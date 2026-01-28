/*
  Warnings:

  - Added the required column `classe` to the `turmas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "turmas" ADD COLUMN     "classe" INTEGER NOT NULL;
