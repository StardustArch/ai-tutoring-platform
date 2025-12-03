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
              include: { disciplina: true }
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

  async getGuardianReport(alunoId: number, usuarioId: number) {    // 1. Validar Aluno
    const aluno = await this.prisma.aluno.findFirst({
      where: {
        id: alunoId,
        encarregado: {
          usuarioId: usuarioId // <--- AQUI ESTÁ A SEGURANÇA
        }
      },
      select: { id: true, nome: true, classe: true }
    });

    // Se não encontrar, ou o aluno não existe ou não pertence a este pai.
    // Lançamos ForbiddenException para ser semanticamente correto.
    if (!aluno) {
      throw new ForbiddenException('Não tem permissão para ver este relatório.');
    }
    // 2. Buscar Stats do CHAT (Agrupado por Contexto)
    const chatStats = await this.prisma.chatMensagem.groupBy({
      by: ['turmaId'],
      where: { alunoId },
      _count: { id: true }
    });

    // 3. Buscar Stats do RUSH (Agrupado por Contexto e Acerto)
    const rushStats = await this.prisma.exercicioResultado.groupBy({
      by: ['turmaId', 'acertou'],
      where: { alunoId },
      _count: { id: true }
    });

    // 4. Buscar Informação das Turmas (para dar nome aos IDs)
    // Extraímos todos os turmaIds encontrados nos resultados
    const turmaIds = new Set([
      ...chatStats.map(c => c.turmaId).filter(id => id !== null),
      ...rushStats.map(r => r.turmaId).filter(id => id !== null)
    ]);

    const turmasInfo = await this.prisma.turma.findMany({
      where: { id: { in: Array.from(turmaIds) as number[] } },
      select: { id: true, nome: true, disciplina: { select: { nome: true } } }
    });

    // 5. Processar e Separar os Dados
    // --- A. DADOS AUTÓNOMOS (CASA) ---
    const chatCasa = chatStats.find(c => c.turmaId === null)?._count.id || 0;

    const rushCasaAcertos = rushStats.find(r => r.turmaId === null && r.acertou)?._count.id || 0;
    const rushCasaErros = rushStats.find(r => r.turmaId === null && !r.acertou)?._count.id || 0;
    const rushCasaTotal = rushCasaAcertos + rushCasaErros;

    // --- B. DADOS ESCOLARES (AGREGADOS) ---
    // Aqui somamos tudo o que tem turmaId != null
    const chatEscola = chatStats
      .filter(c => c.turmaId !== null)
      .reduce((acc, curr) => acc + curr._count.id, 0);

    const rushEscolaAcertos = rushStats
      .filter(r => r.turmaId !== null && r.acertou)
      .reduce((acc, curr) => acc + curr._count.id, 0);

    const rushEscolaErros = rushStats
      .filter(r => r.turmaId !== null && !r.acertou)
      .reduce((acc, curr) => acc + curr._count.id, 0);

    const rushEscolaTotal = rushEscolaAcertos + rushEscolaErros;

    // --- C. DETALHE POR TURMA (Opcional, mas útil) ---
    const detalheTurmas = turmasInfo.map(t => {
      const msgs = chatStats.find(c => c.turmaId === t.id)?._count.id || 0;
      const acertos = rushStats.find(r => r.turmaId === t.id && r.acertou)?._count.id || 0;
      const totalRush = rushStats.filter(r => r.turmaId === t.id).reduce((acc, curr) => acc + curr._count.id, 0);

      return {
        nome: t.nome,
        disciplina: t.disciplina.nome,
        interacoesChat: msgs,
        exerciciosFeitos: totalRush,
        taxaAcerto: totalRush > 0 ? Math.round((acertos / totalRush) * 100) : 0
      };
    });

    return {
      aluno,
      geral: {
        casa: {
          chat: chatCasa,
          rush: { total: rushCasaTotal, taxaAcerto: rushCasaTotal > 0 ? Math.round((rushCasaAcertos / rushCasaTotal) * 100) : 0 }
        },
        escola: {
          chat: chatEscola,
          rush: { total: rushEscolaTotal, taxaAcerto: rushEscolaTotal > 0 ? Math.round((rushEscolaAcertos / rushEscolaTotal) * 100) : 0 }
        }
      },
      turmas: detalheTurmas
    };
  }
async getGuardianOverview(usuarioId: number) {
    // 1. Identificar o Encarregado e os seus Alunos
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId },
      include: { alunos: { select: { id: true } } }
    });

    if (!encarregado) throw new ForbiddenException('Perfil não encontrado.');

    const alunoIds = encarregado.alunos.map(a => a.id);

    if (alunoIds.length === 0) {
      return { totalAlunos: 0, totalAtividades: 0, mediaAcerto: 0, topicosExplorados: 0 };
    }

    // 2. Executar TODAS as queries em paralelo para performance máxima
    const [
        totalChat, 
        totalRush, 
        totalAcertos, 
        chatTopics, 
        rushTopics
    ] = await Promise.all([
        
        // A. Contagem de Chat (Apenas Interações de Valor)
        this.prisma.chatMensagem.count({
            where: {
                alunoId: { in: alunoIds },
                tipoInteracao: { in: ['EXPLICACAO', 'PERGUNTA', 'EXERCICIO'] }
            }
        }),

        // B. Contagem de Rush Total
        this.prisma.exercicioResultado.count({
            where: { alunoId: { in: alunoIds } }
        }),

        // C. Contagem de Rush Acertos
        this.prisma.exercicioResultado.count({
            where: { 
                alunoId: { in: alunoIds },
                acertou: true 
            }
        }),

        // D. Tópicos Distintos no Chat (Sugestão 2)
        this.prisma.chatMensagem.findMany({
            where: { 
                alunoId: { in: alunoIds },
                topicoId: { not: null } 
            },
            distinct: ['topicoId'],
            select: { topicoId: true }
        }),

        // E. Tópicos Distintos no Rush (Sugestão 2)
        this.prisma.exercicioResultado.findMany({
            where: { alunoId: { in: alunoIds } },
            distinct: ['topicoId'],
            select: { topicoId: true }
        })
    ]);

    // 3. Processar Dados
    
    // Calcular Tópicos Únicos (União de conjuntos Chat + Rush)
    // Se ele estudou "Verbos" no Chat e no Rush, conta apenas como 1 Tópico.
    const uniqueTopicIds = new Set([
        ...chatTopics.map(t => t.topicoId),
        ...rushTopics.map(t => t.topicoId)
    ]);

    const totalAtividades = totalChat + totalRush;
    const taxaAcertoGlobal = totalRush > 0 ? Math.round((totalAcertos / totalRush) * 100) : 0;

    return {
      totalAlunos: alunoIds.length,
      totalAtividades,      // Métrica de Volume (Qualidade)
      mediaAcerto: taxaAcertoGlobal, // Métrica de Desempenho
      topicosExplorados: uniqueTopicIds.size // Métrica de Diversidade (Nova)
    };
  }
}