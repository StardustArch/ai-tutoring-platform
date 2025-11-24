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
    private readonly prisma: PrismaService
  ) {}

  /**
   * Verifica se o aluno precisa fazer diagnóstico
   */
  async needsDiagnostic(alunoId: number, disciplina: string): Promise<boolean> {
    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: {
        alunoId_disciplina: { alunoId, disciplina }
      }
    });

    if (!diagnostic) return true;

    // Verifica se o diagnóstico expirou (3 meses)
    const now = new Date();
    return now > diagnostic.validoAte;
  }

  /**
   * Gera perguntas de diagnóstico adaptadas à classe do aluno
   */
  async generateDiagnosticQuestions(
    alunoId: number,
    disciplina: string,
    classe: number
  ) {
    const aluno = await this.prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    // Define tópicos por disciplina
    const topicos = disciplina === 'matematica'
      ? ['Adição e Subtração', 'Multiplicação', 'Divisão', 'Frações', 'Geometria']
      : ['Vocabulário', 'Verbos', 'Ortografia', 'Interpretação', 'Gramática'];

    const perguntas: any[] = []; // ✅ Tipo explícito

    // Gera 2 perguntas por tópico (10 perguntas no total)
    for (const topico of topicos) {
      for (let i = 0; i < 2; i++) {
        try {
          const payload = {
            student_class: classe,
            subject: disciplina,
            subtopic: topico,
            difficulty_level: 3, // Nível médio para diagnóstico
            recent_questions: []
          };

          const obs = this.http.post(`${this.aiUrl}/generate-rush-question`, payload);
          const res = await firstValueFrom(obs.pipe(timeout(this.httpTimeoutMs)));
          
          perguntas.push({
            topico,
            ...res.data
          });
        } catch (err) {
          this.logger.error(`Erro ao gerar pergunta diagnóstica: ${err.message}`);
        }
      }
    }

    return {
      alunoId,
      disciplina,
      classe,
      totalPerguntas: perguntas.length,
      perguntas
    };
  }

  /**
   * Processa respostas do diagnóstico e calcula o nível
   */
  async processDiagnosticResults(
    alunoId: number,
    disciplina: string,
    respostas: Array<{ topico: string; acertou: boolean }>
  ) {
    const aluno = await this.prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    // Calcula acertos totais
    const acertos = respostas.filter(r => r.acertou).length;
    const totalPerguntas = respostas.length;
    const percentualAcerto = (acertos / totalPerguntas) * 100;

    // Calcula acertos por tópico
    const detalhesTopicos = {};
    respostas.forEach(r => {
      if (!detalhesTopicos[r.topico]) {
        detalhesTopicos[r.topico] = { acertos: 0, total: 0 };
      }
      detalhesTopicos[r.topico].total++;
      if (r.acertou) detalhesTopicos[r.topico].acertos++;
    });

    // Define o nível baseado no percentual
    let nivelDiagnosticado: NivelDificuldade; // ✅ Tipo correto do Prisma
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
      detalhesTopicos
    );

    // Data de validade (3 meses)
    const validoAte = new Date();
    validoAte.setMonth(validoAte.getMonth() + 3);

    // Salva diagnóstico
    const diagnostic = await this.prisma.diagnosticoInicial.upsert({
      where: {
        alunoId_disciplina: { alunoId, disciplina }
      },
      create: {
        alunoId,
        disciplina,
        acertos,
        totalPerguntas,
        percentualAcerto,
        nivelDiagnosticado,
        detalhesTopicos,
        recomendacoes,
        validoAte
      },
      update: {
        acertos,
        totalPerguntas,
        percentualAcerto,
        nivelDiagnosticado,
        detalhesTopicos,
        recomendacoes,
        realizadoEm: new Date(),
        validoAte
      }
    });

    return {
      diagnostic,
      analise: {
        nivel: nivelDiagnosticado,
        percentual: percentualAcerto,
        pontosFortes: this.identifyStrongPoints(detalhesTopicos),
        pontosFrageis: this.identifyWeakPoints(detalhesTopicos),
        recomendacoes
      }
    };
  }

  /**
   * Gera recomendações personalizadas usando IA
   */
  private async generateRecommendations(
    classe: number,
    disciplina: string,
    percentualAcerto: number,
    detalhesTopicos: any
  ): Promise<string> {
    try {
      const payload = {
        student_id: 0,
        student_class: classe,
        user_query: `Analise os resultados deste teste diagnóstico de ${disciplina}:
        - Taxa de acerto: ${percentualAcerto.toFixed(1)}%
        - Detalhes por tópico: ${JSON.stringify(detalhesTopicos)}
        
        Forneça recomendações curtas e práticas (máx 3 frases) sobre em que focar nos estudos.`,
        mode: 'tutor',
        history: []
      };

      const obs = this.http.post(`${this.aiUrl}/generate-chat-response`, payload);
      const res = await firstValueFrom(obs.pipe(timeout(this.httpTimeoutMs)));
      
      return res.data?.response_text || 'Continue praticando regularmente!';
    } catch (err) {
      this.logger.error(`Erro ao gerar recomendações: ${err.message}`);
      return 'Continue estudando e praticando. Foque nos tópicos com mais dificuldade.';
    }
  }

  /**
   * Identifica pontos fortes (tópicos com >70% acerto)
   */
  private identifyStrongPoints(detalhesTopicos: any): string[] {
    return Object.entries(detalhesTopicos)
      .filter(([_, dados]: any) => (dados.acertos / dados.total) > 0.7)
      .map(([topico]) => topico);
  }

  /**
   * Identifica pontos frágeis (tópicos com <50% acerto)
   */
  private identifyWeakPoints(detalhesTopicos: any): string[] {
    return Object.entries(detalhesTopicos)
      .filter(([_, dados]: any) => (dados.acertos / dados.total) < 0.5)
      .map(([topico]) => topico);
  }

  /**
   * Busca o diagnóstico mais recente do aluno
   */
  async getDiagnostic(alunoId: number, disciplina: string) {
    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: {
        alunoId_disciplina: { alunoId, disciplina }
      }
    });

    if (!diagnostic) {
      return null;
    }

    // Verifica se expirou
    if (new Date() > diagnostic.validoAte) {
      return { ...diagnostic, expirado: true };
    }

    return { ...diagnostic, expirado: false };
  }

  /**
   * Mapeia nível diagnóstico para dificuldade numérica (1-5)
   */
  mapLevelToDifficulty(nivel: NivelDificuldade): number {
    const map: Record<NivelDificuldade, number> = {
      [NivelDificuldade.MUITO_FACIL]: 1,
      [NivelDificuldade.FACIL]: 2,
      [NivelDificuldade.MEDIO]: 3,
      [NivelDificuldade.DIFICIL]: 4,
      [NivelDificuldade.MUITO_DIFICIL]: 5
    };
    return map[nivel] || 3;
  }
}