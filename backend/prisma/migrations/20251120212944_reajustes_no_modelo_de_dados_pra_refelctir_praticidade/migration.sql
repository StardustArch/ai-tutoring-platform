/*
  Warnings:

  - You are about to drop the column `escolaId` on the `professores` table. All the data in the column will be lost.
  - You are about to drop the column `isVerificado` on the `professores` table. All the data in the column will be lost.
  - You are about to drop the column `alunoId` on the `turmas` table. All the data in the column will be lost.
  - You are about to drop the column `escolaId` on the `turmas` table. All the data in the column will be lost.
  - You are about to drop the `administradores_escola` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `codigos_professor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documentos_escola` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `escolas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "administradores_escola" DROP CONSTRAINT "administradores_escola_escolaId_fkey";

-- DropForeignKey
ALTER TABLE "administradores_escola" DROP CONSTRAINT "administradores_escola_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "codigos_professor" DROP CONSTRAINT "codigos_professor_escolaId_fkey";

-- DropForeignKey
ALTER TABLE "documentos_escola" DROP CONSTRAINT "documentos_escola_escolaId_fkey";

-- DropForeignKey
ALTER TABLE "professores" DROP CONSTRAINT "professores_escolaId_fkey";

-- DropForeignKey
ALTER TABLE "turmas" DROP CONSTRAINT "turmas_alunoId_fkey";

-- DropForeignKey
ALTER TABLE "turmas" DROP CONSTRAINT "turmas_escolaId_fkey";

-- AlterTable
ALTER TABLE "professores" DROP COLUMN "escolaId",
DROP COLUMN "isVerificado",
ADD COLUMN     "escolaNome" TEXT;

-- AlterTable
ALTER TABLE "turmas" DROP COLUMN "alunoId",
DROP COLUMN "escolaId",
ADD COLUMN     "escolaNome" TEXT;

-- DropTable
DROP TABLE "administradores_escola";

-- DropTable
DROP TABLE "codigos_professor";

-- DropTable
DROP TABLE "documentos_escola";

-- DropTable
DROP TABLE "escolas";
