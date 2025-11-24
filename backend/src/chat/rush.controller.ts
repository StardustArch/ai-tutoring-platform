import { Controller, Post, Get, Body, Param, BadRequestException, ParseIntPipe, Query } from '@nestjs/common';
import { RushService } from './rush.service';
import { AnswerExerciseDto } from './dto/answer-exercise.dto';

@Controller('api/rush')
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
  
  // Adicionar este endpoint
  @Get('topics')
  async getTopics(@Query('classe') classe: number) {
    if (!classe) throw new BadRequestException('Classe é obrigatória');
    return this.rushService.getTopicsByClass(Number(classe));
  }

  @Post('answer')
  async answer(@Body() dto: AnswerExerciseDto) {
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
      exercicio.topicoId
    );

    // Gera feedback
    const feedback = await this.rushService.generateRushFeedback({
      alunoId: dto.alunoId,
      student_class: dto.classe || 5,
      user_query: `Pergunta: ${exercicio.pergunta}. Resposta do aluno: ${dto.respostaAluno}. Correta: ${exercicio.resposta}. Acertou: ${acertou}`
    });

    return {
      acertou,
      feedback,
      savedResultId: saved.id,
      blocked: saved.blocked,
      blockedUntil: saved.blockedUntil,
      livesRemaining: saved.livesRemaining
    };
  }

  @Get('stats/:alunoId')
  async getStats(@Param('alunoId', ParseIntPipe) alunoId: number) {
    return this.rushService.getStudentStats(alunoId);
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