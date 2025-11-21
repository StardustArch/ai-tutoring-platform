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

@Module({
  imports: [AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ProfileModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/escolas',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          const escolaId = req.params.id;
          return cb(null, `${escolaId}-${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(pdf|jpg|jpeg|png)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Formato de arquivo não suportado'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    TeacherModule,
    ClassModule,
    DisciplineModule,
    StudentModule,
    ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}