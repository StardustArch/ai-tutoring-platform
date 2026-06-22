import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePdfDto } from './dto/create-pdf.dto';
import puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { StudentService } from '../student/student.service';
import { buildPdfHtml } from './pdf.template';

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService, private studentService: StudentService) { }

private async getBaseStudentReport(
    alunoId: number,
    professorUsuarioId: number,
    timeRange: string
  ) {
    // 1. LÓGICA DE FILTRO TEMPORAL
    let filtroData: { gte: Date } | undefined;
    const agora = new Date();

    if (timeRange === '7d') {
      const dataSeteDias = new Date();
      dataSeteDias.setDate(agora.getDate() - 7);
      filtroData = { gte: dataSeteDias };
    } else if (timeRange === '30d') {
      const dataTrintaDias = new Date();
      dataTrintaDias.setDate(agora.getDate() - 30);
      filtroData = { gte: dataTrintaDias };
    }

    // 2. SEGURANÇA E CONTEXTO: Pegar as Turmas do Professor
    const professor = await this.prisma.professor.findUnique({
      where: { usuarioId: professorUsuarioId },
      select: { id: true }
    });

    if (!professor) throw new ForbiddenException('Acesso negado.');

    // BUSCAR IDs DAS TURMAS EM COMUM (Professor <-> Aluno)
    const turmasDoProfessor = await this.prisma.alunoTurma.findMany({
      where: {
        alunoId,
        turma: { professorId: professor.id }
      },
      select: { turmaId: true }
    });

    if (turmasDoProfessor.length === 0) {
      throw new ForbiddenException('Este aluno não pertence a nenhuma das suas turmas.');
    }

    // Criamos uma lista de IDs para filtrar as queries
    const turmaIds = turmasDoProfessor.map(t => t.turmaId);

    // 3. DADOS BÁSICOS
    const aluno = await this.prisma.aluno.findUnique({
      where: { id: alunoId },
      select: { id: true, nome: true, sobrenome: true, classe: true, xp: true }
    });

    if (!aluno) throw new NotFoundException('Aluno não encontrado.');

    // 4. ESTATÍSTICAS GLOBAIS (Filtradas pela Turma do Professor)
    const rushAcertos = await this.prisma.exercicioResultado.count({
      where: {
        alunoId,
        turmaId: { in: turmaIds }, // <--- FILTRO ADICIONADO
        acertou: true,
        timestamp: filtroData
      }
    });

    const rushTotal = await this.prisma.exercicioResultado.count({
      where: {
        alunoId,
        turmaId: { in: turmaIds }, // <--- FILTRO ADICIONADO
        timestamp: filtroData
      }
    });

    const tutorAcertos = await this.prisma.chatMensagem.count({
      where: {
        alunoId,
        turmaId: { in: turmaIds }, // <--- FILTRO ADICIONADO
        timestamp: filtroData,
        respostaIa: { contains: '"assessment": "CORRECT"' }
      }
    });

    const tutorTotal = await this.prisma.chatMensagem.count({
      where: {
        alunoId,
        turmaId: { in: turmaIds }, // <--- FILTRO ADICIONADO
        timestamp: filtroData,
        respostaIa: { contains: '"assessment":' }
      }
    });

    const totalTentativas = rushTotal + tutorTotal;
    const totalSucessos = rushAcertos + tutorAcertos;
    const taxaGlobal = totalTentativas > 0 ? Math.round((totalSucessos / totalTentativas) * 100) : 0;

    // 5. ANÁLISE POR DISCIPLINA (Filtrada)
    const exerciciosResults = await this.prisma.exercicioResultado.findMany({
      where: {
        alunoId,
        turmaId: { in: turmaIds }, // <--- FILTRO ADICIONADO
        timestamp: filtroData
      },
      include: { topico: { include: { disciplina: true } } }
    });

    const chatResults = await this.prisma.chatMensagem.findMany({
      where: {
        alunoId,
        turmaId: { in: turmaIds }, // <--- FILTRO ADICIONADO
        timestamp: filtroData,
        respostaIa: { contains: '"assessment":' }
      },
      include: { topico: { include: { disciplina: true } } }
    });

    const disciplinaMap = new Map<string, { total: number, acertos: number }>();

    // Processar Exercícios
    exerciciosResults.forEach(r => {
      const discNome = r.topico.disciplina.nome;
      const current = disciplinaMap.get(discNome) || { total: 0, acertos: 0 };
      current.total++;
      if (r.acertou) current.acertos++;
      disciplinaMap.set(discNome, current);
    });

    // Processar Chat
    chatResults.forEach(m => {
      if (m.topico?.disciplina) {
        const discNome = m.topico.disciplina.nome;
        const current = disciplinaMap.get(discNome) || { total: 0, acertos: 0 };
        current.total++;
        if (m.respostaIa.includes('"assessment": "CORRECT"')) {
          current.acertos++;
        }
        disciplinaMap.set(discNome, current);
      }
    });

    const performancePorDisciplina = Array.from(disciplinaMap.entries()).map(([nome, stats]) => ({
      disciplina: nome,
      total: stats.total,
      taxa: stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0
    }));

    // 6. TÓPICOS CRÍTICOS (Filtrado)
    const topicoMapCalc = new Map<number, { total: number, acertos: number }>();

    exerciciosResults.forEach(r => {
      const current = topicoMapCalc.get(r.topicoId) || { total: 0, acertos: 0 };
      current.total++;
      if (r.acertou) current.acertos++;
      topicoMapCalc.set(r.topicoId, current);
    });

    chatResults.forEach(m => {
        // Verificação de segurança (Null Check)
        if (m.topicoId && m.topico?.disciplina) {
            const current = topicoMapCalc.get(m.topicoId) || { total: 0, acertos: 0 };
            current.total++;
            if (m.respostaIa.includes('"assessment": "CORRECT"')) {
                current.acertos++;
            }
            topicoMapCalc.set(m.topicoId, current);
        }
    });

    const problemTopicIds: number[] = [];
    topicoMapCalc.forEach((val, key) => {
      if (val.total >= 3 && (val.acertos / val.total) < 0.6) {
        problemTopicIds.push(key);
      }
    });

    const topicosAtencao = await this.prisma.topico.findMany({
      where: { id: { in: problemTopicIds } },
      select: { nome: true, disciplina: { select: { nome: true } } }
    });

    // 7. HISTÓRICO RECENTE (Filtrado)
    const ultimasAtividadesChat = await this.prisma.chatMensagem.findMany({
      where: {
        alunoId,
        turmaId: { in: turmaIds }, // <--- FILTRO ADICIONADO
        timestamp: filtroData
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        timestamp: true,
        topico: { select: { nome: true } },
        tipoInteracao: true,
        respostaIa: true
      }
    });

    // Mapeamento do histórico (igual ao anterior...)
    const historicoRecente = ultimasAtividadesChat.map(a => {
        // Forçamos o tipo para string para permitir frases personalizadas
        let tipoFormatado: string = a.tipoInteracao.toString(); 

        if (a.respostaIa.includes('"assessment":')) {
            if (a.respostaIa.includes('"assessment": "CORRECT"')) {
                tipoFormatado = 'Tirou dúvida (Acertou)';
            } else {
                tipoFormatado = 'Tirou dúvida (Precisa revisar)';
            }
        } else {
            const dePara: any = {
                'EXERCICIO': 'Resolveu Exercício no Tutor',
                'PERGUNTA': 'Tirou dúvida teórica',
                'EXPLICACAO': 'Solicitou explicação',
                'RUSH': 'Desafio Rápido',
                'SAUDACAO': 'Conversa inicial'
            };
            tipoFormatado = dePara[a.tipoInteracao] || a.tipoInteracao;
        }

        return {
            data: a.timestamp,
            topico: a.topico?.nome || 'Geral',
            tipo: tipoFormatado
        };
    });

    if (historicoRecente.length < 10) {
      const ultimosExercicios = await this.prisma.exercicioResultado.findMany({
        where: {
          alunoId,
          turmaId: { in: turmaIds }, // <--- FILTRO ADICIONADO
          timestamp: filtroData
        },
        orderBy: { timestamp: 'desc' },
        take: 10 - historicoRecente.length,
        select: {
          timestamp: true,
          topico: { select: { nome: true } },
          acertou: true
        }
      });

      ultimosExercicios.forEach(e => {
        historicoRecente.push({
          data: e.timestamp,
          topico: e.topico?.nome || 'Geral',
          tipo: e.acertou ? 'Resolveu Exercício (Acertou)' : 'Resolveu Exercício (Errou)'
        });
      });
    }

    return {
      aluno,
      turmaIds, // <--- EXPORTANDO PARA USAR NO PDF
      stats: {
        taxaGlobal,
        totalInteracoes: totalTentativas,
        xp: aluno.xp,
        rush: { acertos: rushAcertos, total: rushTotal },
        tutor: { acertos: tutorAcertos, total: tutorTotal }
      },
      disciplinas: performancePorDisciplina,
      atencaoNecessaria: topicosAtencao.map(t => ({
        topico: t.nome,
        disciplina: t.disciplina.nome
      })),
      historicoRecente: historicoRecente.sort((a, b) => b.data.getTime() - a.data.getTime()).slice(0, 10),
      filtroData
    };
  }


  async getStudentReportForTeacherPdf(

    alunoId: number,

    professorUsuarioId: number,

    timeRange: string = 'all'

  ) {

    // 1️⃣ Dados base (AGORA CORRETO)

    const base = await this.getBaseStudentReport(

      alunoId,

      professorUsuarioId,

      timeRange

    );



    const { aluno, stats, disciplinas, atencaoNecessaria, filtroData, turmaIds } = base;



    // ------------------------------------------------

    // 2️⃣ TEMPO DE ESTUDO

    // ------------------------------------------------

    const tempoEstudo = await this.prisma.sessaoEstudo.aggregate({

      where: { alunoId, inicio: filtroData, turmaId: { in: turmaIds } },

      _sum: { duracaoSegundos: true },

      _count: { id: true }

    });



    const totalMinutos = Math.round((tempoEstudo._sum.duracaoSegundos || 0) / 60);



    // ------------------------------------------------

    // 3️⃣ CONSISTÊNCIA (DIAS ATIVOS)

    // ------------------------------------------------

    const diasAtivos = await this.prisma.sessaoEstudo.findMany({

      where: { alunoId, inicio: filtroData, turmaId: { in: turmaIds } },

      select: { inicio: true },

      distinct: ['inicio']

    });



    // ------------------------------------------------

    // 4️⃣ MELHOR / PIOR DISCIPLINA

    // ------------------------------------------------

    const disciplinasOrdenadas = [...disciplinas].sort(

      (a, b) => b.taxa - a.taxa

    );



    const melhorDisciplina = disciplinasOrdenadas[0] || null;

    const piorDisciplina =

      disciplinasOrdenadas.length > 1

        ? disciplinasOrdenadas[disciplinasOrdenadas.length - 1]

        : null;


    // ------------------------------------------------

    // 7️⃣ BLOQUEIOS PEDAGÓGICOS

    // ------------------------------------------------

    const bloqueios = await this.prisma.alunoProficienciaTopico.findMany({

      where: {

        alunoId,

        bloqueadoAte: { gt: new Date() }

      },

      include: {

        topico: { include: { disciplina: true } }

      }

    });



    const historicoRecente = base.historicoRecente || [];



    // ------------------------------------------------

    // 8️⃣ DTO FINAL (PDF-FIRST) - ATUALIZADO

    // ------------------------------------------------

    return {

      tipo: 'RELATORIO_PDF',

      periodo: timeRange,

      geradoEm: new Date(),



      aluno: {

        ...aluno

      },



      resumo: {

        taxaGlobal: stats.taxaGlobal,

        totalInteracoes: stats.totalInteracoes,

        xp: stats.xp,

        // Adicionar breakdown para transparência

        detalhes: {

          exercicios: { acertos: stats.rush.acertos, total: stats.rush.total },

          tutor: { acertos: stats.tutor.acertos, total: stats.tutor.total }

        }

      },



      desempenho: {

        disciplinas,

        melhorDisciplina,

        piorDisciplina

      },



      tempoEstudo: {

        totalMinutos,

        totalSessoes: tempoEstudo._count.id,

        mediaPorSessao:

          tempoEstudo._count.id > 0

            ? Math.round(totalMinutos / tempoEstudo._count.id)

            : 0,

        diasAtivos: diasAtivos.length

      },


      atencaoPedagogica: {

        topicosCriticos: atencaoNecessaria,

        bloqueiosAtivos: bloqueios.map(b => ({

          topico: b.topico.nome,

          disciplina: b.topico.disciplina.nome,

          bloqueadoAte: b.bloqueadoAte

        }))

      },

      historicoRecente,
      historicoNarrativo: this.buildPedagogicalNarrative(base.historicoRecente)

    };

  }


 
