import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendChatDto, MicroserviceChatRequestDto } from './dto/send-chat.dto';
import { firstValueFrom, timeout } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { TipoInteracaoChat } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

// ─── State Machine ────────────────────────────────────────────────────────────
//
// Fases do modo Lição (Tutor Guiado):
//   EXPLAIN  → Kani explica o conceito
//   TEST     → Kani faz uma pergunta de avaliação
//   FEEDBACK → Kani reage à resposta do aluno (assessment calculado no Python)
//
// Transições:
//   EXPLAIN  + "Entendi" / confirmação     → TEST
//   EXPLAIN  + "Não percebi" / dúvida      → EXPLAIN (nova analogia)
//   TEST     + qualquer resposta           → FEEDBACK
//   FEEDBACK (CORRECT)  + "Avançar"        → EXPLAIN (novo slot)
//   FEEDBACK (CORRECT)  + "Mais desafio"   → TEST
//   FEEDBACK (INCORRECT)                   → TEST (retry automático)
//
// ⚠️  O estado (phase, slot, lastCorrectAnswer…) é derivado 100% da BD.
//     O frontend NÃO envia nem guarda estado de sessão.

type Phase = 'EXPLAIN' | 'TEST' | 'FEEDBACK';

const CONFIRM_KEYWORDS = [
  'entendi', 'percebi', 'sim', 'ok', 'continua', 'avança', 'pronto', 'claro',
];
const DOUBT_KEYWORDS = [
  'não percebi', 'nao percebi', 'dúvida', 'duvida',
  'não entendi', 'nao entendi', 'explica', 'não percebo','outro exemplo', 'mais exemplo', 'preciso de', 'não ficou claro', 'nao ficou claro', 'não bateu', 'nao bateu',
];
const ADVANCE_KEYWORDS = [
  'avançar', 'avançar matéria', 'aprender', 'próximo', 'novo',
];
const CHALLENGE_KEYWORDS = ['desafio', 'mais um', 'outra'];
const GREETING_KEYWORDS = [
  'ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite',
  'tudo bem', 'salve', 'o que e', 'o que é', 'o que isso', 'vamos a isso', 'vamos lá',
];
const RETRY_KEYWORDS = ['tentar', 'tentar de novo', 'repetir', 'de novo'];

