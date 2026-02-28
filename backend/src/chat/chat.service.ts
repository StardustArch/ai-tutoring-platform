import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendChatDto, MicroserviceChatRequestDto } from './dto/send-chat.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { TipoInteracaoChat } from '@prisma/client'; // Importa o Enum do Prisma

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService
  ) {
    const baseUrl = process.env.IA_API_URL || 'http://localhost:8000'; // Default seguro
    this.aiServiceUrl = `${baseUrl}/generate-chat-response`;
  }

  async sendChat(usuarioId: number, dto: SendChatDto) {
    // 1. Validar Aluno
    const aluno = await this.prisma.aluno.findFirst({
        where: { id: dto.alunoId, encarregado: { usuarioId } },
        select: { id: true, classe: true }
    });

    if (!aluno) throw new NotFoundException('Aluno não encontrado.');

    if (dto.turmaId) {
        // Verifica se o aluno realmente pertence a essa turma
        const pertence = await this.prisma.alunoTurma.findFirst({
            where: { alunoId: dto.alunoId, turmaId: dto.turmaId }
        });
        if (!pertence) throw new ForbiddenException("Aluno não pertence a esta turma.");
    }

    // 2. Resolver Tópico (Para Contexto e Filtro de Histórico)
    let aiContextRules = "";
    let currentTopicoId: number | null = null;
    
    if (dto.topic && dto.subject) {
        const topicoDb = await this.prisma.topico.findFirst({
            where: { 
                nome: dto.topic, 
                nivelClasse: aluno.classe, 
                disciplina: { nome: dto.subject } 
            },
            select: { id: true, metadata: true }
        });

        if (topicoDb) {
            currentTopicoId = topicoDb.id;
            const meta = topicoDb.metadata as any;
            if (meta?.ai_rules) aiContextRules = meta.ai_rules;
        }
    }

    // 3. Buscar Histórico (CORRIGIDO)
    // Lógica: "Dá-me as últimas 10 mensagens DESTE aluno NESTE tópico"
    const rawHistory = await this.prisma.chatMensagem.findMany({
        where: { 
            alunoId: aluno.id,
            // SE tivermos tópico identificado, filtramos por ele. 
            // Isto resolve o bug "Litros vs Números".
            ...(currentTopicoId ? { topicoId: currentTopicoId } : {}) 
        },
        // IMPORTANTE: Queremos as mais recentes (desc), depois invertemos no JS
        orderBy: { timestamp: 'desc' }, 
        take: 6, // 6 é suficiente para contexto e poupa tokens
        select: { 
            mensagemAluno: true, 
            respostaIa: true, 
            tipoInteracao: true // Precisamos disto para o Python
        }
    });
    
    // Inverte para ficar cronológico: [Msg Antiga -> Msg Recente]
    const chronologicalHistory = rawHistory.reverse();
    const formattedHistory = this.formatarHistoricoParaIA(chronologicalHistory);
    
    // 4. Payload para o Python
    const aiRequest: MicroserviceChatRequestDto = {
        student_id: aluno.id,
        student_class: aluno.classe,
        user_query: dto.userQuery,
        mode: 'tutor',
        history: formattedHistory,
        subject: dto.subject || "Geral",
        topic: dto.topic || "Geral",
        context_rules: aiContextRules
    };
    
    let finalResponse: string;

    // 5. Chamada ao Python
    try {
        const response = await firstValueFrom(
            this.httpService.post(this.aiServiceUrl, aiRequest)
        );
        finalResponse = response.data.response_text;
    } catch (error) { 
        this.logger.error(`ERRO IA: ${error.message}`);
        finalResponse = JSON.stringify({
            text: "O KMind está a pensar... Podes tentar de novo?",
            emotion: "THOUGHTFUL",
            interaction_type: "CHIPS", // Tipo neutro
            interaction_data: { options: ["Tentar"] }
        });
    }

    // 6. Persistência Inteligente (Salvar o Tipo Correto)
    let tipoSalvo: TipoInteracaoChat = 'EXPLICACAO'; // Default
    let topicoIdSalvo = currentTopicoId;

    try {
        const jsonResp = JSON.parse(finalResponse);
        // Mapeia o tipo do JSON da IA para o Enum do Prisma
        if (['CHIPS', 'CLOZE', 'TESTING'].includes(jsonResp.interaction_type)) {
            tipoSalvo = 'PERGUNTA'; // Ou o valor equivalente no teu Enum
        } else if (['RUSH_DRILL'].includes(jsonResp.interaction_type)) {
             tipoSalvo = 'RUSH';
        }
        // Se for explicação, mantém o default
    } catch (e) {
        // Se falhar o parse, assume explicação genérica
    }

    await this.prisma.chatMensagem.create({
        data: {
            alunoId: aluno.id,
            mensagemAluno: dto.userQuery,
            respostaIa: finalResponse, 
            tipoInteracao: tipoSalvo, // ✅ Agora salvamos se foi Pergunta ou Explicação
            topicoId: topicoIdSalvo,   // ✅ Vinculamos ao tópico para filtrar no futuro
            turmaId: dto.turmaId || null,
            sessaoId: dto.sessaoId || null // <--- LINHA NOVA: Liga à sessão se existir
        }
    });

    return { message: 'Sucesso', response: finalResponse };
  }
  
  // ✅ CORREÇÃO NO FORMATTER
  private formatarHistoricoParaIA(rawHistory: any[]): any[] {
      const history: Array<{ role: string, text: string, type?: string }> = []; 
      
      for (const entry of rawHistory) {
          if (entry.mensagemAluno) {
              history.push({ role: "user", text: entry.mensagemAluno });
          }
          if (entry.respostaIa) {
              // Envia o TIPO para o Python usar no [STATE: TYPE]
              history.push({ 
                  role: "model", 
                  text: entry.respostaIa,
                  type: entry.tipoInteracao // O Python vai ler isto!
              });
          }
      }
      return history;
  }
}