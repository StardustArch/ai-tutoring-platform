import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionCacheService } from '../common/question-cache/question-cache.service';

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface LicaoSlot {
  slot: number;
  structure: string;
  difficulty: number;
}

interface LicaoEstado {
  slots: LicaoSlot[];
  currentSlotIndex: number;
  // mapa slotIndex → exercicioId gerado nesse slot (para reusar na revisão)
  slotExercicioMap: Record<number, number>;
  errados: number[];           // índices dos slots que o aluno errou
  fase: 'normal' | 'revisao';
  // Na revisão, queue é lista de slotIndex a rever; iteramos sempre no [0] e removemos quando acerta
  revisaoQueue: number[];
  perguntasRespondidas: string[];
  // Contagem de acertos nesta tentativa (para calcular pontuação no fim)
  acertosNestaTentativa: number;
}

// O que o controller devolve ao frontend a cada pergunta
export interface LicaoQuestionResponse {
  sessaoId: number;
  progressoId: number;
  slotIndex: number;
  totalSlots: number;
  fase: 'normal' | 'revisao';
  isLast: boolean;             // último slot desta fase
  exercicioId: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  // contexto de repetição (para mostrar "Tentativa 3 · Melhor: 7/8")
  tentativa: number;
  melhorPontuacao: number | null;  // melhor nº de acertos em tentativas anteriores
  totalSlotsPlan: number;          // total de slots do plano (denominador da pontuação)
}

export interface LicaoAnswerResponse {
  acertou: boolean;
  explanation: string;
  // O que vem a seguir
  done: boolean;               // lição 100% concluída
  revisaoCount: number;        // quantos slots ainda na revisão
  nextReady: boolean;          // há próxima pergunta imediata
  // Só preenchido quando done=true
  pontuacao?: number;          // acertos nesta tentativa
  melhorPontuacao?: number;    // melhor de sempre (inclui esta se for recorde)
  totalSlotsPlan?: number;
  tentativa?: number;
  isRecorde?: boolean;
}

// ─── Serviço ─────────────────────────────────────────────────────────────────

@Injectable()
export class LessonService {
  private readonly logger = new Logger(LessonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: QuestionCacheService,
  ) {}

  // ── 1. INICIAR LIÇÃO ────────────────────────────────────────────────────────
  async startLicao(alunoId: number, topicoId: number, turmaId?: number): Promise<LicaoQuestionResponse> {

    const topico = await this.prisma.topico.findUnique({ where: { id: topicoId } });
    if (!topico) throw new NotFoundException('Tópico não encontrado');

    const meta = topico.metadata as any;
    const lessonPlan: LicaoSlot[] = meta?.lesson_plan;
    if (!lessonPlan || lessonPlan.length === 0) {
      throw new BadRequestException('Este tópico não tem plano de lição configurado (lesson_plan no metadata).');
    }

    // Cancela só lições em curso (não concluídas) — lições concluídas ficam para histórico
    await this.prisma.licaoProgresso.deleteMany({
      where: { alunoId, topicoId, concluida: false }
    });

    // Calcula o número desta tentativa e o melhor recorde anterior
    const historico = await this.prisma.licaoProgresso.findMany({
      where: { alunoId, topicoId, concluida: true },
      select: { tentativa: true, melhorPontuacao: true },
      orderBy: { tentativa: 'desc' },
    });
    const tentativa = historico.length + 1;
    const melhorAnterior = historico.length > 0
      ? Math.max(...historico.map(h => h.melhorPontuacao ?? 0))
      : null;

    // Cria sessão de estudo
    const sessao = await this.prisma.sessaoEstudo.create({
      data: {
        alunoId,
        turmaId: turmaId || null,
        modo: 'LICAO' as any,
        topicosAlvo: [topicoId],
        status: 'EM_ANDAMENTO',
      }
    });

    const estadoInicial: LicaoEstado = {
      slots: lessonPlan,
      currentSlotIndex: 0,
      slotExercicioMap: {},
      errados: [],
      fase: 'normal',
      revisaoQueue: [],
      perguntasRespondidas: [],
      acertosNestaTentativa: 0,
    };

    const progresso = await this.prisma.licaoProgresso.create({
      data: {
        alunoId,
        topicoId,
        sessaoId: sessao.id,
        estado: estadoInicial as any,
        concluida: false,
        tentativa,
        melhorPontuacao: melhorAnterior,
      }
    });

return await this._gerarPerguntaParaSlot(
      progresso.id, 
      sessao.id, 
      estadoInicial, 
      topico, 
      0, 
      tentativa, 
      melhorAnterior
    );  }

