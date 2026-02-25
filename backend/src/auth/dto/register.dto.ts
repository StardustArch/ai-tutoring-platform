import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nome: string; // <-- CORRIGIDO (era nomeCompleto)

  @IsString()
  @IsNotEmpty()
  sobrenome: string; // <-- NOVO

  @IsString()
  @IsOptional()
  telefone?: string; // <-- NOVO

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  password: string;
}