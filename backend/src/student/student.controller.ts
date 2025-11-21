import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  ParseIntPipe
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/students')
@UseGuards(AuthGuard('jwt')) // Protege todas as rotas
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  create(@Request() req, @Body() createStudentDto: CreateStudentDto) {
    return this.studentService.create(req.user.id, createStudentDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.studentService.findAllMyStudents(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.studentService.findOne(id, req.user.id);
  }

  @Patch(':id') // Patch é melhor para atualizações parciais
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req, 
    @Body() updateStudentDto: UpdateStudentDto
  ) {
    return this.studentService.update(id, req.user.id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.studentService.remove(id, req.user.id);
  }
}