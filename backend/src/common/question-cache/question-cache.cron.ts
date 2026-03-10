import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QuestionCacheService } from './question-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class QuestionCacheCron {
  private readonly logger = new Logger(QuestionCacheCron.name);

  // Limite máximo de trabalho: 2 horas (em milissegundos)
  private readonly MAX_DURATION_MS = 2 * 60 * 60 * 1000;

  constructor(
    private readonly cacheService: QuestionCacheService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  private async waitForAiToWakeUp(aiUrl: string): Promise<boolean> {
    const maxRetries = 12;
    const delayMs = 15000; // 15s (Total 3 minutos)

    this.logger.log(
      `☕ A fazer café e a acordar o motor de IA (Python) em ${aiUrl}...`,
    );

    for (let i = 1; i <= maxRetries; i++) {
      try {
        await firstValueFrom(this.httpService.get(`${aiUrl}/health`));
        this.logger.log(
          `✅ [SUCESSO] O motor de IA acordou na tentativa ${i}!`,
        );
        return true;
      } catch (error) {
        this.logger.warn(
          `⏳ [Aguardando] A IA ainda está a dormir (Tentativa ${i}/${maxRetries}). Esperando 15s...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return false;
  }

  // Volta a colocar às 02:00 da manhã (ou a hora que quiseres testar)
  @Cron('0 2 * * *', { timeZone: 'Africa/Maputo' })
  async handleCronRefill() {
    this.logger.log(
      '⏰ [CRON] Iniciando turno da madrugada para reposição de stock...',
    );

    // ⏱️ MARCAR O PONTO (Hora de entrada)
    const startTime = Date.now();
    const deadlineMs = startTime + this.MAX_DURATION_MS; // A hora exata em que TEM de parar!

    const aiUrl =
      process.env.IA_API_URL || 'https://ai-tutoring-platform-17je.onrender.com';

    // 1. Acordar o Python
    const isAwake = await this.waitForAiToWakeUp(aiUrl);
    if (!isAwake) {
      this.logger.error(
        '❌ [CRON ABORTADO] O motor não acordou. Tentaremos amanhã.',
      );
      return;
    }

    // 2. Iniciar a reposição de stock com limite de tempo
    try {
      const topicos = await this.prisma.topico.findMany();

      for (const topico of topicos) {
        // Verifica o relógio no Cron
        if (Date.now() >= deadlineMs) {
          this.logger.warn(`🛑 [CRON] Limite atingido! Encerrando a fábrica.`);
          break;
        }

        this.logger.log(`📦 [CRON] A repor stock: ${topico.nome}`);

        // Passa o deadline para dentro da função!
        await this.cacheService.refillStock(topico.id, 15, true, deadlineMs);
      }

      this.logger.log(
        '✅ [CRON] Turno fechado! O que deu para gerar foi gerado. A IA vai dormir daqui a 15 mins. 😴',
      );
    } catch (error) {
      this.logger.error(
        `❌ [CRON] Erro crítico na reposição: ${error.message}`,
      );
    }
  }
}
