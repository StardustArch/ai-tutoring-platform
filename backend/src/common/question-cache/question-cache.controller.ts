import { Controller, Post, Get, Body, Param, BadRequestException, ParseIntPipe, Query, Logger } from '@nestjs/common';

import { QuestionCacheService } from './question-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Controller('api/admin')
export class QuestionCacheController {
private readonly logger = new Logger(QuestionCacheController.name);

  constructor(
    private readonly cacheService: QuestionCacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 🎯 INJEÇÃO DIRETA VIA JSON (O método do "Chat" Inteligente)
   * Envia o JSON gigante gerado pelo DeepSeek diretamente para aqui!
   */
  @Post('import-cache')
  async importQuestionsFromChat(
    @Body() body: {
      questoes: Array<{
        disciplina: string;
        classe: number;
        topico: string;
        dificuldade: number;
        pergunta: string;
        opcoesJson: string[];
        resposta: string;
        explicacao: string;
      }>;
    }
  ) {
    if (!body.questoes || !Array.isArray(body.questoes)) {
      throw new BadRequestException("O formato deve conter um array 'questoes'.");
    }

    this.logger.log(`📥 A processar ${body.questoes.length} questões do JSON...`);
    
    let inseridas = 0;
    let ignoradas = 0;
    const dadosParaInserir: Array<{
      topicoId: number;
      disciplina: string;
      classe: number;
      dificuldade: number;
      pergunta: string;
      opcoesJson: string[];
      resposta: string;
      explicacao: string;
      signatureHash: string;
    }> = [];

    // Cache local em memória para não consultar a BD pelo mesmo tópico repetidas vezes
    const topicosCache = new Map<string, any>();

    try {
      // 1. Mapeamento e Descoberta de IDs
      for (const q of body.questoes) {
        const cacheKey = `${q.disciplina}-${q.classe}-${q.topico}`;
        let topicoBd = topicosCache.get(cacheKey);

        // Se ainda não fomos à BD procurar este tópico, vamos agora
        if (!topicoBd) {
          const nomeDisciplinaBd = q.disciplina.toLowerCase() === 'matematica' ? 'Matemática' : 'Português';
          topicoBd = await this.prisma.topico.findFirst({
            where: {
              nome: q.topico,
              nivelClasse: q.classe,
              disciplina: { nome: nomeDisciplinaBd }
            }
          });

          if (topicoBd) {
            topicosCache.set(cacheKey, topicoBd);
          }
        }

        // Se o tópico realmente não existir na BD, saltamos esta pergunta
        if (!topicoBd) {
          this.logger.warn(`⚠️ Tópico não encontrado na BD: [${q.classe}ª Classe] ${q.topico}. Questão ignorada.`);
          ignoradas++;
          continue;
        }

        const contextRules = (topicoBd.metadata as any)?.ai_rules || '';
        const signatureHash = crypto.createHash('md5').update(contextRules).digest('hex');

        dadosParaInserir.push({
          topicoId: topicoBd.id,
          disciplina: q.disciplina.toLowerCase(),
          classe: q.classe,
          dificuldade: q.dificuldade,
          pergunta: q.pergunta,
          opcoesJson: q.opcoesJson,
          resposta: q.resposta,
          explicacao: q.explicacao,
          signatureHash: signatureHash
        });
      }

      // 2. Barreira 2 Anti-Repetição: Filtrar perguntas que já existem no Armazém
      if (dadosParaInserir.length > 0) {
        const topicosIds = [...new Set(dadosParaInserir.map(d => d.topicoId))];
        
        // Vamos buscar todas as perguntas que já existem nestes tópicos
        const existentes = await this.prisma.questaoCache.findMany({
            where: { topicoId: { in: topicosIds } },
            select: { pergunta: true }
        });
        
        // Criamos um Set (lista super rápida de pesquisa) com os textos das perguntas
        const textosExistentes = new Set(existentes.map(e => e.pergunta));

        // Filtramos para manter APENAS as perguntas cujos textos não estão na BD
        const dadosFinais = dadosParaInserir.filter(d => !textosExistentes.has(d.pergunta));

        if (dadosFinais.length > 0) {
            // 3. Inserção em Massa
            const resultado = await this.prisma.questaoCache.createMany({
                data: dadosFinais,
                skipDuplicates: true
            });
            inseridas = resultado.count;
            this.logger.log(`✅ Sucesso! ${inseridas} novas questões guardadas no Armazém.`);
        } else {
            this.logger.log(`⚠️ Todas as ${dadosParaInserir.length} questões já existiam no banco. Nenhuma duplicata inserida.`);
        }
      }

      const duplicadas = dadosParaInserir.length - inseridas;
      
      return { 
        status: 'success', 
        message: `${inseridas} novas questões importadas com sucesso! (${ignoradas} ignoradas, ${duplicadas} repetidas bloqueadas)`
      };

    } catch (error) {
      this.logger.error(`❌ Erro na importação: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

}