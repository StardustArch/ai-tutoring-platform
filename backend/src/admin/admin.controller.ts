import { Controller, Get, Post, Body, Query, UseGuards, Param, ParseIntPipe, Patch, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ListTopicsDto } from './dto/list-topics.dto';
import { PaginationDto } from './dto/pagination.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateDisciplinaDto, UpdateDisciplinaDto, FilterTopicDto, CreateTopicDto, UpdateTopicDto } from './dto/content.dto';

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

// --- GESTÃO DE CONTEÚDO ---

  // 1. Disciplinas
  @Get('content/disciplines')
  getDisciplinas() {
    return this.adminService.getDisciplinas();
  }

  @Post('content/disciplines')
  createDisciplina(@Body() dto: CreateDisciplinaDto) {
    return this.adminService.createDisciplina(dto);
  }

  @Patch('content/disciplines/:id')
  updateDisciplina(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDisciplinaDto) {
    return this.adminService.updateDisciplina(id, dto);
  }

  @Delete('content/disciplines/:id')
  deleteDisciplina(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteDisciplina(id);
  }

  // 2. Tópicos
  @Get('content/topics')
  getTopics(@Query() filters: FilterTopicDto) {
    return this.adminService.getTopics(filters);
  }

  @Get('content/topics/:id')
  getTopicDetails(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTopicById(id);
  }

  @Post('content/topics')
  createTopic(@Body() dto: CreateTopicDto) {
    return this.adminService.createTopic(dto);
  }

  @Patch('content/topics/:id')
  updateTopic(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTopicDto) {
    return this.adminService.updateTopic(id, dto);
  }

  @Delete('content/topics/:id')
  deleteTopic(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteTopic(id);
  }

  // 3. Estrutura Global (Árvore)
  @Get('content/tree')
  getContentTree() {
      return this.adminService.getContentTree();
  }
  
  @Get('topics')
  listTopics(@Query() query: ListTopicsDto) {
    return this.adminService.listTopics(query);
  }

// --- GESTÃO DE SISTEMA ---

  @Get('system')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

// --- GESTÃO DE UTILIZADORES (NOVO) ---

  @Get('users')
  getUsers(@Query() query: PaginationDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/:id')
  getUserDetails(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/toggle-block')
  toggleBlock(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleBlockStatus(id);
  }

  @Patch('users/:id/reset-password')
  resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.resetPassword(id);
  }

  @Patch('users/:id/role')
  changeRole(@Param('id', ParseIntPipe) id: number, @Body('role') role: 'ADMIN' | 'USER') {
    return this.adminService.changeRole(id, role);
  }
}
