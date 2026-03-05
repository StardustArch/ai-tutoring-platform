import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NivelDificuldade } from '@prisma/client';
import { QuestionCacheService } from '../common/question-cache/question-cache.service'; // ✅ IMPORTADO

@Injectable()
export class DiagnosticService {
  private readonly logger = new Logger(DiagnosticService.name);
  private readonly aiUrl = process.env.IA_API_URL;
  private readonly httpTimeoutMs = 60000;

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly cacheService: QuestionCacheService, // ✅ INJETADO
  ) {}

  async needsDiagnostic(alunoId: number, disciplina: string): Promise<boolean> {
    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: { alunoId_disciplina: { alunoId, disciplina } },
    });
    if (!diagnostic) return true;
    const aluno = await this.prisma.aluno.findUnique({
      where: { id: alunoId },
    });
    if (!aluno) return true;
    const nomeDisciplinaBd =
      disciplina.toLowerCase() === 'matematica' ? 'Matemática' : 'Português';
    const totalTopicos = await this.prisma.topico.count({
      where: {
        nivelClasse: aluno.classe,
        disciplina: { nome: nomeDisciplinaBd },
      },
    });
    const detalhes = diagnostic.detalhesTopicos as Record<string, any>;
    const topicosTestados = detalhes ? Object.keys(detalhes).length : 0;
    if (topicosTestados < totalTopicos) return true;
    const now = new Date();
    return now > diagnostic.validoAte;
  }

  async generateDiagnosticQuestions(
    alunoId: number,
    disciplina: string,
    classe: number,
    topicoAlvo?: string,
  ) {
    const aluno = await this.prisma.aluno.findUnique({
      where: { id: alunoId },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    const nomeDisciplinaBd =
      disciplina.toLowerCase() === 'matematica' ? 'Matemática' : 'Português';
    const diagnostic = await this.prisma.diagnosticoInicial.findUnique({
      where: { alunoId_disciplina: { alunoId, disciplina } },
    });
    const detalhesTesteAnterior =
      (diagnostic?.detalhesTopicos as Record<string, any>) || {};

    let topicosParaGerar: any[] = [];
    let perguntasPorTopico = 2;

    if (topicoAlvo) {
      if (detalhesTesteAnterior[topicoAlvo]) {
        return {
          alunoId,
          disciplina,
          classe,
          foco: topicoAlvo,
          totalPerguntas: 0,
          perguntas: [],
          jaConcluido: true,
        };
      }
      const t = await this.prisma.topico.findFirst({
        where: {
          nome: topicoAlvo,
          nivelClasse: classe,
          disciplina: { nome: nomeDisciplinaBd },
        },
      });
      if (t) topicosParaGerar = [t];
      perguntasPorTopico = 5;
    } else {
      const topicosDb = await this.prisma.topico.findMany({
        where: { nivelClasse: classe, disciplina: { nome: nomeDisciplinaBd } },
        orderBy: { ordem: 'asc' },
      });
      topicosParaGerar = topicosDb.filter(
        (t) => !detalhesTesteAnterior[t.nome],
      );
      perguntasPorTopico = 2;
    }

    const totalPromises: Promise<any>[] = [];

    // 🔥 USANDO PARALELISMO COM O CACHE
    for (const topico of topicosParaGerar) {
      for (let i = 0; i < perguntasPorTopico; i++) {
        totalPromises.push(
          this.cacheService
            .getQuestion({
              classe,
              disciplina: disciplina.toLowerCase(),
              topicoId: topico.id,
              dificuldade: 3, // Nível médio para diagnóstico
              historicoRecente: [],
            })
            .then((res) => ({ topico: topico.nome, ...res }))
            .catch(() => null),
        );
      }
    }

    const results = await Promise.all(totalPromises);
    const perguntasFinal = results.filter((r) => r !== null);

    return {
      alunoId,
      disciplina,
      classe,
      foco: topicoAlvo || 'Automático',
      totalPerguntas: perguntasFinal.length,
      perguntas: perguntasFinal,
    };
  }

  // ... (restante do processDiagnosticResults e helpers permanecem iguais)
  async processDiagnosticResults(
    alunoId: number,
    disciplina: string,
    respostas: Array<{ topico: string; acertou: boolean }>,
  ) {
    const aluno = await this.prisma.aluno.findUnique({
      where: { id: alunoId },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');
    const diagnosticoExistente =
      await this.prisma.diagnosticoInicial.findUnique({
        where: { alunoId_disciplina: { alunoId, disciplina } },
      });
    const detalhesTopicos = diagnosticoExistente?.detalhesTopicos
      ? JSON.parse(JSON.stringify(diagnosticoExistente.detalhesTopicos))
      : {};
    respostas.forEach((r) => {
      if (!detalhesTopicos[r.topico])
        detalhesTopicos[r.topico] = { acertos: 0, total: 0 };
      detalhesTopicos[r.topico].total++;
      if (r.acertou) detalhesTopicos[r.topico].acertos++;
    });
    let acertosGlobais = 0;
    let totalPerguntasGlobal = 0;
    Object.values(detalhesTopicos).forEach((dados: any) => {
      acertosGlobais += dados.acertos;
      totalPerguntasGlobal += dados.total;
    });
    const percentualAcerto =
      totalPerguntasGlobal > 0
        ? (acertosGlobais / totalPerguntasGlobal) * 100
        : 0;
    let nivelDiagnosticado: NivelDificuldade;
    if (percentualAcerto < 40)
      nivelDiagnosticado = NivelDificuldade.MUITO_FACIL;
    else if (percentualAcerto < 60) nivelDiagnosticado = NivelDificuldade.FACIL;
    else if (percentualAcerto < 75) nivelDiagnosticado = NivelDificuldade.MEDIO;
    else if (percentualAcerto < 90)
      nivelDiagnosticado = NivelDificuldade.DIFICIL;
    else nivelDiagnosticado = NivelDificuldade.MUITO_DIFICIL;
    const recomendacoes = await this.generateRecommendations(
      aluno.classe,
      disciplina,
      percentualAcerto,
      detalhesTopicos,
    );
    const validoAte = new Date();
    validoAte.setMonth(validoAte.getMonth() + 3);
    const diagnostic = await this.prisma.diagnosticoInicial.upsert({
      where: { alunoId_disciplina: { alunoId, disciplina } },
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
        user_query: `Analise os resultados deste teste diagnóstico de ${disciplina}: - Taxa de acerto geral: ${percentualAcerto.toFixed(1)}% - Detalhes por tópico: ${JSON.stringify(detalhesTopicos)}`,
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
      return 'Continue a estudar e a praticar.';
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
      where: { alunoId_disciplina: { alunoId, disciplina } },
    });
    if (!diagnostic) return null;
    return { ...diagnostic, expirado: new Date() > diagnostic.validoAte };
  }
}
