import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) { }

  // --- CRIAR ALUNO ---
  async create(usuarioId: number, dto: CreateStudentDto) {
    // 1. Obter o ID do perfil de Encarregado
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId },
    });

    if (!encarregado) {
      throw new ForbiddenException('Apenas encarregados podem registar alunos.');
    }

    // 2. Criar o aluno ligado ao Encarregado
    const aluno = await this.prisma.aluno.create({
      data: {
        nome: dto.nome,
        sobrenome: dto.sobrenome,
        dataNascimento: new Date(dto.dataNascimento),
        classe: dto.classe,
        encarregadoId: encarregado.id,
      },
    });

    return {
      message: 'Educando registado com sucesso!',
      aluno,
    };
  }

  // --- LISTAR MEUS ALUNOS ---
  async findAllMyStudents(usuarioId: number) {
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId },
      include: {
        alunos: {
          orderBy: { nome: 'asc' },
          include: {
            _count: { select: { alunoTurmas: true } } // Contar em quantas turmas está
          }
        }
      }
    });

    if (!encarregado) return [];

    return encarregado.alunos;
  }

  // --- OBTER UM ALUNO ---
  async findOne(id: number, usuarioId: number) {
    await this.validarPropriedade(id, usuarioId);

const aluno = await this.prisma.aluno.findUnique({
      where: { id },
      include: {
        alunoTurmas: {
          include: {
            turma: {
              include: { 
                disciplina: true,
                professor: {          // 1. Inclui a relação com o Professor
                  include: {
                    usuario: true     // 2. Inclui a relação com o Usuário para apanhar o nome
                  }
                }
              }
            }
          }
        }
      }
    });

    return aluno;
  }

  // --- ATUALIZAR ALUNO ---
  async update(id: number, usuarioId: number, dto: UpdateStudentDto) {
    await this.validarPropriedade(id, usuarioId);

    const dataUpdate: any = { ...dto };

    // Converter data se existir
    if (dto.dataNascimento) {
      dataUpdate.dataNascimento = new Date(dto.dataNascimento);
    }

    const aluno = await this.prisma.aluno.update({
      where: { id },
      data: dataUpdate,
    });

    return {
      message: 'Dados atualizados com sucesso',
      aluno
    };
  }

  // --- REMOVER ALUNO ---
  async remove(id: number, usuarioId: number) {
    await this.validarPropriedade(id, usuarioId);

    // Nota: O `onDelete: Cascade` no Prisma Schema tratará de limpar as relações
    await this.prisma.aluno.delete({
      where: { id },
    });

    return { message: 'Educando removido com sucesso' };
  }

  // --- AUXILIAR DE SEGURANÇA ---
  // Garante que o aluno pertence ao utilizador que está a fazer o pedido
  private async validarPropriedade(alunoId: number, usuarioId: number) {
    const aluno = await this.prisma.aluno.findFirst({
      where: {
        id: alunoId,
        encarregado: { usuarioId }
      }
    });

    if (!aluno) {
      throw new NotFoundException('Educando não encontrado ou sem permissão.');
    }
  }
