import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NivelDificuldade } from '@prisma/client';

@Injectable()
export class DiagnosticService {
  private readonly logger = new Logger(DiagnosticService.name);
  private readonly aiUrl = process.env.IA_API_URL;
  private readonly httpTimeoutMs = 15000;

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verifica se o aluno precisa fazer diagnóstico (Avalia Tópico a Tópico)
   */
  async needsDiagnostic(alunoId: number, disciplina: string): Promise<boolean> {
    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: {
        alunoId_disciplina: { alunoId, disciplina },
      },
    });

    // Se não tem nada, claro que precisa!
    if (!diagnostic) return true;

    // 1. Buscar a classe do aluno
    const aluno = await this.prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) return true;

    const nomeDisciplinaBd = disciplina.toLowerCase() === 'matematica' ? 'Matemática' : 'Português';
    
    // 2. Quantos tópicos existem no currículo desta classe?
    const totalTopicos = await this.prisma.topico.count({
      where: { nivelClasse: aluno.classe, disciplina: { nome: nomeDisciplinaBd } }
    });

    // 3. Quantos tópicos o aluno já testou?
    const detalhes = diagnostic.detalhesTopicos as Record<string, any>;
    const topicosTestados = detalhes ? Object.keys(detalhes).length : 0;

    // 🔥 Se ainda faltam tópicos para testar, precisa de diagnóstico!
    if (topicosTestados < totalTopicos) {
        return true;
    }

    // Só verifica a validade (os 3 meses) se já tiver concluído TODOS os tópicos
    const now = new Date();
    return now > diagnostic.validoAte;
  }

  async generateDiagnosticQuestions(
    alunoId: number,
    disciplina: string, 
    classe: number,
    topicoAlvo?: string
  ) {
    const aluno = await this.prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    const nomeDisciplinaBd = disciplina.toLowerCase() === 'matematica' ? 'Matemática' : 'Português';
    
    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: { alunoId_disciplina: { alunoId, disciplina } }
    });
    const detalhesTesteAnterior = (diagnostic?.detalhesTopicos as Record<string, any>) || {};

    let topicosParaGerar: string[] = [];
    let perguntasPorTopico = 2;

    if (topicoAlvo) {
        topicosParaGerar = [topicoAlvo];
        perguntasPorTopico = 5; 
    } else {
        // 🔥 MAGIA: Se não há tópico alvo, pega só nos tópicos que AINDA NÃO FORAM FEITOS
        const topicosDb = await this.prisma.topico.findMany({
            where: {
              nivelClasse: classe,
              disciplina: { nome: nomeDisciplinaBd }
            },
            orderBy: { ordem: 'asc' }
        });
        
        topicosParaGerar = topicosDb
            .filter(t => !detalhesTesteAnterior[t.nome])
            .map(t => t.nome);
            
        perguntasPorTopico = 2; // Faz um mix de 2 perguntas para cada tópico em falta
    }

    if (topicosParaGerar.length === 0) {
        return {
            alunoId, disciplina, classe,
            foco: 'Completo', totalPerguntas: 0, perguntas: []
        };
    }

    const perguntas: any[] = [];

    // Loop pelos Tópicos
    for (const nomeTopico of topicosParaGerar) {
      
      const topicoDb = await this.prisma.topico.findFirst({
        where: {
          nome: nomeTopico,
          nivelClasse: classe,
          disciplina: { nome: nomeDisciplinaBd }
        }
      });

      let regrasContexto = "Gere uma pergunta apropriada para a classe.";
      if (topicoDb?.metadata && typeof topicoDb.metadata === 'object') {
          const meta = topicoDb.metadata as any;
          if (meta.ai_rules) regrasContexto = meta.ai_rules;
      }

      const historicoPerguntas: string[] = [];

      for (let i = 0; i < perguntasPorTopico; i++) {
        
        let tentativas = 0;
        let perguntaAceite = false;

        while (!perguntaAceite && tentativas < 3) {
            try {
              const payload = {
                student_class: classe,
                subject: nomeDisciplinaBd,
                subtopic: nomeTopico,
                difficulty_level: 3, 
                context_rules: regrasContexto,
                recent_questions: historicoPerguntas 
              };

              const obs = this.http.post(`${this.aiUrl}/generate-rush-question`, payload);
              const res = await firstValueFrom(obs.pipe(timeout(this.httpTimeoutMs || 10000)));
              
              if (res.data && res.data.question) {
                const novaPerguntaTexto = res.data.question.trim().toLowerCase();
                const ehDuplicada = historicoPerguntas.some(p => p.trim().toLowerCase() === novaPerguntaTexto);
                const ehFallbackDaApi = novaPerguntaTexto.includes('falha técnica');

                if (!ehDuplicada || ehFallbackDaApi) {
                    perguntas.push({
                      topico: nomeTopico, 
                      ...res.data
                    });

                    historicoPerguntas.push(res.data.question);
                    perguntaAceite = true; 
                } else {
                    this.logger.warn(`♻️ A IA tentou repetir: "${res.data.question}". A pedir outra vez...`);
                    tentativas++;
                }
              } else {
                  tentativas++; 
              }

            } catch (err) {
              this.logger.error(`Erro na tentativa ${tentativas + 1} (${nomeTopico}): ${err.message}`);
              tentativas++;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!perguntaAceite) {
            this.logger.error(`🚨 Falha total ao gerar a pergunta ${i+1} do tópico ${nomeTopico}. A usar emergência local.`);
            
            const fallbackMatematica = {
                question: `Pausa técnica! Quanto é 2 + 2? (Tópico: ${nomeTopico})`,
                options: ["2", "3", "4", "5"],
                correct_answer: "4",
                explanation: "O servidor precisou de respirar! 2 + 2 = 4."
            };

            const fallbackPortugues = {
                question: `Pausa técnica! Qual é a primeira vogal do alfabeto? (Tópico: ${nomeTopico})`,
                options: ["A", "E", "I", "O"],
                correct_answer: "A",
                explanation: "O servidor precisou de respirar! 'A' é a primeira vogal."
            };

            const perguntaLocal = nomeDisciplinaBd === 'Matemática' ? fallbackMatematica : fallbackPortugues;

            perguntas.push({ topico: nomeTopico, ...perguntaLocal });
            historicoPerguntas.push(perguntaLocal.question);
        }
      }
    }

    return {
      alunoId,
      disciplina,
      classe,
      foco: topicoAlvo || 'Automático',
      totalPerguntas: perguntas.length,
      perguntas
    };
  }

  /**
   * Processa respostas do diagnóstico e calcula o nível (MÉTODO INCREMENTAL)
   */
  async processDiagnosticResults(
    alunoId: number,
    disciplina: string,
    respostas: Array<{ topico: string; acertou: boolean }>,
  ) {
    const aluno = await this.prisma.aluno.findUnique({
      where: { id: alunoId },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    // 🔥 FUNDAMENTAL: Recupera o histórico antigo para NÃO o apagar!
    const diagnosticoExistente = await this.prisma.diagnosticoInicial.findUnique({
        where: { alunoId_disciplina: { alunoId, disciplina } },
    });

    const detalhesTopicos = diagnosticoExistente?.detalhesTopicos 
      ? JSON.parse(JSON.stringify(diagnosticoExistente.detalhesTopicos)) 
      : {};

    // Adiciona as novas respostas ao histórico mantendo as antigas
    respostas.forEach((r) => {
      if (!detalhesTopicos[r.topico]) {
        detalhesTopicos[r.topico] = { acertos: 0, total: 0 };
      }
      detalhesTopicos[r.topico].total++;
      if (r.acertou) detalhesTopicos[r.topico].acertos++;
    });

    // Recalcula os totais GLOBAIS (Antigos + Novos)
    let acertosGlobais = 0;
    let totalPerguntasGlobal = 0;
    
    Object.values(detalhesTopicos).forEach((dados: any) => {
        acertosGlobais += dados.acertos;
        totalPerguntasGlobal += dados.total;
    });

    const percentualAcerto = totalPerguntasGlobal > 0 ? (acertosGlobais / totalPerguntasGlobal) * 100 : 0;

    // Define o nível baseado no percentual global
    let nivelDiagnosticado: NivelDificuldade;
    if (percentualAcerto < 40) nivelDiagnosticado = NivelDificuldade.MUITO_FACIL;
    else if (percentualAcerto < 60) nivelDiagnosticado = NivelDificuldade.FACIL;
    else if (percentualAcerto < 75) nivelDiagnosticado = NivelDificuldade.MEDIO;
    else if (percentualAcerto < 90) nivelDiagnosticado = NivelDificuldade.DIFICIL;
    else nivelDiagnosticado = NivelDificuldade.MUITO_DIFICIL;

    // Gera recomendações usando IA
    const recomendacoes = await this.generateRecommendations(
      aluno.classe,
      disciplina,
      percentualAcerto,
      detalhesTopicos,
    );

    // Data de validade (3 meses)
    const validoAte = new Date();
    validoAte.setMonth(validoAte.getMonth() + 3);

    // Salva diagnóstico
    const diagnostic = await this.prisma.diagnosticoInicial.upsert({
      where: {
        alunoId_disciplina: { alunoId, disciplina },
      },
      create: {
        alunoId,
        disciplina,
        acertos: acertosGlobais,
        totalPerguntas: totalPerguntasGlobal,
        percentualAcerto,
        nivelDiagnosticado,
        detalhesTopicos,
        recomendacoes,
        validoAte,
      },
      update: {
        acertos: acertosGlobais,
        totalPerguntas: totalPerguntasGlobal,
        percentualAcerto,
        nivelDiagnosticado,
        detalhesTopicos,
        recomendacoes,
        realizadoEm: new Date(),
        validoAte,
      },
    });

    return {
      diagnostic,
      analise: {
        nivel: nivelDiagnosticado,
        percentual: percentualAcerto,
        pontosFortes: this.identifyStrongPoints(detalhesTopicos),
        pontosFrageis: this.identifyWeakPoints(detalhesTopicos),
        recomendacoes,
      },
    };
  }

  private async generateRecommendations(
    classe: number,
    disciplina: string,
    percentualAcerto: number,
    detalhesTopicos: any,
  ): Promise<string> {
    try {
      const payload = {
        student_id: 0,
        student_class: classe,
        user_query: `Analise os resultados deste teste diagnóstico de ${disciplina}:
        - Taxa de acerto geral: ${percentualAcerto.toFixed(1)}%
        - Detalhes por tópico: ${JSON.stringify(detalhesTopicos)}
        
        Forneça recomendações curtas e encorajadoras (máx 3 frases) indicando em que tópicos focar os estudos.`,
        mode: 'tutor',
        history: [],
      };

      const obs = this.http.post(
        `${this.aiUrl}/generate-chat-response`,
        payload,
      );
      const res = await firstValueFrom(obs.pipe(timeout(this.httpTimeoutMs)));

      return res.data?.response_text || 'Continue a praticar regularmente!';
    } catch (err) {
      this.logger.error(`Erro ao gerar recomendações: ${err.message}`);
      return 'Continue a estudar e a praticar. Foque-se nos tópicos em que teve mais dificuldade.';
    }
  }

  private identifyStrongPoints(detalhesTopicos: any): string[] {
    return Object.entries(detalhesTopicos)
      .filter(([_, dados]: any) => dados.acertos / dados.total > 0.7)
      .map(([topico]) => topico);
  }

  private identifyWeakPoints(detalhesTopicos: any): string[] {
    return Object.entries(detalhesTopicos)
      .filter(([_, dados]: any) => dados.acertos / dados.total < 0.5)
      .map(([topico]) => topico);
  }

  async getDiagnostic(alunoId: number, disciplina: string) {
    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: {
        alunoId_disciplina: { alunoId, disciplina },
      },
    });

    if (!diagnostic) {
      return null;
    }

    if (new Date() > diagnostic.validoAte) {
      return { ...diagnostic, expirado: true };
    }

    return { ...diagnostic, expirado: false };
  }

  mapLevelToDifficulty(nivel: NivelDificuldade): number {
    const map: Record<NivelDificuldade, number> = {
      [NivelDificuldade.MUITO_FACIL]: 1,
      [NivelDificuldade.FACIL]: 2,
      [NivelDificuldade.MEDIO]: 3,
      [NivelDificuldade.DIFICIL]: 4,
      [NivelDificuldade.MUITO_DIFICIL]: 5,
    };
    return map[nivel] || 3;
  }
}