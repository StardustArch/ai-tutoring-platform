import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionCacheService } from '../common/question-cache/question-cache.service';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class RushService {
  private readonly logger = new Logger(RushService.name);

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly cacheService: QuestionCacheService // ✅ Motor de Cache injetado
  ) { }

  // --- 1. LÓGICA DE DIFICULDADE DINÂMICA (MANTIDA) ---
  private async getDifficultyLevel(alunoId: number, topicoId: number, disciplina: string): Promise<number> {
    if (!alunoId) return 3;

    const proficiencia = await this.prisma.alunoProficienciaTopico.findUnique({
        where: { alunoId_topicoId: { alunoId, topicoId } }
    });

    if (proficiencia) {
        const mapProf: Record<string, number> = {
            'INICIANTE': 1,
            'ABAIXO_MEDIA': 2,
            'NA_MEDIA': 3,
            'AVANCADO': 4
        };
        if (proficiencia.nivel !== 'NAO_DIAGNOSTICADO') {
            return mapProf[proficiencia.nivel] || 3;
        }
    }

    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: { alunoId_disciplina: { alunoId, disciplina } }
    });

    if (diagnostic && new Date() < diagnostic.validoAte) {
        const mapDiag: Record<string, number> = {
            'MUITO_FACIL': 1, 'FACIL': 2, 'MEDIO': 3, 'DIFICIL': 4
        };
        return mapDiag[diagnostic.nivelDiagnosticado] || 3;
    }

    return 3;
  }

  // ── HELPER — adicionar no topo do ficheiro (ou no fim, antes do }) ────
 
/**
 * Escolhe uma âncora aleatória da lista de âncoras do tópico.
 * Devolve undefined se o tópico não tiver âncoras definidas.
 */
 _resolveAncoraAleatoria(ancoras: string[] | null | undefined): string | undefined {
  if (!ancoras || ancoras.length === 0) return undefined;
  return ancoras[Math.floor(Math.random() * ancoras.length)];
}

  // --- 2. GERAR PERGUNTA (REFATORADA COM CACHE) ---

    async getNextQuestion(alunoId: number, classe: number, disciplina: string, subtopico: string) {
    const subject = (disciplina || 'matematica').toLowerCase();
    const subtopicName = subtopico || 'Geral';
    const classeInt = Number(classe);
 
    // 🆕 incluir ancoras no findFirst
    let topicoDb = await this.prisma.topico.findFirst({
      where: { nome: subtopicName, nivelClasse: classeInt },
      select: {
        id: true,
        nome: true,
        nivelClasse: true,
        disciplinaId: true,
        metadata: true,
        ancoras: true,   // 🆕
      }
    });
 
    let topicoId: number;
    if (topicoDb) {
      topicoId = topicoDb.id;
    } else {
      topicoId = await this.getOrCreateTopicoId(subject, subtopicName, classeInt);
      // 🆕 rebuscar com ancoras após criar
      topicoDb = await this.prisma.topico.findUnique({
        where: { id: topicoId },
        select: {
          id: true,
          nome: true,
          nivelClasse: true,
          disciplinaId: true,
          metadata: true,
          ancoras: true,   // 🆕
        }
      });
    }
 

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

    const perguntasParaIgnorar = alunoId
      ? (await this.prisma.exercicioResultado.findMany({
        where: { alunoId, topicoId },
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: { exercicio: true }
      })).map(r => r.exercicio?.pergunta).filter(Boolean) as string[]
      : [];

    const dificuldade = await this.getDifficultyLevel(alunoId, topicoId, subject);
const ancoras = (topicoDb as any)?.ancoras ?? [];
const usarAncora = ancoras.length > 0 && Math.random() < 0.20;
const ancora = usarAncora ? this._resolveAncoraAleatoria(ancoras) : undefined;
this.logger.log(`🎲 [Rush âncora] ancoras=${ancoras.length} usarAncora=${usarAncora} ancora=${ancora ?? 'nenhuma'}`);
    try {
      const data = await this.cacheService.getQuestion({
        classe: classeInt,
        disciplina: subject,
        topicoId,
        dificuldade,
        historicoRecente: perguntasParaIgnorar,
        ancora
      });

      // 🔥 CORREÇÃO CRÍTICA: OTIMIZAÇÃO DA BD
      // Só cria o exercício se ele não existir. Caso contrário, reaproveita o ID.
      let exercicioDb = await this.prisma.exercicio.findFirst({
        where: { 
            topicoId: topicoId, 
            pergunta: data.question 
        }
      });

      if (!exercicioDb) {
        exercicioDb = await this.prisma.exercicio.create({
          data: {
            topicoId,
            tipo: 'multiple_choice',
            pergunta: data.question,
            opcoesJson: data.options,
            resposta: data.correct_answer,
            dificuldade: dificuldade
          }
        });
      }

      return {
        exercicioId: exercicioDb.id, // ID reaproveitado ou novo
        topicoId,
        question: data.question,
        options: data.options,
        correct_answer: data.correct_answer,
        explanation: data.explanation || '',
        cached: data.cached,
        ancora: data.ancora ?? null,  // 🆕
      };

    } catch (err) {
      this.logger.error(`Erro no motor de questões: ${err.message}`);
      
      // 🔥 Fallback de emergência: Tenta buscar qualquer exercício deste tópico na BD
      const fallbackExercicio = await this.prisma.exercicio.findFirst({
         where: { topicoId, dificuldade }
      });

      if (fallbackExercicio) {
          return {
              exercicioId: fallbackExercicio.id,
              topicoId,
              question: fallbackExercicio.pergunta,
              options: fallbackExercicio.opcoesJson,
              correct_answer: fallbackExercicio.resposta,
              explanation: "Recuperado da memória de emergência.",
              cached: true
          };
      }
      // Se tudo falhar, manda o erro e encerra
      throw new Error("Não foi possível gerar mais questões no momento.");
    }
  }

  // --- 3. SALVAR RESPOSTA (TRANSACTIONAL - MANTIDO) ---