async getGuardianReport(alunoId: number, usuarioId: number) {
    // ---------------------------------------------------------
    // 1. VALIDAÇÃO DE SEGURANÇA
    // ---------------------------------------------------------
    const aluno = await this.prisma.aluno.findFirst({
      where: {
        id: alunoId,
        encarregado: {
          usuarioId: usuarioId // Garante que o pai é dono do aluno
        }
      },
      select: { id: true, nome: true, classe: true }
    });

    if (!aluno) {
      throw new ForbiddenException('Não tem permissão para ver este relatório.');
    }

    // ---------------------------------------------------------
    // 2. BUSCAR ESTATÍSTICAS DO CHAT (TUTOR)
    // ---------------------------------------------------------
    
    // A. Volume Total (Quantas mensagens trocou?)
    const chatStats = await this.prisma.chatMensagem.groupBy({
      by: ['turmaId'],
      where: { alunoId },
      _count: { id: true }
    });

    // B. Acertos no Tutor (Eficiência Teórica)
    // Procura mensagens onde a IA avaliou como "CORRECT"
    const tutorCorrectStats = await this.prisma.chatMensagem.groupBy({
        by: ['turmaId'],
        where: { 
            alunoId,
            respostaIa: { contains: '"assessment": "CORRECT"' } 
        },
        _count: { id: true }
    });

    // C. Total de Avaliações no Tutor (Para calcular a %)
    // Procura qualquer mensagem que tenha tido avaliação (CORRECT ou INCORRECT)
    const tutorTotalStats = await this.prisma.chatMensagem.groupBy({
        by: ['turmaId'],
        where: { 
            alunoId,
            respostaIa: { contains: '"assessment":' } 
        },
        _count: { id: true }
    });

    // ---------------------------------------------------------
    // 3. BUSCAR ESTATÍSTICAS DO RUSH (PRÁTICA)
    // ---------------------------------------------------------
    const rushStats = await this.prisma.exercicioResultado.groupBy({
      by: ['turmaId', 'acertou'],
      where: { alunoId },
      _count: { id: true }
    });

    // ---------------------------------------------------------
    // 4. PREPARAR DADOS DE TURMAS E DISCIPLINAS
    // ---------------------------------------------------------
    
    // A. Identificar Turmas Escolares
const turmaIds = new Set([
      ...chatStats.map(c => c.turmaId).filter((id): id is number => id !== null),
      ...rushStats.map(r => r.turmaId).filter((id): id is number => id !== null)
    ])

    const turmasEscola = await this.prisma.turma.findMany({
      where: { id: { in: Array.from(turmaIds) as number[] } },
      select: { id: true, nome: true, disciplina: { select: { nome: true } } }
    });

    // B. Identificar Disciplinas Praticadas em Casa (Sem Turma)
    // Buscamos tópicos usados em contexto standalone para saber que disciplina mostrar
    const casaTopicIdsRush = await this.prisma.exercicioResultado.findMany({
        where: { alunoId, turmaId: null },
        distinct: ['topicoId'], select: { topicoId: true }
    });
    const casaTopicIdsChat = await this.prisma.chatMensagem.findMany({
        where: { alunoId, turmaId: null, topicoId: { not: null } },
        distinct: ['topicoId'], select: { topicoId: true }
    });

    const allCasaTopicIds = new Set([
        ...casaTopicIdsRush.map(t => t.topicoId),
        ...casaTopicIdsChat.map(t => t.topicoId)
    ]);
    const validCasaTopicIds = Array.from(allCasaTopicIds).filter((id): id is number => id !== null);

const disciplinasCasa = await this.prisma.topico.findMany({
        where: { id: { in: validCasaTopicIds } }, // Agora usa o array limpo
        select: { disciplina: { select: { nome: true } } }
    });

    // Cria string única ex: "Matemática, Português"
    const disciplinasCasaStr = Array.from(new Set(disciplinasCasa.map(d => d.disciplina.nome))).join(", ");


    // ---------------------------------------------------------
    // 5. ANÁLISE DE PONTOS FORTES E FRACOS (GLOBAL UNIFICADO)
    // ---------------------------------------------------------
    
    const topicMap = new Map<number, { total: number, acertos: number }>();

    // A. Adicionar dados do RUSH ao mapa
    const rushTopicStats = await this.prisma.exercicioResultado.groupBy({
        by: ['topicoId', 'acertou'],
        where: { alunoId },
        _count: { id: true }
    });

    rushTopicStats.forEach(stat => {
        const current = topicMap.get(stat.topicoId) || { total: 0, acertos: 0 };
        current.total += stat._count.id;
        if (stat.acertou) current.acertos += stat._count.id;
        topicMap.set(stat.topicoId, current);
    });

    // B. Adicionar dados do TUTOR ao mapa
    // Precisamos de queries agrupadas por tópico para o Tutor
    const tutorCorrectByTopic = await this.prisma.chatMensagem.groupBy({
        by: ['topicoId'],
        where: { alunoId, topicoId: { not: null }, respostaIa: { contains: '"assessment": "CORRECT"' } },
        _count: { id: true }
    });
    const tutorTotalByTopic = await this.prisma.chatMensagem.groupBy({
        by: ['topicoId'],
        where: { alunoId, topicoId: { not: null }, respostaIa: { contains: '"assessment":' } },
        _count: { id: true }
    });

    tutorTotalByTopic.forEach(stat => {
        const current = topicMap.get(stat.topicoId!) || { total: 0, acertos: 0 };
        const totalAdd = stat._count.id;
        const acertosAdd = tutorCorrectByTopic.find(t => t.topicoId === stat.topicoId)?._count.id || 0;
        
        current.total += totalAdd;
        current.acertos += acertosAdd;
        topicMap.set(stat.topicoId!, current);
    });

    // C. Calcular Ranking
    const allTopicIds = Array.from(topicMap.keys());
    const topicsDetails = await this.prisma.topico.findMany({
        where: { id: { in: allTopicIds } },
        select: { id: true, nome: true, disciplina: { select: { nome: true } } }
    });

    const rankedTopics = topicsDetails.map(t => {
        const stats = topicMap.get(t.id)!;
        return {
            id: t.id,
            nome: t.nome,
            disciplina: t.disciplina.nome,
            total: stats.total,
            taxa: stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0
        };
    })
    .filter(t => t.total >= 2) // Mínimo 2 interações para contar
    .sort((a, b) => b.taxa - a.taxa);

    const pontosFortes = rankedTopics.slice(0, 3).filter(t => t.taxa >= 70);
    const pontosFracos = rankedTopics.reverse().slice(0, 3).filter(t => t.taxa < 60);

    // ---------------------------------------------------------
    // 6. PROCESSAMENTO DE TOTAIS E RETORNO
    // ---------------------------------------------------------

    // Helper de cálculo
    const getTutorEfficiency = (tId: number | null) => {
        const acertos = tutorCorrectStats.find(t => t.turmaId === tId)?._count.id || 0;
        const total = tutorTotalStats.find(t => t.turmaId === tId)?._count.id || 0;
        return { avaliacoes: total, taxaAcerto: total > 0 ? Math.round((acertos / total) * 100) : 0 };
    };

    // --- Totais CASA ---
    const chatCasaTotal = chatStats.find(c => c.turmaId === null)?._count.id || 0;
    const tutorCasa = getTutorEfficiency(null);
    const rushCasaAcertos = rushStats.find(r => r.turmaId === null && r.acertou)?._count.id || 0;
    const rushCasaTotal = (rushCasaAcertos) + (rushStats.find(r => r.turmaId === null && !r.acertou)?._count.id || 0);

    // --- Totais ESCOLA ---
    const chatEscolaTotal = chatStats.filter(c => c.turmaId !== null).reduce((acc, curr) => acc + curr._count.id, 0);
    const tutorEscolaAcertos = tutorCorrectStats.filter(t => t.turmaId !== null).reduce((a, c) => a + c._count.id, 0);
    const tutorEscolaTotal = tutorTotalStats.filter(t => t.turmaId !== null).reduce((a, c) => a + c._count.id, 0);
    const rushEscolaAcertos = rushStats.filter(r => r.turmaId !== null && r.acertou).reduce((a, c) => a + c._count.id, 0);
    const rushEscolaTotal = rushEscolaAcertos + rushStats.filter(r => r.turmaId !== null && !r.acertou).reduce((a, c) => a + c._count.id, 0);

    // --- Construção da Lista de Detalhes (Escola + Casa) ---
    
    // 1. Turmas Reais
    const listaFinal = turmasEscola.map(t => {
      const msgs = chatStats.find(c => c.turmaId === t.id)?._count.id || 0;
      const acertos = rushStats.find(r => r.turmaId === t.id && r.acertou)?._count.id || 0;
      const totalRush = rushStats.filter(r => r.turmaId === t.id).reduce((acc, curr) => acc + curr._count.id, 0);
      const tutorMetric = getTutorEfficiency(t.id);

      return {
        nome: t.nome,
        disciplina: t.disciplina.nome,
        interacoesChat: msgs,
        desempenho: {
            rush: totalRush > 0 ? Math.round((acertos / totalRush) * 100) : 0,
            rushTotal: totalRush,
            tutor: tutorMetric.taxaAcerto,
            tutorTotal: tutorMetric.avaliacoes
        }
      };
    });

    // 2. Turma Virtual "Casa" (Adiciona se houver atividade)
    if (chatCasaTotal > 0 || rushCasaTotal > 0) {
        listaFinal.push({
            nome: "Estudo Autónomo (Casa)",
            disciplina: disciplinasCasaStr || "Geral",
            interacoesChat: chatCasaTotal,
            desempenho: {
                rush: rushCasaTotal > 0 ? Math.round((rushCasaAcertos / rushCasaTotal) * 100) : 0,
                rushTotal: rushCasaTotal,
                tutor: tutorCasa.taxaAcerto,
                tutorTotal: tutorCasa.avaliacoes
            }
        });
    }

    return {
      aluno,
      geral: {
        casa: {
          chatVolume: chatCasaTotal,
          rushVolume: rushCasaTotal,
          tutorVolume: tutorCasa.avaliacoes, // Volume de avaliações
          tutorEfficiency: tutorCasa.taxaAcerto,
          rushEfficiency: rushCasaTotal > 0 ? Math.round((rushCasaAcertos / rushCasaTotal) * 100) : 0
        },
        escola: {
          chatVolume: chatEscolaTotal,
          rushVolume: rushEscolaTotal,
          tutorVolume: tutorEscolaTotal, // Volume de avaliações
          tutorEfficiency: tutorEscolaTotal > 0 ? Math.round((tutorEscolaAcertos / tutorEscolaTotal) * 100) : 0,
          rushEfficiency: rushEscolaTotal > 0 ? Math.round((rushEscolaAcertos / rushEscolaTotal) * 100) : 0
        }
      },
      pontosFortes,
      pontosFracos,
      turmas: listaFinal // Contém Turmas Reais + Casa
    };
  }

  async getGuardianOverview(usuarioId: number) {
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId },
      include: { alunos: { select: { id: true } } }
    });

    if (!encarregado) throw new ForbiddenException('Perfil não encontrado.');
    const alunoIds = encarregado.alunos.map(a => a.id);

    if (alunoIds.length === 0) return { totalAlunos: 0, totalAtividades: 0, mediaAcerto: 0, topicosExplorados: 0 };

    const [
        totalChat, 
        totalRush, 
        rushAcertos, 
        chatTopics, 
        rushTopics,
        // 🆕 Novas Queries para o Tutor
        tutorAcertos,
        tutorTotalAvaliacoes
    ] = await Promise.all([
        // A. Chat Volume
        this.prisma.chatMensagem.count({ where: { alunoId: { in: alunoIds } } }),

        // B. Rush Total
        this.prisma.exercicioResultado.count({ where: { alunoId: { in: alunoIds } } }),

        // C. Rush Acertos
        this.prisma.exercicioResultado.count({ where: { alunoId: { in: alunoIds }, acertou: true } }),

        // D. Tópicos
        this.prisma.chatMensagem.findMany({ where: { alunoId: { in: alunoIds }, topicoId: { not: null } }, distinct: ['topicoId'], select: { topicoId: true } }),
        this.prisma.exercicioResultado.findMany({ where: { alunoId: { in: alunoIds } }, distinct: ['topicoId'], select: { topicoId: true } }),

        // 🆕 E. Tutor Acertos (Via String search)
        this.prisma.chatMensagem.count({
            where: { 
                alunoId: { in: alunoIds },
                respostaIa: { contains: '"assessment": "CORRECT"' }
            }
        }),

        // 🆕 F. Tutor Total Tentativas (Via String search)
        this.prisma.chatMensagem.count({
            where: { 
                alunoId: { in: alunoIds },
                respostaIa: { contains: '"assessment":' } // Conta CORRECT e INCORRECT
            }
        })
    ]);

    // 3. Processar Dados
    const uniqueTopicIds = new Set([...chatTopics.map(t => t.topicoId), ...rushTopics.map(t => t.topicoId)]);
    
    // Total de Atividades (Conversas + Exercícios Rush)
    const totalAtividades = totalChat + totalRush;

    // 🆕 Cálculo Unificado de Precisão (Rush + Tutor)
    const totalTentativasValidas = totalRush + tutorTotalAvaliacoes;
    const totalSucessos = rushAcertos + tutorAcertos;
    
    const taxaAcertoGlobal = totalTentativasValidas > 0 
        ? Math.round((totalSucessos / totalTentativasValidas) * 100) 
        : 0;

    return {
      totalAlunos: alunoIds.length,
      totalAtividades,
      mediaAcerto: taxaAcertoGlobal, // Agora inclui a performance no chat!
      topicosExplorados: uniqueTopicIds.size
    };
  }

  // ==========================================
  // 👨‍🏫 RELATÓRIO PARA O PROFESSOR
  // ==========================================
/**
   * Gera um relatório detalhado do aluno para o professor.
   * Suporta filtragem por período (7d, 30d, all).
   */
  
  async getStudentReportForTeacher(
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

}