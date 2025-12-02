import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NivelDificuldade } from '@prisma/client';

@Injectable()
export class RushService {
  private readonly logger = new Logger(RushService.name);
  private readonly aiUrl = process.env.IA_API_URL;
  private readonly httpTimeoutMs = 20000;

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService
  ) { }

  // --- 1. LÓGICA DE DIFICULDADE ---
  private async getDifficultyLevel(alunoId: number, disciplina: string): Promise<number> {
    if (!alunoId) return 3;

    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: {
        alunoId_disciplina: { alunoId, disciplina }
      }
    });

    if (!diagnostic || new Date() > diagnostic.validoAte) {
      return 3;
    }

    const map: Record<NivelDificuldade, number> = {
      [NivelDificuldade.MUITO_FACIL]: 1,
      [NivelDificuldade.FACIL]: 2,
      [NivelDificuldade.MEDIO]: 3,
      [NivelDificuldade.DIFICIL]: 4,
      [NivelDificuldade.MUITO_DIFICIL]: 5
    };

    return map[diagnostic.nivelDiagnosticado] || 3;
  }

  // --- 2. GERAR PERGUNTA ---
  async getNextQuestion(alunoId: number, classe: number, disciplina: string, subtopico: string) {
    const subject = (disciplina || 'matematica').toLowerCase();
    const subtopicName = subtopico || 'Geral';
    const classeInt = Number(classe);
    // A. Tenta encontrar o tópico
    let topicoDb = await this.prisma.topico.findFirst({
      where: {
        nome: subtopicName,
        nivelClasse: classeInt
      }
    });

    let topicoId: number;

    // B. Fallback seguro: Se não existir, cria ou busca genérico
    if (topicoDb) {
      topicoId = topicoDb.id;
    } else {
      topicoId = await this.getOrCreateTopicoId(subject, subtopicName, classeInt);
      // Recarrega o objeto topicoDb para ter acesso ao metadata
      topicoDb = await this.prisma.topico.findUnique({ where: { id: topicoId } });
    }

    // C. Extrair regras (com verificação de null)
    let contextRules = "";
    if (topicoDb && topicoDb.metadata) {
      const meta = topicoDb.metadata as any;
      if (meta.ai_rules) contextRules = meta.ai_rules;
    }

    // D. Verificar Bloqueio
    if (alunoId) {
      const proficiencia = await this.prisma.alunoProficienciaTopico.findUnique({
        where: { alunoId_topicoId: { alunoId, topicoId } }
      });

      if (proficiencia?.bloqueadoAte && new Date() < proficiencia.bloqueadoAte) {
        const minutos = Math.ceil((proficiencia.bloqueadoAte.getTime() - Date.now()) / 60000);
        throw new ForbiddenException({
          message: `Tópico bloqueado! Volta em ${minutos} minutos.`,
          blockedUntil: proficiencia.bloqueadoAte,
          minutesRemaining: minutos
        });
      }
    }

    // E. Histórico
    const perguntasParaIgnorar = alunoId
      ? (await this.prisma.exercicioResultado.findMany({
        where: { alunoId, topicoId },
        orderBy: { timestamp: 'desc' },
        take: 5,
        include: { exercicio: true }
      })).map(r => r.exercicio?.pergunta).filter(Boolean) as string[]
      : [];

    // F. Chamada IA
    const dificuldade = await this.getDifficultyLevel(alunoId, subject);

    const payload = {
      student_class: classeInt,
      subject,
      subtopic: subtopicName,
      difficulty_level: dificuldade,
      recent_questions: perguntasParaIgnorar,
      context_rules: contextRules
    };

    try {
      const obs = this.http.post(`${this.aiUrl}/generate-rush-question`, payload);
      const res = await firstValueFrom(obs.pipe(timeout(this.httpTimeoutMs)));
      console.log('🚩 [DEBUG] Python respondeu com sucesso!', res);
      const data = res.data;

      console.log('🚩 [DEBUG] A salvar exercício na BD...');
      const created = await this.prisma.exercicio.create({
        data: {
          topicoId,
          tipo: 'multiple_choice',
          pergunta: data.question,
          opcoesJson: data.options,
          resposta: data.correct_answer,
          dificuldade: dificuldade
        }
      });

      console.log(`🚩 [DEBUG] Exercício salvo com ID: ${created.id}`);
      return {
        exercicioId: created.id,
        topicoId,
        question: data.question,
        options: data.options,
        correct_answer: data.correct_answer,
        explanation: data.explanation ?? '',
      };

    } catch (err) {
      this.logger.error(`Erro Rush AI: ${err.message}`);
      return {
        exercicioId: null,
        topicoId,
        question: 'Quanto é 2 + 2?',
        options: ['3', '4', '5'],
        correct_answer: '4',
        explanation: 'Erro de conexão.'
      };
    }
  }

  // --- 3. SALVAR RESPOSTA ---
  async saveExerciseResult(alunoId: number, exercicioId: number | null, respostaAluno: string, acertou: boolean, topicoId: number, turmaId: number | null) {
    return await this.prisma.$transaction(async (tx) => {
      const resultado = await tx.exercicioResultado.create({
        data: {
          alunoId,
          topicoId,
          exercicioId: exercicioId ?? undefined,
          respostaAluno,
          acertou,
          detalhesJson: { note: 'rush' },
          turmaId: turmaId || null // <--- GRAVAR O CONTEXTO        
          }
      });

      let prof = await tx.alunoProficienciaTopico.findUnique({
        where: { alunoId_topicoId: { alunoId, topicoId } }
      });

      if (!prof) {
        prof = await tx.alunoProficienciaTopico.create({
          data: { alunoId, topicoId, nivel: 'INICIANTE', vidasRestantes: 3 }
        });
      }

      if (acertou) {
        await tx.aluno.update({
          where: { id: alunoId },
          data: { xp: { increment: 10 } }
        });

        // ✅ CORREÇÃO 1: Retornar objeto consistente
        return {
          ...resultado,
          blocked: false,
          livesRemaining: prof.vidasRestantes,
          blockedUntil: null // Obrigatório definir explicitamente
        };
      } else {
        const novasVidas = Math.max(0, prof.vidasRestantes - 1);
        const blocked = novasVidas === 0;
        const bloqueadoAte = blocked ? new Date(Date.now() + 5 * 60000) : null;

        await tx.alunoProficienciaTopico.update({
          where: { id: prof.id },
          data: {
            vidasRestantes: blocked ? 3 : novasVidas,
            bloqueadoAte
          }
        });

        return {
          ...resultado,
          blocked,
          livesRemaining: blocked ? 0 : novasVidas,
          blockedUntil: bloqueadoAte
        };
      }
    });
  }

  // --- HELPERS ---

  async findExercicio(exercicioId: number) {
    const exercicio = await this.prisma.exercicio.findUnique({ where: { id: exercicioId } });
    if (!exercicio) throw new NotFoundException(`Exercício ${exercicioId} não encontrado`);
    return exercicio;
  }
