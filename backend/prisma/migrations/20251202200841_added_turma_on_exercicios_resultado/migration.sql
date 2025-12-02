-- AlterTable
ALTER TABLE "exercicio_resultados" ADD COLUMN     "turmaId" INTEGER;

-- AddForeignKey
ALTER TABLE "exercicio_resultados" ADD CONSTRAINT "exercicio_resultados_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
