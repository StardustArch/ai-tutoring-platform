import { IsInt, IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class SendChatDto {
  @IsInt()
  @IsNotEmpty()
  alunoId: number;

  @IsString()
  @IsNotEmpty()
  userQuery: string;

  @IsOptional()
  @IsString()
  @IsIn(['tutor', 'rush_feedback']) // Valida se o modo é permitido
  mode?: string = 'tutor';
}

export class MicroserviceChatRequestDto {
  student_id: number;
  student_class: number;
  user_query: string;
  mode: string;
  history: Array<{ role: string; text: string }>;
}