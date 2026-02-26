import { Controller, Get, Post, Body, Query, UseGuards, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ListTopicsDto } from './dto/list-topics.dto';
import { PaginationDto } from './dto/pagination.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Post('topics')
  createTopic(@Body() dto: CreateTopicDto) {
    return this.adminService.createTopic(dto);
  }

  @Get('topics')
  listTopics(@Query() query: ListTopicsDto) {
    return this.adminService.listTopics(query);
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
