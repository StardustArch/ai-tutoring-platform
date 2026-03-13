import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendChatDto, MicroserviceChatRequestDto } from './dto/send-chat.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { TipoInteracaoChat } from '@prisma/client';

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

const CONFIRM_KEYWORDS    = ['entendi', 'percebi', 'sim', 'ok', 'continua', 'avança', 'pronto', 'claro'];
const DOUBT_KEYWORDS      = ['não percebi', 'nao percebi', 'dúvida', 'duvida', 'não entendi', 'nao entendi', 'explica', 'não percebo'];
const ADVANCE_KEYWORDS    = ['avançar', 'avançar matéria', 'aprender', 'próximo', 'novo'];
const CHALLENGE_KEYWORDS  = ['desafio', 'mais um', 'outra'];

function _calcNextPhase(currentPhase: Phase, userQuery: string, lastAssessment?: string): Phase {
  const q = userQuery.trim().toLowerCase();

  switch (currentPhase) {
    case 'EXPLAIN':
      // Se o aluno confirmou → passar para TEST
      if (CONFIRM_KEYWORDS.some(k => q.includes(k))) return 'TEST';
      // Se o aluno tem dúvidas → ficar em EXPLAIN
      if (DOUBT_KEYWORDS.some(k => q.includes(k))) return 'EXPLAIN';
      // Por defeito, qualquer outra coisa em EXPLAIN → TEST
      return 'TEST';

    case 'TEST':
      // Qualquer resposta a uma pergunta vai para FEEDBACK
      return 'FEEDBACK';

    case 'FEEDBACK':
      // Depois de feedback correcto: aluno escolhe
      if (lastAssessment === 'CORRECT') {
        if (ADVANCE_KEYWORDS.some(k => q.includes(k))) return 'EXPLAIN';
        if (CHALLENGE_KEYWORDS.some(k => q.includes(k))) return 'TEST';
        // Por defeito após correcto → avança explicação
        return 'EXPLAIN';
      }
      // Depois de feedback incorrecto: retesta automaticamente
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
  ) {
    const baseUrl = process.env.IA_API_URL || 'http://localhost:8000';
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
      if (!pertence) throw new ForbiddenException('Aluno não pertence a esta turma.');
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
            ancoras: true,   // 🆕
          },
        });
        if (topicoDb) {
          currentTopicoId = topicoDb.id;
          const meta = topicoDb.metadata as any;
          if (meta?.ai_rules) aiContextRules = meta.ai_rules;
          // 🆕 guardar ancoras para o payload
          currentAncoras = (topicoDb as any).ancoras ?? [];
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
    //
    // O frontend envia a fase em que estava ANTES desta mensagem.
    // O NestJS calcula em que fase o Python deve RESPONDER.
    //
    // Exemplo:
    //   Frontend: phase="TEST" (estava a responder a uma pergunta)
    //   NestJS calcula: próxima fase = "FEEDBACK"
    //   Python recebe phase="FEEDBACK" e usa PROMPT_FEEDBACK_*
    const currentPhase = (dto.phase as Phase) || 'EXPLAIN';

    // Para o FEEDBACK, precisamos do último assessment guardado
    // (para saber se o aluno acertou ou não na pergunta anterior)
    const lastMensagem = rawHistory[rawHistory.length - 1];
    let lastAssessment: string | undefined;
    if (lastMensagem?.respostaIa) {
      try {
        const parsed = JSON.parse(lastMensagem.respostaIa);
        lastAssessment = parsed.assessment ?? undefined;
      } catch { /* ignora */ }
    }

    const nextPhase: Phase = _calcNextPhase(currentPhase, dto.userQuery, lastAssessment);

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
        ancoras: currentAncoras,   // 🆕 lista de chaves para o Python escolher
      };

    // 7. Chamada ao Python
    let finalResponse: string;
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.aiServiceUrl, aiRequest),
      );
      finalResponse = response.data.response_text;
    } catch (error) {
      this.logger.error(`ERRO IA: ${error.message}`);
      finalResponse = JSON.stringify({
        messages: ['O KMind está a pensar... Podes tentar de novo?'],
        emotion: 'THOUGHTFUL',
        interaction_type: 'CHIPS',
        assessment: null,
        phase: nextPhase,
        interaction_data: { options: ['Tentar'] },
      });
    }

    // 8. Persistência
    // tipoSalvo reflecte a fase actual (o que o Kani acabou de fazer)
    let tipoSalvo: TipoInteracaoChat = 'EXPLICACAO';
    try {
      const jsonResp = JSON.parse(finalResponse);
      const itype = jsonResp.interaction_type;
      if (nextPhase === 'TEST' || ['CHIPS', 'CLOZE', 'TRUE_FALSE', 'DIRECT_INPUT', 'DRAG_DROP'].includes(itype)) {
        tipoSalvo = 'PERGUNTA';
      } else if (nextPhase === 'FEEDBACK' && jsonResp.assessment === 'CORRECT') {
        tipoSalvo = 'PERGUNTA'; // foi avaliado
      }
    } catch { /* assume EXPLICACAO */ }

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
        // Remove campos técnicos (audio_url, phase) antes de passar ao modelo.
        // Se ficarem no histórico, o GPT-4o começa a inventar audio_urls no output.
        let textoParaIA = entry.respostaIa;
        try {
          const parsed = JSON.parse(entry.respostaIa);
          delete parsed.audio_url;
          delete parsed.phase;
          textoParaIA = JSON.stringify(parsed);
        } catch { /* mantém o texto original se não for JSON válido */ }

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