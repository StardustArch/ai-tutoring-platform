import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  @IsNotEmpty()
  sobrenome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  telefone!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role: Role = Role.USER;
}