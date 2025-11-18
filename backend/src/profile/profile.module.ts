import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport'; // <-- 1. IMPORTAR O PASSPORT
import { AuthModule } from '../auth/auth.module'; // <-- 2. IMPORTAR O AUTHMODULE

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }), // <-- 3. REGISTAR O PASSPORT
    AuthModule, // <-- 4. IMPORTAR O AUTHMODULE
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}