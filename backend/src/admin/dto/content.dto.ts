// src/admin/dto/content.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, Max, IsJSON, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

// --- DISCIPLINA ---
export class CreateDisciplinaDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;
}

export class UpdateDisciplinaDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;
}

// --- TÓPICO ---
export class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsInt()
  @Min(1)
  @Max(13) // Assumindo sistema até 13ª classe
  classe!: number;

  @IsInt()
  disciplinaId!: number;

  @IsInt()
  @IsOptional()
  ordem?: number;

  @IsInt()
  @IsOptional()
  requisitoId?: number; // O ID de outro tópico que deve ser aprendido antes

  // O "Cérebro" do tópico para a IA
  @IsOptional()
  metadata?: any; // Aceita objeto JSON (ex: { keywords: [], difficulty: 1 })
}

export class UpdateTopicDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsInt()
  @IsOptional()
  classe?: number;

  @IsInt()
  @IsOptional()
  ordem?: number;

  @IsInt()
  @IsOptional()
  requisitoId?: number;

  @IsOptional()
  metadata?: any;
}

// Filtros para listagem
export class FilterTopicDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classe?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  disciplinaId?: number;
}