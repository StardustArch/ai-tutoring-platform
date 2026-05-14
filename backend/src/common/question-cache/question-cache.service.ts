import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QuestionCacheService {
  private readonly logger = new Logger(QuestionCacheService.name);
  private readonly aiUrl: any;
  private readonly httpTimeoutMs = 60000;

constructor(
  private readonly prisma: PrismaService,
  private readonly http: HttpService,
  private readonly configService: ConfigService,
) {
  const url = this.configService.get('IA_API_URL');
  if (!url) throw new Error('IA_API_URL não está definida no .env');
  this.aiUrl = url;
}
  /**
   * 🎯 Busca no armazém ou gera na IA se o stock estiver vazio.
   *
   * NOVO: aceita `structure` opcional.
   *   - Se vier (Lesson): filtra cache por structure + envia ao Python
   *   - Se não vier (Rush/Cron): comportamento original sem alteração
   */
  async getQuestion(params: {
    classe: number;
    disciplina: string;
    topicoId: number;
    dificuldade: number;
    historicoRecente: string[];
    structure?: string; // opcional — só o LessonService envia
    ancora?: string; // 🆕 chave da âncora (ex: 'texto_bilhete_fatima')
  }) {
    const {
      topicoId,
      dificuldade,
      classe,
      disciplina,
      historicoRecente,
      structure,
    } = params;

    const topico = await this.prisma.topico.findUnique({
      where: { id: topicoId },
    });
    if (!topico) throw new Error('Tópico não encontrado');

    const contextRules = (topico.metadata as any)?.ai_rules || '';
    const currentSignature = this.generateSignature(contextRules);

    this.logger.debug(
      `🔍 Procurando: Topico ${topicoId}, Level ${dificuldade}, Classe ${classe}, ` +
        `Structure: ${structure || 'qualquer'}, Hash ${currentSignature}`,
    );

    // ── 1. Tentar Cache ───────────────────────────────────────────────────────
    //
    // Se `structure` vier → filtra por ela (modo Lesson, pedagogicamente correcto)
    // Se não vier         → busca qualquer questão do tópico (modo Rush/Cron)
    const cacheWhere: any = {
      topicoId,
      dificuldade,
      classe,
      signatureHash: currentSignature,
      pergunta: { notIn: historicoRecente },
    };

    if (structure) {
      cacheWhere.structure = structure; // 🆕 filtro por estrutura do slot
    }

    const cachedPool = await this.prisma.questaoCache.findMany({
      where: cacheWhere,
      take: 5,
    });

if (cachedPool.length > 0) {
  const selected = cachedPool[Math.floor(Math.random() * cachedPool.length)];

  // Se foi pedida âncora mas a pergunta do cache não tem → ignora cache, gera ao vivo
  if (params.ancora && !selected.ancoraChave) {
    this.logger.warn(`🐢 [CACHE MISS âncora] Tópico ${topicoId} - Pergunta sem âncora no cache, gerando ao vivo`);
    // não faz return — cai para generateAndCache abaixo
  } else {
    this.logger.log(
      `⚡ [CACHE HIT] Tópico ${topicoId} - Dificuldade ${dificuldade}` +
        (structure ? ` - Structure: "${structure.substring(0, 40)}..."` : ''),
    );
return {
  question: selected.pergunta,
  options: selected.opcoesJson as string[],
  correct_answer: selected.resposta,
  explanation: selected.explicacao,
  cached: true,
  cacheId: selected.id,  // 🆕
  ancora: selected.ancoraChave ? {
    chave: selected.ancoraChave,
    tipo: selected.ancoraTipo,
    conteudo: selected.ancoraConteudo,
  } : null,
};
  }
}
    // ── 2. Cache Miss → Gera na IA ────────────────────────────────────────────
    this.logger.warn(
      `🐢 [CACHE MISS] Tópico ${topicoId} - Gerando via IA` +
        (structure ? ` com structure: "${structure.substring(0, 40)}..."` : ''),
    );
const result = await this.generateAndCache(
  params,
  currentSignature,
  contextRules,
  topico.nome,
  false,
);
if (!structure) { // Fazemos refill apenas no modo Rush genérico (sem structure fixa)
      this.refillStock(topicoId, 3, true).catch(e => 
        this.logger.warn(`Background refill ignorado: ${e.message}`)
      );
    }
return {
  ...result,
  ancora: result.ancora_chave ? {
    chave:    result.ancora_chave,
    tipo:     result.ancora_tipo,
    conteudo: result.ancora_conteudo,
  } : null,
};
  }

  /**
   * 🚀 FUNÇÃO DE REPOSIÇÃO EM MASSA (Cron Worker)
   * Não passa structure — gera questões genéricas para o Rush.
   */
  async refillStock(
    topicId: number,
    targetAmount = 20,
    isBackground = true,
    deadlineMs?: number,
  ) {
    const topico = await this.prisma.topico.findUnique({
      where: { id: topicId },
      include: { disciplina: true },
    });

    if (!topico) return;

    const contextRules = (topico.metadata as any)?.ai_rules || '';
    const signature = this.generateSignature(contextRules);

    for (let nivel = 1; nivel <= 5; nivel++) {
      if (deadlineMs && Date.now() >= deadlineMs) {
        this.logger.warn(
          `🛑 [FIM DE TURNO] Tempo esgotou no tópico ${topico.nome} (Nível ${nivel}). Abortando...`,
        );
        return;
      }

      const existentes = await this.prisma.questaoCache.findMany({
        where: {
          topicoId: topicId,
          dificuldade: nivel,
          signatureHash: signature,
          structure: null, // 🆕 Cron só repõe questões genéricas (Rush)
        },
        select: { pergunta: true },
      });

      const currentCount = existentes.length;
      const needs = targetAmount - currentCount;

      if (needs > 0) {
        this.logger.log(
          `📦 Repondo estoque: Tópico ${topico.nome} | Nível ${nivel} | Faltam ${needs}`,
        );

        const historicoAtualizado = existentes.map((e) => e.pergunta);
        const iteracoes = Math.min(needs, 5);

        for (let i = 0; i < iteracoes; i++) {
          try {
            if (deadlineMs && Date.now() >= deadlineMs) {
              this.logger.warn(
                `🛑 Tempo limite atingido antes de gerar nova questão. Saindo...`,
              );
              return;
            }

            const gerada = await this.generateAndCache(
              {
                classe: topico.nivelClasse,
                disciplina: topico.disciplina.nome.toLowerCase(),
                topicoId: topicId,
                dificuldade: nivel,
                historicoRecente: historicoAtualizado,
                // structure: undefined → Rush/Cron, comportamento original
              },
              signature,
              contextRules,
              topico.nome,
              isBackground,
            );

            if (gerada && gerada.question) {
              historicoAtualizado.push(gerada.question);
            }

            await new Promise((resolve) => setTimeout(resolve, 800));
          } catch (err: any) {
            this.logger.error(`Falha no refill loop: ${err.message}`);
          }
        }
      }
    }
  }

  /**
   * 🛡️ GERAÇÃO COM BARREIRA ANTI-DUPLICATAS
   *
   * NOVO: se `params.structure` existir, é enviado ao Python como
   * `forced_structure_override` — o Python usa directamente sem sortear.
   */
  private async generateAndCache(
    params: {
      classe: number;
      disciplina: string;
      topicoId: number;
      dificuldade: number;
      historicoRecente: string[];
      structure?: string;
      ancora?: string; // 🆕
    },
    signature: string,
    rules: string,
    topicoNome: string,
    isBackground: boolean = false,
  ) {
    try {
      const payload: any = {
        student_class: params.classe,
        subject: params.disciplina,
        subtopic: topicoNome,
        difficulty_level: params.dificuldade,
        context_rules: rules,
        recent_questions: params.historicoRecente,
        is_background: isBackground,
      };

      // 🆕 Se vier structure do Lesson, envia ao Python para forçar
      if (params.structure) {
        payload.forced_structure_override = params.structure;
      }
      // 🆕 Se o slot tem âncora, envia a chave ao Python
      if (params.ancora) {
        payload.ancora = params.ancora;
      }

      const timeoutValue = isBackground ? 120000 : this.httpTimeoutMs;

      const res = await firstValueFrom(
        this.http
          .post(`${this.aiUrl}/generate-rush-question`, payload)
          .pipe(timeout(timeoutValue)),
      );

      const data = res.data;

      // 🛑 BARREIRA ANTI-DUPLICATAS
      const perguntaDuplicada = await this.prisma.questaoCache.findFirst({
        where: { topicoId: params.topicoId, pergunta: data.question },
      });

let savedCache: Awaited<ReturnType<typeof this.prisma.questaoCache.create>> | null = null;
if (!perguntaDuplicada) {
  savedCache = await this.prisma.questaoCache.create({
    data: {
      topicoId: params.topicoId,
      disciplina: params.disciplina,
      classe: params.classe,
      dificuldade: params.dificuldade,
      pergunta: data.question,
      opcoesJson: data.options,
      resposta: data.correct_answer,
      explicacao: data.explanation || '',
      signatureHash: signature,
      structure: params.structure ?? null,
      ancoraChave: params.ancora ?? null,
      ancoraTipo: data.ancora_tipo ?? null,
      ancoraConteudo: data.ancora_conteudo ?? null,
    },
  });
} else {
  // Duplicata — busca o id do existente para não perder a referência
  savedCache = perguntaDuplicada;
}

      return { ...data, cached: false, cacheId: savedCache?.id ?? null };

    } catch (e: any) {
      this.logger.error(`Erro ao gerar via IA: ${e.message}`);
      throw e;
    }
  }

  private generateSignature(rules: string): string {
    return crypto.createHash('md5').update(rules).digest('hex');
  }
}