  // ── 2. RESPONDER E AVANÇAR ──────────────────────────────────────────────────
  async answerSlot(
    progressoId: number,
    exercicioId: number,
    respostaAluno: string,
  ): Promise<LicaoAnswerResponse> {

    const progresso = await this.prisma.licaoProgresso.findUnique({
      where: { id: progressoId },
      include: { sessao: true }
    });
    if (!progresso) throw new NotFoundException('Progresso não encontrado');
    if (progresso.concluida) throw new BadRequestException('Lição já concluída');

    const exercicio = await this.prisma.exercicio.findUnique({ where: { id: exercicioId } });
    if (!exercicio) throw new NotFoundException('Exercício não encontrado');

    const acertou = String(respostaAluno).trim() === String(exercicio.resposta).trim();
    const estado = progresso.estado as unknown as LicaoEstado;

    // Guarda resultado na BD (para relatórios)
    await this.prisma.exercicioResultado.create({
      data: {
        alunoId: progresso.alunoId,
        topicoId: progresso.topicoId,
        exercicioId,
        respostaAluno,
        acertou,
        sessaoId: progresso.sessaoId || undefined,
        detalhesJson: { note: 'licao', slot: estado.currentSlotIndex, fase: estado.fase },
      }
    });

    if (acertou) {
      await this.prisma.aluno.update({
        where: { id: progresso.alunoId },
        data: { xp: { increment: 15 } }
      });
      // Conta acertos na fase normal (os da revisão não contam — já foram contados como erros)
      if (estado.fase === 'normal') {
        estado.acertosNestaTentativa = (estado.acertosNestaTentativa || 0) + 1;
      }
    }

    // ── Qual slot acabou de ser respondido? ──────────────────────────────────
    // Na fase normal: é currentSlotIndex
    // Na fase revisão: é sempre o primeiro da queue (revisaoQueue[0])
    const slotRespondido = estado.fase === 'normal'
      ? estado.currentSlotIndex
      : estado.revisaoQueue[0];

    // ── Actualizar estado consoante acerto/erro ──────────────────────────────
    if (estado.fase === 'normal') {
      if (!acertou) {
        if (!estado.errados.includes(slotRespondido)) {
          estado.errados.push(slotRespondido);
        }
      }
      estado.currentSlotIndex++;

      const todosNormaisFeitos = estado.currentSlotIndex >= estado.slots.length;
      if (todosNormaisFeitos) {
        if (estado.errados.length === 0) {
          const stats = await this._concluirLicao(progressoId, progresso.sessaoId!, estado);
          return { acertou, explanation: exercicio.resposta, done: true, revisaoCount: 0, nextReady: false, ...stats };
        } else {
          estado.fase = 'revisao';
          estado.revisaoQueue = [...estado.errados];
          estado.errados = [];
          estado.currentSlotIndex = 0;
        }
      }

    } else {
      if (acertou) {
        estado.revisaoQueue.shift();
      } else {
        estado.revisaoQueue.shift();
        if (!estado.revisaoQueue.includes(slotRespondido)) {
          estado.revisaoQueue.push(slotRespondido);
        }
      }

      if (estado.revisaoQueue.length === 0) {
        const stats = await this._concluirLicao(progressoId, progresso.sessaoId!, estado);
        return { acertou, explanation: exercicio.resposta, done: true, revisaoCount: 0, nextReady: false, ...stats };
      }
    }

    // Guarda estado actualizado
    await this.prisma.licaoProgresso.update({
      where: { id: progressoId },
      data: { estado: estado as any }
    });

    return {
      acertou,
      explanation: exercicio.resposta,
      done: false,
      revisaoCount: estado.fase === 'revisao' ? estado.revisaoQueue.length : 0,
      nextReady: true,
    };
  }

