// src/escolas/dto/create-escola.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateEscolaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsOptional()
  codigo?: string; // Código oficial do MINEDH

  @IsString()
  @IsNotEmpty()
  localizacao: string;

  @IsEmail()
  @IsOptional()
  emailInstitucional?: string;

  @IsString()
  @IsOptional()
  telefoneInstitucional?: string;
}
