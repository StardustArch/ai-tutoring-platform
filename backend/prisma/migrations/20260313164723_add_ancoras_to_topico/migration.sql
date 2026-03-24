/*
  Warnings:

  - The values [EXPERT] on the enum `NivelProficiencia` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NivelProficiencia_new" AS ENUM ('INICIANTE', 'ABAIXO_MEDIA', 'NA_MEDIA', 'AVANCADO', 'NAO_DIAGNOSTICADO');
ALTER TABLE "public"."aluno_proficiencia_topicos" ALTER COLUMN "nivel" DROP DEFAULT;
ALTER TABLE "aluno_proficiencia_topicos" ALTER COLUMN "nivel" TYPE "NivelProficiencia_new" USING ("nivel"::text::"NivelProficiencia_new");
ALTER TYPE "NivelProficiencia" RENAME TO "NivelProficiencia_old";
ALTER TYPE "NivelProficiencia_new" RENAME TO "NivelProficiencia";
DROP TYPE "public"."NivelProficiencia_old";
ALTER TABLE "aluno_proficiencia_topicos" ALTER COLUMN "nivel" SET DEFAULT 'NAO_DIAGNOSTICADO';
COMMIT;

-- AlterTable
ALTER TABLE "questao_cache" ADD COLUMN     "structure" TEXT;

-- AlterTable
ALTER TABLE "topicos" ADD COLUMN     "ancoras" TEXT[];

-- CreateIndex
CREATE INDEX "questao_cache_topicoId_dificuldade_structure_idx" ON "questao_cache"("topicoId", "dificuldade", "structure");
