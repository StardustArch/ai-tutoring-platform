export class CreateExerciseDto {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  topic: 'matematica' | 'portugues';
  difficulty?: number;
}