// --- 3. SALVAR RESPOSTA (TRANSACTIONAL - MANTIDO E CORRIGIDO) ---
  async saveExerciseResult(alunoId: number, exercicioId: number | null, respostaAluno: string, acertou: boolean, topicoId: number, turmaId?: number, sessaoId?: number) {
    return await this.prisma.$transaction(async (tx) => {
      
      // 🔥 VALIDAÇÃO DE SEGURANÇA: Prevenir erros de Foreign Key fantasma
      let validSessaoId = sessaoId || null;
      if (validSessaoId) {
          // Verifica se a sessão realmente existe na BD
          const sessaoExiste = await tx.sessaoEstudo.findUnique({ 
              where: { id: validSessaoId } 
          });
          if (!sessaoExiste) {
              this.logger.warn(`Sessão fantasma detectada: ${validSessaoId} não existe. A gravar sem sessaoId.`);
              validSessaoId = null; // Ignora o ID para não quebrar a inserção
          }
      }

      // Validação semelhante para turmaId (opcional, mas boa prática)
      let validTurmaId = turmaId || null;
      if (validTurmaId) {
          const turmaExiste = await tx.turma.findUnique({
              where: { id: validTurmaId }
          });
          if (!turmaExiste) validTurmaId = null;
      }

      const resultado = await tx.exercicioResultado.create({
        data: {
          alunoId,
          topicoId,
          exercicioId: exercicioId ?? undefined,
          respostaAluno,
          acertou,
          detalhesJson: { note: 'rush' },
          turmaId: validTurmaId,   // ⬅️ USA A VARIÁVEL VALIDADA
          sessaoId: validSessaoId  // ⬅️ USA A VARIÁVEL VALIDADA
        }
      });
      
      await this.updateProficiencyLevel(alunoId, topicoId, acertou, tx);

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
          blockedUntil: null
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

  // --- 4. ESTATÍSTICAS E FEEDBACK (MANTIDO) ---
  async getStudentStats(alunoId: number, turmaId: number | null) {
    const filtroTurma = turmaId ? { turmaId: turmaId } : { turmaId: null };
    const resultados = await this.prisma.exercicioResultado.groupBy({
      by: ['acertou'],
      where: { alunoId, ...filtroTurma },
      _count: true
    });

    const acertos = resultados.find(r => r.acertou)?._count ?? 0;
    const erros = resultados.find(r => !r.acertou)?._count ?? 0;
    const total = acertos + erros;

    return {
      xp: acertos * 10, 
      totalExercicios: total,
      acertos,
      erros,
      taxaAcerto: total > 0 ? Math.round((acertos / total) * 100) : 0
    };
  }

  async generateRushFeedback(payload: any) {
    try {
      const obs = this.http.post(`${process.env.IA_API_URL}/generate-chat-response`, {
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

  // --- 5. HELPERS E ADAPTAÇÃO (MANTIDO) ---
  async findExercicio(exercicioId: number) {
    const exercicio = await this.prisma.exercicio.findUnique({ where: { id: exercicioId } });
    if (!exercicio) throw new NotFoundException(`Exercício ${exercicioId} não encontrado`);
    return exercicio;
  }

  async getCurrentLives(alunoId: number, disciplina: string, subtopico: string, classe: number) {
    const topicoId = await this.getOrCreateTopicoId(disciplina, subtopico, Number(classe));
    const prof = await this.prisma.alunoProficienciaTopico.findUnique({
      where: { alunoId_topicoId: { alunoId, topicoId } }
    });
    return { lives: prof?.vidasRestantes ?? 3, topicoId };
  }

  async getOrCreateTopicoId(disciplinaKey: string, subtopicoNome: string, classe: number): Promise<number> {
    const discNome = disciplinaKey === 'matematica' ? 'Matemática' : 'Português';
    let topico = await this.prisma.topico.findFirst({
      where: { nome: subtopicoNome, nivelClasse: Number(classe) }
    });

    if (!topico) {
      let disciplina = await this.prisma.disciplina.findUnique({ where: { nome: discNome } });
      if (!disciplina) disciplina = await this.prisma.disciplina.create({ data: { nome: discNome } });
      topico = await this.prisma.topico.create({
        data: { nome: subtopicoNome, nivelClasse: Number(classe), disciplinaId: disciplina.id }
      });
    }
    return topico.id;
  }

private async updateProficiencyLevel(alunoId: number, topicoId: number, acertou: boolean, tx: any) {
    const ultimos = await tx.exercicioResultado.findMany({
        where: { alunoId, topicoId },
        orderBy: { timestamp: 'desc' },
        take: 12, 
        select: { acertou: true }
    });

    if (ultimos.length < 10) return;

    const acertos = ultimos.filter(r => r.acertou).length;
    const taxa = acertos / ultimos.length;

    const atual = await tx.alunoProficienciaTopico.findUnique({
        where: { alunoId_topicoId: { alunoId, topicoId } }
    });
    
    if (!atual) return;

    // 🔥 1. ADICIONADO 'EXPERT' E 'NAO_DIAGNOSTICADO' PARA EVITAR ERROS
    const niveis = ['INICIANTE', 'ABAIXO_MEDIA', 'NA_MEDIA', 'AVANCADO'];
    let index = niveis.indexOf(atual.nivel);

    // Se for um nível estranho ou não diagnosticado, assumimos a média para poder subir/descer
    if (index === -1) index = 2; 

    let novoIndex = index;

    // 🔥 2. Lógica de Subida (80% de acerto)
    if (taxa >= 0.8 && index < (niveis.length - 1)) {
        novoIndex++;
    } 
    // 🔥 3. Lógica de Descida (30% de acerto)
    else if (taxa <= 0.3 && index > 0) {
        novoIndex--;
    }

    if (novoIndex !== index) {
        this.logger.log(`📈 MUDANÇA DE NÍVEL: Aluno ${alunoId} foi de ${niveis[index]} para ${niveis[novoIndex]}`);
        await tx.alunoProficienciaTopico.update({
            where: { id: atual.id },
            data: { nivel: niveis[novoIndex] as any }
        });
    }
}
}