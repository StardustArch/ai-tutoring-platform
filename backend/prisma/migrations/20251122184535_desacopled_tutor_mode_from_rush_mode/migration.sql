-- DropForeignKey
ALTER TABLE "exercicio_resultados" DROP CONSTRAINT "exercicio_resultados_alunoId_fkey";

-- DropForeignKey
ALTER TABLE "exercicio_resultados" DROP CONSTRAINT "exercicio_resultados_topicoId_fkey";

-- AlterTable
ALTER TABLE "exercicio_resultados" ADD COLUMN     "exercicioId" INTEGER,
ADD COLUMN     "respostaAluno" TEXT;

-- CreateTable
CREATE TABLE "Exercicio" (
    "id" SERIAL NOT NULL,
    "topicoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "opcoesJson" JSONB,
    "resposta" TEXT NOT NULL,
    "dificuldade" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercicio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exercicio_resultados" ADD CONSTRAINT "exercicio_resultados_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicio_resultados" ADD CONSTRAINT "exercicio_resultados_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "topicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicio_resultados" ADD CONSTRAINT "exercicio_resultados_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "Exercicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercicio" ADD CONSTRAINT "Exercicio_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "topicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
