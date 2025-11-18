import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessorDto } from './dto/create-professor.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lógica para criar um Perfil de Encarregado
   * (Fluxo Universal, passo 2)
   */
  async createEncarregadoProfile(userId: number) {
    console.log(`[ProfileService] Utilizador ${userId} a tentar criar perfil de Encarregado`);

    // 1. Verificar se o utilizador já tem este perfil
    const existingProfile = await this.prisma.encarregado.findUnique({
      where: { usuarioId: userId },
    });
    if (existingProfile) {
      throw new ConflictException('O utilizador já possui um perfil de Encarregado.');
    }

    // 2. Criar o novo perfil e ligá-lo ao utilizador
    const newProfile = await this.prisma.encarregado.create({
      data: {
        usuario: {
          connect: { id: userId }, // Liga ao 'Usuario' existente
        },
      },
    });
    return newProfile;
  }

  /**
   * Lógica para criar um Perfil de Professor
   * (Fluxo Universal, passo 2)
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
    const newProfile = await this.prisma.professor.create({
      data: {
        escola: dto.escola,
        usuario: {
          connect: { id: userId }, // Liga ao 'Usuario' existente
        },
      },
    });
    return newProfile;
  }


  /**
   * Atualiza o perfil do utilizador
   */
  async updateUserProfile(userId: number, dto: UpdateUserDto) {
    console.log(`[UserService] Atualizando perfil do utilizador ${userId}`);

    // Verificar se o utilizador existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    // Verificar se o email já está em uso por outro utilizador
    if (dto.email !== existingUser.email) {
      const emailExists = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException('Este email já está em uso por outro utilizador');
      }
    }

    // Atualizar o utilizador
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
}