import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'O nome não pode ter mais de 50 caracteres' })
  nome: string;

  @IsString()
  @MinLength(2, { message: 'O sobrenome deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'O sobrenome não pode ter mais de 50 caracteres' })
  sobrenome: string;

  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^(\+258\s?)?8[2-7][0-9]{7}$/, { 
    message: 'Número de telefone moçambicano inválido. Formato: +258 8X XXX XXXX' 
  })
  telefone?: string;
}