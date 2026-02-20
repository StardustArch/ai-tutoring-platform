import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisciplineService {
  constructor(private prisma: PrismaService) {}
  /**
   * Lista todas as disciplinas disponíveis (Português, Matemática, etc.).
   */
  async listarDisciplinas() {

    // Busca todas as disciplinas (que foram criadas pelo seed)
    return this.prisma.disciplina.findMany({
      select: {
        id: true,
        nome: true,
      },
      orderBy: { nome: 'asc' },
    });
  }
}
