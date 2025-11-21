import { IsString, IsInt, IsNotEmpty, Length } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  nome: string; // Ex: "Matemática 4ª Classe - Manhã"

  @IsNotEmpty()
  @IsInt()
  disciplinaId: number; // O ID da disciplina (Matemática, Português, etc.)
}