async gerarPdfDoRelatorio(
  alunoId: number,
  professorUsuarioId: number,
  timeRange: string = 'all'
): Promise<Buffer> {
  // Usa directamente o V2 que tem todos os campos
  const report = await this.studentService.getStudentReportForTeacherV2(
    alunoId,
    professorUsuarioId,
    timeRange
  );

  const html = buildPdfHtml(report, timeRange);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' }
  });

  await browser.close();
  return pdfBuffer as Buffer;
}


  async buildPedagogicalNarrative(
  historico: any[],
) {
  const narrativa: string[] = [];

  const agrupar = new Map<string, any[]>();

  historico.forEach(h => {
    const key = h.topico || 'Geral';

    if (!agrupar.has(key)) agrupar.set(key, []);
    agrupar.get(key)!.push(h);
  });

  agrupar.forEach((items, topico) => {
    const exercicios = items.filter(i => i.tipo === 'EXERCICIO');
    const perguntas = items.filter(i => i.tipo === 'PERGUNTA');
    const tutor = items.filter(i => i.tipo?.includes('TUTOR') || i.respostaIa);

    if (exercicios.length > 0) {
      narrativa.push(`Praticou ${topico} através de exercícios (${exercicios.length})`);
    }

    if (perguntas.length > 0) {
      narrativa.push(`Tirou dúvidas sobre ${topico}`);
    }

    if (tutor.length > 0) {
      narrativa.push(`Interagiu com o Tutor IA para reforçar ${topico}`);
    }
  });

  return narrativa;
}
  /**
 * Gera um relatório simulado para alunos demo (IDs -101 e -102)
 */
