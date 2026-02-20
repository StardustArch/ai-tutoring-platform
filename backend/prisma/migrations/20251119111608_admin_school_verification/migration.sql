/*
  Warnings:

  - Added the required column `atualizadoEm` to the `administradores_escola` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "administradores_escola" ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isVerificado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "escolas" ADD COLUMN     "emailInstitucional" TEXT,
ADD COLUMN     "isVerificada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telefoneInstitucional" TEXT;

-- CreateTable
CREATE TABLE "documentos_escola" (
    "id" SERIAL NOT NULL,
    "escolaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "numeroDocumento" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "dataValidade" TIMESTAMP(3),
    "aprovado" BOOLEAN,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aprovadoEm" TIMESTAMP(3),

    CONSTRAINT "documentos_escola_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documentos_escola" ADD CONSTRAINT "documentos_escola_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
