import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
  slotExercicioMap: Record<number, number>;
  errados: number[];
  fase: 'normal' | 'revisao';
  revisaoQueue: number[];
  perguntasRespondidas: string[];
  acertosNestaTentativa: number;
}

// 🆕 Tipos de pergunta suportados
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'cloze'
  | 'direct_input';

export interface LicaoQuestionResponse {
  sessaoId: number;
  progressoId: number;
  slotIndex: number;
  totalSlots: number;
  fase: 'normal' | 'revisao';
  isLast: boolean;
  exercicioId: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  questionType: QuestionType; // 🆕
  tentativa: number;
  melhorPontuacao: number | null;
  totalSlotsPlan: number;
  ancora?: { chave: string; tipo: string; conteudo: string } | null;
}

export interface LicaoAnswerResponse {
  acertou: boolean;
  explanation: string;
  done: boolean;
  revisaoCount: number;
  nextReady: boolean;
  pontuacao?: number;
  melhorPontuacao?: number;
  totalSlotsPlan?: number;
  tentativa?: number;
  isRecorde?: boolean;
}

// ─── Keywords que implicam Direct Input ──────────────────────────────────────
// Adiciona aqui as strings que usas nos lesson_plan do seed quando quiseres
// que um slot específico use input de texto livre em vez de botões.
const DIRECT_INPUT_KEYWORDS = [
  'escrever por extenso',
  'escrita por extenso',
  'escrever o número',
  'resposta aberta',
  'direct_input',
];

