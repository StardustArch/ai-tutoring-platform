import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { RushController } from './rush.controller';
import { RushService } from './rush.service';
import { QuestionCacheModule } from '../common/question-cache/question-cache.module';


@Module({
  imports:[PrismaModule, HttpModule,QuestionCacheModule],
  controllers: [ChatController, RushController],
  providers: [ChatService, RushService],
})
export class ChatModule {}
