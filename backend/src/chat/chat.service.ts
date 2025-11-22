import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendChatDto, MicroserviceChatRequestDto } from './dto/send-chat.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

const AI_SERVICE_URL = process.env.IA_API_URL; 

@Injectable()
export class ChatService {
  private readonly aiServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService
  ) {
    this.aiServiceUrl = `${AI_SERVICE_URL}/generate-chat-response`;
  }

  async sendChat(usuarioId: number, dto: SendChatDto) {
    // 1. Validar Aluno
    const aluno = await this.prisma.aluno.findFirst({
        where: { id: dto.alunoId, encarregado: { usuarioId } },
        select: { id: true, classe: true }
    });

    if (!aluno) throw new NotFoundException('Aluno não encontrado.');

    // 2. Buscar Histórico Recente
    const rawHistory = await this.prisma.chatMensagem.findMany({
        where: { alunoId: aluno.id },
        orderBy: { timestamp: 'asc' },
        take: 10,
        select: { mensagemAluno: true, respostaIa: true }
    });
    
    const formattedHistory = this.formatarHistoricoParaIA(rawHistory);
    
    // 3. Preparar Pedido para o Microserviço Python
const aiRequest: MicroserviceChatRequestDto = {
        student_id: aluno.id,
        student_class: aluno.classe,
        user_query: dto.userQuery,
        mode: dto.mode || 'tutor', // ✅ Envia o modo para o Python
        history: formattedHistory
    };
    
    let iaResponseText: string;

    try {
        const response = await firstValueFrom(
            this.httpService.post(this.aiServiceUrl, aiRequest)
        );
        iaResponseText = response.data.response_text;
    } catch (error) {
        console.error(`ERRO MICROSERVIÇO IA:`, error);
        throw new InternalServerErrorException('O KaniMente está a dormir. Tenta já.');
    }

    // 4. LIMPEZA INTELIGENTE
    // Remove cabeçalhos Markdown (#) para não ficar gigante no chat
    // Mas MANTÉM negrito (**) e as tags de opções (<< >>)
    let cleanResponse = iaResponseText
        .replace(/#+\s*/g, '') // Remove header MD
        .replace(/\n{3,}/g, '\n\n') // Remove excesso de quebras de linha
        .trim();

    // 5. Guardar na Base de Dados
    try {
        const novaMensagem = await this.prisma.chatMensagem.create({
            data: {
                alunoId: aluno.id,
                mensagemAluno: dto.userQuery,
                respostaIa: cleanResponse,
            },
            select: { id: true, respostaIa: true, mensagemAluno: true, timestamp: true }
        });

        return {
            message: 'Processado',
            response: novaMensagem.respostaIa // Envia o texto com <<opcoes>> para o front tratar
        };
        
    } catch (e) {
        console.error('ERRO DB:', e);
        return { message: 'Erro ao guardar', response: cleanResponse };
    }
  }
  
  private formatarHistoricoParaIA(rawHistory: any[]): any[] {
            const history: Array<{ role: string, text: string }> = []; 

      for (const entry of rawHistory) {
          if (entry.mensagemAluno) history.push({ role: "user", text: entry.mensagemAluno });
          if (entry.respostaIa) history.push({ role: "model", text: entry.respostaIa });
      }
      return history;
  }
}