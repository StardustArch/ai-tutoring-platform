import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TeacherModule } from './teacher/teacher.module';
import { ClassModule } from './class/class.module';
import { DisciplineModule } from './discipline/discipline.module';
import { StudentModule } from './student/student.module';
import { ChatModule } from './chat/chat.module';
import { DiagnosticModule } from './diagnostic/diagnostic.module';
import { SessionModule } from './session/session.module';
import { PdfModule } from './pdf/pdf.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { HealthModule } from './health/health.module';
import { QuestionCacheModule } from './common/question-cache/question-cache.module';
import { RushModule } from './rush/rush.module';
import { LessonModule } from './lesson/lesson.module';

@Module({
  imports: [AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ProfileModule,
    TeacherModule,
    ClassModule,
    DisciplineModule,
    StudentModule,
    ChatModule,
    DiagnosticModule,
    SessionModule,
    PdfModule,
    AdminModule,
    MailModule, 
    HealthModule,
    QuestionCacheModule,
    RushModule,
    LessonModule
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}