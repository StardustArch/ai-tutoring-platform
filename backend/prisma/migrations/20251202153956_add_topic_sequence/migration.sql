-- AlterTable
ALTER TABLE "topicos" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "requisitoId" INTEGER;

-- AddForeignKey
ALTER TABLE "topicos" ADD CONSTRAINT "topicos_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "topicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
