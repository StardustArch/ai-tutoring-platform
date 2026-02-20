-- CreateTable
CREATE TABLE "_TurmaTopicos" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TurmaTopicos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TurmaTopicos_B_index" ON "_TurmaTopicos"("B");

-- AddForeignKey
ALTER TABLE "_TurmaTopicos" ADD CONSTRAINT "_TurmaTopicos_A_fkey" FOREIGN KEY ("A") REFERENCES "topicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TurmaTopicos" ADD CONSTRAINT "_TurmaTopicos_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
