-- CreateEnum
CREATE TYPE "NivelDificuldade" AS ENUM ('MUITO_FACIL', 'FACIL', 'MEDIO', 'DIFICIL', 'MUITO_DIFICIL');

-- CreateTable
CREATE TABLE "diagnosticos_iniciais" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "disciplina" TEXT NOT NULL,
    "acertos" INTEGER NOT NULL,
    "totalPerguntas" INTEGER NOT NULL,
    "percentualAcerto" DOUBLE PRECISION NOT NULL,
    "nivelDiagnosticado" "NivelDificuldade" NOT NULL,
    "detalhesTopicos" JSONB,
    "recomendacoes" TEXT,
    "realizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validoAte" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosticos_iniciais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diagnosticos_iniciais_alunoId_disciplina_key" ON "diagnosticos_iniciais"("alunoId", "disciplina");

-- AddForeignKey
ALTER TABLE "diagnosticos_iniciais" ADD CONSTRAINT "diagnosticos_iniciais_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
