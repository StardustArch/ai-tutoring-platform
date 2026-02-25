// src/admin/dto/create-topic.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTopicDto {
  @IsString({ message: 'O nome do tópico deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome do tópico é obrigatório.' })
  nome: string;

  @IsInt({ message: 'O ID da disciplina deve ser um número inteiro.' })
  disciplinaId: number;

  @IsInt({ message: 'A classe deve ser um número inteiro.' })
  @Min(1)
  @Max(13) // Assumindo sistema até 12ª/13ª classe
  classe: number;

  @IsInt()
  @IsOptional()
  ordem?: number;

  // --- Campos para Metadata ---

  @IsString()
  @IsOptional()
  contextoIA?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  dificuldadeBase?: number;
}