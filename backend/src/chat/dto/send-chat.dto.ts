import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';

export class SendChatDto {
  @IsInt()
  alunoId: number;

  @IsString()
  userQuery: string;

  @IsOptional()
  @IsString()
  @IsEnum(['tutor', 'rush']) // Validação extra
  mode?: 'tutor' | 'rush' = 'tutor'; // Padrão é tutor
}

export class MicroserviceChatRequestDto {
    student_id: number;
    student_class: number;
    user_query: string;
    mode: string; // ✅ Adicionado para o Python
    history: Array<{ role: string, text: string }>;
}