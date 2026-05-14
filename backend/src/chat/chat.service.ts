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
//   EXPLAIN  + "Entendi" / "Percebeste" / confirmação   → TEST
//   EXPLAIN  + "Não percebi" / dúvida                   → EXPLAIN (nova analogia)
//   TEST     + qualquer resposta                         → FEEDBACK
//   FEEDBACK (CORRECT)  + "Mais um desafio"             → TEST
//   FEEDBACK (CORRECT)  + "Avançar"                     → EXPLAIN
//   FEEDBACK (INCORRECT) → TEST automático (retry)
//
// O frontend envia `phase` = fase actual antes de processar a mensagem.
// O NestJS calcula a PRÓXIMA fase com base na resposta + fase actual.
// O Python recebe a fase calculada e usa o prompt correcto.

type Phase = 'EXPLAIN' | 'TEST' | 'FEEDBACK';

const CONFIRM_KEYWORDS = [
  'entendi',
  'percebi',
  'sim',
  'ok',
  'continua',
  'avança',
  'pronto',
  'claro',
];
const DOUBT_KEYWORDS = [
  'não percebi',
  'nao percebi',
  'dúvida',
  'duvida',
  'não entendi',
  'nao entendi',
  'explica',
  'não percebo',
];
const ADVANCE_KEYWORDS = [
  'avançar',
  'avançar matéria',
  'aprender',
  'próximo',
  'novo',
];
const CHALLENGE_KEYWORDS = ['desafio', 'mais um', 'outra'];

