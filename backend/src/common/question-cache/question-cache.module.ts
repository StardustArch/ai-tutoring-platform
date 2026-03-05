import { Module } from '@nestjs/common';
import { QuestionCacheService } from './question-cache.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { QuestionCacheController } from './question-cache.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [QuestionCacheService],
  controllers: [QuestionCacheController],
  exports: [QuestionCacheService],
})
export class QuestionCacheModule {}