  // helper privado para fechar a lição e devolver stats finais
  private async _concluirLicao(
    progressoId: number,
    sessaoId: number,
    estado: LicaoEstado,
  ): Promise<{ pontuacao: number; melhorPontuacao: number; tentativa: number; totalSlotsPlan: number; isRecorde: boolean }> {

    const pontuacao = estado.acertosNestaTentativa;
    const totalSlotsPlan = estado.slots.length;

    // Vai buscar o melhor anterior (sem esta tentativa ainda)
    const progresso = await this.prisma.licaoProgresso.findUnique({
      where: { id: progressoId },
      select: { tentativa: true, melhorPontuacao: true }
    });
    const tentativa = progresso?.tentativa ?? 1;
    const melhorAnterior = progresso?.melhorPontuacao ?? 0;
    const novaMelhor = Math.max(melhorAnterior, pontuacao);
    const isRecorde = pontuacao > melhorAnterior;

    await this.prisma.sessaoEstudo.update({
      where: { id: sessaoId },
      data: { status: 'CONCLUIDA', fim: new Date() }
    });
    await this.prisma.licaoProgresso.update({
      where: { id: progressoId },
      data: { concluida: true, estado: estado as any, melhorPontuacao: novaMelhor }
    });

    return { pontuacao, melhorPontuacao: novaMelhor, tentativa, totalSlotsPlan, isRecorde };
  }

  // ── 3. PRÓXIMA PERGUNTA ─────────────────────────────────────────────────────
  async nextQuestion(progressoId: number): Promise<LicaoQuestionResponse> {

    const progresso = await this.prisma.licaoProgresso.findUnique({
      where: { id: progressoId },
      include: { topico: true }
    });
    if (!progresso) throw new NotFoundException('Progresso não encontrado');
    if (progresso.concluida) throw new BadRequestException('Lição já concluída');

    const estado = progresso.estado as unknown as LicaoEstado;

    if (estado.fase === 'revisao') {
      // Na revisão: o slot a rever é sempre o primeiro da queue
      const slotIndex = estado.revisaoQueue[0];

      // Reutiliza o exercício original que o aluno errou
      const exercicioId = estado.slotExercicioMap[slotIndex];
      if (exercicioId) {
        const exercicio = await this.prisma.exercicio.findUnique({ where: { id: exercicioId } });
        if (exercicio) {
          const totalSlots = estado.revisaoQueue.length;
          return {
            sessaoId: progresso.sessaoId!,
            progressoId,
            slotIndex,
            totalSlots,
            fase: 'revisao',
            isLast: totalSlots === 1,
            exercicioId: exercicio.id,
            question: exercicio.pergunta,
            options: exercicio.opcoesJson as string[],
            correct_answer: exercicio.resposta,
            explanation: '',
            tentativa: progresso.tentativa,
            melhorPontuacao: progresso.melhorPontuacao,
            totalSlotsPlan: estado.slots.length,
          };
        }
      }
      // fallback: gera nova (não devia acontecer)
return this._gerarPerguntaParaSlot(progresso.id, progresso.sessaoId!, estado, progresso.topico, slotIndex, progresso.tentativa, progresso.melhorPontuacao);    }

    // Fase normal
    const slotIndex = estado.currentSlotIndex;
    return this._gerarPerguntaParaSlot(
      progresso.id,
      progresso.sessaoId!,
      estado,
      progresso.topico,
      slotIndex,
      progresso.tentativa,       // 🔥 NOVO
      progresso.melhorPontuacao  // 🔥 NOVO
    );
  }

