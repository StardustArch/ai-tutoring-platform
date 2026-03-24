-- AlterTable
ALTER TABLE "exercicios" ADD COLUMN     "questaoOrigemId" INTEGER;

-- AddForeignKey
ALTER TABLE "exercicios" ADD CONSTRAINT "exercicios_questaoOrigemId_fkey" FOREIGN KEY ("questaoOrigemId") REFERENCES "questao_cache"("id") ON DELETE SET NULL ON UPDATE CASCADE;
