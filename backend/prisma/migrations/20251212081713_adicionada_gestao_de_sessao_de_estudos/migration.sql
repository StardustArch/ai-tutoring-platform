-- CreateEnum
CREATE TYPE "ModoEstudo" AS ENUM ('TUTOR', 'RUSH');

-- CreateEnum
CREATE TYPE "StatusSessao" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA', 'ABANDONADA');

-- AlterTable
ALTER TABLE "chat_mensagens" ADD COLUMN     "sessaoId" INTEGER;

-- AlterTable
ALTER TABLE "exercicio_resultados" ADD COLUMN     "sessaoId" INTEGER;

-- CreateTable
CREATE TABLE "sessoes_estudo" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "turmaId" INTEGER,
    "modo" "ModoEstudo" NOT NULL,
    "topicosAlvo" JSONB NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim" TIMESTAMP(3),
    "duracaoSegundos" INTEGER,
    "xpGanho" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusSessao" NOT NULL DEFAULT 'EM_ANDAMENTO',

    CONSTRAINT "sessoes_estudo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "chat_mensagens" ADD CONSTRAINT "chat_mensagens_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "sessoes_estudo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicio_resultados" ADD CONSTRAINT "exercicio_resultados_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "sessoes_estudo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_estudo" ADD CONSTRAINT "sessoes_estudo_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_estudo" ADD CONSTRAINT "sessoes_estudo_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
