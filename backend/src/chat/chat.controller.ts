import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { SendChatDto } from './dto/send-chat.dto';

@Controller('api/chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  async sendChat(@Request() req, @Body() dto: SendChatDto) {
    // Requer o ID do aluno e a query, e usa o ID do usuário logado para segurança
    return this.chatService.sendChat(req.user.id, dto);
  }
}