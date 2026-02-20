/*
  Warnings:

  - You are about to drop the `_ProfessorDisciplinas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ProfessorDisciplinas" DROP CONSTRAINT "_ProfessorDisciplinas_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProfessorDisciplinas" DROP CONSTRAINT "_ProfessorDisciplinas_B_fkey";

-- DropTable
DROP TABLE "_ProfessorDisciplinas";
