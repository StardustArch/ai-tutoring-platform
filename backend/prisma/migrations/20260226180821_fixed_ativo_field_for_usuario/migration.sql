/*
  Warnings:

  - You are about to drop the column `ativo` on the `alunos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "alunos" DROP COLUMN "ativo";

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;
