import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { QuestionCacheModule } from '../common/question-cache/question-cache.module';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';

@Module({
  imports: [HttpModule, PrismaModule, QuestionCacheModule],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}