// --- LER ESTATÍSTICAS ---
  async getStudentStats(alunoId: number, turmaId: number | null) {
    
    // A Lógica de Isolamento:
    // Se turmaId vem preenchido -> Filtra por essa turma.
    // Se turmaId é null (vem do controller) -> Filtra onde turmaId é NULL (Standalone).
    const filtroTurma = turmaId ? { turmaId: turmaId } : { turmaId: null };

    // Buscar dados agregados
    const resultados = await this.prisma.exercicioResultado.groupBy({
      by: ['acertou'],
      where: { 
          alunoId,
          ...filtroTurma // <--- Aplica o filtro aqui
      },
      _count: true
    });

    const acertos = resultados.find(r => r.acertou)?._count ?? 0;
    const erros = resultados.find(r => !r.acertou)?._count ?? 0;
    const total = acertos + erros;

    // Calcular XP (apenas deste contexto)
    // Nota: O XP global do aluno (na tabela Aluno) continua a somar tudo.
    // Mas aqui calculamos o "XP da Sessão/Contexto" visualmente.
    const xpContexto = acertos * 10; 

    return {
      xp: xpContexto, 
      totalExercicios: total,
      acertos,
      erros,
      taxaAcerto: total > 0 ? Math.round((acertos / total) * 100) : 0
    };
  }

  async generateRushFeedback(payload: any) {
    try {
      const obs = this.http.post(`${this.aiUrl}/generate-chat-response`, {
        student_id: payload.alunoId,
        student_class: payload.student_class,
        user_query: payload.user_query,
        mode: 'rush_feedback',
        history: []
      });
      const res = await firstValueFrom(obs.pipe(timeout(5000)));
      return res.data?.response_text || 'Muito bem!';
    } catch (err) {
      return 'Continua assim!';
    }
  }

  async getCurrentLives(alunoId: number, disciplina: string, subtopico: string, classe: number) {
    const classeInt = Number(classe);
    
    // ✅ CORREÇÃO 2: Lógica segura para encontrar o ID
    let topico = await this.prisma.topico.findFirst({
      where: { nome: subtopico, nivelClasse: classeInt }
    });

    let topicoId: number;

    if (topico) {
        topicoId = topico.id;
    } else {
        topicoId = await this.getOrCreateTopicoId(disciplina, subtopico, classeInt);
    }

    const prof = await this.prisma.alunoProficienciaTopico.findUnique({
      where: { alunoId_topicoId: { alunoId, topicoId } }
    });

    return { lives: prof?.vidasRestantes ?? 3, topicoId };
  }

  async getOrCreateTopicoId(disciplinaKey: string, subtopicoNome: string, classe: number): Promise<number> {
    const discNome = disciplinaKey === 'matematica' ? 'Matemática' : 'Português';
    const nomeTopicoBD = subtopicoNome; 

    let topico = await this.prisma.topico.findFirst({
      where: { nome: nomeTopicoBD, nivelClasse: Number(classe) }
    });

    if (!topico) {
      let disciplina = await this.prisma.disciplina.findUnique({ where: { nome: discNome } });
      if (!disciplina) {
        disciplina = await this.prisma.disciplina.create({ data: { nome: discNome } });
      }
      topico = await this.prisma.topico.create({
        data: { 
            nome: nomeTopicoBD, 
            nivelClasse: Number(classe), 
            disciplinaId: disciplina.id,
            metadata: { desc: "Gerado auto" }
        }
      });
    }
    return topico.id;
  }

}