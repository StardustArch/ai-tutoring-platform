-- AlterEnum
ALTER TYPE "ModoEstudo" ADD VALUE 'LESSON';

-- CreateTable
CREATE TABLE "licao_progressos" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "topicoId" INTEGER NOT NULL,
    "sessaoId" INTEGER,
    "estado" JSONB NOT NULL,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licao_progressos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licao_progressos_sessaoId_key" ON "licao_progressos"("sessaoId");

-- CreateIndex
CREATE UNIQUE INDEX "licao_progressos_alunoId_topicoId_concluida_key" ON "licao_progressos"("alunoId", "topicoId", "concluida");

-- AddForeignKey
ALTER TABLE "licao_progressos" ADD CONSTRAINT "licao_progressos_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licao_progressos" ADD CONSTRAINT "licao_progressos_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "topicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licao_progressos" ADD CONSTRAINT "licao_progressos_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "sessoes_estudo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
