import { Controller, Post, Get, Body, Param, BadRequestException, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { RushService } from './rush.service';
import { AnswerExerciseDto } from './dto/answer-exercise.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/rush')
@UseGuards(AuthGuard('jwt'))
export class RushController {
  constructor(private readonly rushService: RushService) { }

  @Post('next')
  async nextQuestion(@Body() body: {
    alunoId?: number;
    classe: number;
    disciplina: string;
    subtopico: string
  }) {
    if (!body.classe) {
      throw new BadRequestException('classe é obrigatório');
    }
    if (!body.subtopico) {
      throw new BadRequestException('subtopico é obrigatório');
    }

    return this.rushService.getNextQuestion(
      body.alunoId ?? 0, // 0 = anónimo (sem verificação de bloqueio)
      body.classe,
      body.disciplina || 'matematica',
      body.subtopico
    );
  }
  
  @Post('answer')
  async answer(@Body() dto: AnswerExerciseDto) {
    console.log("fgj",dto)
    if (!dto.alunoId) {
      throw new BadRequestException('alunoId é obrigatório');
    }
    if (!dto.exercicioId) {
      throw new BadRequestException('exercicioId é obrigatório');
    }
    
    // Recupera o exercício
    const exercicio = await this.rushService.findExercicio(dto.exercicioId);

    // Valida resposta
    const acertou = String(dto.respostaAluno).trim() === String(exercicio.resposta).trim();

    // Salva resultado (usa o topicoId do exercício!)
    const saved = await this.rushService.saveExerciseResult(
      dto.alunoId,
      dto.exercicioId,
      dto.respostaAluno,
      acertou,
      exercicio.topicoId,
      dto.turmaId,
      dto.sessaoId // <--- Passar o que vem do frontend
    );

    return {
      acertou,
      savedResultId: saved.id,
      blocked: saved.blocked,
      blockedUntil: saved.blockedUntil,
      livesRemaining: saved.livesRemaining
    };
  }

@Get('stats/:alunoId')
  async getStats(
    @Param('alunoId', ParseIntPipe) alunoId: number,
    @Query('turmaId') turmaId?: string // <--- NOVO
  ) {
    const tId = turmaId ? parseInt(turmaId) : null;
    return this.rushService.getStudentStats(alunoId, tId);
  }

  @Get('lives/:alunoId')
  async getLives(
    @Param('alunoId', ParseIntPipe) alunoId: number,
    @Query('disciplina') disciplina: string,
    @Query('subtopico') subtopico: string,
    @Query('classe') classe: number
  ) {
    return this.rushService.getCurrentLives(alunoId, disciplina, subtopico, classe);
  }

}