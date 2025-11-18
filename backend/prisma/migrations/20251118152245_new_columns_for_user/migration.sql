-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoInteracaoChat" AS ENUM ('EXPLICACAO', 'EXERCICIO', 'SAUDACAO', 'DESCONHECIDO');

-- CreateEnum
CREATE TYPE "NivelProficiencia" AS ENUM ('INICIANTE', 'ABAIXO_MEDIA', 'NA_MEDIA', 'AVANCADO', 'NAO_DIAGNOSTICADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "passwordHash" TEXT,
    "oauthProvider" TEXT,
    "oauthId" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professor" (
    "id" SERIAL NOT NULL,
    "escola" TEXT,
    "isVerificado" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encarregado" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Encarregado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aluno" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "dataNascimento" DATE,
    "classe" INTEGER NOT NULL,
    "encarregadoId" INTEGER NOT NULL,

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disciplina" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Disciplina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topico" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nivelClasse" INTEGER NOT NULL,
    "disciplinaId" INTEGER NOT NULL,

    CONSTRAINT "Topico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMensagem" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mensagemAluno" TEXT NOT NULL,
    "respostaIa" TEXT NOT NULL,
    "tipoInteracao" "TipoInteracaoChat" NOT NULL DEFAULT 'DESCONHECIDO',
    "alunoId" INTEGER NOT NULL,
    "topicoId" INTEGER,

    CONSTRAINT "ChatMensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExercicioResultado" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acertou" BOOLEAN NOT NULL,
    "detalhesJson" JSONB,
    "alunoId" INTEGER NOT NULL,
    "topicoId" INTEGER NOT NULL,

    CONSTRAINT "ExercicioResultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlunoProficienciaTopico" (
    "id" SERIAL NOT NULL,
    "nivel" "NivelProficiencia" NOT NULL DEFAULT 'NAO_DIAGNOSTICADO',
    "alunoId" INTEGER NOT NULL,
    "topicoId" INTEGER NOT NULL,

    CONSTRAINT "AlunoProficienciaTopico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfessorAlunos" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfessorAlunos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProfessorDisciplinas" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfessorDisciplinas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_oauthId_key" ON "Usuario"("oauthId");

-- CreateIndex
CREATE UNIQUE INDEX "Professor_usuarioId_key" ON "Professor"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Encarregado_usuarioId_key" ON "Encarregado"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Disciplina_nome_key" ON "Disciplina"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "AlunoProficienciaTopico_alunoId_topicoId_key" ON "AlunoProficienciaTopico"("alunoId", "topicoId");

-- CreateIndex
CREATE INDEX "_ProfessorAlunos_B_index" ON "_ProfessorAlunos"("B");

-- CreateIndex
CREATE INDEX "_ProfessorDisciplinas_B_index" ON "_ProfessorDisciplinas"("B");

-- AddForeignKey
ALTER TABLE "Professor" ADD CONSTRAINT "Professor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encarregado" ADD CONSTRAINT "Encarregado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_encarregadoId_fkey" FOREIGN KEY ("encarregadoId") REFERENCES "Encarregado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topico" ADD CONSTRAINT "Topico_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "Disciplina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMensagem" ADD CONSTRAINT "ChatMensagem_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMensagem" ADD CONSTRAINT "ChatMensagem_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "Topico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExercicioResultado" ADD CONSTRAINT "ExercicioResultado_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExercicioResultado" ADD CONSTRAINT "ExercicioResultado_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "Topico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlunoProficienciaTopico" ADD CONSTRAINT "AlunoProficienciaTopico_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlunoProficienciaTopico" ADD CONSTRAINT "AlunoProficienciaTopico_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "Topico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorAlunos" ADD CONSTRAINT "_ProfessorAlunos_A_fkey" FOREIGN KEY ("A") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorAlunos" ADD CONSTRAINT "_ProfessorAlunos_B_fkey" FOREIGN KEY ("B") REFERENCES "Professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorDisciplinas" ADD CONSTRAINT "_ProfessorDisciplinas_A_fkey" FOREIGN KEY ("A") REFERENCES "Disciplina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorDisciplinas" ADD CONSTRAINT "_ProfessorDisciplinas_B_fkey" FOREIGN KEY ("B") REFERENCES "Professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
