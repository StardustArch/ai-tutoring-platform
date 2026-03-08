-- DropIndex
DROP INDEX "licao_progressos_alunoId_topicoId_concluida_key";

-- AlterTable
ALTER TABLE "licao_progressos" ADD COLUMN     "melhorPontuacao" INTEGER,
ADD COLUMN     "tentativa" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "licao_progressos_alunoId_topicoId_idx" ON "licao_progressos"("alunoId", "topicoId");