function _calcNextPhase(
  currentPhase: Phase,
  userQuery: string,
  lastAssessment?: string,
  hasLastCorrectAnswer?: boolean,
): Phase {
  const q = userQuery.trim().toLowerCase();
  if (!q) return 'EXPLAIN';
  if (q === 'iniciar_sessao') return 'EXPLAIN';
  if (RETRY_KEYWORDS.some((k) => q.includes(k))) return currentPhase;

  switch (currentPhase) {
    case 'EXPLAIN':
      if (GREETING_KEYWORDS.some((k) => q.includes(k))) return 'EXPLAIN';
      if (CONFIRM_KEYWORDS.some((k) => q.includes(k))) return 'TEST';
      if (DOUBT_KEYWORDS.some((k) => q.includes(k))) return 'EXPLAIN';
      return 'TEST';

    case 'TEST':
      // Sem correct_answer ainda não houve pergunta real → Python gera a pergunta
      if (!hasLastCorrectAnswer) return 'TEST';
      return 'FEEDBACK';

    case 'FEEDBACK':
      if (lastAssessment === 'CORRECT') {
        if (ADVANCE_KEYWORDS.some((k) => q.includes(k))) return 'EXPLAIN';
        if (CHALLENGE_KEYWORDS.some((k) => q.includes(k))) return 'TEST';
        return 'EXPLAIN';
      }
      return 'TEST';

    default:
      return 'EXPLAIN';
  }
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    const baseUrl = this.configService.get('IA_API_URL');
    if (!baseUrl) throw new Error('IA_API_URL não está definida no .env');
    this.aiServiceUrl = `${baseUrl}/generate-chat-response`;
  }

  async sendChat(usuarioId: number, dto: SendChatDto) {
    // 1. Validar Aluno
    const aluno = await this.prisma.aluno.findFirst({
      where: { id: dto.alunoId, encarregado: { usuarioId } },
      select: { id: true, classe: true },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado.');

    if (dto.turmaId) {
      const pertence = await this.prisma.alunoTurma.findFirst({
        where: { alunoId: dto.alunoId, turmaId: dto.turmaId },
      });
      if (!pertence)
        throw new ForbiddenException('Aluno não pertence a esta turma.');
    }

    // 2. Resolver Tópico, regras da IA e âncoras
    let aiContextRules = '';
    let currentTopicoId: number | null = null;
    let currentAncoras: string[] = [];
    let topicoMetadata: any = null;

    if (dto.topic && dto.subject) {
      const topicoDb = await this.prisma.topico.findFirst({
        where: {
          nome: dto.topic,
          nivelClasse: aluno.classe,
          disciplina: { nome: dto.subject },
        },
        select: { id: true, metadata: true, ancoras: true },
      });
      if (topicoDb) {
        currentTopicoId = topicoDb.id;
        topicoMetadata  = topicoDb.metadata as any;
        if (topicoMetadata?.ai_rules) aiContextRules = topicoMetadata.ai_rules;

        const rawAncoras = (topicoDb as any).ancoras;
        if (Array.isArray(rawAncoras)) {
          currentAncoras = rawAncoras.map((a) => String(a));
        }
      }
    }

    // 3. Memória contextual — tópicos problemáticos recentes
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const errosRecentes = await this.prisma.exercicioResultado.findMany({
      where: { alunoId: aluno.id, acertou: false, timestamp: { gte: seteDiasAtras } },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { topico: { select: { nome: true } } },
    });

    const contagemErros: Record<string, number> = {};
    for (const r of errosRecentes) {
      const nome = r.topico?.nome;
      if (nome) contagemErros[nome] = (contagemErros[nome] || 0) + 1;
    }
    const topicosProblematicos = Object.entries(contagemErros)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nome]) => nome);

    let memoriaContexto = '';
    if (topicosProblematicos.length > 0) {
      memoriaContexto =
        `\n\n📊 CONTEXTO DO ALUNO (usa com naturalidade, não reveles os números):\n` +
        `O aluno teve dificuldades recentes em: ${topicosProblematicos.join(', ')}.\n` +
        `Se o tópico actual for um destes, começa por reconhecer que é uma área difícil e encoraja-o.\n` +
        `Se for um tópico diferente, não precisas de mencionar os outros.`;
    }

    // 4. Histórico — isolado por sessão e tópico
    const rawHistory = await this.prisma.chatMensagem.findMany({
      where: {
        alunoId: aluno.id,
        ...(currentTopicoId ? { topicoId: currentTopicoId } : {}),
        turmaId: dto.turmaId || null,
        ...(dto.sessaoId ? { sessaoId: dto.sessaoId } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: 6,
      select: { mensagemAluno: true, respostaIa: true, tipoInteracao: true },
    });
    // rawHistory está em ordem DESC — reverter para cronológico antes de formatar
    const rawHistoryCrono = [...rawHistory].reverse();
    const formattedHistory = this.formatarHistoricoParaIA(rawHistoryCrono);

    // 5. Estado derivado 100% da BD — o frontend não envia nem guarda estado
    let currentPhase: Phase = 'EXPLAIN';
    let lastAssessment: string | undefined;
    let lastCorrectAnswer: string | undefined;
    let lastQuestion: string | undefined;
    let lastInteractionType: string | undefined;
    let currentSlotNumber = 1;

    // Última mensagem → fase actual, assessment e slot
    const lastMsg = rawHistoryCrono[rawHistoryCrono.length - 1];
    if (lastMsg?.respostaIa) {
      try {
        const p = JSON.parse(lastMsg.respostaIa);
        currentPhase      = (p.phase as Phase) || 'EXPLAIN';
        lastAssessment    = p.assessment   ?? undefined;
        currentSlotNumber = p.slot_number  ?? 1;
      } catch { /* ignora JSON inválido */ }
    }

    // Última mensagem de fase TEST → pergunta + resposta correcta
    const lastTestMsg = [...rawHistoryCrono].reverse().find((m) => {
      try { return JSON.parse(m.respostaIa)?.phase === 'TEST'; }
      catch { return false; }
    });
    if (lastTestMsg?.respostaIa) {
      try {
        const p    = JSON.parse(lastTestMsg.respostaIa);
        const msgs = p.messages || [];
        lastQuestion        = msgs[msgs.length - 1];
        lastCorrectAnswer   = p.correct_answer;
        lastInteractionType = p.interaction_type;
      } catch { /* ignora */ }
    }

    const nextPhase: Phase = _calcNextPhase(
      currentPhase,
      dto.userQuery,
      lastAssessment,
      !!lastCorrectAnswer,
    );

    this.logger.log(
      `💬 Chat: [${currentPhase}] → [${nextPhase}] | slot=${currentSlotNumber} | âncoras=${currentAncoras.length}`,
    );

    // 5.5. Slot activo — avança se FEEDBACK(CORRECT) → EXPLAIN
    const advancing =
      nextPhase === 'EXPLAIN' &&
      currentPhase === 'FEEDBACK' &&
      lastAssessment === 'CORRECT';
    const activeSlotNumber = advancing ? currentSlotNumber + 1 : currentSlotNumber;

    // Extrai a estrutura do slot activo a partir dos metadados do tópico
    let currentStructure: string | undefined;
    if (topicoMetadata?.lesson_plan) {
      const slotIndex = activeSlotNumber - 1;
      currentStructure = topicoMetadata.lesson_plan[slotIndex]?.structure;
    }

    // 6. Payload para o Python
    const aiRequest: MicroserviceChatRequestDto = {
      student_id:           aluno.id,
      student_class:        aluno.classe,
      user_query:           dto.userQuery,
      mode:                 'tutor',
      history:              formattedHistory,
      subject:              dto.subject || 'Geral',
      topic:                dto.topic   || 'Geral',
      context_rules:        aiContextRules + memoriaContexto,
      phase:                nextPhase,
      last_question:        lastQuestion,
      last_correct_answer:  lastCorrectAnswer,
      last_interaction_type: lastInteractionType,
      ancoras:              currentAncoras,
      current_structure:    currentStructure,
      session_id:           dto.sessaoId,
      slot_number:          activeSlotNumber,
    };

    // 7. Chamada ao Python
    let finalResponse: string;
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.aiServiceUrl, aiRequest).pipe(timeout(40_000)),
      );
      finalResponse = response.data.response_text;

      // Sanitizar opções + injectar slot_number na resposta (persiste na BD)
      try {
        const parsed = JSON.parse(finalResponse);

        // Injctar slot_number para que a próxima leitura da BD o encontre
        parsed.slot_number = activeSlotNumber;

        // Limpar opções com instrução interna do modelo
        if (parsed.interaction_data && Array.isArray(parsed.interaction_data.options)) {
          parsed.interaction_data.options = parsed.interaction_data.options.filter(
            (opt: string) => {
              const s = opt.trim().toLowerCase();
              if (s.startsWith('(') || s.startsWith('[')) return false;
              if (s.includes('avalia tu') || s.includes('escolhe') || s.includes('usa a'))
                return false;
              return true;
            },
          );
          if (parsed.interaction_data.options.length === 0) {
            parsed.interaction_data.options = ['Continuar'];
          }
        }

        finalResponse = JSON.stringify(parsed);
      } catch (e: any) {
        this.logger.warn(`Falha ao sanitizar resposta: ${e.message}`);
      }
    } catch (error: any) {
      this.logger.error(`ERRO IA: ${error.message}`);
      finalResponse = JSON.stringify({
        messages: ['O tutor está a pensar... Podes tentar de novo?'],
        emotion: 'THOUGHTFUL',
        interaction_type: 'CHIPS',
        assessment: null,
        phase: nextPhase,
        slot_number: activeSlotNumber,
        interaction_data: { options: ['Tentar'] },
      });
    }

    // 8. Persistência
    let tipoSalvo: TipoInteracaoChat = 'EXPLICACAO';
    try {
      const jsonResp = JSON.parse(finalResponse);
      const itype = jsonResp.interaction_type;
      if (
        nextPhase === 'TEST' ||
        ['CHIPS', 'CLOZE', 'TRUE_FALSE', 'DIRECT_INPUT', 'DRAG_DROP'].includes(itype)
      ) {
        tipoSalvo = 'PERGUNTA';
      } else if (nextPhase === 'FEEDBACK' && jsonResp.assessment === 'CORRECT') {
        tipoSalvo = 'PERGUNTA';
      }
    } catch { /* assume EXPLICACAO */ }

    await this.prisma.chatMensagem.create({
      data: {
        alunoId:       aluno.id,
        mensagemAluno: dto.userQuery,
        respostaIa:    finalResponse,
        tipoInteracao: tipoSalvo,
        topicoId:      currentTopicoId,
        turmaId:       dto.turmaId  || null,
        sessaoId:      dto.sessaoId || null,
      },
    });

    return { message: 'Sucesso', response: finalResponse };
  }

  private formatarHistoricoParaIA(rawHistory: any[]): any[] {
    const history: Array<{ role: string; text: string; type?: string }> = [];
    for (const entry of rawHistory) {
      if (entry.mensagemAluno) {
        history.push({ role: 'user', text: entry.mensagemAluno });
      }
      if (entry.respostaIa) {
        let textoParaIA = entry.respostaIa;
        try {
          const parsed = JSON.parse(entry.respostaIa);
          // Remove campos internos que não devem ir para o modelo
          delete parsed.audio_url;
          delete parsed.phase;
          delete parsed.slot_number;
          textoParaIA = JSON.stringify(parsed);
        } catch { /* mantém texto original */ }

        history.push({ role: 'model', text: textoParaIA, type: entry.tipoInteracao });
      }
    }
    return history;
  }
}