import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser'; // <-- 1. IMPORTAR
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5173', // O endereço do nosso frontend Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Permite o envio de cookies/tokens (para o Auth)
  });

  // main.ts
app.useGlobalPipes(new ValidationPipe({ 
  whitelist: true, 
  transform: true // Isto é essencial para converter strings da URL em números nos DTOs
}));
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
