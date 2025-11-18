import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nome: string; // <-- CORRIGIDO (era nomeCompleto)

  @IsString()
  @IsNotEmpty()
  sobrenome: string; // <-- NOVO

  @IsString()
  @IsNotEmpty()
  telefone: string; // <-- NOVO

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  password: string;
}