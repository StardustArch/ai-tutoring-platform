import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nome: string; // <-- CORRIGIDO (era nomeCompleto)

  @IsString()
  @IsNotEmpty()
  sobrenome: string; // <-- NOVO

  @IsString()
  @IsOptional()
  @Matches(/^(?:\+258)?8[2-7]\d{7}$/, {
    message: 'Número de telefone inválido',
  })
  telefone?: string; // <-- NOVO

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'A password deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/, {
    message:
      'A senha deve ter pelo menos 8 caracteres, uma maiúscula, um número e um caractere especial',
  })
  password: string;
}
