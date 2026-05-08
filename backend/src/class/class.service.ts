import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { randomInt } from 'crypto';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 👨‍🏫 LÓGICA DO PROFESSOR
  // ==========================================

  async criarTurma(usuarioId: number, dto: CreateClassDto) {
    // 1. Validar Professor
    const professor = await this.prisma.professor.findUnique({
      where: { usuarioId },
    });

    if (!professor) {
      throw new ForbiddenException('Apenas professores podem criar turmas.');
    }

    // 2. Validar Disciplina
    const disciplina = await this.prisma.disciplina.findUnique({
      where: { id: dto.disciplinaId },
    });

    if (!disciplina) {
      throw new NotFoundException('Disciplina inválida.');
    }

    // 3. Gerar e Criar
    const codigo = this.gerarCodigoTurma();

    const turma = await this.prisma.turma.create({
      data: {
        nome: dto.nome,
        codigo,
        disciplinaId: dto.disciplinaId,
        professorId: professor.id,
        escolaNome: professor.escolaNome || 'Escola Não Informada',
        classe: dto.classe, // ✅ AQUI: Salvamos a classe (ex: 5)
      },
    });

    return {
      message: 'Turma criada com sucesso!',
      turma,
    };
  }

  async atualizarTurma(
    turmaId: number,
    usuarioId: number,
    dto: UpdateClassDto,
  ) {
    await this.validarPropriedadeTurma(turmaId, usuarioId);

    const turma = await this.prisma.turma.update({
      where: { id: turmaId },
      data: {
        nome: dto.nome,
        ativa: dto.ativa,
      },
    });

    return {
      message: 'Turma atualizada com sucesso',
      turma,
    };
  }
  async listarTurmasProfessor(usuarioId: number) {
    const professor = await this.prisma.professor.findUnique({
      where: { usuarioId },
      include: {
        turmas: {
          where: { ativa: true },
          orderBy: { criadoEm: 'desc' },
          include: {
            disciplina: true,
            _count: { select: { alunos: true } }, // Contagem rápida
          },
        },
      },
    });

    if (!professor) return [];

    return professor.turmas.map((t) => ({
      id: t.id,
      nome: t.nome,
      codigo: t.codigo,
      disciplina: t.disciplina.nome,
      totalAlunos: t._count.alunos,
      escola: t.escolaNome,
    }));
  }

  async getTurmaDetalhes(turmaId: number, usuarioId: number) {
    const turma = await this.prisma.turma.findFirst({
      where: { id: turmaId, professor: { usuarioId } },
      include: {
        disciplina: true,
        _count: { select: { alunos: true } },
      },
    });

    if (!turma) throw new NotFoundException('Turma não encontrada');

    return turma;
  }

  async renovarCodigoTurma(turmaId: number, usuarioId: number) {
    await this.validarPropriedadeTurma(turmaId, usuarioId);

    const novoCodigo = this.gerarCodigoTurma();

    return this.prisma.turma.update({
      where: { id: turmaId },
      data: { codigo: novoCodigo },
    });
  }

  async desativarTurma(turmaId: number, usuarioId: number) {
    await this.validarPropriedadeTurma(turmaId, usuarioId);

    return this.prisma.turma.update({
      where: { id: turmaId },
      data: { ativa: false },
    });
  }

  // ==========================================
  // 🎓 GESTÃO DE ALUNOS (Dentro da Turma)
  // ==========================================

  async listarAlunosTurma(turmaId: number, usuarioId: number) {
    await this.validarPropriedadeTurma(turmaId, usuarioId);

    const relacao = await this.prisma.alunoTurma.findMany({
      where: { turmaId },
      include: {
        aluno: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            classe: true,
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    return relacao.map((r) => ({
      ...r.aluno,
      dataEntrada: r.criadoEm,
    }));
  }

  async removerAlunoTurma(turmaId: number, alunoId: number, usuarioId: number) {
    await this.validarPropriedadeTurma(turmaId, usuarioId);

    // Encontrar a relação específica e apagar
    const relacao = await this.prisma.alunoTurma.findUnique({
      where: {
        alunoId_turmaId: {
          // Chave composta definida no Prisma Schema
          alunoId,
          turmaId,
        },
      },
    });

    if (!relacao) throw new NotFoundException('Aluno não está nesta turma.');

    await this.prisma.alunoTurma.delete({
      where: {
        alunoId_turmaId: { alunoId, turmaId },
      },
    });

    return { message: 'Aluno removido.' };
  }

  // ==========================================
  // 👨‍👩‍👧‍👦 LÓGICA DO ENCARREGADO (JOIN)
  // ==========================================

  // Passo 1: Verificar código e mostrar detalhes da turma
  async verificarCodigoTurma(codigo: string, usuarioId: number) {
    const turma = await this.prisma.turma.findUnique({
      where: { codigo: this.normalizarCodigo(codigo) },
      include: {
        disciplina: true,
        professor: { include: { usuario: true } },
      },
    });

    if (!turma || !turma.ativa) {
      throw new NotFoundException('Código inválido ou turma fechada.');
    }

    // Buscar alunos do encarregado para ele escolher quem entra
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId },
      include: { alunos: true },
    });

    if (!encarregado || encarregado.alunos.length === 0) {
      throw new BadRequestException(
        'Precisa registar alunos antes de entrar numa turma.',
      );
    }

    // Verifica quem já está na turma para desabilitar o botão no frontend
    const alunosNaTurma = await this.prisma.alunoTurma.findMany({
      where: {
        turmaId: turma.id,
        alunoId: { in: encarregado.alunos.map((a) => a.id) },
      },
    });
    const idsNaTurma = alunosNaTurma.map((a) => a.alunoId);

    return {
      turma: {
        id: turma.id,
        nome: turma.nome,
        codigo: turma.codigo,
        escola: turma.escolaNome,
        disciplina: turma.disciplina.nome,
        professor: `${turma.professor.usuario.nome} ${turma.professor.usuario.sobrenome}`,
      },
      meusAlunos: encarregado.alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        jaInscrito: idsNaTurma.includes(a.id),
      })),
    };
  }

  private normalizarCodigo(codigo: string): string {
    return codigo.toUpperCase().trim();
  }
  // Passo 2: Confirmar entrada
  async adicionarAlunoTurmaComCodigo(
    codigo: string,
    alunoId: number,
    usuarioId: number,
  ) {
    // Em verificarCodigoTurma:

    // Em adicionarAlunoTurmaComCodigo:

    // Re-verificar turma
    const turma = await this.prisma.turma.findUnique({
      where: { codigo: this.normalizarCodigo(codigo) },
    });
    if (!turma || !turma.ativa)
      throw new BadRequestException('Turma inválida.');

    // Verificar se o aluno pertence mesmo a este encarregado
    const aluno = await this.prisma.aluno.findFirst({
      where: {
        id: alunoId,
        encarregado: { usuarioId },
      },
    });

    if (!aluno) throw new ForbiddenException('Este aluno não lhe pertence.');

    // Criar relação (Try/Catch para evitar erro de duplicidade)
    try {
      await this.prisma.alunoTurma.create({
        data: {
          turmaId: turma.id,
          alunoId: aluno.id,
        },
      });
      return { message: 'Aluno matriculado com sucesso!' };
    } catch (error) {
      throw new BadRequestException('O aluno já está nesta turma.');
    }
  }

  async listarTurmasEncarregado(usuarioId: number) {
    // Busca complexa: Encarregado -> Alunos -> Turmas
    const encarregado = await this.prisma.encarregado.findUnique({
      where: { usuarioId },
      include: {
        alunos: {
          include: {
            alunoTurmas: {
              include: {
                turma: { include: { disciplina: true } },
              },
            },
          },
        },
      },
    });

    if (!encarregado) return [];

    // Aplainar a lista (Flatten)
    const lista: {
      alunoNome: string;
      turmaNome: string;
      disciplina: string;
      escola: string | null;
    }[] = [];
    for (const aluno of encarregado.alunos) {
      for (const at of aluno.alunoTurmas) {
        lista.push({
          alunoNome: aluno.nome,
          turmaNome: at.turma.nome,
          disciplina: at.turma.disciplina.nome,
          escola: at.turma.escolaNome,
        });
      }
    }
    return lista;
  }

  // ==========================================
  // 🛠️ AUXILIARES
  // ==========================================

  private gerarCodigoTurma(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars[randomInt(0, chars.length)];
    }
    return result;
  }

  private async validarPropriedadeTurma(turmaId: number, usuarioId: number) {
    const count = await this.prisma.turma.count({
      where: { id: turmaId, professor: { usuarioId } },
    });
    if (count === 0)
      throw new ForbiddenException('Turma não encontrada ou sem permissão.');
  }
  async getTopicsForStudent(
    classe: number,
    alunoId: number,
    requesterId: number,
    turmaId?: number,
  ) {
    const aluno = await this.prisma.aluno.findFirst({
      where: {
        id: alunoId,
        encarregado: { usuarioId: requesterId }, // encarregado
      },
    });

    // Se não é encarregado, verificar se é professor da turma
    if (!aluno && turmaId) {
      const turma = await this.prisma.turma.findFirst({
        where: { id: turmaId, professor: { usuarioId: requesterId } },
      });
      if (!turma)
        throw new ForbiddenException('Sem permissão para ver este aluno.');
    } else if (!aluno) {
      throw new ForbiddenException('Sem permissão.');
    }

    let whereClause: any = { nivelClasse: classe };

    // 🚨 LÓGICA NOVA: Se vier TurmaID, filtra pelo que o professor liberou
    if (turmaId) {
      whereClause = {
        ...whereClause,
        turmasComAcesso: {
          some: { id: turmaId },
        },
      };
    }

    // 1. Buscar tópicos (Agora com o filtro dinâmico)
    const todosTopicos = await this.prisma.topico.findMany({
      where: whereClause,
      include: { disciplina: true },
      orderBy: [{ disciplinaId: 'asc' }, { ordem: 'asc' }],
    });

    // Se for modo Turma e não houver tópicos, avisar ou retornar vazio
    if (turmaId && todosTopicos.length === 0) {
      // Podes retornar vazio, o frontend mostra "Professor ainda não liberou conteúdos"
      return { matematica: [], portugues: [] };
    }

    // 2. Buscar o progresso do aluno (Mantém igual)
    const progresso = await this.prisma.alunoProficienciaTopico.findMany({
      where: { alunoId: alunoId },
      select: { topicoId: true, nivel: true },
    });

    const topicosConcluidos = new Set(
      progresso
        .filter((p) => p.nivel !== 'NAO_DIAGNOSTICADO')
        .map((p) => p.topicoId),
    );

    // 3. Processar Bloqueios (Mantém a tua lógica de gamificação)
    const topicosProcessados = todosTopicos.map((topico) => {
      let isLocked = false;
      let isCompleted = topicosConcluidos.has(topico.id);

      // Regra de Gamificação: Se ordem > 1, verifica o anterior
      // NOTA: No modo Turma, se o professor libertou o tópico 5 mas não o 4,
      // esta lógica pode bloquear o 5.
      // Para Turma, talvez queiras remover o bloqueio sequencial?
      // Por agora, mantemos a lógica original:
      if (topico.ordem > 1) {
        const anterior = todosTopicos.find(
          (t) =>
            t.disciplinaId === topico.disciplinaId &&
            t.ordem === topico.ordem - 1,
        );

        if (anterior && !topicosConcluidos.has(anterior.id)) {
          isLocked = true;
        }
      }

      return { ...topico, isLocked, isCompleted };
    });

    // 4. Retorno
    return {
      matematica: topicosProcessados.filter(
        (t) => t.disciplina.nome === 'Matemática',
      ),
      portugues: topicosProcessados.filter(
        (t) => t.disciplina.nome === 'Português',
      ),
    };
  }

  async atualizarTopicosTurma(
    turmaId: number,
    usuarioId: number,
    topicosIds: number[],
  ) {
    // 1. Validar se a turma pertence ao professor
    await this.validarPropriedadeTurma(turmaId, usuarioId);

    // 2. Validar se os tópicos pertencem à disciplina da turma
    // (Para evitar que um professor de Mat adicione tópicos de Português)
    const turma = await this.prisma.turma.findUnique({
      where: { id: turmaId },
      select: { disciplinaId: true },
    });

    const countValidos = await this.prisma.topico.count({
      where: {
        id: { in: topicosIds },
        disciplinaId: turma?.disciplinaId,
      },
    });

    if (countValidos !== topicosIds.length) {
      throw new BadRequestException(
        'Alguns tópicos não pertencem à disciplina desta turma.',
      );
    }

    // 3. Atualizar a lista (A técnica "set" substitui tudo o que estava lá pelos novos)
    await this.prisma.turma.update({
      where: { id: turmaId },
      data: {
        topicosDisponiveis: {
          set: topicosIds.map((id) => ({ id })),
        },
      },
    });

    return { message: 'Conteúdos da turma atualizados com sucesso!' };
  }

  async listarTopicosGerenciamento(turmaId: number, usuarioId: number) {
    await this.validarPropriedadeTurma(turmaId, usuarioId);

    const turma = await this.prisma.turma.findUnique({
      where: { id: turmaId },
      include: {
        disciplina: true,
        topicosDisponiveis: { select: { id: true } },
      },
    });

    const idsAtivos = new Set(turma?.topicosDisponiveis.map((t) => t.id));

    // ✅ A CORREÇÃO DA BRECHA:
    // Filtra por Disciplina E por Classe
    const topicosDaClasse = await this.prisma.topico.findMany({
      where: {
        disciplinaId: turma?.disciplinaId,
        nivelClasse: turma?.classe, // <--- Só traz tópicos da 5ª classe se a turma for da 5ª
      },
      orderBy: { ordem: 'asc' },
    });

    return topicosDaClasse.map((topico) => ({
      id: topico.id,
      nome: topico.nome,
      nivel: topico.nivelClasse,
      ordem: topico.ordem,
      ativo: idsAtivos.has(topico.id),
    }));
  }
}
