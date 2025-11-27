import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendChatDto, MicroserviceChatRequestDto } from './dto/send-chat.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService
  ) {
    // Garante que a URL não termina em barra para evitar //
    const baseUrl = process.env.IA_API_URL;
    this.aiServiceUrl = `${baseUrl}/generate-chat-response`;
  }

  async sendChat(usuarioId: number, dto: SendChatDto) {
    // 1. Validar Aluno e Permissões (Segurança)
    const aluno = await this.prisma.aluno.findFirst({
        where: { 
            id: dto.alunoId, 
            encarregado: { usuarioId } 
        },
        select: { id: true, classe: true }
    });

    if (!aluno) {
      this.logger.warn(`Tentativa de acesso não autorizado ao aluno ${dto.alunoId} pelo user ${usuarioId}`);
      throw new NotFoundException('Aluno não encontrado.');
    }

    // 2. Buscar Histórico (Limitado às últimas 10 trocas para contexto)
    const rawHistory = await this.prisma.chatMensagem.findMany({
        where: { alunoId: aluno.id },
        orderBy: { timestamp: 'asc' },
        take: 10,
        select: { mensagemAluno: true, respostaIa: true }
    });
    
    const formattedHistory = this.formatarHistoricoParaIA(rawHistory);
    
    // 3. Payload para o Microserviço Python
    const aiRequest: MicroserviceChatRequestDto = {
        student_id: aluno.id,
        student_class: aluno.classe,
        user_query: dto.userQuery,
        mode: dto.mode || 'tutor', 
        history: formattedHistory
    };
    
    let iaResponseText: string;

    // 4. Chamada ao Python
    try {
        const response = await firstValueFrom(
            this.httpService.post(this.aiServiceUrl, aiRequest)
        );
        console.log('🚩 [DEBUG] Python respondeu com sucesso!', response);
        iaResponseText = response.data.response_text;
    } catch (error) {
        this.logger.error(`ERRO MICROSERVIÇO IA: ${error.message}`, error.response?.data);
        throw new InternalServerErrorException('O KaniMente está indisponível momentaneamente.');
    }

    // 5. TRATAMENTO DA RESPOSTA (A mudança crítica)
    // Se for modo Tutor, a resposta é um JSON Stringificado vindo do Python.
    // NÃO podemos usar regex de limpeza de Markdown aqui, pois pode quebrar o JSON.
    // O Python já faz a sanitização necessária.
    
    const finalResponse = iaResponseText.trim(); 

    // 6. Persistência na Base de Dados
    try {
        const novaMensagem = await this.prisma.chatMensagem.create({
            data: {
                alunoId: aluno.id,
                mensagemAluno: dto.userQuery,
                respostaIa: finalResponse, // Guarda o JSON string ou texto puro
                tipoInteracao: 'EXPLICACAO' // Podes ajustar isto futuramente
            },
            select: { 
                id: true, 
                respostaIa: true, 
                mensagemAluno: true, 
                timestamp: true 
            }
        });

        return {
            message: 'Processado com sucesso',
            // O Frontend fará o JSON.parse disto
            response: novaMensagem.respostaIa 
        };
        
    } catch (e) {
        this.logger.error('ERRO AO GUARDAR CHAT NA BD:', e);
        // Mesmo que falhe a guardar, devolvemos a resposta para não frustrar o aluno
        return {
            message: 'Resposta recebida (erro de histórico)',
            response: finalResponse
        };
    }
  }
  
  /**
   * Formata o histórico.
   * Nota: Se respostaIa for JSON, o Python agora sabe lidar com isso (extrai apenas o texto no lado dele),
   * então podemos enviar a string crua aqui sem problemas.
   */
  private formatarHistoricoParaIA(rawHistory: any[]): any[] {
            const history: Array<{ role: string, text: string }> = []; 
      for (const entry of rawHistory) {
          if (entry.mensagemAluno) {
              history.push({ role: "user", text: entry.mensagemAluno });
          }
          if (entry.respostaIa) {
              history.push({ role: "model", text: entry.respostaIa });
          }
      }
      return history;
  }
}