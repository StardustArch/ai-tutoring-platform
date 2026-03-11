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
}