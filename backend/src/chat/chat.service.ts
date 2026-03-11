import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendChatDto, MicroserviceChatRequestDto } from './dto/send-chat.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { TipoInteracaoChat } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {
    const baseUrl = process.env.IA_API_URL || 'http://localhost:8000';
    this.aiServiceUrl = `${baseUrl}/generate-chat-response`;
  }

  async sendChat(usuarioId: number, dto: SendChatDto) {
    // 1. Validar Aluno
    const aluno = await this.prisma.aluno.findFirst({
      where: { id: dto.alunoId, encarregado: { usuarioId } },
      select: { id: true, classe: true },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado.');

    if (dto.turmaId) {
      const pertence = await this.prisma.alunoTurma.findFirst({
        where: { alunoId: dto.alunoId, turmaId: dto.turmaId },
      });
      if (!pertence)
        throw new ForbiddenException('Aluno não pertence a esta turma.');
    }

    // 2. Resolver Tópico
    let aiContextRules = '';
    let currentTopicoId: number | null = null;

    if (dto.topic && dto.subject) {
      const topicoDb = await this.prisma.topico.findFirst({
        where: {
          nome: dto.topic,
          nivelClasse: aluno.classe,
          disciplina: { nome: dto.subject },
        },
        select: { id: true, metadata: true },
      });
      if (topicoDb) {
        currentTopicoId = topicoDb.id;
        const meta = topicoDb.metadata as any;
        if (meta?.ai_rules) aiContextRules = meta.ai_rules;
      }
    }

    // 3. ── MEMÓRIA CONTEXTUAL ────────────────────────────────────────────────
    // Busca os tópicos onde o aluno teve mais dificuldade nos últimos 7 dias.
    // Injeta este contexto no prompt para o Kani poder referenciar os pontos fracos.
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const errosRecentes = await this.prisma.exercicioResultado.findMany({
      where: {
        alunoId: aluno.id,
        acertou: false,
        timestamp: { gte: seteDiasAtras },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { topico: { select: { nome: true } } },
    });

    // Conta quantas vezes errou em cada tópico → ordena pelos mais problemáticos
    const contagemErros: Record<string, number> = {};
    for (const r of errosRecentes) {
      const nome = r.topico?.nome;
      if (nome) contagemErros[nome] = (contagemErros[nome] || 0) + 1;
    }
    const topicosProblematicos = Object.entries(contagemErros)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nome]) => nome);

    // Constrói o bloco de contexto que vai ser injectado nas context_rules
    let memoriaContexto = '';
    if (topicosProblematicos.length > 0) {
      memoriaContexto =
        `\n\n📊 CONTEXTO DO ALUNO (usa com naturalidade, não reveles os números):\n` +
        `O aluno teve dificuldades recentes em: ${topicosProblematicos.join(', ')}.\n` +
        `Se o tópico actual for um destes, começa por reconhecer que é uma área difícil e encoraja-o.\n` +
        `Se for um tópico diferente, não precisas de mencionar os outros.`;
    }

    // 4. Buscar Histórico
    const rawHistory = await this.prisma.chatMensagem.findMany({
      where: {
        alunoId: aluno.id,
        ...(currentTopicoId ? { topicoId: currentTopicoId } : {}),
        turmaId: dto.turmaId || null, // ← isola o contexto por turma
      },
      orderBy: { timestamp: 'desc' },
      take: 6,
      select: {
        mensagemAluno: true,
        respostaIa: true,
        tipoInteracao: true,
      },
    });
    const chronologicalHistory = rawHistory.reverse();
    const formattedHistory = this.formatarHistoricoParaIA(chronologicalHistory);

    // 5. Payload para o Python — memoriaContexto junta-se às context_rules do tópico
    const aiRequest: MicroserviceChatRequestDto = {
      student_id: aluno.id,
      student_class: aluno.classe,
      user_query: dto.userQuery,
      mode: 'tutor',
      history: formattedHistory,
      subject: dto.subject || 'Geral',
      topic: dto.topic || 'Geral',
      context_rules: aiContextRules + memoriaContexto, // ← injecção da memória
    };

    let finalResponse: string;

    // 6. Chamada ao Python
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.aiServiceUrl, aiRequest),
      );
      finalResponse = response.data.response_text;
    } catch (error) {
      this.logger.error(`ERRO IA: ${error.message}`);
      finalResponse = JSON.stringify({
        text: 'O KMind está a pensar... Podes tentar de novo?',
        emotion: 'THOUGHTFUL',
        interaction_type: 'CHIPS',
        interaction_data: { options: ['Tentar'] },
      });
    }

    // 7. Persistência
    let tipoSalvo: TipoInteracaoChat = 'EXPLICACAO';
    let topicoIdSalvo = currentTopicoId;

    try {
      const jsonResp = JSON.parse(finalResponse);
      if (['CHIPS', 'CLOZE', 'TESTING'].includes(jsonResp.interaction_type)) {
        tipoSalvo = 'PERGUNTA';
      } else if (['RUSH_DRILL'].includes(jsonResp.interaction_type)) {
        tipoSalvo = 'RUSH';
      }
    } catch (e) {
      /* assume EXPLICACAO */
    }

    await this.prisma.chatMensagem.create({
      data: {
        alunoId: aluno.id,
        mensagemAluno: dto.userQuery,
        respostaIa: finalResponse,
        tipoInteracao: tipoSalvo,
        topicoId: topicoIdSalvo,
        turmaId: dto.turmaId || null,
        sessaoId: dto.sessaoId || null,
      },
    });

    return { message: 'Sucesso', response: finalResponse };
  }

  private formatarHistoricoParaIA(rawHistory: any[]): any[] {
    const history: Array<{ role: string; text: string; type?: string }> = [];
    for (const entry of rawHistory) {
      if (entry.mensagemAluno) {
        history.push({ role: 'user', text: entry.mensagemAluno });
      }
      if (entry.respostaIa) {
        history.push({
          role: 'model',
          text: entry.respostaIa,
          type: entry.tipoInteracao,
        });
      }
    }
    return history;
  }
}
