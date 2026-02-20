import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajuste o caminho conforme sua estrutura
import { CreateProfessorDto } from './dto/create-professor.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // ==========================================================
  // 👨‍🏫 PERFIL PROFESSOR (O que faltava)
  // ==========================================================
  
  /**
   * Cria o perfil de Professor para um utilizador existente.
   * Recebe o ID do utilizador e o nome da escola (opcional).
   */
  async createProfessorProfile(userId: number, dto: CreateProfessorDto) {
    console.log(`[ProfileService] Utilizador ${userId} a tentar criar perfil de Professor`);

    // 1. Verificar se o utilizador já tem este perfil
    const existingProfile = await this.prisma.professor.findUnique({
      where: { usuarioId: userId },
    });

    if (existingProfile) {
      throw new ConflictException('O utilizador já possui um perfil de Professor.');
    }

    // 2. Criar o novo perfil e ligá-lo ao utilizador
    // Nota: Não precisamos de validar escola, apenas guardamos a string se vier.
    const newProfile = await this.prisma.professor.create({
      data: {
        escolaNome: dto.escolaNome || null, // Guarda o nome ou null
        usuario: {
          connect: { id: userId }, // Liga ao 'Usuario' existente na tabela pai
        },
      },
    });

    return newProfile;
  }

  // ==========================================================
  // 👨‍👩‍👧‍👦 PERFIL ENCARREGADO (Já existente)
  // ==========================================================

  /**
   * Lógica para criar um Perfil de Encarregado
   */
  async createEncarregadoProfile(userId: number) {
    console.log(`[ProfileService] Utilizador ${userId} a tentar criar perfil de Encarregado`);

    const existingProfile = await this.prisma.encarregado.findUnique({
      where: { usuarioId: userId },
    });
    
    if (existingProfile) {
      throw new ConflictException('O utilizador já possui um perfil de Encarregado.');
    }

    const newProfile = await this.prisma.encarregado.create({
      data: {
        usuario: {
          connect: { id: userId },
        },
      },
    });
    return newProfile;
  }

  // ==========================================================
  // ⚙️ UTILIZADOR BASE (Atualização)
  // ==========================================================

  async updateUserProfile(userId: number, dto: UpdateUserDto) {
    console.log(`[UserService] Atualizando perfil do utilizador ${userId}`);

    const existingUser = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    // Verificar email único se estiver a ser alterado
    if (dto.email && dto.email !== existingUser.email) {
      const emailExists = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Este email já está em uso por outro utilizador');
      }
    }

    try {
      const updatedUser = await this.prisma.usuario.update({
        where: { id: userId },
        data: {
          nome: dto.nome,
          sobrenome: dto.sobrenome,
          email: dto.email,
          telefone: dto.telefone
        },
        select: {
          id: true,
          email: true,
          nome: true,
          sobrenome: true,
          telefone: true,
          perfilEncarregado: true,
          perfilProfessor: true,
        },
      });

      return {
        message: 'Perfil atualizado com sucesso',
        user: updatedUser,
      };
    } catch (error) {
      console.error('Erro ao atualizar utilizador:', error);
      throw new Error('Erro interno ao atualizar perfil');
    }
  }

  async getUnifiedDashboardData(userId: number) {
  // 1. Verificar os perfis existentes
  const user = await this.prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      perfilProfessor: true,
      perfilEncarregado: true,
    },
  });

  const promises = [];

  // 2. Preparar as queries baseadas no perfil
  const professorDataPromise = user?.perfilProfessor
    ? this.getProfessorDashboard(user.perfilProfessor.id)
    : Promise.resolve(null);

  const encarregadoDataPromise = user?.perfilEncarregado
    ? this.getEncarregadoDashboard(user.perfilEncarregado.id)
    : Promise.resolve(null);

  const [professorData, encarregadoData] = await Promise.all([
    professorDataPromise,
    encarregadoDataPromise,
  ]);

  // 3. Montar o objeto unificado seguindo a estrutura do seu Front-end
  return {
    professor: professorData,
    encarregado: encarregadoData,
    stats: {
      totalAlunosEnsina: professorData?.totalAlunos || 0,
      totalTurmas: professorData?.totalTurmas || 0,
      totalEducandos: encarregadoData?.totalEducandos || 0,
      atividadesHoje: encarregadoData?.atividadesHoje || 0,
    }
  };
}

// Métodos auxiliares privados para manter o código limpo
private async getProfessorDashboard(professorId: number) {
  const [totalTurmas, turmas] = await Promise.all([
    this.prisma.turma.count({ where: { professorId, ativa: true } }),
    this.prisma.turma.findMany({
      where: { professorId, ativa: true },
      take: 3,
      orderBy: { criadoEm: 'desc' },
      include: { _count: { select: { alunos: true } } }
    })
  ]);

  // Contagem de alunos únicos
  const totalAlunos = await this.prisma.alunoTurma.count({
    where: { turma: { professorId } }
  });

  return {
    totalTurmas,
    totalAlunos,
    turmasRecentes: turmas.map(t => ({
      id: t.id,
      nome: t.nome,
      totalAlunos: t._count.alunos
    }))
  };
}

private async getEncarregadoDashboard(encarregadoId: number) {
  const educandos = await this.prisma.aluno.findMany({
    where: { encarregadoId },
    include: {
      exercicioResultados: {
        take: 5,
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  // Cálculo de atividades hoje (filtro de data simplificado)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const atividadesHoje = await this.prisma.exercicioResultado.count({
    where: {
      aluno: { encarregadoId },
      timestamp: { gte: hoje }
    }
  });

  return {
    totalEducandos: educandos.length,
    atividadesHoje,
    educandos: educandos.map(e => ({
      id: e.id,
      nome: e.nome,
      classe: e.classe,
      desempenho: this.calcularMedia(e.exercicioResultados) // Função helper sua
    })),
    atividadesRecentes: [] // Mapear aqui exercicioResultados se necessário
  };
}

private calcularMedia(resultados: any[]): number {
  if (resultados.length === 0) return 0;
  const acertos = resultados.filter(r => r.acertou).length;
  return Math.round((acertos / resultados.length) * 100);
}
}