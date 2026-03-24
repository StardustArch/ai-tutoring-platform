import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

// ─── Helper: extrai dados úteis do JSON guardado pela IA ─────────────────────
// O GPT-4o às vezes serializa sem espaços ("assessment":"CORRECT") e outras
// vezes com espaços ("assessment": "CORRECT"). Para não depender de contains
// exacto, parsemos o JSON e lemos os campos directamente.
function _parseRespostaIa(raw: string): {
  acertou: boolean | null;
  pergunta: string | null;
  tipoInteracao: string | null;
} {
  try {
    const obj = JSON.parse(raw);
    const assessment: string | null = obj.assessment ?? null;
    const acertou = assessment === 'CORRECT' ? true
                  : assessment === 'INCORRECT' ? false
                  : null;

    // A última mensagem do array é normalmente a pergunta feita ao aluno
    const msgs: string[] = obj.messages ?? [];
    const pergunta = msgs.length > 0 ? msgs[msgs.length - 1] : null;

    const tipoInteracao: string | null = obj.interaction_type ?? null;
    return { acertou, pergunta, tipoInteracao };
  } catch {
    return { acertou: null, pergunta: null, tipoInteracao: null };
  }
}

// ─── Helper: formata o tipo de interação de forma legível ─────────────────────
function _formatarTipoAtividade(
  tipoInteracao: string | null,
  acertou: boolean | null,
  tipoDb: string
): string {
  // Se foi uma avaliação (o Kani esperava uma resposta)
  if (acertou !== null) {
    const TIPO_LABEL: Record<string, string> = {
      CHIPS:        'Escolha múltipla',
      TRUE_FALSE:   'Verdadeiro/Falso',
      CLOZE:        'Completar a frase',
      DIRECT_INPUT: 'Resposta aberta',
      DRAG_DROP:    'Ordenar itens',
    };
    const label = TIPO_LABEL[tipoInteracao ?? ''] ?? 'Exercício';
    return acertou ? `${label} — Acertou ✅` : `${label} — Errou ❌`;
  }

  // Se não foi avaliação, classifica pela intenção
  const DE_PARA: Record<string, string> = {
    EXPLANATION: 'Solicitou explicação',
    EXERCICIO:   'Resolveu exercício',
    PERGUNTA:    'Tirou dúvida',
    EXPLICACAO:  'Solicitou explicação',
    RUSH:        'Desafio rápido',
    SAUDACAO:    'Conversa inicial',
  };
  return DE_PARA[tipoDb] ?? DE_PARA[tipoInteracao ?? ''] ?? 'Interação';
}

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  // --- CRIAR ALUNO ---
  async create(usuarioId: number, dto: CreateStudentDto) {
    const encarregado = await this.prisma.encarregado.findUnique({ where: { usuarioId } });
    if (!encarregado) throw new ForbiddenException('Apenas encarregados podem registar alunos.');

    const aluno = await this.prisma.aluno.create({
      data: {
        nome: dto.nome,
        sobrenome: dto.sobrenome,
        dataNascimento: new Date(dto.dataNascimento),
        classe: dto.classe,
        encarregadoId: encarregado.id,
      },
    });
    return { message: 'Educando registado com sucesso!', aluno };
  }

  // --- LISTAR MEUS ALUNOS ---
  async findAllMyStudents(usuarioId: number) {
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId },
      include: {
        alunos: {
          orderBy: { nome: 'asc' },
          include: { _count: { select: { alunoTurmas: true } } }
        }
      }
    });
    if (!encarregado) return [];
    return encarregado.alunos;
  }

  // --- OBTER UM ALUNO ---
  async findOne(id: number, usuarioId: number) {
    await this.validarPropriedade(id, usuarioId);
    return this.prisma.aluno.findUnique({
      where: { id },
      include: {
        alunoTurmas: {
          include: {
            turma: {
              include: {
                disciplina: true,
                professor: { include: { usuario: true } }
              }
            }
          }
        }
      }
    });
  }

  // --- ATUALIZAR ALUNO ---
  async update(id: number, usuarioId: number, dto: UpdateStudentDto) {
    await this.validarPropriedade(id, usuarioId);
    const dataUpdate: any = { ...dto };
    if (dto.dataNascimento) dataUpdate.dataNascimento = new Date(dto.dataNascimento);
    const aluno = await this.prisma.aluno.update({ where: { id }, data: dataUpdate });
    return { message: 'Dados atualizados com sucesso', aluno };
  }

  // --- REMOVER ALUNO ---
  async remove(id: number, usuarioId: number) {
    await this.validarPropriedade(id, usuarioId);
    await this.prisma.aluno.delete({ where: { id } });
    return { message: 'Educando removido com sucesso' };
  }

  // --- AUXILIAR DE SEGURANÇA ---
  private async validarPropriedade(alunoId: number, usuarioId: number) {
    const aluno = await this.prisma.aluno.findFirst({
      where: { id: alunoId, encarregado: { usuarioId } }
    });
    if (!aluno) throw new NotFoundException('Educando não encontrado ou sem permissão.');
  }

  // ==========================================
  // 📊 RELATÓRIO PARA O ENCARREGADO
  // ==========================================
  async getGuardianReport(alunoId: number, usuarioId: number) {
    const aluno = await this.prisma.aluno.findFirst({
      where: { id: alunoId, encarregado: { usuarioId } },
      select: { id: true, nome: true, classe: true }
    });
    if (!aluno) throw new ForbiddenException('Não tem permissão para ver este relatório.');

    const chatStats = await this.prisma.chatMensagem.groupBy({
      by: ['turmaId'], where: { alunoId }, _count: { id: true }
    });

    // 🔥 FIX: busca todas as mensagens com assessment e filtra em JS
    // Evita falhas por diferenças de espaçamento no JSON guardado
    const todasMensagensAvaliadas = await this.prisma.chatMensagem.findMany({
      where: { alunoId, respostaIa: { contains: '"assessment"' } },
      select: { turmaId: true, respostaIa: true }
    });

    const tutorCorrectStats: Record<string | 'null', number> = {};
    const tutorTotalStats: Record<string | 'null', number> = {};

    for (const m of todasMensagensAvaliadas) {
      const key = m.turmaId?.toString() ?? 'null';
      tutorTotalStats[key] = (tutorTotalStats[key] ?? 0) + 1;
      const { acertou } = _parseRespostaIa(m.respostaIa);
      if (acertou === true) tutorCorrectStats[key] = (tutorCorrectStats[key] ?? 0) + 1;
    }

    const rushStats = await this.prisma.exercicioResultado.groupBy({
      by: ['turmaId', 'acertou'], where: { alunoId }, _count: { id: true }
    });

    const turmaIds = new Set([
      ...chatStats.map(c => c.turmaId).filter((id): id is number => id !== null),
      ...rushStats.map(r => r.turmaId).filter((id): id is number => id !== null)
    ]);

    const turmasEscola = await this.prisma.turma.findMany({
      where: { id: { in: Array.from(turmaIds) } },
      select: { id: true, nome: true, disciplina: { select: { nome: true } } }
    });

    const casaTopicIdsRush = await this.prisma.exercicioResultado.findMany({
      where: { alunoId, turmaId: null }, distinct: ['topicoId'], select: { topicoId: true }
    });
    const casaTopicIdsChat = await this.prisma.chatMensagem.findMany({
      where: { alunoId, turmaId: null, topicoId: { not: null } },
      distinct: ['topicoId'], select: { topicoId: true }
    });
    const validCasaTopicIds = Array.from(new Set([
      ...casaTopicIdsRush.map(t => t.topicoId),
      ...casaTopicIdsChat.map(t => t.topicoId)
    ])).filter((id): id is number => id !== null);

    const disciplinasCasa = await this.prisma.topico.findMany({
      where: { id: { in: validCasaTopicIds } },
      select: { disciplina: { select: { nome: true } } }
    });
    const disciplinasCasaStr = Array.from(new Set(disciplinasCasa.map(d => d.disciplina.nome))).join(', ');

    // Análise por tópico
    const topicMap = new Map<number, { total: number; acertos: number }>();
    const rushTopicStats = await this.prisma.exercicioResultado.groupBy({
      by: ['topicoId', 'acertou'], where: { alunoId }, _count: { id: true }
    });
    rushTopicStats.forEach(stat => {
      const cur = topicMap.get(stat.topicoId) ?? { total: 0, acertos: 0 };
      cur.total += stat._count.id;
      if (stat.acertou) cur.acertos += stat._count.id;
      topicMap.set(stat.topicoId, cur);
    });

    for (const m of todasMensagensAvaliadas) {
      if (!m.respostaIa) continue;
      // topicoId não está neste select — usamos groupBy separado abaixo
    }
    const tutorByTopic = await this.prisma.chatMensagem.findMany({
      where: { alunoId, topicoId: { not: null }, respostaIa: { contains: '"assessment"' } },
      select: { topicoId: true, respostaIa: true }
    });
    for (const m of tutorByTopic) {
      if (!m.topicoId) continue;
      const cur = topicMap.get(m.topicoId) ?? { total: 0, acertos: 0 };
      cur.total++;
      if (_parseRespostaIa(m.respostaIa).acertou === true) cur.acertos++;
      topicMap.set(m.topicoId, cur);
    }

    const allTopicIds = Array.from(topicMap.keys());
    const topicsDetails = await this.prisma.topico.findMany({
      where: { id: { in: allTopicIds } },
      select: { id: true, nome: true, disciplina: { select: { nome: true } } }
    });
    const rankedTopics = topicsDetails.map(t => {
      const s = topicMap.get(t.id)!;
      return { id: t.id, nome: t.nome, disciplina: t.disciplina.nome, total: s.total, taxa: s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0 };
    }).filter(t => t.total >= 2).sort((a, b) => b.taxa - a.taxa);

    const pontosFortes = rankedTopics.slice(0, 3).filter(t => t.taxa >= 70);
    const pontosFracos = [...rankedTopics].reverse().slice(0, 3).filter(t => t.taxa < 60);

    const getTutorEfficiency = (tId: number | null) => {
      const key = tId?.toString() ?? 'null';
      const acertos = tutorCorrectStats[key] ?? 0;
      const total   = tutorTotalStats[key] ?? 0;
      return { avaliacoes: total, taxaAcerto: total > 0 ? Math.round((acertos / total) * 100) : 0 };
    };

    const chatCasaTotal = chatStats.find(c => c.turmaId === null)?._count.id ?? 0;
    const tutorCasa = getTutorEfficiency(null);
    const rushCasaAcertos = rushStats.find(r => r.turmaId === null && r.acertou)?._count.id ?? 0;
    const rushCasaTotal = rushCasaAcertos + (rushStats.find(r => r.turmaId === null && !r.acertou)?._count.id ?? 0);

    const chatEscolaTotal = chatStats.filter(c => c.turmaId !== null).reduce((a, c) => a + c._count.id, 0);
    const tutorEscolaAcertos = Object.entries(tutorCorrectStats).filter(([k]) => k !== 'null').reduce((a, [, v]) => a + v, 0);
    const tutorEscolaTotal   = Object.entries(tutorTotalStats).filter(([k]) => k !== 'null').reduce((a, [, v]) => a + v, 0);
    const rushEscolaAcertos  = rushStats.filter(r => r.turmaId !== null && r.acertou).reduce((a, c) => a + c._count.id, 0);
    const rushEscolaTotal    = rushEscolaAcertos + rushStats.filter(r => r.turmaId !== null && !r.acertou).reduce((a, c) => a + c._count.id, 0);

    const listaFinal = turmasEscola.map(t => {
      const msgs     = chatStats.find(c => c.turmaId === t.id)?._count.id ?? 0;
      const acertos  = rushStats.find(r => r.turmaId === t.id && r.acertou)?._count.id ?? 0;
      const totalRush = rushStats.filter(r => r.turmaId === t.id).reduce((a, c) => a + c._count.id, 0);
      const tutorMetric = getTutorEfficiency(t.id);
      return {
        nome: t.nome, disciplina: t.disciplina.nome, interacoesChat: msgs,
        desempenho: {
          rush: totalRush > 0 ? Math.round((acertos / totalRush) * 100) : 0, rushTotal: totalRush,
          tutor: tutorMetric.taxaAcerto, tutorTotal: tutorMetric.avaliacoes
        }
      };
    });

    if (chatCasaTotal > 0 || rushCasaTotal > 0) {
      listaFinal.push({
        nome: 'Estudo Autónomo (Casa)', disciplina: disciplinasCasaStr || 'Geral',
        interacoesChat: chatCasaTotal,
        desempenho: {
          rush: rushCasaTotal > 0 ? Math.round((rushCasaAcertos / rushCasaTotal) * 100) : 0, rushTotal: rushCasaTotal,
          tutor: tutorCasa.taxaAcerto, tutorTotal: tutorCasa.avaliacoes
        }
      });
    }

    return {
      aluno, pontosFortes, pontosFracos, turmas: listaFinal,
      geral: {
        casa: { chatVolume: chatCasaTotal, rushVolume: rushCasaTotal, tutorVolume: tutorCasa.avaliacoes, tutorEfficiency: tutorCasa.taxaAcerto, rushEfficiency: rushCasaTotal > 0 ? Math.round((rushCasaAcertos / rushCasaTotal) * 100) : 0 },
        escola: { chatVolume: chatEscolaTotal, rushVolume: rushEscolaTotal, tutorVolume: tutorEscolaTotal, tutorEfficiency: tutorEscolaTotal > 0 ? Math.round((tutorEscolaAcertos / tutorEscolaTotal) * 100) : 0, rushEfficiency: rushEscolaTotal > 0 ? Math.round((rushEscolaAcertos / rushEscolaTotal) * 100) : 0 }
      }
    };
  }

  // ==========================================
  // 👨‍👩‍👦 VISÃO GERAL DO ENCARREGADO
  // ==========================================
  async getGuardianOverview(usuarioId: number) {
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId }, include: { alunos: { select: { id: true } } }
    });
    if (!encarregado) throw new ForbiddenException('Perfil não encontrado.');
    const alunoIds = encarregado.alunos.map(a => a.id);
    if (alunoIds.length === 0) return { totalAlunos: 0, totalAtividades: 0, mediaAcerto: 0, topicosExplorados: 0 };

    const [totalChat, totalRush, rushAcertos, chatTopics, rushTopics] = await Promise.all([
      this.prisma.chatMensagem.count({ where: { alunoId: { in: alunoIds } } }),
      this.prisma.exercicioResultado.count({ where: { alunoId: { in: alunoIds } } }),
      this.prisma.exercicioResultado.count({ where: { alunoId: { in: alunoIds }, acertou: true } }),
      this.prisma.chatMensagem.findMany({ where: { alunoId: { in: alunoIds }, topicoId: { not: null } }, distinct: ['topicoId'], select: { topicoId: true } }),
      this.prisma.exercicioResultado.findMany({ where: { alunoId: { in: alunoIds } }, distinct: ['topicoId'], select: { topicoId: true } }),
    ]);

    // 🔥 FIX: filtra em JS para não depender de espaçamento
    const mensagensAvaliadas = await this.prisma.chatMensagem.findMany({
      where: { alunoId: { in: alunoIds }, respostaIa: { contains: '"assessment"' } },
      select: { respostaIa: true }
    });
    const tutorTotalAvaliacoes = mensagensAvaliadas.length;
    const tutorAcertos = mensagensAvaliadas.filter(m => _parseRespostaIa(m.respostaIa).acertou === true).length;

    const uniqueTopicIds = new Set([...chatTopics.map(t => t.topicoId), ...rushTopics.map(t => t.topicoId)]);
    const totalTentativasValidas = totalRush + tutorTotalAvaliacoes;
    const totalSucessos = rushAcertos + tutorAcertos;
    const taxaAcertoGlobal = totalTentativasValidas > 0 ? Math.round((totalSucessos / totalTentativasValidas) * 100) : 0;

    return {
      totalAlunos: alunoIds.length,
      totalAtividades: totalChat + totalRush,
      mediaAcerto: taxaAcertoGlobal,
      topicosExplorados: uniqueTopicIds.size
    };
  }

  // ==========================================
  // 👨‍🏫 RELATÓRIO PARA O PROFESSOR
  // ==========================================
  async getStudentReportForTeacher(alunoId: number, professorUsuarioId: number, timeRange: string) {
    // 🟡 DEMO MODE
if (alunoId === -101) {
  return this.getDemoStudentAna();
}

if (alunoId === -102) {
  return this.getDemoStudentCarlos();
}
    // 1. Filtro temporal
    let filtroData: { gte: Date } | undefined;
    if (timeRange === '7d') {
      const d = new Date(); d.setDate(d.getDate() - 7); filtroData = { gte: d };
    } else if (timeRange === '30d') {
      const d = new Date(); d.setDate(d.getDate() - 30); filtroData = { gte: d };
    }

    // 2. Segurança: turmas em comum
    const professor = await this.prisma.professor.findUnique({
      where: { usuarioId: professorUsuarioId }, select: { id: true }
    });
    if (!professor) throw new ForbiddenException('Acesso negado.');

    const turmasDoProfessor = await this.prisma.alunoTurma.findMany({
      where: { alunoId, turma: { professorId: professor.id } },
      select: { turmaId: true }
    });
    if (turmasDoProfessor.length === 0) throw new ForbiddenException('Este aluno não pertence a nenhuma das suas turmas.');

    const turmaIds = turmasDoProfessor.map(t => t.turmaId);

    // 3. Dados básicos
    const aluno = await this.prisma.aluno.findUnique({
      where: { id: alunoId },
      select: { id: true, nome: true, sobrenome: true, classe: true, xp: true }
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado.');

    // 4. Stats globais — 🔥 FIX: filtra em JS (resolve 0% por espaçamento)
    const rushAcertos = await this.prisma.exercicioResultado.count({
      where: { alunoId, turmaId: { in: turmaIds }, acertou: true, timestamp: filtroData }
    });
    const rushTotal = await this.prisma.exercicioResultado.count({
      where: { alunoId, turmaId: { in: turmaIds }, timestamp: filtroData }
    });

    const mensagensAvaliadas = await this.prisma.chatMensagem.findMany({
      where: { alunoId, turmaId: { in: turmaIds }, timestamp: filtroData, respostaIa: { contains: '"assessment"' } },
      select: { respostaIa: true }
    });
    const tutorTotal   = mensagensAvaliadas.length;
    const tutorAcertos = mensagensAvaliadas.filter(m => _parseRespostaIa(m.respostaIa).acertou === true).length;

    const totalTentativas = rushTotal + tutorTotal;
    const taxaGlobal = totalTentativas > 0 ? Math.round(((rushAcertos + tutorAcertos) / totalTentativas) * 100) : 0;

    // 5. Análise por disciplina
    const exerciciosResults = await this.prisma.exercicioResultado.findMany({
      where: { alunoId, turmaId: { in: turmaIds }, timestamp: filtroData },
      include: { topico: { include: { disciplina: true } } }
    });
    const chatResults = await this.prisma.chatMensagem.findMany({
      where: { alunoId, turmaId: { in: turmaIds }, timestamp: filtroData, respostaIa: { contains: '"assessment"' } },
      include: { topico: { include: { disciplina: true } } }
    });

    const disciplinaMap = new Map<string, { total: number; acertos: number }>();
    exerciciosResults.forEach(r => {
      const d = r.topico.disciplina.nome;
      const cur = disciplinaMap.get(d) ?? { total: 0, acertos: 0 };
      cur.total++;
      if (r.acertou) cur.acertos++;
      disciplinaMap.set(d, cur);
    });
    chatResults.forEach(m => {
      if (!m.topico?.disciplina) return;
      const d = m.topico.disciplina.nome;
      const cur = disciplinaMap.get(d) ?? { total: 0, acertos: 0 };
      cur.total++;
      if (_parseRespostaIa(m.respostaIa).acertou === true) cur.acertos++;
      disciplinaMap.set(d, cur);
    });

    const performancePorDisciplina = Array.from(disciplinaMap.entries()).map(([nome, s]) => ({
      disciplina: nome, total: s.total,
      taxa: s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0
    }));

    // 6. Tópicos críticos
    const topicoMapCalc = new Map<number, { total: number; acertos: number }>();
    exerciciosResults.forEach(r => {
      const cur = topicoMapCalc.get(r.topicoId) ?? { total: 0, acertos: 0 };
      cur.total++; if (r.acertou) cur.acertos++;
      topicoMapCalc.set(r.topicoId, cur);
    });
    chatResults.forEach(m => {
      if (!m.topicoId) return;
      const cur = topicoMapCalc.get(m.topicoId) ?? { total: 0, acertos: 0 };
      cur.total++;
      if (_parseRespostaIa(m.respostaIa).acertou === true) cur.acertos++;
      topicoMapCalc.set(m.topicoId, cur);
    });

    const problemTopicIds: number[] = [];
    topicoMapCalc.forEach((val, key) => {
      if (val.total >= 3 && (val.acertos / val.total) < 0.6) problemTopicIds.push(key);
    });
    const topicosAtencao = await this.prisma.topico.findMany({
      where: { id: { in: problemTopicIds } },
      select: { nome: true, disciplina: { select: { nome: true } } }
    });

    // 7. Histórico recente — 🔥 FIX: legível com pergunta real + tipo concreto
    const ultimasAtividadesChat = await this.prisma.chatMensagem.findMany({
      where: { alunoId, turmaId: { in: turmaIds }, timestamp: filtroData },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        timestamp: true,
        topico: { select: { nome: true } },
        tipoInteracao: true,
        respostaIa: true
      }
    });

    const historicoRecente = ultimasAtividadesChat.map(a => {
      const { acertou, pergunta, tipoInteracao } = _parseRespostaIa(a.respostaIa);
      const tipo = _formatarTipoAtividade(tipoInteracao, acertou, a.tipoInteracao.toString());
      return {
        data: a.timestamp,
        topico: a.topico?.nome ?? 'Geral',
        // 🆕 pergunta real que o Kani fez ao aluno (última mensagem do array)
        pergunta: pergunta ?? null,
        tipo,
        acertou,
      };
    });

    // Complementar com exercícios Rush se < 10
    if (historicoRecente.length < 10) {
      const ultimosExercicios = await this.prisma.exercicioResultado.findMany({
        where: { alunoId, turmaId: { in: turmaIds }, timestamp: filtroData },
        orderBy: { timestamp: 'desc' },
        take: 10 - historicoRecente.length,
        include: { topico: { select: { nome: true } }, exercicio: { select: { pergunta: true } } }
      });
      ultimosExercicios.forEach(e => {
        historicoRecente.push({
          data: e.timestamp,
          topico: e.topico?.nome ?? 'Geral',
          pergunta: e.exercicio?.pergunta ?? null,   // 🆕 pergunta real do exercício
          tipo: e.acertou ? 'Rush — Acertou ✅' : 'Rush — Errou ❌',
          acertou: e.acertou,
        });
      });
    }

    return {
      aluno, turmaIds,
      stats: {
        taxaGlobal, totalInteracoes: totalTentativas, xp: aluno.xp,
        rush: { acertos: rushAcertos, total: rushTotal },
        tutor: { acertos: tutorAcertos, total: tutorTotal }
      },
      disciplinas: performancePorDisciplina,
      atencaoNecessaria: topicosAtencao.map(t => ({ topico: t.nome, disciplina: t.disciplina.nome })),
      historicoRecente: historicoRecente
        .sort((a, b) => b.data.getTime() - a.data.getTime())
        .slice(0, 10),
      filtroData
    };
  }
private getDemoStudentAna() {
  return {
    aluno: { id: -101, nome: 'Ana', sobrenome: 'Silva', classe: 3, xp: 1240 },
    resumo: { nivelGeral: 'ALTO', scoreGeral: 87, tendencia: 'SUBINDO' },
    desempenho: { acertos: 42, erros: 8, taxaAcerto: 0.84, exerciciosFeitos: 50 },
    engajamento: { tempoTotalSegundos: 15600, sessoesConcluidas: 8, sessoesAbandonadas: 2, taxaConclusao: 0.8 },
    aprendizagem: { modoPreferido: 'TUTOR', dificuldadeMedia: 2.4, tentativasPorExercicio: 1.2 },
    proficiencia: { INICIANTE: 0, ABAIXO_MEDIA: 1, NA_MEDIA: 3, AVANCADO: 5 },
    diagnostico: { nivelInicial: 'NA_MEDIA', evolucao: 12 },
    risco: { nivel: 'BAIXO', fatores: [] },
    insights: [
      'Compreensão rápida: A aluna absorve novos conceitos com facilidade.',
      'Perfil investigativo: Utiliza o modo TUTOR para pedir explicações profundas, não apenas respostas.',
    ],
    recomendacoes: [
      'Avançar a aluna para desafios de nível AVANÇADO em Matemática.',
    ],
    stats: { taxaGlobal: 84, totalInteracoes: 50, xp: 1240, rush: { acertos: 28, total: 35 }, tutor: { acertos: 14, total: 15 } },
    disciplinas: [ { disciplina: 'Matemática', taxa: 86 }, { disciplina: 'Português', taxa: 82 } ],
    atencaoNecessaria: [],
    historicoRecente: [
      { data: new Date(), topico: 'Valor posicional', tipo: 'TUTOR', acertou: true, pergunta: 'Qual é o dígito que está na casa das centenas no número 543?' },
      { data: new Date(Date.now() - 86400000), topico: 'Números até 1 milhão', tipo: 'RUSH', acertou: true, pergunta: 'O professor Mateus tem 542.819 meticais na conta. Como se escreve este número por extenso?' },
    ],

    // Sessões navegáveis
    sessoesRecentes: [
      {
        id: 115,
        modo: 'LESSON',
        status: 'CONCLUIDA',
        inicio: new Date(Date.now() - 3600000 * 2),
        duracaoSegundos: 980,
        xpGanho: 60,
        acertos: 4,
        erros: 0,
        totalExercicios: 4,
        totalMensagens: 0,
        licaoConcluida: true,
      },
      {
        id: 114,
        modo: 'RUSH',
        status: 'CONCLUIDA',
        inicio: new Date(Date.now() - 86400000),
        duracaoSegundos: 420,
        xpGanho: 30,
        acertos: 3,
        erros: 1,
        totalExercicios: 4,
        totalMensagens: 0,
        licaoConcluida: null,
      },
      {
        id: 113,
        modo: 'TUTOR',
        status: 'CONCLUIDA',
        inicio: new Date(Date.now() - 86400000 * 2),
        duracaoSegundos: 1560,
        xpGanho: 20,
        acertos: 3,
        erros: 0,
        totalExercicios: 0,
        totalMensagens: 8,
        licaoConcluida: null,
      },
    ],

    // Trilha de auditoria — formato real da BD
    trilhaAuditoria: [
      {
        idContexto: 901,
        topico: 'Valor posicional',
        dataUltimaInteracao: new Date(Date.now() - 3600000),
        statusDidatico: 'EXCELENTE',
        resumoProblema: 'A aluna pediu explicação avançada e a IA guiou perfeitamente.',
        interacoes: [
          {
            ator: 'Aluno',
            mensagem: 'Não percebi...',
            timestamp: new Date(Date.now() - 3610000),
          },
          {
            ator: 'IA',
            assessment: null,
            mensagem: 'Não se preocupe! Pensa no número 540 como uma casa com três quartos: o quarto das Centenas, das Dezenas e das Unidades. Em qual quarto o 5 está a morar?',
            emotion: 'THOUGHTFUL',
            timestamp: new Date(Date.now() - 3608000),
            avaliacaoProfessor: null,
          },
          {
            ator: 'Aluno',
            mensagem: 'No das centenas!',
            timestamp: new Date(Date.now() - 3605000),
          },
          {
            ator: 'IA',
            assessment: 'CORRECT',
            mensagem: 'Exactamente! Como ele está na casa das centenas, vale 5 × 100 = 500. Estás a ir muito bem, Ana!',
            emotion: 'HAPPY',
            timestamp: new Date(Date.now() - 3603000),
            avaliacaoProfessor: null,
          },
        ],
      },
    ],
  };
}

private getDemoStudentCarlos() {
  return {
    aluno: { id: -102, nome: 'Carlos', sobrenome: 'Mendes', classe: 4, xp: 560 },
    resumo: { nivelGeral: 'MEDIO', scoreGeral: 58, tendencia: 'ESTAVEL' },
    desempenho: { acertos: 23, erros: 22, taxaAcerto: 0.51, exerciciosFeitos: 45 },
    engajamento: { tempoTotalSegundos: 4800, sessoesConcluidas: 4, sessoesAbandonadas: 6, taxaConclusao: 0.4 },
    aprendizagem: { modoPreferido: 'RUSH', dificuldadeMedia: 3.1, tentativasPorExercicio: 2.3 },
    proficiencia: { INICIANTE: 3, ABAIXO_MEDIA: 4, NA_MEDIA: 2, AVANCADO: 0 },
    diagnostico: { nivelInicial: 'ABAIXO_MEDIA', evolucao: 8 },
    risco: { nivel: 'MEDIO', fatores: ['Abandona muitas sessões', 'Baixa taxa de acerto (51%)', 'Bloqueio em Multiplicação'] },
    insights: [
      'Frustração rápida: O aluno abandona sessões longas (sinal de cansaço ou desmotivação).',
      'Déficit de base: Erros contínuos em tabuadas simples estão a travar o avanço.',
    ],
    recomendacoes: [
      'Intervenção humana: O aluno precisa de material visual para entender multiplicação.',
      'Reduzir a dificuldade dos exercícios gerados para recuperar a confiança.',
    ],
    stats: { taxaGlobal: 51, totalInteracoes: 45, xp: 560, rush: { acertos: 16, total: 30 }, tutor: { acertos: 7, total: 15 } },
    disciplinas: [ { disciplina: 'Matemática', taxa: 45 }, { disciplina: 'Português', taxa: 60 } ],
    atencaoNecessaria: [ { topico: 'Multiplicação', disciplina: 'Matemática' } ],
    historicoRecente: [
      { data: new Date(), topico: 'Multiplicação', tipo: 'TUTOR', acertou: false, pergunta: 'Quanto é 6 × 4?' },
      { data: new Date(Date.now() - 86400000), topico: 'Números até 1 milhão', tipo: 'RUSH', acertou: false, pergunta: 'Como se decompõe o número 65.077?' },
    ],

    // Sessões navegáveis
    sessoesRecentes: [
      {
        id: 120,
        modo: 'TUTOR',
        status: 'ABANDONADA',
        inicio: new Date(Date.now() - 3600000),
        duracaoSegundos: 310,
        xpGanho: 0,
        acertos: 1,
        erros: 3,
        totalExercicios: 0,
        totalMensagens: 6,
        licaoConcluida: null,
      },
      {
        id: 119,
        modo: 'RUSH',
        status: 'CONCLUIDA',
        inicio: new Date(Date.now() - 86400000),
        duracaoSegundos: 280,
        xpGanho: 20,
        acertos: 2,
        erros: 3,
        totalExercicios: 5,
        totalMensagens: 0,
        licaoConcluida: null,
      },
      {
        id: 118,
        modo: 'RUSH',
        status: 'ABANDONADA',
        inicio: new Date(Date.now() - 86400000 * 2),
        duracaoSegundos: 95,
        xpGanho: 10,
        acertos: 1,
        erros: 2,
        totalExercicios: 3,
        totalMensagens: 0,
        licaoConcluida: null,
      },
    ],

    // Trilha de auditoria — formato real da BD, IA com má didática
    trilhaAuditoria: [
      {
        idContexto: 902,
        topico: 'Multiplicação',
        dataUltimaInteracao: new Date(),
        statusDidatico: 'ALERTA',
        resumoProblema: 'A IA foi excessivamente técnica e não ajudou o aluno a resolver a dúvida.',
        interacoes: [
          {
            ator: 'Aluno',
            mensagem: 'Não consigo fazer 6 vezes 4. Dá 10?',
            timestamp: new Date(Date.now() - 7200000),
          },
          {
            ator: 'IA',
            assessment: 'INCORRECT',
            mensagem: 'Incorrecto. A multiplicação é o produto de dois factores. 6 e 4 são os factores. O produto correcto é 24. A adição deles é que resultaria em 10. Tenta de novo.',
            emotion: 'SAD',
            timestamp: new Date(Date.now() - 7150000),
            avaliacaoProfessor: null,
          },
          {
            ator: 'Aluno',
            mensagem: 'Ainda não percebi, produto de quê?',
            timestamp: new Date(Date.now() - 7100000),
          },
          {
            ator: 'IA',
            assessment: null,
            mensagem: 'Produto é o resultado algébrico. Estuda mais a tabuada do 6.',
            emotion: 'SAD',
            timestamp: new Date(Date.now() - 7000000),
            avaliacaoProfessor: null,
          },
        ],
      },
      {
        idContexto: 903,
        topico: 'Números até 1 milhão',
        dataUltimaInteracao: new Date(Date.now() - 86400000),
        statusDidatico: 'NORMAL',
        resumoProblema: 'O aluno acertou após explicação. Valide se a didática foi adequada.',
        interacoes: [
          {
            ator: 'Aluno',
            mensagem: 'Não percebi...',
            timestamp: new Date(Date.now() - 86400000 - 120000),
          },
          {
            ator: 'IA',
            assessment: null,
            mensagem: 'Tudo bem, vamos explicar de outra forma. Imagina que tens 3 machambas: uma com 200.000 metros quadrados, outra com 500.000 e outra com 800.000. Qual delas é a maior?',
            emotion: 'THOUGHTFUL',
            timestamp: new Date(Date.now() - 86400000 - 60000),
            avaliacaoProfessor: null,
          },
          {
            ator: 'Aluno',
            mensagem: '800.000',
            timestamp: new Date(Date.now() - 86400000 - 30000),
          },
          {
            ator: 'IA',
            assessment: 'CORRECT',
            mensagem: 'Fantástico! A machamba com 800.000 metros quadrados é mesmo a maior. Agora já percebes como comparar números grandes!',
            emotion: 'HAPPY',
            timestamp: new Date(Date.now() - 86400000),
            avaliacaoProfessor: null,
          },
        ],
      },
    ],
  };
}
async getStudentReportForTeacherV2(
  alunoId: number,
  professorUsuarioId: number,
  timeRange: string,
) {
  // 🟡 Se for demo, retorna os dados melhorados
  if (alunoId === -101) return this.getDemoStudentAna();
  if (alunoId === -102) return this.getDemoStudentCarlos();

  // 1. Filtro temporal
  const filtroData = this.buildTimeFilter(timeRange); // helper abaixo

  // 2. Segurança: professor tem acesso a este aluno?
  const professor = await this.prisma.professor.findUnique({
    where: { usuarioId: professorUsuarioId },
    select: { id: true },
  });
  if (!professor) throw new ForbiddenException('Acesso negado.');

  const turmasDoProfessor = await this.prisma.alunoTurma.findMany({
    where: { alunoId, turma: { professorId: professor.id } },
    select: { turmaId: true },
  });
  if (turmasDoProfessor.length === 0)
    throw new ForbiddenException('Aluno não pertence a nenhuma das suas turmas.');

  const turmaIds = turmasDoProfessor.map((t) => t.turmaId);

  // 3. Dados básicos do aluno
  const aluno = await this.prisma.aluno.findUnique({
    where: { id: alunoId },
    select: { id: true, nome: true, sobrenome: true, classe: true, xp: true },
  });
  if (!aluno) throw new NotFoundException('Aluno não encontrado.');

  // 4. Desempenho (acertos/erros) – usando os dados já filtrados
  const [exercicios, mensagensAvaliadas] = await Promise.all([
    this.prisma.exercicioResultado.findMany({
      where: { alunoId, turmaId: { in: turmaIds }, timestamp: filtroData },
    }),
    this.prisma.chatMensagem.findMany({
      where: {
        alunoId,
        turmaId: { in: turmaIds },
        timestamp: filtroData,
        respostaIa: { contains: '"assessment"' },
      },
      select: { respostaIa: true },
    }),
  ]);

  const acertosRush = exercicios.filter((e) => e.acertou).length;
  const totalRush = exercicios.length;

  const tutorAvaliacoes = mensagensAvaliadas.map((m) =>
    this.parseRespostaIa(m.respostaIa),
  );
  const acertosTutor = tutorAvaliacoes.filter((a) => a.acertou === true).length;
  const totalTutor = tutorAvaliacoes.length;

  const totalAcertos = acertosRush + acertosTutor;
  const totalTentativas = totalRush + totalTutor;
  const taxaAcerto = totalTentativas ? totalAcertos / totalTentativas : 0;

  // 5. Engajamento (sessões)
  const sessoes = await this.prisma.sessaoEstudo.findMany({
    where: { alunoId, turmaId: { in: turmaIds }, inicio: filtroData },
  });
  const tempoTotalSegundos = sessoes.reduce(
    (acc, s) => acc + (s.duracaoSegundos ?? 0),
    0,
  );
  const concluidas = sessoes.filter((s) => s.status === 'CONCLUIDA').length;
  const abandonadas = sessoes.filter((s) => s.status === 'ABANDONADA').length;
  const taxaConclusao = sessoes.length ? concluidas / sessoes.length : 0;

  // 6. Aprendizagem (modo preferido, dificuldade média)
  const modos = sessoes.reduce(
    (acc, s) => {
      acc[s.modo] = (acc[s.modo] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const modoPreferido = Object.entries(modos).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Dificuldade média dos exercícios (se tiver exercícios ligados)
  const exerciciosComDificuldade = await this.prisma.exercicioResultado.findMany({
    where: {
      alunoId,
      turmaId: { in: turmaIds },
      timestamp: filtroData,
      exercicio: { isNot: null },
    },
    include: { exercicio: { select: { dificuldade: true } } },
  });
  const dificuldadeMedia =
    exerciciosComDificuldade.reduce(
      (acc, e) => acc + (e.exercicio?.dificuldade ?? 0),
      0,
    ) / (exerciciosComDificuldade.length || 1);

  // Tentativas por exercício (contagem de tentativas únicas por pergunta)
  const tentativasPorExercicio = 0; // opcional: mais complexo, pode ser calculado agrupando por pergunta

  // 7. Proficiência (tabela AlunoProficienciaTopico)
  const proficiencias = await this.prisma.alunoProficienciaTopico.findMany({
    where: { alunoId },
    select: { nivel: true },
  });
  const profStats = {
    INICIANTE: 0,
    ABAIXO_MEDIA: 0,
    NA_MEDIA: 0,
    AVANCADO: 0,
  };
  proficiencias.forEach((p) => profStats[p.nivel]++);

  // 8. Diagnóstico inicial
  const diagnosticos = await this.prisma.diagnosticoInicial.findMany({
    where: { alunoId },
    orderBy: { realizadoEm: 'asc' },
  });
  const nivelInicial = diagnosticos[0]?.nivelDiagnosticado ?? 'NAO_DIAGNOSTICADO';
  const evolucao = diagnosticos.length > 1
    ? (diagnosticos[diagnosticos.length - 1].percentualAcerto -
        diagnosticos[0].percentualAcerto)
    : 0;

  // 9. Risco do aluno
const fatoresRisco: string[] = []; // ✅ agora com tipo
if (abandonadas > concluidas) fatoresRisco.push('Alta taxa de abandono de sessões');
if (taxaAcerto < 0.5) fatoresRisco.push('Baixa taxa de acerto');
if (tempoTotalSegundos < 600) fatoresRisco.push('Pouco tempo de estudo');
if (profStats.INICIANTE > profStats.AVANCADO)
  fatoresRisco.push('Muitos tópicos em nível iniciante');

  const nivelRisco =
    fatoresRisco.length >= 3 ? 'ALTO'
    : fatoresRisco.length === 2 ? 'MEDIO'
    : 'BAIXO';

// 10. Insights automáticos
const insights: string[] = []; // ✅
if (taxaAcerto > 0.8) insights.push('Aluno com alta compreensão dos conteúdos');
if (abandonadas > concluidas) insights.push('Aluno perde foco durante sessões');
if (modoPreferido === 'RUSH')
  insights.push('Aluno aprende melhor em desafios rápidos');
if (profStats.INICIANTE > profStats.AVANCADO)
  insights.push('Ainda em fase inicial de domínio dos tópicos');
if (evolucao > 10) insights.push('Evolução significativa desde o diagnóstico inicial');
if (evolucao < -5) insights.push('Desempenho em queda – requer atenção');

// 11. Recomendações acionáveis
const recomendacoes: string[] = []; // ✅
if (taxaAcerto < 0.6)
  recomendacoes.push('Reforçar exercícios básicos antes de avançar');
if (abandonadas > concluidas)
  recomendacoes.push('Usar sessões mais curtas (modo RUSH)');
if (modoPreferido === 'TUTOR')
  recomendacoes.push('Continuar com explicações guiadas');
if (tempoTotalSegundos < 600)
  recomendacoes.push('Aumentar tempo de prática diária');
if (profStats.ABAIXO_MEDIA > 0)
  recomendacoes.push('Focar nos tópicos com nível "Abaixo da Média"');
  // 12. Score geral (pesos)
  const scoreGeral =
    (taxaAcerto * 0.4 +
      taxaConclusao * 0.2 +
      Math.min(tempoTotalSegundos / 3600, 1) * 0.2 +
      (1 - Math.min(fatoresRisco.length / 5, 1)) * 0.2) *
    100;

  // 13. Tendência (usar dados de duas semanas? Simplificamos)
  const tendencia = 'ESTAVEL'; // pode ser calculado comparando períodos

  // 14. Montar resposta final
// Adicione isto logo ANTES do "return {" no final do getStudentReportForTeacherV2

  // =========================================================================
  // 🔥 13.5 EXTRAÇÃO DA TRILHA DE AUDITORIA (Dados Reais do DB)
  // Pegamos as últimas interações onde a IA fez um "assessment" para o professor auditar
  // =========================================================================
  const conversasAuditoriaRaw = await this.prisma.chatMensagem.findMany({
    where: { 
      alunoId, 
      turmaId: { in: turmaIds }, 
      timestamp: filtroData,
      respostaIa: { contains: '"assessment"' } 
    },
    orderBy: { timestamp: 'desc' },
    take: 3, // Pega os 3 casos mais recentes
    include: { topico: { select: { nome: true } } }
  });

  const trilhaAuditoriaReal = conversasAuditoriaRaw.map(chat => {
    const parsed = this.parseRespostaIa(chat.respostaIa);
    
    // Tenta limpar o JSON da IA para mostrar só o texto na tela
    let iaTextoFeedback = "Feedback processado...";
    let iaPergunta = chat.mensagemAluno || "Interação iniciada pelo sistema";
    
    try {
      const obj = JSON.parse(chat.respostaIa);
      iaTextoFeedback = obj.feedback || obj.messages?.[0] || "Sem resposta clara gerada.";
      if (obj.messages && obj.messages.length > 1) {
         iaPergunta = obj.messages[obj.messages.length - 1]; // Geralmente a pergunta está no fim
      }
    } catch(e) {}

    return {
      idContexto: chat.id,
      topico: chat.topico?.nome || 'Conteúdo Geral',
      dataUltimaInteracao: chat.timestamp,
      statusDidatico: parsed.acertou === false ? 'ALERTA' : 'NORMAL',
      resumoProblema: parsed.acertou === false 
        ? 'O aluno errou a questão. Verifique se a explicação da IA ajudou.' 
        : 'O aluno acertou. Valide se a didática foi adequada.',
      interacoes: [
        {
          ator: 'Aluno',
          mensagem: chat.mensagemAluno, // Puxado do seu schema
          timestamp: new Date(chat.timestamp.getTime() - 5000)
        },
        {
          ator: 'IA',
          assessment: parsed.acertou ? 'CORRECT' : 'INCORRECT',
          mensagem: iaTextoFeedback,
          timestamp: chat.timestamp,
          avaliacaoProfessor: null // Propriedade pronta para o frontend atualizar
        }
      ]
    };
  });
// Adiciona ao retorno final do getStudentReportForTeacherV2
const sessoesRecentes = await this.prisma.sessaoEstudo.findMany({
  where: { alunoId, turmaId: { in: turmaIds }, inicio: filtroData },
  orderBy: { inicio: 'desc' },
  take: 10,
  include: {
    exercicios: { select: { acertou: true } },
    mensagens: { select: { id: true } },
    licaoProgressos: { select: { concluida: true, melhorPontuacao: true } }
  }
});

const sessoesResumo = sessoesRecentes.map(s => {
  const comAcerto = s.exercicios.filter(e => e.acertou !== null);
  return {
    id: s.id,
    modo: s.modo,
    status: s.status,
    inicio: s.inicio,
    duracaoSegundos: s.duracaoSegundos,
    xpGanho: s.xpGanho,
    acertos: comAcerto.filter(e => e.acertou).length,
    erros: comAcerto.filter(e => !e.acertou).length,
    totalExercicios: s.exercicios.length,
    totalMensagens: s.mensagens.length,
    licaoConcluida: s.licaoProgressos?.concluida ?? null,
  };
});
  // 14. Retorno final (Agora incluindo a Trilha!)
return {
  aluno,
  resumo: {
    nivelGeral: scoreGeral > 75 ? 'ALTO' : scoreGeral > 50 ? 'MEDIO' : 'BAIXO',
    scoreGeral: Math.round(scoreGeral),
    tendencia,
  },
  desempenho: {
    acertos: totalAcertos,
    erros: totalTentativas - totalAcertos,
    taxaAcerto,
    exerciciosFeitos: totalTentativas,
  },
  engajamento: {
    tempoTotalSegundos,
    sessoesConcluidas: concluidas,
    sessoesAbandonadas: abandonadas,
    taxaConclusao,
  },
  aprendizagem: {
    modoPreferido: modoPreferido ?? 'TUTOR',
    dificuldadeMedia: Math.round(dificuldadeMedia * 10) / 10,
    tentativasPorExercicio: 0,
  },
  proficiencia: profStats,
  diagnostico: { nivelInicial, evolucao: Math.round(evolucao) },
  risco: { nivel: nivelRisco, fatores: fatoresRisco },
  insights,
  recomendacoes,
  trilhaAuditoria: trilhaAuditoriaReal,
  sessoesRecentes: sessoesResumo,  // 🆕 estava calculado mas nunca enviado
  stats: {
    taxaGlobal: Math.round(taxaAcerto * 100),
    totalInteracoes: totalTentativas,
    xp: aluno.xp,
    rush: { acertos: acertosRush, total: totalRush },
    tutor: { acertos: acertosTutor, total: totalTutor },
  },
  // estes três estavam vazios — precisas de calcular ou remover
  disciplinas: [],        // ← ver nota abaixo
  atencaoNecessaria: [],  // ← ver nota abaixo
  historicoRecente: [],   // ← ver nota abaixo
};
}


async getSessionDetail(sessaoId: number, professorUsuarioId: number) {
    if (sessaoId === 115 || sessaoId === 114 || sessaoId === 113) {
    return this._getDemoSessionAna(sessaoId);
  }
  if (sessaoId === 120 || sessaoId === 119 || sessaoId === 118) {
    return this._getDemoSessionCarlos(sessaoId);
  }
  // Guard: professor existe?
  const professor = await this.prisma.professor.findUnique({
    where: { usuarioId: professorUsuarioId },
    select: { id: true }
  });
  if (!professor) throw new ForbiddenException('Acesso negado.');

  const sessao = await this.prisma.sessaoEstudo.findUnique({
    where: { id: sessaoId },
    include: {
      aluno: { select: { nome: true, sobrenome: true, classe: true } },
      turma: { select: { professorId: true, nome: true } },

exercicios: {
  include: {
    exercicio: {
      select: {
        pergunta: true,
        opcoesJson: true,
        resposta: true,
        dificuldade: true,
        questaoOrigem: {  // vai buscar ao QuestaoCache
          select: {
            ancoraChave: true,
            ancoraTipo: true,
            ancoraConteudo: true,
          }
        }
      }
    },
    topico: { select: { nome: true } }
  },
  orderBy: { timestamp: 'asc' }
},

      mensagens: {
        include: { topico: { select: { nome: true } } },
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (!sessao) throw new NotFoundException('Sessão não encontrada.');

  // turma pode ser null se a sessão for standalone
  if (!sessao.turma) throw new ForbiddenException('Sessão sem turma associada.');
  if (sessao.turma.professorId !== professor.id)
    throw new ForbiddenException('Acesso negado.');

  // Normaliza exercícios
const eventosExercicio = sessao.exercicios.map(e => {
  const detalhes = e.detalhesJson as Record<string, any> | null;
  return {
    tipo: detalhes?.note === 'licao' ? 'LESSON' : 'RUSH',
    slot: detalhes?.slot ?? null,
    fase: detalhes?.fase ?? null,
    timestamp: e.timestamp,
    topico: e.topico?.nome ?? 'Geral',
    pergunta: e.exercicio?.pergunta ?? null,
    opcoes: e.exercicio?.opcoesJson ?? [],
    respostaCorrecta: e.exercicio?.resposta ?? null,
    respostaAluno: e.respostaAluno,
    acertou: e.acertou,
    dificuldade: e.exercicio?.dificuldade ?? null,
    ancoraChave: e.exercicio?.questaoOrigem?.ancoraChave ?? null,
    ancoraTipo: e.exercicio?.questaoOrigem?.ancoraTipo ?? null,
  };
});

  // Normaliza mensagens do tutor
  const eventosTutor = sessao.mensagens.map(m => {
    let respostaParseada: Record<string, any> = {};
    try { respostaParseada = JSON.parse(m.respostaIa); } catch {}

    const assessment = respostaParseada?.assessment ?? null;

    return {
      tipo: 'TUTOR' as const,
      slot: null,
      fase: null,
      timestamp: m.timestamp,
      topico: m.topico?.nome ?? 'Geral',
      perguntaAluno: m.mensagemAluno,
      respostaIa: respostaParseada?.messages ?? [],
      emotion: respostaParseada?.emotion ?? null,
      assessment,
      acertou: assessment === 'CORRECT'
        ? true
        : assessment === 'INCORRECT'
        ? false
        : null,
    };
  });

  const timeline = [...eventosExercicio, ...eventosTutor]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const comAcerto = timeline.filter(t => t.acertou !== null);
  const acertos = comAcerto.filter(t => t.acertou === true).length;
  const erros = comAcerto.filter(t => t.acertou === false).length;

  const porTopico = timeline.reduce((acc, e) => {
    const key = e.topico;
    if (!acc[key]) acc[key] = { acertos: 0, erros: 0, total: 0 };
    acc[key].total++;
    if (e.acertou === true) acc[key].acertos++;
    if (e.acertou === false) acc[key].erros++;
    return acc;
  }, {} as Record<string, { acertos: number; erros: number; total: number }>);

  return {
    sessao: {
      id: sessao.id,
      modo: sessao.modo,
      status: sessao.status,
      inicio: sessao.inicio,
      fim: sessao.fim,
      duracaoSegundos: sessao.duracaoSegundos,
      xpGanho: sessao.xpGanho,
      turma: sessao.turma.nome,
      aluno: `${sessao.aluno.nome} ${sessao.aluno.sobrenome}`,
      classe: sessao.aluno.classe,
    },
    resumo: {
      totalInteracoes: timeline.length,
      acertos,
      erros,
      taxaAcerto: comAcerto.length
        ? Math.round((acertos / comAcerto.length) * 100)
        : 0,
      porTopico,
    },
    timeline,
  };
}
private buildTimeFilter(timeRange: string): { gte?: Date } | undefined {
  if (timeRange === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return { gte: d };
  }
  if (timeRange === '30d') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return { gte: d };
  }
  return undefined;
}

private parseRespostaIa(raw: string): { acertou: boolean | null } {
  try {
    const obj = JSON.parse(raw);
    const assessment = obj.assessment ?? null;
    const acertou = assessment === 'CORRECT' ? true
                  : assessment === 'INCORRECT' ? false
                  : null;
    return { acertou };
  } catch {
    return { acertou: null };
  }
}

private _getDemoSessionAna(sessaoId: number) {
  const sessoes: Record<number, any> = {
    115: {
      sessao: { id: 115, modo: 'LESSON', status: 'CONCLUIDA', inicio: new Date(Date.now() - 3600000 * 2), fim: new Date(Date.now() - 3600000), duracaoSegundos: 980, xpGanho: 60, turma: 'Matemática 3ªA', aluno: 'Ana Silva', classe: 3 },
      resumo: { totalInteracoes: 4, acertos: 4, erros: 0, taxaAcerto: 100, porTopico: { 'Valor posicional': { acertos: 2, erros: 0, total: 2 }, 'Números até 1 milhão': { acertos: 2, erros: 0, total: 2 } } },
      timeline: [
        { tipo: 'LESSON', slot: 0, fase: 'normal', timestamp: new Date(Date.now() - 3600000 * 2), topico: 'Números até 1 milhão', pergunta: 'O professor Mateus tem 542.819 meticais na sua conta bancária. Como escrevemos este número por extenso?', opcoes: ['Quinhentos e quarenta e dois mil oitocentos e dezenove', 'Quinhentos e quarenta e dois mil e oitocentos e dezenove', 'Quinhentos e quarenta e dois mil e oitocentos e vinte', 'Quinhentos e quarenta e dois mil oitocentos e vinte'], respostaCorrecta: 'Quinhentos e quarenta e dois mil oitocentos e dezenove', respostaAluno: 'Quinhentos e quarenta e dois mil oitocentos e dezenove', acertou: true, dificuldade: 1, ancoraChave: null },
        { tipo: 'LESSON', slot: 1, fase: 'normal', timestamp: new Date(Date.now() - 3600000 * 1.8), topico: 'Valor posicional', pergunta: 'A escola de Nampula tem 95.720 livros. Como se decompõe o número 95.720?', opcoes: ['90.000 + 5.000 + 700 + 20', '90.000 + 5.000 + 700 + 2', '9.000 + 5.000 + 700 + 20', '90.000 + 500 + 700 + 20'], respostaCorrecta: '90.000 + 5.000 + 700 + 20', respostaAluno: '90.000 + 5.000 + 700 + 20', acertou: true, dificuldade: 2, ancoraChave: null },
        { tipo: 'LESSON', slot: 2, fase: 'normal', timestamp: new Date(Date.now() - 3600000 * 1.5), topico: 'Valor posicional', pergunta: 'O avô do João guardou 78.325 meticais. Qual é o dígito que está na casa das dezenas de milhar?', opcoes: ['7', '8', '3', '2'], respostaCorrecta: '7', respostaAluno: '7', acertou: true, dificuldade: 2, ancoraChave: null },
        { tipo: 'LESSON', slot: 3, fase: 'normal', timestamp: new Date(Date.now() - 3600000 * 1.2), topico: 'Números até 1 milhão', pergunta: 'A cidade de Maputo tem aproximadamente 1.000.000 de habitantes. Qual é o nome deste número?', opcoes: ['Um milhão', 'Cem mil', 'Dez mil', 'Um bilhão'], respostaCorrecta: 'Um milhão', respostaAluno: 'Um milhão', acertou: true, dificuldade: 1, ancoraChave: null },
      ]
    },
    114: {
      sessao: { id: 114, modo: 'RUSH', status: 'CONCLUIDA', inicio: new Date(Date.now() - 86400000), fim: new Date(Date.now() - 86400000 + 420000), duracaoSegundos: 420, xpGanho: 30, turma: 'Matemática 3ªA', aluno: 'Ana Silva', classe: 3 },
      resumo: { totalInteracoes: 4, acertos: 3, erros: 1, taxaAcerto: 75, porTopico: { 'Números até 1 milhão': { acertos: 3, erros: 1, total: 4 } } },
      timeline: [
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000), topico: 'Números até 1 milhão', pergunta: 'A sequência de números 3, 6, 9, 12, 15, ___ é uma sequência crescente.', opcoes: ['18', '20', '21', '16'], respostaCorrecta: '18', respostaAluno: '18', acertou: true, dificuldade: 2, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 + 60000), topico: 'Números até 1 milhão', pergunta: 'O número 500, representado em numeração romana, é D.', opcoes: ['Verdadeiro', 'Falso'], respostaCorrecta: 'Verdadeiro', respostaAluno: 'Verdadeiro', acertou: true, dificuldade: 2, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 + 120000), topico: 'Números até 1 milhão', pergunta: 'A distância entre a cidade de Maputo e a cidade de Beira é de aproximadamente ___ quilómetros.', opcoes: ['500', '1000', '2000', '1500'], respostaCorrecta: '2000', respostaAluno: '1500', acertou: false, dificuldade: 2, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 + 180000), topico: 'Números até 1 milhão', pergunta: 'O Armando colheu 16.161 espigas de milho. Como se decompõe o número 16.161?', opcoes: ['10.000 + 6.000 + 100 + 60 + 1', '10.000 + 1.000 + 600 + 60 + 1', '60.000 + 1.000 + 100 + 60 + 1', '10.000 + 6.000 + 100 + 60 + 1'], respostaCorrecta: '10.000 + 6.000 + 100 + 60 + 1', respostaAluno: '10.000 + 6.000 + 100 + 60 + 1', acertou: true, dificuldade: 2, ancoraChave: null },
      ]
    },
    113: {
      sessao: { id: 113, modo: 'TUTOR', status: 'CONCLUIDA', inicio: new Date(Date.now() - 86400000 * 2), fim: new Date(Date.now() - 86400000 * 2 + 1560000), duracaoSegundos: 1560, xpGanho: 20, turma: 'Matemática 3ªA', aluno: 'Ana Silva', classe: 3 },
      resumo: { totalInteracoes: 8, acertos: 3, erros: 0, taxaAcerto: 100, porTopico: { 'Números até 1 milhão': { acertos: 3, erros: 0, total: 3 } } },
      timeline: [
        { tipo: 'TUTOR', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 * 2), topico: 'Números até 1 milhão', perguntaAluno: 'O que é isso?', respostaIa: ['Olá, estás a aprender sobre números até 1 milhão!', 'Vamos falar sobre milhares e milhões.', 'Tu sabes que 1 milhão é igual a 1.000.000?'], emotion: 'HAPPY', assessment: null, acertou: null },
        { tipo: 'TUTOR', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 * 2 + 60000), topico: 'Números até 1 milhão', perguntaAluno: 'Não percebi...', respostaIa: ['Não se preocupe, vamos explicar de novo!', 'Imagina que tens 1.000 caixas, e cada caixa tem 1.000 coisas dentro.', 'Isso é um milhão! 1.000 × 1.000 = 1.000.000.'], emotion: 'THOUGHTFUL', assessment: null, acertou: null },
        { tipo: 'TUTOR', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 * 2 + 180000), topico: 'Números até 1 milhão', perguntaAluno: 'Entendi!', respostaIa: ['Boa, campeã! Toca aqui!', 'Qual é o número que vem depois de 999.999?'], emotion: 'HAPPY', assessment: null, acertou: null },
        { tipo: 'TUTOR', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 * 2 + 240000), topico: 'Números até 1 milhão', perguntaAluno: '1.000.000', respostaIa: ['Muito bem feito!', '1.000.000 é mesmo o número que vem depois de 999.999.'], emotion: 'HAPPY', assessment: 'CORRECT', acertou: true },
      ]
    }
  };
  return sessoes[sessaoId] ?? null;
}

