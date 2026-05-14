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
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto, AddStudentDto } from './dto/join-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ManageClassTopicsDto } from './dto/manage-topics.dto';

@Controller('api/classes') // Mudei para 'classes' (plural é convenção REST)
@UseGuards(AuthGuard('jwt')) // Aplica proteção a tudo por padrão
export class ClassController {
  constructor(private readonly classService: ClassService) {}

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
    @Query('classe', ParseIntPipe) classe: number,
    @Query('studentId', ParseIntPipe) studentId: number,
    @Request() req,
    @Query('classId', new ParseIntPipe({ optional: true })) classId?: number,
  ) {
    return this.classService.getTopicsForStudent(
      Number(classe),
      Number(studentId),
      req.user.id,
      Number(classId),
    );
  }

  @Get(':id')
  async getTurmaDetalhes(
    @Param('id', ParseIntPipe) turmaId: number,
    @Request() req,
  ) {
    return this.classService.getTurmaDetalhes(turmaId, req.user.id);
  }

  @Put(':id')
  async atualizarTurma(
    @Param('id', ParseIntPipe) turmaId: number,
    @Body() dto: UpdateClassDto,
    @Request() req,
  ) {
    return this.classService.atualizarTurma(turmaId, req.user.id, dto);
  }
  @Put(':id/codigo/renovar')
  async renovarCodigo(
    @Param('id', ParseIntPipe) turmaId: number,
    @Request() req,
  ) {
    return this.classService.renovarCodigoTurma(turmaId, req.user.id);
  }

  @Delete(':id')
  async desativarTurma(
    @Param('id', ParseIntPipe) turmaId: number,
    @Request() req,
  ) {
    return this.classService.desativarTurma(turmaId, req.user.id);
  }

  // --- Gestão de Alunos na Turma ---

  @Get(':id/alunos')
  async listarAlunosTurma(
    @Param('id', ParseIntPipe) turmaId: number,
    @Request() req,
  ) {
    return this.classService.listarAlunosTurma(turmaId, req.user.id);
  }

  @Delete(':id/alunos/:alunoId')
  async removerAluno(
    @Param('id', ParseIntPipe) turmaId: number,
    @Param('alunoId', ParseIntPipe) alunoId: number,
    @Request() req,
  ) {
    return this.classService.removerAlunoTurma(turmaId, alunoId, req.user.id);
  }

  // 📋 GET: Listar tópicos para gerenciar (Checkbox List)
  @Get(':id/topics/manage')
  async getTopicsForManagement(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.classService.listarTopicosGerenciamento(id, req.user.id);
  }

  // 💾 PATCH: Salvar a seleção do professor
  @Patch(':id/topics')
  async updateClassTopics(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManageClassTopicsDto,
  ) {
    return this.classService.atualizarTopicosTurma(
      id,
      req.user.id,
      dto.topicosIds,
    );
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
    return this.classService.adicionarAlunoTurmaComCodigo(
      dto.codigo,
      dto.alunoId,
      req.user.id,
    );
  }
}
