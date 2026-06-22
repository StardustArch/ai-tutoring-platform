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
  alunoId!: number;

  @IsString()
  @IsNotEmpty({ message: 'A mensagem não pode estar vazia.' })
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  userQuery!: string;

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
}

export class MicroserviceChatRequestDto {
  student_id!: number;
  student_class!: number;
  user_query!: string;
  mode!: string;
  history!: any[];
  subject!: string;
  topic!: string;
  context_rules!: string;

  // Campos da state machine
  phase!: string;
  last_question?: string;
  last_correct_answer?: string;
  last_interaction_type?: string;
  ancoras?: string[];
  // Adiciona em AMBAS as classes (SendChatDto e MicroserviceChatRequestDto)
  @IsOptional()
  @IsString()
  current_structure?: string;
  session_id?: number;   // ← adicionar isto
  slot_number?: number;
}
