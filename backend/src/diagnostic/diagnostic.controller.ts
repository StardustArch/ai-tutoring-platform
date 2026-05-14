import { Controller, Get, Post, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { DiagnosticService } from './diagnostic.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/diagnostic')
@UseGuards(AuthGuard('jwt'))
export class DiagnosticController {
  constructor(private readonly diagnosticService: DiagnosticService) {}

  /**
   * Verifica se o aluno precisa fazer diagnóstico
   * GET /api/diagnostic/needs/:alunoId?disciplina=matematica
   */
  @Get('needs/:alunoId')
  async checkNeedsDiagnostic(
    @Param('alunoId', ParseIntPipe) alunoId: number,
    @Query('disciplina') disciplina: string
  ) {
    const needs = await this.diagnosticService.needsDiagnostic(alunoId, disciplina);
    return { needs, alunoId, disciplina };
  }

  /**
   * Gera perguntas para o teste diagnóstico
   * POST /api/diagnostic/generate
   */
  @Post('generate')
  async generateQuestions(
    @Body() body: { alunoId: number; disciplina: string; classe: number, topico?: string; }
  ) {
    return await this.diagnosticService.generateDiagnosticQuestions(
      body.alunoId,
      body.disciplina,
      body.classe,
      body.topico
    );
  }

  /**
   * Processa resultados do diagnóstico
   * POST /api/diagnostic/process
   */
  @Post('process')
  async processResults(
    @Body() body: {
      alunoId: number;
      disciplina: string;
      respostas: Array<{ topico: string; acertou: boolean }>;
    }
  ) {
    return await this.diagnosticService.processDiagnosticResults(
      body.alunoId,
      body.disciplina,
      body.respostas
    );
  }

  /**
   * Busca diagnóstico existente
   * GET /api/diagnostic/:alunoId?disciplina=matematica
   */
  @Get(':alunoId')
  async getDiagnostic(
    @Param('alunoId', ParseIntPipe) alunoId: number,
    @Query('disciplina') disciplina: string
  ) {
    return await this.diagnosticService.getDiagnostic(alunoId, disciplina);
  }
}