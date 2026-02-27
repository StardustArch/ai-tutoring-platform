import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser'; // <-- 1. IMPORTAR
import { ValidationPipe } from '@nestjs/common';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // O endereço do nosso frontend Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Permite o envio de cookies/tokens (para o Auth)
  });

  // main.ts
app.useGlobalPipes(new ValidationPipe({ 
  whitelist: true, 
  transform: true // Isto é essencial para converter strings da URL em números nos DTOs
}));
  app.use(cookieParser());
const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); 
  console.log(`🚀 Maestro KaniMente a ouvir na porta ${port}`);}
bootstrap();