private async getDemoStudentReportForTeacherPdf(
  alunoId: number,
  timeRange: string
): Promise<any> {
  // Dados base dos alunos demo (similar ao StudentService)
  const demoData = alunoId === -101
    ? this.getDemoStudentAnaData()
    : this.getDemoStudentCarlosData();

  // Adaptar para o formato esperado pelo PDF
  return {
    tipo: 'RELATORIO_PDF',
    periodo: timeRange,
    geradoEm: new Date(),
    aluno: {
      id: demoData.aluno.id,
      nome: demoData.aluno.nome,
      sobrenome: demoData.aluno.sobrenome,
      classe: demoData.aluno.classe,
      xp: demoData.aluno.xp,
    },
    resumo: {
      taxaGlobal: demoData.stats.taxaGlobal,
      totalInteracoes: demoData.stats.totalInteracoes,
      xp: demoData.stats.xp,
      detalhes: {
        exercicios: {
          acertos: demoData.stats.rush.acertos,
          total: demoData.stats.rush.total,
        },
        tutor: {
          acertos: demoData.stats.tutor.acertos,
          total: demoData.stats.tutor.total,
        },
      },
    },
    desempenho: {
      disciplinas: demoData.disciplinas.map((d: any) => ({
        disciplina: d.disciplina,
        taxa: d.taxa,
        total: d.total || 0,
      })),
      melhorDisciplina: demoData.disciplinas.length
        ? demoData.disciplinas.reduce((a: any, b: any) => (a.taxa > b.taxa ? a : b))
        : null,
      piorDisciplina: demoData.disciplinas.length
        ? demoData.disciplinas.reduce((a: any, b: any) => (a.taxa < b.taxa ? a : b))
        : null,
    },
    tempoEstudo: {
      totalMinutos: 120,
      totalSessoes: 5,
      mediaPorSessao: 24,
      diasAtivos: 3,
    },
    atencaoPedagogica: {
      topicosCriticos: demoData.atencaoNecessaria || [],
      bloqueiosAtivos: [],
    },
    historicoRecente: demoData.historicoRecente.map((log: any) => ({
      data: log.data,
      topico: log.topico,
      tipo: log.tipo,
    })),
  };
}

