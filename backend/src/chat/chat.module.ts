import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { RushController } from './rush.controller';
import { RushService } from './rush.service';


@Module({
  imports:[PrismaModule, HttpModule],
  controllers: [ChatController, RushController],
  providers: [ChatService, RushService],
})
export class ChatModule {}
