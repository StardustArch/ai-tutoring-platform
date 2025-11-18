import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Este serviço é um "wrapper" do Prisma Client.
// Ele trata de ligar e desligar da BD.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // A ligação à BD é feita aqui
    await this.$connect();
  }
}