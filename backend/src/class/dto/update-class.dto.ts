import { IsString, IsBoolean, IsOptional, Length } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}