function _isDirectInputStructure(structure: string): boolean {
  const s = structure.toLowerCase();
  return DIRECT_INPUT_KEYWORDS.some((k) => s.includes(k));
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
  async startLicao(
    alunoId: number,
    topicoId: number,
    turmaId?: number,
  ): Promise<LicaoQuestionResponse> {
    const topico = await this.prisma.topico.findUnique({
      where: { id: topicoId },
    });
    if (!topico) throw new NotFoundException('Tópico não encontrado');

    const meta = topico.metadata as any;
    const lessonPlan: LicaoSlot[] = meta?.lesson_plan;
    if (!lessonPlan || lessonPlan.length === 0) {
      throw new BadRequestException(
        'Este tópico não tem plano de lição configurado.',
      );
    }

    await this.prisma.licaoProgresso.deleteMany({
      where: { alunoId, topicoId, concluida: false },
    });

    const historico = await this.prisma.licaoProgresso.findMany({
      where: { alunoId, topicoId, concluida: true },
      select: { tentativa: true, melhorPontuacao: true },
      orderBy: { tentativa: 'desc' },
    });
    const tentativa = historico.length + 1;
    const melhorAnterior =
      historico.length > 0
        ? Math.max(...historico.map((h) => h.melhorPontuacao ?? 0))
        : null;

    const sessao = await this.prisma.sessaoEstudo.create({
      data: {
        alunoId,
        turmaId: turmaId || null,
        modo: 'LESSON' as any,
        topicosAlvo: [topicoId],
        status: 'EM_ANDAMENTO',
      },
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
      },
    });

    return await this._gerarPerguntaParaSlot(
      progresso.id,
      sessao.id,
      estadoInicial,
      topico,
      0,
      tentativa,
      melhorAnterior,
    );
  }

  // ── 2. RESPONDER E AVANÇAR ──────────────────────────────────────────────────
  async answerSlot(
    progressoId: number,
    exercicioId: number,
    respostaAluno: string,
  ): Promise<LicaoAnswerResponse> {
    const progresso = await this.prisma.licaoProgresso.findUnique({
      where: { id: progressoId },
      include: { sessao: true },
    });
    if (!progresso) throw new NotFoundException('Progresso não encontrado');
    if (progresso.concluida)
      throw new BadRequestException('Lição já concluída');

    const exercicio = await this.prisma.exercicio.findUnique({
      where: { id: exercicioId },
    });
    if (!exercicio) throw new NotFoundException('Exercício não encontrado');

    // 🆕 Comparação normalizada — essencial para Direct Input
    // "540 000" == "540.000" == "540000"
    const normalizar = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[\s.,]/g, '');
    const acertou =
      normalizar(respostaAluno) === normalizar(exercicio.resposta);

    const estado = progresso.estado as unknown as LicaoEstado;

    await this.prisma.exercicioResultado.create({
      data: {
        alunoId: progresso.alunoId,
        topicoId: progresso.topicoId,
        exercicioId,
        respostaAluno,
        acertou,
        sessaoId: progresso.sessaoId || undefined,
        detalhesJson: {
          note: 'licao',
          slot: estado.currentSlotIndex,
          fase: estado.fase,
        },
      },
    });

    if (acertou) {
      await this.prisma.aluno.update({
        where: { id: progresso.alunoId },
        data: { xp: { increment: 15 } },
      });
      if (estado.fase === 'normal') {
        estado.acertosNestaTentativa = (estado.acertosNestaTentativa || 0) + 1;
      }
    }

    const slotRespondido =
      estado.fase === 'normal'
        ? estado.currentSlotIndex
        : estado.revisaoQueue[0];

    if (estado.fase === 'normal') {
      if (!acertou && !estado.errados.includes(slotRespondido)) {
        estado.errados.push(slotRespondido);
      }
      estado.currentSlotIndex++;

      const todosNormaisFeitos = estado.currentSlotIndex >= estado.slots.length;
      if (todosNormaisFeitos) {
        if (estado.errados.length === 0) {
          const stats = await this._concluirLicao(
            progressoId,
            progresso.sessaoId!,
            estado,
          );
          return {
            acertou,
            explanation: exercicio.resposta,
            done: true,
            revisaoCount: 0,
            nextReady: false,
            ...stats,
          };
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
        const stats = await this._concluirLicao(
          progressoId,
          progresso.sessaoId!,
          estado,
        );
        return {
          acertou,
          explanation: exercicio.resposta,
          done: true,
          revisaoCount: 0,
          nextReady: false,
          ...stats,
        };
      }
    }

    await this.prisma.licaoProgresso.update({
      where: { id: progressoId },
      data: { estado: estado as any },
    });

    return {
      acertou,
      explanation: exercicio.resposta,
      done: false,
      revisaoCount: estado.fase === 'revisao' ? estado.revisaoQueue.length : 0,
      nextReady: true,
    };
  }

  // ── HELPER: concluir lição ──────────────────────────────────────────────────
  private async _concluirLicao(
    progressoId: number,
    sessaoId: number,
    estado: LicaoEstado,
  ): Promise<{
    pontuacao: number;
    melhorPontuacao: number;
    tentativa: number;
    totalSlotsPlan: number;
    isRecorde: boolean;
  }> {
    const pontuacao = estado.acertosNestaTentativa;
    const totalSlotsPlan = estado.slots.length;

    const progresso = await this.prisma.licaoProgresso.findUnique({
      where: { id: progressoId },
      select: { tentativa: true, melhorPontuacao: true },
    });
    const tentativa = progresso?.tentativa ?? 1;
    const melhorAnterior = progresso?.melhorPontuacao ?? 0;
    const novaMelhor = Math.max(melhorAnterior, pontuacao);
    const isRecorde = pontuacao > melhorAnterior;

    await this.prisma.sessaoEstudo.update({
      where: { id: sessaoId },
      data: { status: 'CONCLUIDA', fim: new Date() },
    });
    await this.prisma.licaoProgresso.update({
      where: { id: progressoId },
      data: {
        concluida: true,
        estado: estado as any,
        melhorPontuacao: novaMelhor,
      },
    });

    return {
      pontuacao,
      melhorPontuacao: novaMelhor,
      tentativa,
      totalSlotsPlan,
      isRecorde,
    };
  }

  // ── 3. PRÓXIMA PERGUNTA ─────────────────────────────────────────────────────
  async nextQuestion(progressoId: number): Promise<LicaoQuestionResponse> {
    const progresso = await this.prisma.licaoProgresso.findUnique({
      where: { id: progressoId },
      include: { topico: true },
    });
    if (!progresso) throw new NotFoundException('Progresso não encontrado');
    if (progresso.concluida)
      throw new BadRequestException('Lição já concluída');

    const estado = progresso.estado as unknown as LicaoEstado;

    if (estado.fase === 'revisao') {
      const slotIndex = estado.revisaoQueue[0];
      const exercicioId = estado.slotExercicioMap[slotIndex];

      if (exercicioId) {
        const exercicio = await this.prisma.exercicio.findUnique({
          where: { id: exercicioId },
        });
        if (exercicio) {
          const totalSlots = estado.revisaoQueue.length;
          const slot = estado.slots[slotIndex];
          const questionType = this._resolveQuestionType(slot, exercicio.tipo);
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
            questionType,
            tentativa: progresso.tentativa,
            melhorPontuacao: progresso.melhorPontuacao,
            totalSlotsPlan: estado.slots.length,
          };
        }
      }
      return this._gerarPerguntaParaSlot(
        progresso.id,
        progresso.sessaoId!,
        estado,
        progresso.topico,
        slotIndex,
        progresso.tentativa,
        progresso.melhorPontuacao,
      );
    }

    const slotIndex = estado.currentSlotIndex;
    return this._gerarPerguntaParaSlot(
      progresso.id,
      progresso.sessaoId!,
      estado,
      progresso.topico,
      slotIndex,
      progresso.tentativa,
      progresso.melhorPontuacao,
    );
  }

  // ── HELPER: resolve tipo ────────────────────────────────────────────────────
  private _resolveQuestionType(
    slot: LicaoSlot,
    tipoNaBd?: string,
  ): QuestionType {
    const validos: QuestionType[] = [
      'true_false',
      'cloze',
      'direct_input',
      'multiple_choice',
    ];
    if (tipoNaBd && validos.includes(tipoNaBd as QuestionType)) {
      return tipoNaBd as QuestionType;
    }
    if (_isDirectInputStructure(slot.structure)) return 'direct_input';
    return 'multiple_choice';
  }

  // ── HELPER — adicionar junto ao _isDirectInputStructure no topo ───────

  /**
   * Resolve ancora do slot — pode ser string ou string[].
   * Se for array, escolhe aleatoriamente.
   * Devolve string | undefined.
   */
  _resolveSlotAncora(
    ancora: string | string[] | undefined | null,
  ): string | undefined {
    if (!ancora) return undefined;
    if (Array.isArray(ancora)) {
      if (ancora.length === 0) return undefined;
      return ancora[Math.floor(Math.random() * ancora.length)];
    }
    return ancora;
  }

  // ── HELPER: gera pergunta para um slot ──────────────────────────────────────
  // ─── ALTERAÇÃO CIRÚRGICA NO LessonService ────────────────────────────────────
  //
  // Apenas a função _gerarPerguntaParaSlot() muda.
  // Tudo o resto do lesson.service.ts permanece IGUAL.
  //
  // ANTES:
  //   const pergunta = await this.cache.getQuestion({
  //     classe, disciplina, topicoId, dificuldade, historicoRecente
  //   });
  //
  // DEPOIS:
  //   const pergunta = await this.cache.getQuestion({
  //     classe, disciplina, topicoId, dificuldade, historicoRecente,
  //     structure: slot.structure   // 🆕 força a estrutura pedagógica do slot
  //   });
  // ─────────────────────────────────────────────────────────────────────────────

  private async _gerarPerguntaParaSlot(
    progressoId: number,
    sessaoId: number,
    estado: LicaoEstado,
    topico: any,
    slotIndex: number,
    tentativa: number = 1,
    melhorPontuacao: number | null = null,
  ): Promise<LicaoQuestionResponse> {
    const slot = estado.slots[slotIndex];

    // 🆕 Resolver ancora (string ou array → sempre string | undefined)
    const ancora = this._resolveSlotAncora((slot as any).ancora);

    const pergunta = await this.cache.getQuestion({
      classe: topico.nivelClasse,
      disciplina: topico.disciplina?.nome?.toLowerCase() || 'matematica',
      topicoId: topico.id,
      dificuldade: slot.difficulty,
      historicoRecente: estado.perguntasRespondidas,
      structure: slot.structure,
      ancora, // 🆕 sempre string | undefined — nunca array
    });

    estado.perguntasRespondidas.push(pergunta.question);
    await this.prisma.licaoProgresso.update({
      where: { id: progressoId },
      data: { estado: estado as any },
    });

    const questionType: QuestionType =
      (pergunta as any).type && (pergunta as any).type !== 'multiple_choice'
        ? ((pergunta as any).type as QuestionType)
        : this._resolveQuestionType(slot);

    let exercicioDb = await this.prisma.exercicio.findFirst({
      where: { topicoId: topico.id, pergunta: pergunta.question },
    });
    if (!exercicioDb) {
      exercicioDb = await this.prisma.exercicio.create({
        data: {
          topicoId: topico.id,
          tipo: questionType,
          pergunta: pergunta.question,
          opcoesJson: pergunta.options,
          resposta: pergunta.correct_answer,
          dificuldade: slot.difficulty,
        },
      });
    }

    if (!estado.slotExercicioMap) estado.slotExercicioMap = {};
    estado.slotExercicioMap[slotIndex] = exercicioDb.id;
    await this.prisma.licaoProgresso.update({
      where: { id: progressoId },
      data: { estado: estado as any },
    });

    const totalSlots =
      estado.fase === 'normal'
        ? estado.slots.length
        : estado.revisaoQueue.length;

    return {
      sessaoId,
      progressoId,
      slotIndex,
      totalSlots,
      fase: estado.fase,
      isLast:
        estado.fase === 'normal'
          ? estado.currentSlotIndex === estado.slots.length - 1
          : estado.revisaoQueue.length === 1,
      exercicioId: exercicioDb.id,
      question: pergunta.question,
      options: pergunta.options as string[],
      correct_answer: pergunta.correct_answer,
      explanation: pergunta.explanation || '',
      questionType,
      tentativa,
      melhorPontuacao,
      totalSlotsPlan: estado.slots.length,
      ancora: (pergunta as any).ancora ?? null,
    };
  }

  // ── 4. HISTÓRICO POR TÓPICO ──────────────────────────────────────────────
  async getHistorico(alunoId: number): Promise<
    Record<
      number,
      {
        tentativas: number;
        melhorPontuacao: number | null;
        totalSlots: number | null;
        temActiva: boolean;
      }
    >
  > {
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
        if (
          mapa[r.topicoId].melhorPontuacao === null ||
          mp > mapa[r.topicoId].melhorPontuacao
        ) {
          mapa[r.topicoId].melhorPontuacao = mp;
        }
      } else {
        mapa[r.topicoId].temActiva = true;
      }
    }
    return mapa;
  }
}
