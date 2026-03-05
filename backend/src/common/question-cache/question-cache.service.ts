import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QuestionCacheService {
  private readonly logger = new Logger(QuestionCacheService.name);
  private readonly aiUrl = process.env.IA_API_URL;
  private readonly httpTimeoutMs = 60000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  /**
   * 🎯 Busca no armazém ou gera na IA se o stock estiver vazio.
   */
  async getQuestion(params: {
    classe: number;
    disciplina: string;
    topicoId: number;
    dificuldade: number;
    historicoRecente: string[];
  }) {
    const { topicoId, dificuldade, classe, disciplina, historicoRecente } = params;

    const topico = await this.prisma.topico.findUnique({ where: { id: topicoId } });
    const contextRules = (topico?.metadata as any)?.ai_rules || '';
    const currentSignature = this.generateSignature(contextRules);

    // 1. Tentar Cache
    const cachedPool = await this.prisma.questaoCache.findMany({
      where: {
        topicoId,
        dificuldade,
        classe,
        signatureHash: currentSignature,
        pergunta: { notIn: historicoRecente }
      },
      take: 5 // Pegamos 5 candidatos
    });

    if (cachedPool.length > 0) {
      const selected = cachedPool[Math.floor(Math.random() * cachedPool.length)];
      this.logger.log(`⚡ [CACHE HIT] Tópico ${topicoId} - Dificuldade ${dificuldade}`);
      return {
        question: selected.pergunta,
        options: selected.opcoesJson as string[],
        correct_answer: selected.resposta,
        explanation: selected.explicacao,
        cached: true
      };
    }

    // 2. Cache Miss: Gera na IA
    this.logger.warn(`🐢 [CACHE MISS] Tópico ${topicoId} - Gerando via IA`);
    return this.generateAndCache(params, currentSignature, contextRules, topico?.nome || '');
  }

  private async generateAndCache(params: any, signature: string, rules: string, topicoNome: string) {
    try {
      const payload = {
        student_class: params.classe,
        subject: params.disciplina,
        subtopic: topicoNome,
        difficulty_level: params.dificuldade,
        context_rules: rules,
        recent_questions: params.historicoRecente
      };

      const res = await firstValueFrom(this.http.post(`${this.aiUrl}/generate-rush-question`, payload).pipe(timeout(this.httpTimeoutMs)));
      const data = res.data;

      // Armazena no cache para o próximo
      await this.prisma.questaoCache.create({
        data: {
          topicoId: params.topicoId,
          disciplina: params.disciplina,
          classe: params.classe,
          dificuldade: params.dificuldade,
          pergunta: data.question,
          opcoesJson: data.options,
          resposta: data.correct_answer,
          explicacao: data.explanation || '',
          signatureHash: signature
        }
      });

      return { ...data, cached: false };
    } catch (e) {
      this.logger.error(`Erro ao gerar via IA: ${e.message}`);
      throw e;
    }
  }

  private generateSignature(rules: string): string {
    return crypto.createHash('md5').update(rules).digest('hex');
  }

    /**
   * 🚀 FUNÇÃO DE REPOSIÇÃO EM MASSA (O Momento do Worker)
   * Pode ser chamada por um cron job ou manualmente para encher o armazém.
   */
  async refillStock(topicId: number, targetAmount = 20) {
    const topico = await this.prisma.topico.findUnique({ where: { id: topicId } });
    if (!topico) return;

    const contextRules = (topico.metadata as any)?.ai_rules || '';
    const signature = this.generateSignature(contextRules);

    // Verifica todos os níveis de dificuldade (1 a 5)
    for (let nivel = 1; nivel <= 5; nivel++) {
      const currentCount = await this.prisma.questaoCache.count({
        where: { topicoId: topicId, dificuldade: nivel, signatureHash: signature }
      });

      const needs = targetAmount - currentCount;
      if (needs > 0) {
        this.logger.log(`📦 Repondo estoque: Tópico ${topico.nome} | Nível ${nivel} | Faltam ${needs}`);
        
        // Dispara pedidos em paralelo para o Python
        const promises = Array.from({ length: Math.min(needs, 5) }).map(() => 
          this.generateAndCache({
            classe: topico.nivelClasse,
            disciplina: 'matematica', // Idealmente buscar da relação
            topicoId: topicId,
            dificuldade: nivel,
            historicoRecente: []
          }, signature, contextRules, topico.nome)
        );

        await Promise.all(promises.map(p => p.catch(() => null)));
      }
    }
  }

}