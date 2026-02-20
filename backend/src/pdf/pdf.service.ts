import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePdfDto } from './dto/create-pdf.dto';
import puppeteer from 'puppeteer';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) { }

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

      historicoRecente

    };

  }





  async gerarPdfDoRelatorio(alunoId: number, professorUsuarioId: number, timeRange: string = 'all'): Promise<Buffer> {
    // 1️⃣ Pega o JSON do relatório
    const relatorio = await this.getStudentReportForTeacherPdf(alunoId, professorUsuarioId, timeRange);

    // Helper para traduzir tipo de interação
    const traduzirTipoInteracao = (tipo: string): string => {
      const tipos: { [key: string]: string } = {
        'PERGUNTA': 'Tirou dúvida teórica',
        'EXPLICACAO': 'Solicitou explicação',
        'EXERCICIO': 'Resolveu exercício',
        'REVISAO': 'Revisou conteúdo',
        'DUVIDA': 'Tirou dúvida',
        'Tirou dúvida (Acertou)': '(OK) Tirou dúvida (Acertou)',
        'Tirou dúvida (Precisa revisar)': '(!) Tirou dúvida (Revisar)',
        'Resolveu Exercício no Tutor': '[Tutor] Resolveu exercício',
        'Resolveu Exercício (Acertou)': '(OK) Resolveu exercício',
        'Resolveu Exercício (Errou)': '(X) Resolveu exercício',
        'default': 'Interagiu com conteúdo'
      };
      return tipos[tipo] || tipos.default;
    };

    // Helper para traduzir período
    const traduzirPeriodo = (periodo: string): string => {
      const periodos: { [key: string]: string } = {
        'all': 'Todo o período',
        '30d': 'Últimos 30 dias',
        '7d': 'Últimos 7 dias'
      };
      return periodos[periodo] || periodo;
    };

    // Calcular detalhes de composição
    const totalGeral = relatorio.resumo.detalhes.exercicios.total + relatorio.resumo.detalhes.tutor.total;
    const acertosGeral = relatorio.resumo.detalhes.exercicios.acertos + relatorio.resumo.detalhes.tutor.acertos;

    // Calcular porcentagens individuais
    const taxaExercicios = relatorio.resumo.detalhes.exercicios.total > 0
      ? Math.round((relatorio.resumo.detalhes.exercicios.acertos / relatorio.resumo.detalhes.exercicios.total) * 100)
      : 0;

    const taxaTutor = relatorio.resumo.detalhes.tutor.total > 0
      ? Math.round((relatorio.resumo.detalhes.tutor.acertos / relatorio.resumo.detalhes.tutor.total) * 100)
      : 0;

    // 2️⃣ Converte JSON em HTML com design fiel às telas
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ficha de Avaliação - ${relatorio.aluno.nome} ${relatorio.aluno.sobrenome}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              color: #1f2937;
              background: #ffffff;
              line-height: 1.5;
              padding: 32px;
              max-width: 800px;
              margin: 0 auto;
            }
            
            /* Header */
            .header {
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 24px;
              margin-bottom: 32px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            
            .header-title h1 {
              font-size: 24px;
              font-weight: 800;
              color: #111827;
              margin: 0;
            }
            
            .header-subtitle {
              color: #6b7280;
              margin: 4px 0 0 0;
              font-size: 14px;
              font-weight: 500;
            }
            
            .header-date {
              text-align: right;
            }
            
            .header-date p {
              margin: 0;
              font-weight: 700;
              color: #374151;
            }
            
            .header-date small {
              font-size: 12px;
              color: #9ca3af;
            }
            
            /* Student Profile - REORGANIZADO */
            .student-profile {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-radius: 16px;
              padding: 28px;
              margin-bottom: 32px;
              border: 1px solid #e2e8f0;
            }
            
            .profile-header {
              display: flex;
              align-items: center;
              gap: 28px;
              margin-bottom: 24px;
            }
            
            .student-avatar {
              width: 90px;
              height: 90px;
              border-radius: 50%;
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 32px;
              font-weight: 900;
              box-shadow: 0 8px 16px rgba(59, 130, 246, 0.15);
            }
            
            .student-info {
              flex: 1;
            }
            
            .student-name {
              font-size: 26px;
              font-weight: 900;
              color: #111827;
              margin: 0 0 8px 0;
            }
            
            .student-class {
              font-size: 14px;
              color: #6b7280;
              font-weight: 600;
            }
            
            .performance-score {
              text-align: center;
              min-width: 120px;
            }
            
            .score-value {
              font-size: 42px;
              font-weight: 900;
              margin-bottom: 4px;
            }
            
            .score-label {
              font-size: 11px;
              text-transform: uppercase;
              font-weight: 800;
              color: #6b7280;
              letter-spacing: 0.05em;
            }
            
            /* Detalhamento da taxa de sucesso - NOVO */
            .score-breakdown {
              margin-top: 12px;
              padding: 12px;
              background: rgba(255, 255, 255, 0.8);
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              font-size: 11px;
              color: #4b5563;
            }
            
            .breakdown-title {
              font-weight: 700;
              color: #374151;
              margin-bottom: 6px;
              display: flex;
              align-items: center;
              gap: 4px;
            }
            
            .breakdown-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            
            .breakdown-label {
              font-weight: 600;
            }
            
            .breakdown-value {
              font-family: 'Inter', monospace;
              font-weight: 700;
            }
            
            /* Stats Row - NOVO CABEÇALHO COM MÉTRICAS */
            .stats-row {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              padding-top: 20px;
              border-top: 1px dashed #e5e7eb;
            }
            
            .stat-item {
              text-align: center;
              padding: 12px;
              background: white;
              border-radius: 10px;
              border: 1px solid #e5e7eb;
            }
            
            .stat-number {
              font-size: 24px;
              font-weight: 900;
              color: #1e293b;
              margin-bottom: 4px;
            }
            
            .stat-label {
              font-size: 11px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .stat-desc {
              font-size: 10px;
              color: #94a3b8;
              margin-top: 2px;
            }
            
            /* Critical Attention */
            .critical-section {
              border: 2px solid #fecaca;
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 32px;
            }
            
            .critical-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 16px;
              color: #b91c1c;
            }
            
            .critical-header h3 {
              font-size: 18px;
              font-weight: 800;
              margin: 0;
            }
            
            .critical-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 12px;
            }
            
            .critical-item {
              background: white;
              padding: 12px 16px;
              border: 1px solid #fecaca;
              border-radius: 8px;
            }
            
            .critical-topic {
              font-weight: 800;
              color: #7f1d1d;
              font-size: 14px;
              margin-bottom: 4px;
            }
            
            .critical-discipline {
              font-size: 12px;
              font-weight: 700;
              color: #dc2626;
              text-transform: uppercase;
              background: #fee2e2;
              padding: 2px 8px;
              border-radius: 4px;
              display: inline-block;
              margin-bottom: 6px;
            }
            
            .critical-description {
              font-size: 11px;
              color: #991b1b;
              font-style: italic;
              line-height: 1.4;
            }
            
            /* Main Content Grid */
            .content-grid {
              display: flex;
              gap: 32px;
              align-items: flex-start;
              margin-bottom: 40px;
            }
            
            /* Disciplines Section - AGORA PRIMEIRO */
            .disciplines-section {
              flex: 3;
            }
            
            .section-title {
              font-size: 18px;
              font-weight: 800;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .disciplines-list {
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            
            .discipline-item {
              background: #f8fafc;
              border-radius: 10px;
              padding: 16px;
              border: 1px solid #e5e7eb;
            }
            
            .discipline-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            }
            
            .discipline-name {
              font-size: 15px;
              font-weight: 800;
              color: #1f2937;
            }
            
            .discipline-score {
              font-family: 'Inter', monospace;
              font-size: 16px;
              font-weight: 900;
              padding: 4px 12px;
              border-radius: 6px;
              min-width: 60px;
              text-align: center;
            }
            
            .score-high { background: #dcfce7; color: #166534; }
            .score-medium { background: #fef9c3; color: #854d0e; }
            .score-low { background: #fee2e2; color: #991b1b; }
            
            .progress-bar {
              height: 10px;
              background: #e5e7eb;
              border-radius: 5px;
              overflow: hidden;
              margin-top: 8px;
            }
            
            .progress-fill {
              height: 100%;
              border-radius: 5px;
              transition: width 0.3s ease;
            }
            
            .progress-high { background: #16a34a; }
            .progress-medium { background: #ca8a04; }
            .progress-low { background: #dc2626; }
            
            /* Activities Section */
            .activities-section {
              flex: 2;
              background: #f8fafc;
              border-radius: 12px;
              padding: 20px;
              border: 1px solid #e5e7eb;
            }
            
            .activities-list {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            
            .activity-item {
              padding-bottom: 16px;
              border-bottom: 1px dashed #cbd5e1;
            }
            
            .activity-item:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }
            
            .activity-date {
              font-size: 11px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            
            .activity-description {
              font-size: 13px;
              font-weight: 600;
              color: #1e293b;
              margin: 4px 0;
              line-height: 1.4;
            }
            
            .activity-topic {
              font-size: 12px;
              color: #475569;
              font-weight: 500;
              background: #f1f5f9;
              padding: 4px 8px;
              border-radius: 4px;
              display: inline-block;
              margin-top: 4px;
            }
            
            .activity-topic strong {
              font-weight: 700;
              color: #374151;
            }
            
            /* Footer */
            .footer {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
              margin-top: 40px;
              font-weight: 500;
            }
            
            /* Color helpers */
            .text-green-600 { color: #16a34a; }
            .text-yellow-600 { color: #ca8a04; }
            .text-red-600 { color: #dc2626; }
            
            .bg-green-100 { background: #dcfce7; }
            .bg-yellow-100 { background: #fef9c3; }
            .bg-red-100 { background: #fee2e2; }
            
            /* Utility classes */
            .flex { display: flex; }
            .items-center { align-items: center; }
            .gap-2 { gap: 8px; }
            .gap-3 { gap: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-6 { margin-bottom: 24px; }
            
            /* Diagnosis Section */
            .diagnosis-section {
              border: 2px solid #93c5fd;
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 32px;
            }
            
            .diagnosis-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 16px;
              color: #1d4ed8;
            }
            
            .diagnosis-header h3 {
              font-size: 18px;
              font-weight: 800;
              margin: 0;
            }
            
            .diagnosis-comparison {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
            }
            
            .diagnosis-box {
              text-align: center;
              flex: 1;
            }
            
            .diagnosis-label {
              font-size: 12px;
              font-weight: 700;
              color: #6b7280;
              margin-bottom: 6px;
            }
            
            .diagnosis-value {
              font-size: 28px;
              font-weight: 900;
              margin-bottom: 4px;
            }
            
            .diagnosis-note {
              font-size: 11px;
              color: #6b7280;
              font-style: italic;
            }
            
            .diagnosis-arrow {
              font-size: 24px;
              color: #9ca3af;
            }
            
            .diagnosis-progress {
              text-align: center;
              min-width: 100px;
            }
            
            .progress-indicator {
              font-size: 32px;
              font-weight: 900;
              margin-bottom: 4px;
            }
            
            .progress-label {
              font-size: 11px;
              font-weight: 700;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            /* Best/Worst Cards */
            .performance-cards {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-top: 32px;
              margin-bottom: 32px;
            }
            
            .performance-card {
              border-radius: 12px;
              padding: 20px;
              border: 1px solid #e5e7eb;
            }
            
            .performance-card.best {
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              border-color: #86efac;
            }
            
            .performance-card.worst {
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
              border-color: #fca5a5;
            }
            
            .card-title {
              font-size: 13px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 12px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            
            .card-value {
              font-size: 24px;
              font-weight: 900;
              color: #1e293b;
              margin-bottom: 4px;
            }
            
            .card-score {
              font-size: 32px;
              font-weight: 900;
              margin-bottom: 8px;
            }
            
            .best .card-score { color: #166534; }
            .worst .card-score { color: #991b1b; }
            
            .card-desc {
              font-size: 12px;
              color: #64748b;
              line-height: 1.4;
            }
            
            /* Breakdown Legend */
            .breakdown-legend {
              margin: 24px 0;
              padding: 16px;
              background: #f8fafc;
              border-radius: 10px;
              border: 1px solid #e5e7eb;
            }
            
            .legend-title {
              font-size: 13px;
              font-weight: 700;
              color: #374151;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            
            .legend-items {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            
            .legend-item {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .legend-icon {
              width: 20px;
              height: 20px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 900;
            }
            
            .legend-icon.exercicio {
              background: #3b82f6;
              color: white;
            }
            
            .legend-icon.tutor {
              background: #8b5cf6;
              color: white;
            }
            
            .legend-text {
              font-size: 11px;
              color: #4b5563;
            }
            
            .legend-stats {
              font-family: 'Inter', monospace;
              font-weight: 700;
              color: #1f2937;
            }
            
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="header">
            <div class="header-title">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 18px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);">
                  K
                </div>
                <span style="font-size: 24px; font-weight: 900; color: #111827;">
                  Kani<span style="color: #3b82f6;">Mente</span>
                </span>
              </div>
              <p class="header-subtitle">Relatório Pedagógico • ${traduzirPeriodo(timeRange)}</p>
            </div>
            <div class="header-date">
              <p>${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <small>Data de Emissão</small>
            </div>
          </div>
          
          <!-- Student Profile REORGANIZADO -->
          <div class="student-profile">
            <div class="profile-header">
              <div class="student-avatar">
                ${relatorio.aluno.nome[0]}${relatorio.aluno.sobrenome[0]}
              </div>
              <div class="student-info">
                <h2 class="student-name">${relatorio.aluno.nome} ${relatorio.aluno.sobrenome}</h2>
                <div class="student-class">${relatorio.aluno.classe}ª Classe</div>
              </div>
              <div class="performance-score">
                <div class="score-value ${relatorio.resumo.taxaGlobal >= 80 ? 'text-green-600' : relatorio.resumo.taxaGlobal >= 60 ? 'text-yellow-600' : 'text-red-600'}">
                  ${relatorio.resumo.taxaGlobal}%
                </div>
                <div class="score-label">Média Geral de Acertos</div>
                <!-- Detalhamento da taxa de sucesso -->
                <div class="score-breakdown">
                  <div class="breakdown-title">Composição:</div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">Exercícios Práticos:</span>
                    <span class="breakdown-value">${taxaExercicios}% (${relatorio.resumo.detalhes.exercicios.acertos}/${relatorio.resumo.detalhes.exercicios.total})</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-label">Compreensão (Tutor IA):</span>
                    <span class="breakdown-value">${taxaTutor}% (${relatorio.resumo.detalhes.tutor.acertos}/${relatorio.resumo.detalhes.tutor.total})</span>
                  </div>
                  <div class="breakdown-item" style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e5e7eb;">
                    <span class="breakdown-label" style="font-weight: 800;">Total Consolidado:</span>
                    <span class="breakdown-value" style="font-weight: 900;">${acertosGeral}/${totalGeral} atividades</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Stats Row - MÉTRICAS NO CABEÇALHO -->
            <div class="stats-row">
              <div class="stat-item">
                <div class="stat-number">${relatorio.resumo.xp}</div>
                <div class="stat-label">Pontos de Experiência</div>
                <div class="stat-desc">Engajamento total</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-number">${relatorio.resumo.totalInteracoes}</div>
                <div class="stat-label">Atividades Realizadas</div>
                <div class="stat-desc">Exercícios e interações</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-number">${relatorio.tempoEstudo.totalMinutos}m</div>
                <div class="stat-label">Tempo de Estudo</div>
                <div class="stat-desc">${relatorio.tempoEstudo.totalSessoes} sessões</div>
              </div>
              
              <div class="stat-item">
                <div class="stat-number">${relatorio.tempoEstudo.diasAtivos}</div>
                <div class="stat-label">Dias Ativos</div>
                <div class="stat-desc">Consistência</div>
              </div>
            </div>
          </div>
          
          <!-- Legendas das Métricas -->
          <div class="breakdown-legend">
            <div class="legend-title">Como interpretar as métricas:</div>
            <div class="legend-items">
              <div class="legend-item">
                <div class="legend-icon exercicio">E</div>
                <div class="legend-text">
                  <strong>Exercícios Práticos</strong><br>
                  <span class="legend-stats">${relatorio.resumo.detalhes.exercicios.total} atividades no Rush</span>
                </div>
              </div>
              <div class="legend-item">
                <div class="legend-icon tutor">T</div>
                <div class="legend-text">
                  <strong>Compreensão (Tutor IA)</strong><br>
                  <span class="legend-stats">${relatorio.resumo.detalhes.tutor.total} validações de aprendizado</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Desempenho por Disciplina - AGORA PRIMEIRO -->
          <div class="disciplines-section">
            <h3 class="section-title">Desempenho por Disciplina</h3>
            <div style="font-size: 13px; color: #6b7280; margin-bottom: 24px; font-weight: 500;">
              Percentual de acertos em cada área do conhecimento. Mostra a performance geral do aluno.
            </div>
            <div class="disciplines-list">
              ${relatorio.desempenho.disciplinas.map(disc => {
      const scoreClass = disc.taxa >= 80 ? 'score-high' : disc.taxa >= 60 ? 'score-medium' : 'score-low';
      const progressClass = disc.taxa >= 80 ? 'progress-high' : disc.taxa >= 60 ? 'progress-medium' : 'progress-low';
      return `
                  <div class="discipline-item">
                    <div class="discipline-header">
                      <span class="discipline-name">${disc.disciplina}</span>
                      <span class="discipline-score ${scoreClass}">${disc.taxa}%</span>
                    </div>
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">
                      ${disc.total} atividades realizadas
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill ${progressClass}" style="width: ${disc.taxa}%"></div>
                    </div>
                  </div>
                `;
    }).join('')}
            </div>
          </div>
          
          <!-- Melhor/Pior Disciplina -->
          ${relatorio.desempenho.melhorDisciplina || relatorio.desempenho.piorDisciplina ? `
            <div class="performance-cards">
              ${relatorio.desempenho.melhorDisciplina ? `
                <div class="performance-card best">
                  <div class="card-title">Melhor Desempenho</div>
                  <div class="card-value">${relatorio.desempenho.melhorDisciplina.disciplina}</div>
                  <div class="card-score">${relatorio.desempenho.melhorDisciplina.taxa}%</div>
                  <div class="card-desc">
                    Área de maior destaque do aluno.<br>
                    ${relatorio.desempenho.melhorDisciplina.total} atividades realizadas.
                  </div>
                </div>
              ` : ''}
              
              ${relatorio.desempenho.piorDisciplina ? `
                <div class="performance-card worst">
                  <div class="card-title">Precisa de Atenção</div>
                  <div class="card-value">${relatorio.desempenho.piorDisciplina.disciplina}</div>
                  <div class="card-score">${relatorio.desempenho.piorDisciplina.taxa}%</div>
                  <div class="card-desc">
                    Área que requer reforço pedagógico.<br>
                    ${relatorio.desempenho.piorDisciplina.total} atividades realizadas.
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <!-- Critical Attention - AGORA DEPOIS DO DESEMPENHO -->
          ${relatorio.atencaoPedagogica.topicosCriticos.length > 0 ? `
            <div class="critical-section">
              <div class="critical-header">
                <h3>⚠️ Pontos de Atenção Crítica</h3>
              </div>
              <div style="font-size: 13px; color: #7f1d1d; margin-bottom: 16px; font-weight: 500;">
                Tópicos específicos com desempenho abaixo de 60% que requerem intervenção pedagógica imediata.
                (Mínimo de 3 atividades realizadas no tópico)
              </div>
              <div class="critical-grid">
                ${relatorio.atencaoPedagogica.topicosCriticos.map(item => `
                  <div class="critical-item">
                    <span class="critical-discipline">${item.disciplina}</span>
                    <div class="critical-topic">Tópico: ${item.topico}</div>
                    <div class="critical-description">
                      Recomendação: Revisão urgente deste conteúdo. Considere reforço individualizado.
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Main Content Grid - Atividades Recentes -->
          <div class="content-grid">
            <!-- Recent Activities -->
            <div class="activities-section">
              <h3 class="section-title">Atividades Recentes</h3>
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 16px; font-weight: 500;">
                Últimas interações do aluno na plataforma.
              </div>
              <div class="activities-list">
                ${relatorio.historicoRecente.slice(0, 5).map(log => `
                  <div class="activity-item">
                    <div class="activity-date">
                      ${new Date(log.data).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })}
                    </div>
                    <div class="activity-description">
                      ${traduzirTipoInteracao(log.tipo)}
                    </div>
                    ${log.topico && log.topico !== 'Geral' ? `
                      <div class="activity-topic">
                        <strong>Assunto:</strong> ${log.topico}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Bloqueios Pedagógicos (se houver) -->
            ${relatorio.atencaoPedagogica.bloqueiosAtivos.length > 0 ? `
              <div class="activities-section" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color: #fbbf24;">
                <h3 class="section-title">Bloqueios Pedagógicos</h3>
                <div style="font-size: 13px; color: #92400e; margin-bottom: 16px; font-weight: 500;">
                  Tópicos temporariamente bloqueados para reforço.
                </div>
                <div class="activities-list">
                  ${relatorio.atencaoPedagogica.bloqueiosAtivos.slice(0, 3).map(b => `
                    <div class="activity-item" style="border-color: #fbbf24;">
                      <div class="activity-description" style="color: #92400e; font-weight: 700;">
                        ${b.topico}
                      </div>
                      <div class="activity-topic" style="background: #fef3c7; color: #92400e;">
                        <strong>Disciplina:</strong> ${b.disciplina}
                      </div>

                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <!-- Espaço vazio se não houver bloqueios -->
              <div></div>
            `}
          </div>          
          <!-- Footer -->
          <div class="footer">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 20px; height: 20px; border-radius: 6px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 10px;">
                K
              </div>
              <span style="font-weight: 700; color: #3b82f6;">KaniMente</span>
            </div>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 8px; max-width: 600px; margin-left: auto; margin-right: auto;">
              <strong>Nota:</strong> A Taxa de Sucesso de ${relatorio.resumo.taxaGlobal}% é composta por ${relatorio.resumo.detalhes.exercicios.acertos} acertos em ${relatorio.resumo.detalhes.exercicios.total} exercícios práticos (${taxaExercicios}%) e ${relatorio.resumo.detalhes.tutor.acertos} validações corretas em ${relatorio.resumo.detalhes.tutor.total} interações com o Tutor IA (${taxaTutor}%).
            </div>
            Relatório pedagógico gerado automaticamente pela plataforma KaniMente.<br>
            Documento válido para acompanhamento pedagógico e planejamento de intervenções. • ${new Date().getFullYear()}
          </div>
        </body>
      </html>
    `;

    // 3️⃣ Inicializa Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // 4️⃣ Gera PDF com configurações otimizadas
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        bottom: '40px',
        left: '40px',
        right: '40px'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });

    await browser.close();

    return pdfBuffer as Buffer;
  }
}
