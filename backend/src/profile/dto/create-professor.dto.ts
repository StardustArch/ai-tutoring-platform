import { IsOptional, IsString } from 'class-validator';

export class CreateProfessorDto {
  @IsString()
  @IsOptional()
  escola?: string;
}