import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@UseGuards(AuthGuard('jwt')) // Aplica proteção a tudo por padrão
@Controller('api/teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('stats/:teacherId')
  async getTeacherStats(@Param('teacherId', ParseIntPipe) teacherId: number) {
    return await this.teacherService.getProfessorStats(teacherId);
  }

  @Get('dashboard-overview')
  async getDashboardOverview(@Request() req) {
    // O req.user.id vem do token JWT (Tabela Usuario)
    return await this.teacherService.getDashboardOverview(req.user.id);
  }

  @Get('reports/overview')
  async getReportsOverview(@Request() req) {
    return this.teacherService.getReportsOverview(req.user.id);
  }
}
