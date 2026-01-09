
// session.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

async startSession(userId: number, dto: { modo: 'TUTOR' | 'RUSH', turmaId?: number, topicosIds: number[], alunoId: number }) {
    
    // 1. SEGURANÇA: Verificar se o aluno pertence a este encarregado
    const aluno = await this.prisma.aluno.findFirst({
        where: { 
            id: dto.alunoId,
            encarregado: { usuarioId: userId } // Link mágico
        }
    });

    if (!aluno) {
        throw new ForbiddenException('Não tens permissão para iniciar sessão com este aluno.');
    }

    // 2. Criar a sessão
    return this.prisma.sessaoEstudo.create({
      data: {
        alunoId: dto.alunoId,
        modo: dto.modo,
        turmaId: dto.turmaId || null,
        topicosAlvo: dto.topicosIds as any, // 'as any' ou InputJsonValue para o Prisma aceitar o array
        status: 'EM_ANDAMENTO'
      }
    });
  }

  async endSession(sessaoId: number) {
    const fim = new Date();
    
    // 1. Calcular estatísticas desta sessão específica
    const exercicios = await this.prisma.exercicioResultado.findMany({
      where: { sessaoId, acertou: true }
    });
    
    // Assumindo 10 XP por acerto (podes ajustar a lógica)
    const xpGanhoNaSessao = exercicios.length * 10;

    // 2. Buscar a sessão para pegar o inicio
    const sessao = await this.prisma.sessaoEstudo.findUnique({ where: { id: sessaoId } });
    
    let duracao = 0;
    if (sessao) {
        const diff = fim.getTime() - sessao.inicio.getTime();
        duracao = Math.floor(diff / 1000); // Segundos
    }

    // 3. Fechar a conta
    return this.prisma.sessaoEstudo.update({
      where: { id: sessaoId },
      data: {
        fim,
        status: 'CONCLUIDA',
        duracaoSegundos: duracao,
        xpGanho: xpGanhoNaSessao
      }
    });
  }

  async findOne(id: number) {
    const session = await this.prisma.sessaoEstudo.findUnique({
      where: { id },
    });

    if (!session) {
        throw new NotFoundException(`Sessão ${id} não encontrada`);
    }

    return session;
  }
}