function _calcNextPhase(
  currentPhase: Phase,
  userQuery: string,
  lastAssessment?: string,
  hasLastCorrectAnswer?: boolean,  // ← NOVO parâmetro
): Phase {
  const q = userQuery.trim().toLowerCase();

  switch (currentPhase) {
    case 'EXPLAIN':
      if (CONFIRM_KEYWORDS.some((k) => q.includes(k))) return 'TEST';
      if (DOUBT_KEYWORDS.some((k) => q.includes(k))) return 'EXPLAIN';
      return 'TEST';

    case 'TEST':
      // Se não há correct_answer guardada, ainda não houve pergunta real
      // → manter em TEST para o Python gerar a pergunta primeiro
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

    // 2. Resolver Tópico e regras da IA
    let aiContextRules = '';
    let currentTopicoId: number | null = null;
    let currentAncoras: string[] = [];

    if (dto.topic && dto.subject) {
      const topicoDb = await this.prisma.topico.findFirst({
        where: {
          nome: dto.topic,
          nivelClasse: aluno.classe,
          disciplina: { nome: dto.subject },
        },
        select: {
          id: true,
          metadata: true,
          ancoras: true, // 🆕 Buscar âncoras na BD
        },
      });
      if (topicoDb) {
        currentTopicoId = topicoDb.id;
        const meta = topicoDb.metadata as any;
        if (meta?.ai_rules) aiContextRules = meta.ai_rules;

        // 🆕 Garantir que currentAncoras é sempre um array de strings
        const rawAncoras = (topicoDb as any).ancoras;
        if (Array.isArray(rawAncoras)) {
          currentAncoras = rawAncoras.map((a) => String(a));
        }
      }
    }

    // 3. Memória contextual — tópicos problemáticos recentes
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const errosRecentes = await this.prisma.exercicioResultado.findMany({
      where: {
        alunoId: aluno.id,
        acertou: false,
        timestamp: { gte: seteDiasAtras },
      },
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

    // 4. Histórico — isolado por turmaId (não mistura sessões autónomas)
    const rawHistory = await this.prisma.chatMensagem.findMany({
      where: {
        alunoId: aluno.id,
        ...(currentTopicoId ? { topicoId: currentTopicoId } : {}),
        turmaId: dto.turmaId || null,
      },
      orderBy: { timestamp: 'desc' },
      take: 6,
      select: { mensagemAluno: true, respostaIa: true, tipoInteracao: true },
    });
    const formattedHistory = this.formatarHistoricoParaIA(rawHistory.reverse());

    // 5. State machine — calcula a fase a enviar ao Python
    const currentPhase = (dto.phase as Phase) || 'EXPLAIN';
    const lastMensagem = rawHistory[rawHistory.length - 1];
    let lastAssessment: string | undefined;
    if (lastMensagem?.respostaIa) {
      try {
        const parsed = JSON.parse(lastMensagem.respostaIa);
        lastAssessment = parsed.assessment ?? undefined;
      } catch {
        /* ignora */
      }
    }

    const nextPhase: Phase = _calcNextPhase(
      currentPhase,
      dto.userQuery,
      lastAssessment,
       !!dto.lastCorrectAnswer,
    );

    this.logger.log(
      `💬 Chat: Fase Atual [${currentPhase}] -> Próxima Fase [${nextPhase}]. Âncoras ativas: ${currentAncoras.length}`,
    );

    // 6. Payload para o Python
    const aiRequest: MicroserviceChatRequestDto = {
      student_id: aluno.id,
      student_class: aluno.classe,
      user_query: dto.userQuery,
      mode: 'tutor',
      history: formattedHistory,
      subject: dto.subject || 'Geral',
      topic: dto.topic || 'Geral',
      context_rules: aiContextRules + memoriaContexto,
      phase: nextPhase,
      last_question: dto.lastQuestion,
      last_correct_answer: dto.lastCorrectAnswer,
      last_interaction_type: dto.lastInteractionType,
      ancoras: currentAncoras, // ⬅️ Array enviado perfeitamente para o Python
    };

    // 7. Chamada ao Python
    let finalResponse: string;
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.aiServiceUrl, aiRequest).pipe(
          timeout(30_000), // 30 segundos máximo
        ),
      );
      finalResponse = response.data.response_text;
      try {
        const parsed = JSON.parse(finalResponse);
        if (
          parsed.interaction_data &&
          Array.isArray(parsed.interaction_data.options)
        ) {
          parsed.interaction_data.options =
            parsed.interaction_data.options.filter((opt: string) => {
              const s = opt.trim().toLowerCase();
              // Remove se começar com parênteses ou contiver verbos de instrução interna
              if (s.startsWith('(') || s.startsWith('[')) return false;
              if (
                s.includes('avalia tu') ||
                s.includes('escolhe') ||
                s.includes('usa a')
              )
                return false;
              return true;
            });
          // Se o filtro apagar todas as opções por acidente, coloca um fallback de segurança
          if (parsed.interaction_data.options.length === 0) {
            parsed.interaction_data.options = ['Continuar'];
          }
          finalResponse = JSON.stringify(parsed);
        }
      } catch (e: any) {
        this.logger.warn(`Falha ao sanitizar opções do chat: ${e.message}`);
      }
    } catch (error: any) {
      this.logger.error(`ERRO IA: ${error.message}`);
      finalResponse = JSON.stringify({
        messages: ['O tutor está a pensar... Podes tentar de novo?'],
        emotion: 'THOUGHTFUL',
        interaction_type: 'CHIPS',
        assessment: null,
        phase: nextPhase,
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
        ['CHIPS', 'CLOZE', 'TRUE_FALSE', 'DIRECT_INPUT', 'DRAG_DROP'].includes(
          itype,
        )
      ) {
        tipoSalvo = 'PERGUNTA';
      } else if (
        nextPhase === 'FEEDBACK' &&
        jsonResp.assessment === 'CORRECT'
      ) {
        tipoSalvo = 'PERGUNTA';
      }
    } catch {
      /* assume EXPLICACAO */
    }

    await this.prisma.chatMensagem.create({
      data: {
        alunoId: aluno.id,
        mensagemAluno: dto.userQuery,
        respostaIa: finalResponse,
        tipoInteracao: tipoSalvo,
        topicoId: currentTopicoId,
        turmaId: dto.turmaId || null,
        sessaoId: dto.sessaoId || null,
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
          delete parsed.audio_url;
          delete parsed.phase;
          textoParaIA = JSON.stringify(parsed);
        } catch {
          /* mantém o texto original se não for JSON válido */
        }

        history.push({
          role: 'model',
          text: textoParaIA,
          type: entry.tipoInteracao,
        });
      }
    }
    return history;
  }
}
