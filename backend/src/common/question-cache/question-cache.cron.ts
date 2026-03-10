import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QuestionCacheService } from './question-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class QuestionCacheCron {
  private readonly logger = new Logger(QuestionCacheCron.name);

  constructor(
    private readonly cacheService: QuestionCacheService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  // Função dedicada para bater à porta do Python pacientemente
  private async waitForAiToWakeUp(aiUrl: string): Promise<boolean> {
    const maxRetries = 12; // 12 tentativas
    const delayMs = 15000; // 15 segundos entre tentativas (Total = 3 minutos de tolerância)

    this.logger.log(
      `☕ A fazer café e a acordar o motor de IA (Python) em ${aiUrl}...`,
    );

    for (let i = 1; i <= maxRetries; i++) {
      try {
        await firstValueFrom(this.httpService.get(`${aiUrl}/health`));
        this.logger.log(
          `✅ [SUCESSO] O motor de IA acordou na tentativa ${i}!`,
        );
        return true; // Acordou!
      } catch (error) {
        this.logger.warn(
          `⏳ [Aguardando] A IA ainda está a dormir (Tentativa ${i}/${maxRetries}). Esperando 15s...`,
        );
        // Pausa o código durante 15 segundos antes da próxima tentativa
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return false; // Chegou ao fim das tentativas e não acordou
  }

  // Executa todos os dias às 02:00 da manhã, fuso horário de Moçambique
  @Cron('0 11 * * *', { timeZone: 'Africa/Maputo' })
  async handleCronRefill() {
    this.logger.log(
      '⏰ [CRON] Iniciando turno da madrugada para reposição de stock...',
    );

    const aiUrl =
      process.env.IA_API_URL || 'https://ai-tutoring-platform.onrender.com';

    // 1. Acordar o Python com tolerância de 3 minutos
    const isAwake = await this.waitForAiToWakeUp(aiUrl);

    if (!isAwake) {
      this.logger.error(
        '❌ [CRON ABORTADO] O motor de IA não acordou após 3 minutos. O Render pode estar com problemas. Tentaremos amanhã.',
      );
      return; // Aborta a operação para não gerar erros em cascata!
    }

    // 2. Iniciar a reposição de stock apenas se estiver 100% online
    try {
      const topicos = await this.prisma.topico.findMany();

      for (const topico of topicos) {
        this.logger.log(`📦 [CRON] A repor stock para: ${topico.nome}`);
        // Pede 15 questões (o service trata de não repetir e ir por dificuldades)
        await this.cacheService.refillStock(topico.id, 15, true);
      }

      this.logger.log(
        '✅ [CRON] Turno terminado! O armazém está cheio. A IA vai dormir daqui a 15 mins. 😴',
      );
    } catch (error) {
      this.logger.error(
        `❌ [CRON] Erro crítico na reposição: ${error.message}`,
      );
    }
  }
}
