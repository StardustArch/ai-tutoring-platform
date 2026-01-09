import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto, AddStudentDto } from './dto/join-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Controller('api/classes') // Mudei para 'classes' (plural é convenção REST)
@UseGuards(AuthGuard('jwt')) // Aplica proteção a tudo por padrão
export class ClassController {
  constructor(private readonly classService: ClassService) { }

  // ==========================================
  // 👨‍🏫 ÁREA DO PROFESSOR
  // ==========================================

  @Post()
  async criarTurma(@Body() dto: CreateClassDto, @Request() req) {
    return this.classService.criarTurma(req.user.id, dto);
  }

  @Get()
  async listarTurmasProfessor(@Request() req) {
    return this.classService.listarTurmasProfessor(req.user.id);
  }
  @Get('topics')
  async getTopics(
    @Query('classe') classe: number,
    @Query('studentId') studentId: number // <--- NOVO: Obrigatório para ver o progresso
  ) {
    if (!classe) throw new BadRequestException('Classe é obrigatória');

    // Se não houver studentId (ex: admin a ver), podes manter a lógica antiga ou exigir erro.
    // Aqui assumimos que para jogar, tem de ter ID.
    if (!studentId) throw new BadRequestException('ID do aluno é obrigatório para verificar progresso');

    return this.classService.getTopicsForStudent(Number(classe), Number(studentId));
  }

  @Get(':id')
  async getTurmaDetalhes(@Param('id', ParseIntPipe) turmaId: number, @Request() req) {
    return this.classService.getTurmaDetalhes(turmaId, req.user.id);
  }

  @Put(':id')
  async atualizarTurma(
    @Param('id', ParseIntPipe) turmaId: number,
    @Body() dto: UpdateClassDto,
    @Request() req
  ) {
    return this.classService.atualizarTurma(turmaId, req.user.id, dto);
  }
  @Put(':id/codigo/renovar')
  async renovarCodigo(@Param('id', ParseIntPipe) turmaId: number, @Request() req) {

    return this.classService.renovarCodigoTurma(turmaId, req.user.id);
  }

  @Delete(':id')
  async desativarTurma(@Param('id', ParseIntPipe) turmaId: number, @Request() req) {
    return this.classService.desativarTurma(turmaId, req.user.id);
  }

  // --- Gestão de Alunos na Turma ---

  @Get(':id/alunos')
  async listarAlunosTurma(@Param('id', ParseIntPipe) turmaId: number, @Request() req) {
    return this.classService.listarAlunosTurma(turmaId, req.user.id);
  }

  @Delete(':id/alunos/:alunoId')
  async removerAluno(
    @Param('id', ParseIntPipe) turmaId: number,
    @Param('alunoId', ParseIntPipe) alunoId: number,
    @Request() req
  ) {
    return this.classService.removerAlunoTurma(turmaId, alunoId, req.user.id);
  }

  // ==========================================
  // 👨‍👩‍👧‍👦 ÁREA DO ENCARREGADO
  // ==========================================

  @Get('student/my-classes')
  async listarTurmasEncarregado(@Request() req) {
    return this.classService.listarTurmasEncarregado(req.user.id);
  }

  @Post('check-code')
  async verificarCodigo(@Body() dto: JoinClassDto, @Request() req) {
    return this.classService.verificarCodigoTurma(dto.codigo, req.user.id);
  }

  @Post('join')
  async adicionarAlunoComCodigo(@Body() dto: AddStudentDto, @Request() req) {
    return this.classService.adicionarAlunoTurmaComCodigo(dto.codigo, dto.alunoId, req.user.id);
  }


}