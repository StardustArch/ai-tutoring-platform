import { Controller, Post, Body, UseGuards, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { SendChatDto } from './dto/send-chat.dto';

@Controller('api/chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true })) // Garante que o DTO está limpo
  async sendChat(@Request() req, @Body() dto: SendChatDto) {
    // req.user.id vem do JWT (Encarregado)
    return this.chatService.sendChat(req.user.id, dto);
  }
}