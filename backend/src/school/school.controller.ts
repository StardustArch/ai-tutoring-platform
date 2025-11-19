// src/school/school.controller.ts
import {
  Controller, Post, Body, Put, Param, UseGuards, Request,
  UseInterceptors, UploadedFile, Get, Query
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { SchoolService } from './services/school.service';
import { CodeService } from './services/code.service';


@Controller('api/school')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService,
    private readonly codeService: CodeService
  ) { }

  // ========== GESTÃO DE ESCOLAS ==========

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async criarEscola(@Body() dto: any, @Request() req) {
    return this.schoolService.criarEscola(dto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/documentos')
  @UseInterceptors(FileInterceptor('documento'))
  async uploadDocumento(
    @Param('id') escolaId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
    @Request() req
  ) {
    console.log('Arquivo recebido:', file); // Para debug
    console.log('Dados recebidos:', dto); // Para debug

    return this.schoolService.uploadDocumentoEscola(
      parseInt(escolaId),
      req.user.id,
      file,
      dto
    );
  }
  @UseGuards(AuthGuard('jwt'))
  @Get('minha-escola')
  async getMinhaEscola(@Request() req) {
    return this.schoolService.getEscolaDoAdministrador(req.user.id);
  }
  // src/school/school.controller.ts
  @UseGuards(AuthGuard('jwt'))
  @Put('minha-escola')
  async atualizarEscola(@Body() dto: any, @Request() req) {
    return this.schoolService.atualizarEscola(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('documentos/:id/avaliar')
  async avaliarDocumento(
    @Param('id') documentoId: string,
    @Body() body: { aprovado: boolean; observacoes?: string }
  ) {
    return this.schoolService.avaliarDocumento(
      parseInt(documentoId),
      body.aprovado,
      body.observacoes
    );
  }

  // ========== GESTÃO DE CÓDIGOS ==========

@UseGuards(AuthGuard('jwt'))
@Post('professor/gerar-codigo')
async gerarCodigoProfessor(@Body() dto: { validoAte?: string }, @Request() req) {
  return this.codeService.gerarCodigoProfessor(req.user.id, dto.validoAte);
}

  @UseGuards(AuthGuard('jwt'))
  @Post('professor/ativar')
  async ativarProfessor(@Body() dto: { codigo: string }, @Request() req) {
    return this.codeService.ativarProfessorComCodigo(req.user.id, dto.codigo);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('professor/codigos')
  async listarCodigosEscola(@Query('escolaId') escolaId: string, @Request() req) {
    return this.codeService.listarCodigosEscola(
      parseInt(escolaId),
      req.user.id
    );
  }


@UseGuards(AuthGuard('jwt'))
@Put('professor/codigos/:id/revogar')
async revogarCodigo(@Param('id') codigoId: string, @Request() req) {
  return this.codeService.revogarCodigo(parseInt(codigoId), req.user.id);
}

// ========== GESTÃO DE PROFESSORES ==========

@UseGuards(AuthGuard('jwt'))
@Get('professores')
async listarProfessoresEscola(@Request() req) {
  return this.schoolService.listarProfessoresEscola(req.user.id);
}

@UseGuards(AuthGuard('jwt'))
@Get('professores/:id')
async getProfessorDetalhes(@Param('id') professorId: string, @Request() req) {
  return this.schoolService.getProfessorDetalhes(parseInt(professorId), req.user.id);
}

} 