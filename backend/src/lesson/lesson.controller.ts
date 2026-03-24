import {
  Controller, Post, Body, Param, ParseIntPipe,
  BadRequestException, UseGuards,
  Get
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/lesson')
@UseGuards(AuthGuard('jwt'))
export class LessonController {
  constructor(private readonly licaoService: LessonService) {}

  // ── POST /api/licao/start ────────────────────────────────────────────────
  // Inicia uma nova lição e devolve a primeira pergunta
  @Post('start')
  async start(@Body() body: {
    alunoId: number;
    topicoId: number;
    turmaId?: number;
  }) {
    if (!body.alunoId) throw new BadRequestException('alunoId é obrigatório');
    if (!body.topicoId) throw new BadRequestException('topicoId é obrigatório');
    const data = await this.licaoService.startLicao(
      body.alunoId,
      body.topicoId,
      body.turmaId,
    );
    console.log(data)
    return data;
  }

  // ── POST /api/licao/answer ───────────────────────────────────────────────
  // Regista a resposta e devolve: acertou, done, revisaoCount, nextReady
  @Post('answer')
  async answer(@Body() body: {
    progressoId: number;
    exercicioId: number;
    respostaAluno: string;
  }) {
    if (!body.progressoId) throw new BadRequestException('progressoId é obrigatório');
    if (!body.exercicioId) throw new BadRequestException('exercicioId é obrigatório');
    if (body.respostaAluno === undefined) throw new BadRequestException('respostaAluno é obrigatório');

    return this.licaoService.answerSlot(
      body.progressoId,
      body.exercicioId,
      body.respostaAluno,
    );
  }

  // ── POST /api/licao/next ─────────────────────────────────────────────────
  // Pede a próxima pergunta (chamado após o aluno clicar "Continuar")
  @Post('next')
  async next(@Body() body: { progressoId: number }) {
    if (!body.progressoId) throw new BadRequestException('progressoId é obrigatório');
    const data = await this.licaoService.nextQuestion(body.progressoId);
    console.log(data)
    return data;
  }

    // ── GET /api/licao/historico/:alunoId ────────────────────────────────────
  // Devolve { [topicoId]: { tentativas, melhorPontuacao, totalSlots, concluida } }
  // Usado pela página de configuração para mostrar o progresso por tópico
  @Get('historico/:alunoId')
  async historico(@Param('alunoId', ParseIntPipe) alunoId: number) {
    return this.licaoService.getHistorico(alunoId);
  }
}