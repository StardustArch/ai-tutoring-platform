import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { RushController } from './rush.controller';
import { RushService } from './rush.service';
import { QuestionCacheModule } from '../common/question-cache/question-cache.module';


@Module({
  imports:[PrismaModule, HttpModule,QuestionCacheModule],
  controllers: [RushController],
  providers: [RushService],
})
export class RushModule {}
