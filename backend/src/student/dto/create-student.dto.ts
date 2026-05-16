import { IsString, IsNotEmpty, IsInt, Min, Max, IsDateString, Length } from 'class-validator';

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  nome!: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  sobrenome!: string;

  @IsNotEmpty()
  @IsDateString() // Espera formato ISO 8601 (YYYY-MM-DD)
  dataNascimento!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(13) // Assumindo da 1ª à 12ª/13ª classe
  classe!: number;
}