import { IsString, IsOptional, Length } from 'class-validator';

export class CreateProfessorDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  escolaNome?: string; // Opcional, pois no schema está String?
}