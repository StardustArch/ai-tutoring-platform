// src/admin/dto/list-topics.dto.ts
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTopicsDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  classe!: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  disciplinaId!: number;
}