export class AnswerExerciseDto {
  alunoId: number;
  exercicioId: number; // id vindo do servidor (ou null se gerar on-the-fly)
  respostaAluno: string;
  sessionId?: string;
    classe?: number;

}