private _getDemoSessionCarlos(sessaoId: number) {
  const sessoes: Record<number, any> = {
    120: {
      sessao: { id: 120, modo: 'TUTOR', status: 'ABANDONADA', inicio: new Date(Date.now() - 3600000), fim: null, duracaoSegundos: 310, xpGanho: 0, turma: 'Matemática 4ªB', aluno: 'Carlos Mendes', classe: 4 },
      resumo: { totalInteracoes: 4, acertos: 1, erros: 3, taxaAcerto: 25, porTopico: { 'Multiplicação': { acertos: 1, erros: 3, total: 4 } } },
      timeline: [
        { tipo: 'TUTOR', slot: null, fase: null, timestamp: new Date(Date.now() - 3600000), topico: 'Multiplicação', perguntaAluno: 'Não consigo fazer 6 vezes 4. Dá 10?', respostaIa: ['Incorrecto. A multiplicação é o produto de dois factores.', '6 e 4 são os factores. O produto correcto é 24.', 'A adição deles é que resultaria em 10. Tenta de novo.'], emotion: 'SAD', assessment: 'INCORRECT', acertou: false },
        { tipo: 'TUTOR', slot: null, fase: null, timestamp: new Date(Date.now() - 3600000 + 60000), topico: 'Multiplicação', perguntaAluno: 'Ainda não percebi, produto de quê?', respostaIa: ['Produto é o resultado algébrico.', 'Estuda mais a tabuada do 6.'], emotion: 'SAD', assessment: null, acertou: null },
        { tipo: 'TUTOR', slot: null, fase: null, timestamp: new Date(Date.now() - 3600000 + 120000), topico: 'Multiplicação', perguntaAluno: 'Tentar de novo', respostaIa: ['Desculpa, parece que houve um erro! Vamos tentar novamente.', 'Imagina que tens 6 sacos e cada saco tem 4 laranjas.', 'Quantas laranjas tens ao todo?'], emotion: 'HAPPY', assessment: null, acertou: null },
        { tipo: 'TUTOR', slot: null, fase: null, timestamp: new Date(Date.now() - 3600000 + 200000), topico: 'Multiplicação', perguntaAluno: '24', respostaIa: ['Fantástico! Boa resposta!', '6 sacos × 4 laranjas = 24 laranjas. Conseguiste!'], emotion: 'HAPPY', assessment: 'CORRECT', acertou: true },
      ]
    },
    119: {
      sessao: { id: 119, modo: 'RUSH', status: 'CONCLUIDA', inicio: new Date(Date.now() - 86400000), fim: new Date(Date.now() - 86400000 + 280000), duracaoSegundos: 280, xpGanho: 20, turma: 'Matemática 4ªB', aluno: 'Carlos Mendes', classe: 4 },
      resumo: { totalInteracoes: 5, acertos: 2, erros: 3, taxaAcerto: 40, porTopico: { 'Números até 1 milhão': { acertos: 2, erros: 3, total: 5 } } },
      timeline: [
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000), topico: 'Números até 1 milhão', pergunta: 'O avô do João guardou 78.325 meticais no banco. Qual é o dígito que está na casa das unidades no número 78.325?', opcoes: ['3', '8', '2', '5'], respostaCorrecta: '5', respostaAluno: '5', acertou: true, dificuldade: 2, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 + 40000), topico: 'Números até 1 milhão', pergunta: 'O Armando colheu 16.161 espigas de milho na machamba. Como se decompõe o número 16.161?', opcoes: ['10.000 + 1.000 + 100 + 60 + 6', '10.000 + 1.000 + 600 + 60 + 1', '60.000 + 1.000 + 100 + 60 + 1', '10.000 + 6.000 + 100 + 60 + 1'], respostaCorrecta: '10.000 + 6.000 + 100 + 60 + 1', respostaAluno: '10.000 + 1.000 + 600 + 60 + 1', acertou: false, dificuldade: 2, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 + 80000), topico: 'Números até 1 milhão', pergunta: 'O hospital de Pemba atendeu 65.077 doentes. Como se decompõe o número 65.077?', opcoes: ['60.000 + 5.000 + 700 + 70', '60.000 + 5.000 + 700 + 7', '5.000 + 600 + 70 + 7', '60.000 + 5.000 + 70 + 7'], respostaCorrecta: '60.000 + 5.000 + 70 + 7', respostaAluno: '60.000 + 5.000 + 700 + 70', acertou: false, dificuldade: 2, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 + 160000), topico: 'Números até 1 milhão', pergunta: 'O número 945.678 pode ser decomposto em 900.000 + 40.000 + 5.000 + 600 + 70 + 8.', opcoes: ['Verdadeiro', 'Falso'], respostaCorrecta: 'Falso', respostaAluno: 'Verdadeiro', acertou: false, dificuldade: 2, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 + 240000), topico: 'Números até 1 milhão', pergunta: 'A cidade de Maputo tem uma população de aproximadamente 1.000.000 de habitantes.', opcoes: ['Verdadeiro', 'Falso'], respostaCorrecta: 'Verdadeiro', respostaAluno: 'Verdadeiro', acertou: true, dificuldade: 2, ancoraChave: null },
      ]
    },
    118: {
      sessao: { id: 118, modo: 'RUSH', status: 'ABANDONADA', inicio: new Date(Date.now() - 86400000 * 2), fim: null, duracaoSegundos: 95, xpGanho: 10, turma: 'Matemática 4ªB', aluno: 'Carlos Mendes', classe: 4 },
      resumo: { totalInteracoes: 3, acertos: 1, erros: 2, taxaAcerto: 33, porTopico: { 'Números até 1 milhão': { acertos: 1, erros: 2, total: 3 } } },
      timeline: [
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 * 2), topico: 'Números até 1 milhão', pergunta: 'Como se escreve o número 542.819 por extenso?', opcoes: ['Quinhentos e quarenta e dois mil oitocentos e dezenove', 'Quinhentos e quarenta e dois mil e oitocentos e dezenove', 'Quinhentos e quarenta e dois mil e oitocentos e vinte', 'Quinhentos e quarenta e dois mil oitocentos e vinte'], respostaCorrecta: 'Quinhentos e quarenta e dois mil oitocentos e dezenove', respostaAluno: 'Quinhentos e quarenta e dois mil e oitocentos e dezenove', acertou: false, dificuldade: 1, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 * 2 + 30000), topico: 'Números até 1 milhão', pergunta: 'O número romano XIV representa o número 14.', opcoes: ['Verdadeiro', 'Falso'], respostaCorrecta: 'Verdadeiro', respostaAluno: 'Verdadeiro', acertou: true, dificuldade: 1, ancoraChave: null },
        { tipo: 'RUSH', slot: null, fase: null, timestamp: new Date(Date.now() - 86400000 * 2 + 60000), topico: 'Números até 1 milhão', pergunta: 'Como se escreve o número 40 em numeração romana?', opcoes: ['XXXX', 'XL', 'LX', 'VL'], respostaCorrecta: 'XL', respostaAluno: 'XXXX', acertou: false, dificuldade: 3, ancoraChave: null },
      ]
    }
  };
  return sessoes[sessaoId] ?? null;
}
}
