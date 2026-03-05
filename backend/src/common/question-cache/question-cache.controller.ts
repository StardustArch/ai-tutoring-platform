import { Controller, Post, Get, Body, Param, BadRequestException, ParseIntPipe, Query, Logger } from '@nestjs/common';

import { QuestionCacheService } from './question-cache.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/admin')
export class QuestionCacheController {
private readonly logger = new Logger(QuestionCacheController.name);

  constructor(
    private readonly cacheService: QuestionCacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Endpoint chamado pelo Worker em Python para manter o armazém cheio.
   * Ele percorre todos os tópicos e garante que cada nível de dificuldade tem stock.
   */
  @Post('refill-stock')
  async refillAllStock() {
    this.logger.log('📢 Iniciando processo global de reposição de stock...');

    try {
      // 1. Procurar todos os tópicos registados no sistema
      const topicos = await this.prisma.topico.findMany();

      // 2. Para cada tópico, chamamos a lógica de refill
      // Fazemos isto de forma sequencial (um tópico de cada vez) para não 
      // estourar os limites de Rate Limit da API de IA rapidamente.
      for (const topico of topicos) {
        this.logger.log(`📦 Verificando stock para o tópico: ${topico.nome} (Classe: ${topico.nivelClasse})`);
        
        // O método refillStock já tem paralelismo interno para os 5 níveis
        await this.cacheService.refillStock(topico.id, 15); 
      }

      return { 
        status: 'success', 
        message: 'Reposição de stock concluída para todos os tópicos.' 
      };
    } catch (error) {
      this.logger.error(`❌ Erro durante a reposição de stock: ${error.message}`);
      return { 
        status: 'error', 
        message: 'Falha ao processar reposição de stock.' 
      };
    }
  }

}