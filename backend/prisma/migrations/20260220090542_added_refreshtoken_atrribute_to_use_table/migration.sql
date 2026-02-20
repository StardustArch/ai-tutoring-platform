/*
  Warnings:

  - You are about to drop the `Exercicio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Exercicio" DROP CONSTRAINT "Exercicio_topicoId_fkey";

-- DropForeignKey
ALTER TABLE "exercicio_resultados" DROP CONSTRAINT "exercicio_resultados_exercicioId_fkey";

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "hashedRt" TEXT;

-- DropTable
DROP TABLE "Exercicio";

-- CreateTable
CREATE TABLE "exercicios" (
    "id" SERIAL NOT NULL,
    "topicoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "opcoesJson" JSONB,
    "resposta" TEXT NOT NULL,
    "dificuldade" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercicios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exercicio_resultados" ADD CONSTRAINT "exercicio_resultados_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "exercicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicios" ADD CONSTRAINT "exercicios_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "topicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
