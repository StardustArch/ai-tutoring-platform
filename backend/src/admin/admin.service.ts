import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ListTopicsDto } from './dto/list-topics.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async getDashboardStats() {
    // 1. Executar verificação da IA e Queries da BD em paralelo
    const [totalAlunos, totalProfs, totalTurmas, sessoesHoje, aiStatus] =
      await Promise.all([
        this.prisma.aluno.count(),
        this.prisma.professor.count(),
        this.prisma.turma.count({ where: { ativa: true } }),
        this.prisma.sessaoEstudo.count({
          where: { inicio: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        }),
        this.checkAiHealth(), // <--- A nossa nova função
      ]);

    return {
      users: { alunos: totalAlunos, professores: totalProfs },
      system: {
        turmasAtivas: totalTurmas,
        sessoesHoje,
        aiService: aiStatus, // Retorna: { status: 'ONLINE', latency: 45 } ou { status: 'OFFLINE' }
      },
    };
  }

  // --- Função Privada para testar a IA ---
  private async checkAiHealth() {
    const start = Date.now();
    // URL do teu serviço Python (põe no .env depois!)
    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    try {
      // Tenta bater na rota /health com timeout de 3s
      await firstValueFrom(
        this.httpService.get(`${aiUrl}/health`, { timeout: 3000 }),
      );

      const latency = Date.now() - start;
      return { status: 'ONLINE', latency: `${latency}ms` };
    } catch (error) {
      console.error('IA Service Error:', error.message);
      return { status: 'OFFLINE', error: 'Timeout ou Erro de Conexão' };
    }
  }
  // --- GESTÃO DE TÓPICOS ---
  // Agora recebe o DTO tipado
  async createTopic(dto: CreateTopicDto) {
    const disciplina = await this.prisma.disciplina.findUnique({
      where: { id: dto.disciplinaId },
    });

    if (!disciplina) throw new NotFoundException('Disciplina não encontrada');

    return this.prisma.topico.create({
      data: {
        nome: dto.nome,
        nivelClasse: dto.classe,
        disciplinaId: dto.disciplinaId,
        ordem: dto.ordem || 1,
        metadata: {
          ai_context: dto.contextoIA,
          difficulty_base: dto.dificuldadeBase || 1,
        },
      },
    });
  }

  // Agora recebe o DTO
  async listTopics(params: ListTopicsDto) {
    return this.prisma.topico.findMany({
      where: {
        nivelClasse: params.classe,
        disciplinaId: params.disciplinaId,
      },
      orderBy: { ordem: 'asc' },
    });
  }

  // --- GESTÃO DE UTILIZADORES ---
  // Agora recebe o DTO de paginação
  async getAllUsers(pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    return this.prisma.usuario.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        perfilProfessor: { select: { id: true } },
        perfilEncarregado: { select: { id: true } },
      },
    });
  }
}
