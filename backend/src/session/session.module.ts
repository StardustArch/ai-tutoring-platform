import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { PrismaModule } from '../prisma/prisma.module'; // <--- 1. Importa isto (confirma o caminho)

@Module({imports: [PrismaModule], // <--- 2. Adiciona aqui
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
