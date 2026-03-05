-- CreateTable
CREATE TABLE "questao_cache" (
    "id" SERIAL NOT NULL,
    "topicoId" INTEGER NOT NULL,
    "disciplina" TEXT NOT NULL,
    "classe" INTEGER NOT NULL,
    "dificuldade" INTEGER NOT NULL,
    "pergunta" TEXT NOT NULL,
    "opcoesJson" JSONB NOT NULL,
    "resposta" TEXT NOT NULL,
    "explicacao" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questao_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questao_cache_topicoId_dificuldade_classe_idx" ON "questao_cache"("topicoId", "dificuldade", "classe");

-- AddForeignKey
ALTER TABLE "questao_cache" ADD CONSTRAINT "questao_cache_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "topicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
