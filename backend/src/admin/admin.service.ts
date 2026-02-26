import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ListTopicsDto } from './dto/list-topics.dto';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { HttpService } from '@nestjs/axios';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as os from 'os';

@Injectable()
export class AdminService {
    private readonly aiUrl: string;
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {
        const baseUrl = process.env.IA_API_URL;
    this.aiUrl = `${baseUrl}/health`;
  }

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

    try {
      // Tenta bater na rota /health com timeout de 3s
      await firstValueFrom(
        this.httpService.get(this.aiUrl, { timeout: 3000 }),
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
// 1. LISTAR COM PESQUISA E PAGINAÇÃO
  async getAllUsers(params: PaginationDto) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause = params.search ? {
      OR: [
        { nome: { contains: params.search, mode: 'insensitive' as const } },
        { email: { contains: params.search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.usuario.findMany({
        skip,
        take: limit,
        where: whereClause,
        orderBy: { id: 'desc' },
        select: { // NÃO RETORNAR PASSWORD HASH
          id: true, 
          nome: true, 
          sobrenome: true,
          email: true, 
          role: true,
          ativo: true, // <--- Novo campo
          telefone: true,
          perfilProfessor: { select: { id: true, escolaNome: true } },
          perfilEncarregado: { select: { id: true } }
        }
      }),
      this.prisma.usuario.count({ where: whereClause })
    ]);

    return {
      data: users,
      meta: { total, page, lastPage: Math.ceil(total / limit) }
    };
  }
// 2. OBTER UM UTILIZADOR (Detalhes) - CORRIGIDO
  async getUserById(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        perfilProfessor: { include: { turmas: true } }, 
        perfilEncarregado: { include: { alunos: true } }
      }
    });

    if (!user) throw new NotFoundException('Utilizador não encontrado');

    // SOLUÇÃO PARA O ERRO DO DELETE:
    // Em vez de "delete user.passwordHash", usamos desestruturação para tirar os campos sensíveis
    const { passwordHash, hashedRt, ...userWithoutSecrets } = user;
    
    return userWithoutSecrets;
  }

  // 3. CRIAR UTILIZADOR (Manual) - CORRIGIDO (O erro do 'ativo' some após o npx prisma generate)
  async createUser(dto: CreateUserDto) {
    const exists = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email já registado');

    const hash = await bcrypt.hash(dto.password, 10);

    return this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        sobrenome: dto.sobrenome,
        email: dto.email,
        telefone: dto.telefone,
        passwordHash: hash,
        role: dto.role,
        ativo: true // Este erro desaparece depois de correres o comando no terminal
      }
    });
  }

  // 4. ATUALIZAR DADOS BÁSICOS
  async updateUser(id: number, dto: UpdateUserDto) {
    return this.prisma.usuario.update({
      where: { id },
      data: { ...dto }
    });
  }

  // 5. BLOQUEAR / DESBLOQUEAR (Toggle) - CORRIGIDO
  async toggleBlockStatus(id: number) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');

    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: !user.ativo }, // O TS agora vai reconhecer o campo 'ativo'
      select: { id: true, ativo: true, email: true }
    });
  }
  // 6. RESET DE SENHA (Manual pelo Admin)
  async resetPassword(id: number) {
    const defaultPass = 'Mudar123!'; // Senha temporária
    const hash = await bcrypt.hash(defaultPass, 10);

    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash: hash }
    });

    return { message: `Senha resetada para: ${defaultPass}` };
  }

  // 7. PROMOVER/DESPROMOVER ROLE
  async changeRole(id: number, role: 'ADMIN' | 'USER') {
    return this.prisma.usuario.update({
      where: { id },
      data: { role },
      select: { id: true, role: true }
    });
  }


  // No topo do ficheiro

// Dentro da classe AdminService
async getSystemHealth() {
    const memory = process.memoryUsage();
    
    // Teste de latência da BD
    const dbStart = Date.now();
    await this.prisma.$queryRaw`SELECT 1`; 
    const dbLatency = Date.now() - dbStart;

    // Teste de latência da IA
    const aiHealth = await this.checkAiHealth();

    const now = new Date();
    
    // Configurador de Data "Enterprise" (DD/MM/AAAA HH:mm:ss)
    const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // <--- Força formato 24h (sem AM/PM)
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Garante que usa o fuso do servidor
    });

    return {
        server: {
            uptime: process.uptime(), // Segundos
            nodeVersion: process.version,
            platform: `${os.type()} ${os.release()} (${os.arch()})`,
            memory: {
                heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
                rss: Math.round(memory.rss / 1024 / 1024), // MB
                total: Math.round(os.totalmem() / 1024 / 1024) // MB Sistema
            }
        },
        services: {
            database: { status: 'ONLINE', latency: dbLatency },
            ai: aiHealth
        },
        env: {
            // MOSTRAR APENAS VARIÁVEIS SEGURAS
            apiUrl: process.env.PUBLIC_API_URL_HOST || 'Não definido',
            aiUrl: this.aiUrl || 'Não definido',
            envMode: process.env.NODE_ENV || 'development',
timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, 
serverTime: dateFormatter.format(now)
        },
        timestamp: new Date().toISOString()
    };
}
}
