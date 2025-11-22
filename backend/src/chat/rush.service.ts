import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RushService {
  private readonly logger = new Logger(RushService.name);
  private readonly aiUrl = process.env.IA_API_URL;
  private readonly httpTimeoutMs = 10000;

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService
  ) {}

  async getNextQuestion(alunoId: number, classe: number, disciplina: string, subtopico: string) {
    const subject = (disciplina || 'matematica').toLowerCase();
    const subtopic = subtopico || (subject === 'matematica' ? 'Aritmética' : 'Vocabulário');

    // 1. OBTER TÓPICO (método único!)
    const topicoId = await this.getOrCreateTopicoId(subject, subtopic, classe);

    // 2. VERIFICAR BLOQUEIO (apenas se temos alunoId válido)
    if (alunoId) {
      const proficiencia = await this.prisma.alunoProficienciaTopico.findUnique({
        where: { alunoId_topicoId: { alunoId, topicoId } }
      });

      if (proficiencia?.bloqueadoAte && new Date() < proficiencia.bloqueadoAte) {
        const minutos = Math.ceil((proficiencia.bloqueadoAte.getTime() - Date.now()) / 60000);
        throw new ForbiddenException({
          message: `Tópico bloqueado! Descansa a mente e volta em ${minutos} minutos.`,
          blockedUntil: proficiencia.bloqueadoAte,
          minutesRemaining: minutos
        });
      }
    }

    // 3. BUSCAR ÚLTIMAS 5 PERGUNTAS (ANTI-REPETIÇÃO)
    const perguntasParaIgnorar = alunoId 
      ? (await this.prisma.exercicioResultado.findMany({
          where: { alunoId, topicoId },
          orderBy: { timestamp: 'desc' },
          take: 5,
          include: { exercicio: true }
        })).map(r => r.exercicio?.pergunta).filter(Boolean) as string[]
      : [];

    // 4. CHAMAR IA
    const payload = {
      student_class: classe,
      subject,
      subtopic,
      recent_questions: perguntasParaIgnorar
    };

    try {
      const obs = this.http.post(`${this.aiUrl}/generate-rush-question`, payload);
      const res = await firstValueFrom(obs.pipe(timeout(this.httpTimeoutMs)));
      const data = res.data;

      // 5. GUARDAR EXERCÍCIO
      const created = await this.prisma.exercicio.create({
        data: {
          topicoId,
          tipo: 'multiple_choice',
          pergunta: data.question,
          opcoesJson: data.options,
          resposta: data.correct_answer,
          dificuldade: 5
        }
      });

      return {
        exercicioId: created.id,
        topicoId, // Devolver para o frontend usar
        question: data.question,
        options: data.options,
        correct_answer: data.correct_answer, // Necessário para validação
        explanation: data.explanation ?? '',
      };

    } catch (err) {
      this.logger.error(`Erro Rush AI: ${err.message}`);
      
      // Criar exercício fallback na BD também
      const fallback = await this.prisma.exercicio.create({
        data: {
          topicoId,
          tipo: 'multiple_choice',
          pergunta: 'Quanto é 3 × 3?',
          opcoesJson: ['6', '9', '12'],
          resposta: '9',
          dificuldade: 1
        }
      });

      return {
        exercicioId: fallback.id,
        topicoId,
        question: 'Quanto é 3 × 3?',
        options: ['6', '9', '12'],
        correct_answer: '9',
        explanation: 'Erro de conexão. Tabuada do 3.'
      };
    }
  }

  /**
   * MÉTODO ÚNICO para criar/obter tópicos
   * Formato: "Matemática: Frações" ou "Português: Verbos"
   */
  async getOrCreateTopicoId(disciplinaKey: string, subtopicoNome: string, classe: number): Promise<number> {
    const discNome = disciplinaKey === 'matematica' ? 'Matemática' : 'Português';
    const nomeTopicoBD = `${discNome}: ${subtopicoNome}`;

    let topico = await this.prisma.topico.findFirst({
      where: { nome: nomeTopicoBD, nivelClasse: classe }
    });

    if (!topico) {
      let disciplina = await this.prisma.disciplina.findUnique({
        where: { nome: discNome }
      });

      if (!disciplina) {
        disciplina = await this.prisma.disciplina.create({
          data: { nome: discNome }
        });
      }

      topico = await this.prisma.topico.create({
        data: { nome: nomeTopicoBD, nivelClasse: classe, disciplinaId: disciplina.id }
      });
    }

    return topico.id;
  }

  async saveExerciseResult(alunoId: number, exercicioId: number | null, respostaAluno: string, acertou: boolean, topicoId: number) {
    return await this.prisma.$transaction(async (tx) => {
      const resultado = await tx.exercicioResultado.create({
        data: {
          alunoId,
          topicoId,
          exercicioId: exercicioId ?? undefined,
          respostaAluno,
          acertou,
          detalhesJson: { note: 'gerado pelo rush service' }
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
        return { 
          ...resultado, 
          blocked: false, 
          livesRemaining: prof.vidasRestantes,
          blockedUntil: null as Date | null
        };
      } else {
        const novasVidas = Math.max(0, prof.vidasRestantes - 1);
        const blocked = novasVidas === 0;
        const bloqueadoAte: Date | null = blocked ? new Date(Date.now() + 5 * 60000) : null;

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
          livesRemaining: blocked ? 3 : novasVidas,
          blockedUntil: bloqueadoAte
        };
      }
    });
  }

  async findExercicio(exercicioId: number) {
    const exercicio = await this.prisma.exercicio.findUnique({
      where: { id: exercicioId }
    });
    if (!exercicio) throw new NotFoundException(`Exercício ${exercicioId} não encontrado`);
    return exercicio;
  }

  /**
   * Busca XP e estatísticas do aluno
   */
  async getStudentStats(alunoId: number) {
    const aluno = await this.prisma.aluno.findUnique({
      where: { id: alunoId },
      select: {
        id: true,
        nome: true,
        xp: true,
        classe: true,
        _count: {
          select: {
            exercicioResultados: true
          }
        }
      }
    });

    if (!aluno) {
      throw new NotFoundException(`Aluno ${alunoId} não encontrado`);
    }

    // Buscar estatísticas adicionais
    const resultados = await this.prisma.exercicioResultado.groupBy({
      by: ['acertou'],
      where: { alunoId },
      _count: true
    });

    const acertos = resultados.find(r => r.acertou)?._count ?? 0;
    const erros = resultados.find(r => !r.acertou)?._count ?? 0;
    const total = acertos + erros;

    return {
      id: aluno.id,
      nome: aluno.nome,
      classe: aluno.classe,
      xp: aluno.xp,
      totalExercicios: total,
      acertos,
      erros,
      taxaAcerto: total > 0 ? Math.round((acertos / total) * 100) : 0
    };
  }

  async generateRushFeedback(payload: { alunoId: number; student_class: number; user_query: string }) {
    try {
      const obs = this.http.post(`${this.aiUrl}/generate-chat-response`, {
        student_id: payload.alunoId,
        student_class: payload.student_class,
        user_query: payload.user_query,
        mode: 'rush_feedback',
        history: []
      });
      const res = await firstValueFrom(obs.pipe(timeout(this.httpTimeoutMs)));
      return res.data?.response_text || 'Feedback indisponível.';
    } catch (err) {
      this.logger.error(`Erro ao gerar feedback: ${err.message}`);
      return 'Ótimo trabalho! Continue praticando.';
    }
  }
}