  // ── HELPER: gera pergunta para um slot específico ───────────────────────────
  private async _gerarPerguntaParaSlot(
    progressoId: number,
    sessaoId: number,
    estado: LicaoEstado,
    topico: any,
    slotIndex: number,
    tentativa: number,               // 🔥 NOVO
    melhorPontuacao: number | null,  // 🔥 NOVO
  ): Promise<LicaoQuestionResponse> {

    const slot = estado.slots[slotIndex];
    const meta = topico.metadata as any;

    // Constrói context_rules só com a estrutura deste slot (força o motor)
    const rulesParaSlot = `
PERMITIDO:
- ${slot.structure}

PROIBIDO:
- QUALQUER operação matemática (+, -, x, ÷)
`;

    const pergunta = await this.cache.getQuestion({
      classe: topico.nivelClasse,
      disciplina: topico.disciplina?.nome?.toLowerCase() || 'matematica',
      topicoId: topico.id,
      dificuldade: slot.difficulty,
      historicoRecente: estado.perguntasRespondidas,
    });

    // Guarda no histórico para não repetir
    estado.perguntasRespondidas.push(pergunta.question);
    await this.prisma.licaoProgresso.update({
      where: { id: progressoId },
      data: { estado: estado as any }
    });

    // Cria/reaproveita exercício na BD
    let exercicioDb = await this.prisma.exercicio.findFirst({
      where: { topicoId: topico.id, pergunta: pergunta.question }
    });
    if (!exercicioDb) {
      exercicioDb = await this.prisma.exercicio.create({
        data: {
          topicoId: topico.id,
          tipo: 'multiple_choice',
          pergunta: pergunta.question,
          opcoesJson: pergunta.options,
          resposta: pergunta.correct_answer,
          dificuldade: slot.difficulty,
        }
      });
    }

    // Guarda o exercicioId neste slot para reutilizar na revisão
    if (!estado.slotExercicioMap) estado.slotExercicioMap = {};
    estado.slotExercicioMap[slotIndex] = exercicioDb.id;
    await this.prisma.licaoProgresso.update({
      where: { id: progressoId },
      data: { estado: estado as any }
    });

    const totalSlots = estado.fase === 'normal'
      ? estado.slots.length
      : estado.revisaoQueue.length;

    const currentPos = estado.fase === 'normal'
      ? estado.currentSlotIndex
      : estado.currentSlotIndex;

    return {
      sessaoId,
      progressoId,
      slotIndex,
      totalSlots,
      fase: estado.fase,
      isLast: currentPos === totalSlots - 1,
      exercicioId: exercicioDb.id,
      question: pergunta.question,
      options: pergunta.options as string[],
      correct_answer: pergunta.correct_answer,
      explanation: pergunta.explanation || '',
      tentativa,
      melhorPontuacao,
      totalSlotsPlan: estado.slots.length,
    };
  }

  // ── 4. HISTÓRICO POR TÓPICO ──────────────────────────────────────────────
  async getHistorico(alunoId: number): Promise<Record<number, {
    tentativas: number;
    melhorPontuacao: number | null;
    totalSlots: number | null;
    temActiva: boolean;
  }>> {
    const registos = await this.prisma.licaoProgresso.findMany({
      where: { alunoId },
      select: {
        topicoId: true,
        concluida: true,
        tentativa: true,
        melhorPontuacao: true,
        topico: { select: { metadata: true } },
      },
      orderBy: { tentativa: 'asc' },
    });

    const mapa: Record<number, any> = {};
    for (const r of registos) {
      if (!mapa[r.topicoId]) {
        const meta = r.topico?.metadata as any;
        mapa[r.topicoId] = {
          tentativas: 0,
          melhorPontuacao: null,
          totalSlots: meta?.lesson_plan?.length ?? null,
          temActiva: false,
        };
      }
      if (r.concluida) {
        mapa[r.topicoId].tentativas++;
        const mp = r.melhorPontuacao ?? 0;
        if (mapa[r.topicoId].melhorPontuacao === null || mp > mapa[r.topicoId].melhorPontuacao) {
          mapa[r.topicoId].melhorPontuacao = mp;
        }
      } else {
        mapa[r.topicoId].temActiva = true;
      }
    }
    return mapa;
  }
}