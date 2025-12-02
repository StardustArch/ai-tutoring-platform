import { Controller, Get, UseGuards, Request, Param, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Controller('api/teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('stats/:teacherId')
  async getTeacherStats(@Param('teacherId', ParseIntPipe) teacherId: number){
    return await this.teacherService.getProfessorStats(teacherId);
  }
}