/**
 * Dados da aluna demo Ana (baseado no StudentService)
 */
private getDemoStudentAnaData() {
  return {
    aluno: {
      id: -101,
      nome: 'Ana',
      sobrenome: 'Silva',
      classe: 3,
      xp: 1240,
    },
    stats: {
      taxaGlobal: 84,
      totalInteracoes: 50,
      xp: 1240,
      rush: { acertos: 28, total: 35 },
      tutor: { acertos: 14, total: 15 },
    },
    disciplinas: [
      { disciplina: 'Matemática', taxa: 86, total: 30 },
      { disciplina: 'Português', taxa: 82, total: 20 },
    ],
    atencaoNecessaria: [],
    historicoRecente: [
      {
        data: new Date(),
        topico: 'Decomposição de números',
        tipo: 'Tirou dúvida (Precisa revisar)',
      },
      {
        data: new Date(Date.now() - 3600000),
        topico: 'Comparação de números',
        tipo: 'Resolveu Exercício (Acertou)',
      },
      {
        data: new Date(Date.now() - 7200000),
        topico: 'Valor posicional',
        tipo: 'Resolveu Exercício (Errou)',
      },
    ],

    // 🆕 NOVOS CAMPOS PEDAGÓGICOS
    conteudosTrabalhados: [
      'Decomposição de números',
      'Comparação de números',
      'Valor posicional',
    ],
    historicoNarrativo: [
      'Praticou Decomposição de números através de exercícios (2)',
      'Interagiu com Tutor IA para reforçar Valor posicional',
      'Resolveu Comparação de números com alta precisão',
    ],
    resumoPedagogico: {
      aprendizadosFortes: ['Comparação de números'],
      dificuldades: [],
      tendencia: 'excelente', // excelente / bom / atenção / risco
    },
  };
}

