import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendChatDto {
  @IsInt()
  @IsNotEmpty()
  alunoId: number;

  @IsString()
  @IsNotEmpty()
  userQuery: string;

  // ✅ NOVOS CAMPOS OPCIONAIS (Contexto da Sessão)
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsInt()
  turmaId?: number; // Novo campo opciona

  @IsOptional()
  @IsInt()
  sessaoId?: number; // <--- ADICIONAR ISTO
}

export class MicroserviceChatRequestDto {
  student_id: number;
  student_class: number;
  user_query: string;
  mode: string;
  history: Array<{ role: string; text: string }>;

  // ✅ Passar para o Python
  subject?: string;
  topic?: string;
  context_rules?: string;
}