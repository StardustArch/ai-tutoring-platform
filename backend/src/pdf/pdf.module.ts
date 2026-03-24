import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StudentModule } from '../student/student.module';
import { buildPdfHtml } from './pdf.template';

@Module({
  imports: [PrismaModule, StudentModule],
  controllers: [PdfController],
  providers: [PdfService],
})
export class PdfModule { }
