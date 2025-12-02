import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherService {
constructor(private prisma: PrismaService) {}

async getProfessorStats(professorId: number) {
  // 1. Descobrir a disciplina do Professor
  // (Assumindo que o Professor está ligado a disciplinas ou turmas específicas)
  const turmasProfessor = await this.prisma.turma.findMany({
      where: { professorId },
      select: { id: true, disciplinaId: true }
  });

  const disciplinaIds = turmasProfessor.map(t => t.disciplinaId);

  // 2. Buscar mensagens APENAS dessas disciplinas
  const stats = await this.prisma.chatMensagem.groupBy({
      by: ['topicoId'],
      where: {
          topico: {
              disciplinaId: { in: disciplinaIds } // <--- O FILTRO MÁGICO
          },
          // Opcional: filtrar apenas pelos alunos das turmas dele
          aluno: {
              alunoTurmas: {
                  some: { turmaId: { in: turmasProfessor.map(t => t.id) } }
              }
          }
      },
      _count: { id: true }
  });

  return stats;
}
}
