import { Module } from '@nestjs/common';
import { SchoolService } from './services/school.service';
import { SchoolController } from './school.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CodeService } from './services/code.service';

@Module({
  imports:[PrismaModule],
  controllers: [SchoolController],
  providers: [SchoolService, CodeService],
})
export class SchoolModule {}
  