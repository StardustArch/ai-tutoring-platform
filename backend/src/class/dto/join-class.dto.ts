import { IsString, IsNotEmpty, Length, IsInt } from 'class-validator';

export class JoinClassDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 6) // O código tem sempre 6 caracteres
  codigo!: string;
}

export class AddStudentDto {
  @IsNotEmpty()
  @IsString()
  codigo!: string;

  @IsNotEmpty()
  @IsInt()
  alunoId!: number;
}