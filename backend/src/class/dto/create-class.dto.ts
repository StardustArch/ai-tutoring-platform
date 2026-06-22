import { IsString, IsInt, IsNotEmpty, Length, Min, Max } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  nome!: string;

  @IsNotEmpty()
  @IsInt()
  disciplinaId!: number;

  @IsInt()
  @Min(3)
  @Max(4)
  classe!: number;
}