import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class SendChatDto {
  @IsNumber()
  alunoId: number;

  @IsString()
  @IsNotEmpty({ message: 'A mensagem não pode estar vazia.' })
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  userQuery: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsNumber()
  @IsOptional()
  turmaId?: number;

  @IsNumber()
  @IsOptional()
  sessaoId?: number;

  // ── State machine da lição ────────────────────────────────────────────────
  // O frontend envia a fase actual. O NestJS valida, calcula a próxima fase,
  // e passa a fase correcta ao Python.
  //
  // Fluxo:
  //   EXPLAIN  →  aluno diz "Entendi"   →  NestJS envia TEST ao Python
  //   EXPLAIN  →  aluno diz "Não percebi" → NestJS envia EXPLAIN de volta
  //   TEST     →  aluno responde         → NestJS envia FEEDBACK ao Python
  //   FEEDBACK (CORRECT)   →  "Mais desafio" → TEST
  //   FEEDBACK (CORRECT)   →  "Avançar"     → EXPLAIN
  //   FEEDBACK (INCORRECT) →  (automático)  → TEST (retry)
  @IsString()
  @IsOptional()
  @IsIn(['EXPLAIN', 'TEST', 'FEEDBACK'])
  phase?: string;

  // A última pergunta que o Kani fez (necessário para o FEEDBACK)
  @IsString()
  @IsOptional()
  lastQuestion?: string;

  // A resposta correcta da última pergunta (para o Python calcular o assessment)
  @IsString()
  @IsOptional()
  lastCorrectAnswer?: string;

  // O tipo de interação da última pergunta (para o retry manter o mesmo tipo)
  @IsString()
  @IsOptional()
  lastInteractionType?: string;
}

export class MicroserviceChatRequestDto {
  student_id: number;
  student_class: number;
  user_query: string;
  mode: string;
  history: any[];
  subject: string;
  topic: string;
  context_rules: string;

  // Campos da state machine
  phase: string;
  last_question?: string;
  last_correct_answer?: string;
  last_interaction_type?: string;
  ancoras?: string[];
}
