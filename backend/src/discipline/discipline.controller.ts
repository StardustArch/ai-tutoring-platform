import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DisciplineService } from './discipline.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';

@Controller('api/disciplines')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}

  @Get()
  async listar() {
    return this.disciplineService.listarDisciplinas();
  }
}
