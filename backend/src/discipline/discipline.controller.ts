import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DisciplineService } from './discipline.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/disciplines')
@UseGuards(AuthGuard('jwt'))
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}

  @Get()
  async listar() {
    return this.disciplineService.listarDisciplinas();
  }
}
