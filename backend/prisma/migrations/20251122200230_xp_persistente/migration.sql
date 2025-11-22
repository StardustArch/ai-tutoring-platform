-- AlterTable
ALTER TABLE "aluno_proficiencia_topicos" ADD COLUMN     "bloqueadoAte" TIMESTAMP(3),
ADD COLUMN     "vidasRestantes" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "alunos" ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;
