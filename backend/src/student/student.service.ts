import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

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
}