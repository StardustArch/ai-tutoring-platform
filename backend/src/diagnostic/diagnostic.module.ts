import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DiagnosticService } from './diagnostic.service';
import { DiagnosticController } from './diagnostic.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [DiagnosticController],
  providers: [DiagnosticService],
  exports: [DiagnosticService] // Para usar em Rush/Tutor
})
export class DiagnosticModule {}