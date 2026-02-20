import { IsString, IsInt, IsNotEmpty, Length, Min, Max } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  nome: string; // Ex: "Matemática 4ª Classe - Manhã"

  @IsNotEmpty()
  @IsInt()
  disciplinaId: number; // O ID da disciplina (Matemática, Português, etc.)

  @IsInt()
  @Min(3)
  @Max(4) // Assumindo que o sistema vai até à 12ª
  classe: number;
}