private getDemoStudentCarlosData() {
  return {
    aluno: {
      id: -102,
      nome: 'Carlos',
      sobrenome: 'Mendes',
      classe: 4,
      xp: 560,
    },
    stats: {
      taxaGlobal: 51,
      totalInteracoes: 45,
      xp: 560,
      rush: { acertos: 16, total: 30 },
      tutor: { acertos: 7, total: 15 },
    },
    disciplinas: [
      { disciplina: 'Matemática', taxa: 45, total: 25 },
      { disciplina: 'Português', taxa: 60, total: 20 },
    ],
    atencaoNecessaria: [
      { topico: 'Multiplicação', disciplina: 'Matemática' },
      { topico: 'Decomposição de números', disciplina: 'Matemática' },
    ],
    historicoRecente: [
      {
        data: new Date(),
        topico: 'Multiplicação',
        tipo: 'Resolveu Exercício (Errou)',
      },
      {
        data: new Date(Date.now() - 3600000),
        topico: 'Leitura',
        tipo: 'Tirou dúvida (Acertou)',
      },
      {
        data: new Date(Date.now() - 7200000),
        topico: 'Multiplicação',
        tipo: 'Resolveu Exercício (Errou)',
      },
    ],

    // 🆕 NOVOS CAMPOS PEDAGÓGICOS
    conteudosTrabalhados: [
      'Multiplicação',
      'Leitura e interpretação de texto',
      'Decomposição de números',
    ],
    historicoNarrativo: [
      'Tentou Multiplicação através de exercícios (2) com dificuldades',
      'Tirou dúvidas sobre Leitura com Tutor IA',
      'Repetiu exercícios de Multiplicação com erros recorrentes',
    ],
    resumoPedagogico: {
      aprendizadosFortes: ['Leitura e interpretação de texto'],
      dificuldades: ['Multiplicação', 'Decomposição de números'],
      tendencia: 'atenção', // excelente / bom / atenção / risco
    },
  };
}
}
