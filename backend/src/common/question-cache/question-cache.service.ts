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
    if (!topico) throw new Error("Tópico não encontrado");

    const contextRules = (topico.metadata as any)?.ai_rules || '';
    const currentSignature = this.generateSignature(contextRules);
this.logger.debug(`🔍 Procurando: Topico ${topicoId}, Level ${dificuldade}, Classe ${classe}, Hash ${currentSignature}`);
    // 1. Tentar Cache (com exclusão do histórico do aluno)
    const cachedPool = await this.prisma.questaoCache.findMany({
      where: {
        topicoId,
        dificuldade,
        classe,
        signatureHash: currentSignature,
        pergunta: { notIn: historicoRecente }
      },
      take: 5
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

    // 2. Cache Miss: Gera na IA (Real-time, isBackground = false)
    this.logger.warn(`🐢 [CACHE MISS] Tópico ${topicoId} - Gerando via IA`);
    return this.generateAndCache(params, currentSignature, contextRules, topico.nome, false);
  }

  /**
   * 🚀 FUNÇÃO DE REPOSIÇÃO EM MASSA (O Momento do Worker)
   */
  async refillStock(topicId: number, targetAmount = 20, isBackground = true) {
    const topico = await this.prisma.topico.findUnique({ 
        where: { id: topicId },
        include: { disciplina: true } 
    });
    
    if (!topico) return;

    const contextRules = (topico.metadata as any)?.ai_rules || '';
    const signature = this.generateSignature(contextRules);

    for (let nivel = 1; nivel <= 5; nivel++) {
      // Pega todas as perguntas que JÁ ESTÃO no armazém para este nível
      const existentes = await this.prisma.questaoCache.findMany({
        where: { topicoId: topicId, dificuldade: nivel, signatureHash: signature },
        select: { pergunta: true }
      });

      const currentCount = existentes.length;
      const needs = targetAmount - currentCount;

      if (needs > 0) {
        this.logger.log(`📦 Repondo estoque: Tópico ${topico.nome} | Nível ${nivel} | Faltam ${needs}`);
        
        // A nossa "Lista Negra" inicial é o que já está na BD
        const historicoAtualizado = existentes.map(e => e.pergunta);
        const iteracoes = Math.min(needs, 5); // Limita a 5 por ciclo para não sobrecarregar a API

        // 🔥 SEQUENCIAL: Evita race conditions e permite à IA saber o que acabou de gerar
        for (let i = 0; i < iteracoes; i++) {
            try {
                const gerada = await this.generateAndCache({
                    classe: topico.nivelClasse,
                    disciplina: topico.disciplina.nome.toLowerCase(),
                    topicoId: topicId,
                    dificuldade: nivel,
                    historicoRecente: historicoAtualizado // Envia a lista negra para a IA
                }, signature, contextRules, topico.nome, isBackground);

                // Adiciona a pergunta recém-gerada à lista negra para a PRÓXIMA iteração do loop
                if (gerada && gerada.question) {
                    historicoAtualizado.push(gerada.question);
                }
                
                // Pequeno respiro entre pedidos para aliviar a API
                await new Promise(resolve => setTimeout(resolve, 800));

            } catch (err) {
                this.logger.error(`Falha no refill loop: ${err.message}`);
            }
        }
      }
    }
  }

  /**
   * 🛡️ GERAÇÃO COM BARREIRA ANTI-DUPLICATAS
   */
  private async generateAndCache(params: any, signature: string, rules: string, topicoNome: string, isBackground: boolean = false) {
    try {
      const payload = {
        student_class: params.classe,
        subject: params.disciplina,
        subtopic: topicoNome,
        difficulty_level: params.dificuldade,
        context_rules: rules,
        recent_questions: params.historicoRecente,
        is_background: isBackground
      };

      const timeoutValue = isBackground ? 120000 : this.httpTimeoutMs;
      
      const res = await firstValueFrom(
          this.http.post(`${this.aiUrl}/generate-rush-question`, payload).pipe(timeout(timeoutValue))
      );
      
      const data = res.data;

      // 🛑 BARREIRA FINAL: Verificar diretamente na Base de Dados antes de guardar
      const perguntaDuplicada = await this.prisma.questaoCache.findFirst({
          where: {
              topicoId: params.topicoId,
              pergunta: data.question // Busca pelo texto exato
          }
      });

      if (perguntaDuplicada) {
          this.logger.warn(`♻️ A IA gerou uma duplicata exata ("${data.question.substring(0, 30)}..."). Entregue ao aluno, mas NÃO guardada no armazém.`);
      } else {
          // Só guardamos se for 100% original
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
      }

      return { ...data, cached: false };
    } catch (e) {
      this.logger.error(`Erro ao gerar via IA: ${e.message}`);
      throw e;
    }
  }

  private generateSignature(rules: string): string {
    return crypto.createHash('md5').update(rules).digest('hex');
  }
}