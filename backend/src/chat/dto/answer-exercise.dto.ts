import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class AnswerExerciseDto {
  @IsInt()
  @IsNotEmpty()
  alunoId: number;

  @IsInt()
  @IsNotEmpty()
  exercicioId: number; // id vindo do servidor

  @IsString()
  @IsNotEmpty()
  respostaAluno: string;

  @IsInt()
  @IsOptional()
  classe?: number;

  // 🔥 CORREÇÃO: O frontend envia números (ex: 17), logo tem de ser @IsInt()
  @IsInt()
  @IsOptional()
  turmaId?: number;

  // 🔥 CORREÇÃO: Tem de ser @IsInt() para bater com o payload
  @IsInt()
  @IsOptional()
  sessaoId?: number; 
}