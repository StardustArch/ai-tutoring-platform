import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ListTopicsDto } from './dto/list-topics.dto';
import { PaginationDto } from './dto/pagination.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';

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

  @Get('users')
  getUsers(@Query() query: PaginationDto) {
    return this.adminService.getAllUsers(query);
  }
}
