import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import {AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports:[PrismaModule, HttpModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
