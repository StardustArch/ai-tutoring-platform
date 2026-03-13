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

      const perguntasFinal: any[] = [];

    // 🔥 USANDO PARALELISMO COM O CACHE
    for (const topico of topicosParaGerar) {
        // Esta lista vai crescendo a cada iteração para o mesmo tópico
        const historicoDoTopico: string[] = []; 

        for (let i = 0; i < perguntasPorTopico; i++) {
            try {
                const res = await this.cacheService.getQuestion({
                    classe,
                    disciplina: disciplina.toLowerCase(),
                    topicoId: topico.id,
                    dificuldade: 3, 
                    historicoRecente: historicoDoTopico // Envia a lista das perguntas que JÁ saíram neste teste
                });

                if (res && res.question) {
                    historicoDoTopico.push(res.question); // Adiciona a nova pergunta à "Lista Negra" temporária
                    perguntasFinal.push({ topico: topico.nome, ...res });
                }
            } catch(err) {
                this.logger.error(`Erro ao obter questão de diagnóstico para ${topico.nome}: ${err.message}`);
            }
        }
    }

    return {
      alunoId, disciplina, classe,
      foco: topicoAlvo || 'Automático',
      totalPerguntas: perguntasFinal.length,
      perguntas: perguntasFinal
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
        validoAte,
      },
      update: {
        acertos: acertosGlobais,
        totalPerguntas: totalPerguntasGlobal,
        percentualAcerto,
        nivelDiagnosticado,
        detalhesTopicos,
        realizadoEm: new Date(),
        validoAte,
      },
    });

    // 1. Precisamos buscar os IDs dos tópicos para atualizar a tabela de proficiência
    const nomesTopicos = Object.keys(detalhesTopicos);
    const topicosDb = await this.prisma.topico.findMany({
      where: {
        nome: { in: nomesTopicos },
        nivelClasse: aluno.classe,
        disciplina: { 
           nome: disciplina.toLowerCase() === 'matematica' ? 'Matemática' : 'Português' 
        }
      }
    });

    // 2. Para cada tópico, calculamos a % de acerto e atualizamos o nível do aluno
    for (const t of topicosDb) {
      const dadosTopico = detalhesTopicos[t.nome];
      const percTopico = dadosTopico.total > 0 ? (dadosTopico.acertos / dadosTopico.total) * 100 : 0;

      // Define o nível baseado no acerto do TÓPICO (ajuste as réguas como preferir)
      let nivelNumerico = 1;
      let nivelNome = 'INICIANTE';

      if (percTopico >= 90) {  
        nivelNumerico = 4; nivelNome = 'AVANCADO'; 
      } else if (percTopico >= 60) { 
        nivelNumerico = 3; nivelNome = 'NA_MEDIA'; 
      } else if (percTopico >= 40) { 
        nivelNumerico = 2; nivelNome = 'ABAIXO_MEDIA'; 
      }
  
  

      // 3. Salva a proficiência no banco
      await this.prisma.alunoProficienciaTopico.upsert({
         where: { 
            // Verifique no seu schema.prisma o nome exato desse index único (geralmente alunoId_topicoId)
            alunoId_topicoId: { alunoId, topicoId: t.id } 
         }, 
         create: {
            alunoId,
            nivel: nivelNome as any, 
            topicoId: t.id,
            vidasRestantes: 3
         },
         update: {
            nivel: nivelNome as any
         }
      });
    }

    return {
      diagnostic,
      analise: {
        nivel: nivelDiagnosticado,
        percentual: percentualAcerto,
        pontosFortes: this.identifyStrongPoints(detalhesTopicos),
        pontosFrageis: this.identifyWeakPoints(detalhesTopicos),
      },
    };
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
