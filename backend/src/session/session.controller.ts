// session.controller.ts
import { Controller, Post, Body, Param, Patch, UseGuards, Request, Get, ParseIntPipe } from '@nestjs/common';
import { SessionService } from './session.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/session')
@UseGuards(AuthGuard('jwt'))
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('start')
  start(
    @Request() req, 
    // 👇 ADICIONEI 'alunoId: number' AQUI
    @Body() body: { modo: 'TUTOR' | 'RUSH', turmaId?: number, topicosIds: number[], alunoId: number } 
  ) {
    return this.sessionService.startSession(req.user.id, body);
  }

  @Patch(':id/end')
  end(@Param('id') id: string) {
    return this.sessionService.endSession(+id);
  }

  @Get(':id')
  async getSession(@Param('id', ParseIntPipe) id: number) {
    return this.sessionService.findOne(id);
  }
}