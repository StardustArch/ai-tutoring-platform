/*
  Warnings:

  - You are about to drop the `Aluno` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlunoProficienciaTopico` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatMensagem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Disciplina` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Encarregado` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExercicioResultado` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Professor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Topico` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Usuario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Aluno" DROP CONSTRAINT "Aluno_encarregadoId_fkey";

-- DropForeignKey
ALTER TABLE "AlunoProficienciaTopico" DROP CONSTRAINT "AlunoProficienciaTopico_alunoId_fkey";

-- DropForeignKey
ALTER TABLE "AlunoProficienciaTopico" DROP CONSTRAINT "AlunoProficienciaTopico_topicoId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMensagem" DROP CONSTRAINT "ChatMensagem_alunoId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMensagem" DROP CONSTRAINT "ChatMensagem_topicoId_fkey";

-- DropForeignKey
ALTER TABLE "Encarregado" DROP CONSTRAINT "Encarregado_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "ExercicioResultado" DROP CONSTRAINT "ExercicioResultado_alunoId_fkey";

-- DropForeignKey
ALTER TABLE "ExercicioResultado" DROP CONSTRAINT "ExercicioResultado_topicoId_fkey";

-- DropForeignKey
ALTER TABLE "Professor" DROP CONSTRAINT "Professor_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Topico" DROP CONSTRAINT "Topico_disciplinaId_fkey";

-- DropForeignKey
ALTER TABLE "_ProfessorAlunos" DROP CONSTRAINT "_ProfessorAlunos_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProfessorAlunos" DROP CONSTRAINT "_ProfessorAlunos_B_fkey";

-- DropForeignKey
ALTER TABLE "_ProfessorDisciplinas" DROP CONSTRAINT "_ProfessorDisciplinas_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProfessorDisciplinas" DROP CONSTRAINT "_ProfessorDisciplinas_B_fkey";

-- DropTable
DROP TABLE "Aluno";

-- DropTable
DROP TABLE "AlunoProficienciaTopico";

-- DropTable
DROP TABLE "ChatMensagem";

-- DropTable
DROP TABLE "Disciplina";

-- DropTable
DROP TABLE "Encarregado";

-- DropTable
DROP TABLE "ExercicioResultado";

-- DropTable
DROP TABLE "Professor";

-- DropTable
DROP TABLE "Topico";

-- DropTable
DROP TABLE "Usuario";

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "passwordHash" TEXT,
    "oauthProvider" TEXT,
    "oauthId" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" SERIAL NOT NULL,
    "escolaId" INTEGER,
    "isVerificado" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encarregados" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "encarregados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "dataNascimento" DATE,
    "classe" INTEGER NOT NULL,
    "encarregadoId" INTEGER NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topicos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nivelClasse" INTEGER NOT NULL,
    "disciplinaId" INTEGER NOT NULL,

    CONSTRAINT "topicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_mensagens" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mensagemAluno" TEXT NOT NULL,
    "respostaIa" TEXT NOT NULL,
    "tipoInteracao" "TipoInteracaoChat" NOT NULL DEFAULT 'DESCONHECIDO',
    "alunoId" INTEGER NOT NULL,
    "topicoId" INTEGER,

    CONSTRAINT "chat_mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercicio_resultados" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acertou" BOOLEAN NOT NULL,
    "detalhesJson" JSONB,
    "alunoId" INTEGER NOT NULL,
    "topicoId" INTEGER NOT NULL,

    CONSTRAINT "exercicio_resultados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aluno_proficiencia_topicos" (
    "id" SERIAL NOT NULL,
    "nivel" "NivelProficiencia" NOT NULL DEFAULT 'NAO_DIAGNOSTICADO',
    "alunoId" INTEGER NOT NULL,
    "topicoId" INTEGER NOT NULL,

    CONSTRAINT "aluno_proficiencia_topicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escolas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "localizacao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administradores_escola" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "escolaId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "administradores_escola_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_professor" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "escolaId" INTEGER NOT NULL,
    "criadoPor" INTEGER NOT NULL,
    "usadoPor" INTEGER,
    "usadoEm" TIMESTAMP(3),
    "validoAte" TIMESTAMP(3) NOT NULL,
    "isUsado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codigos_professor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_oauthId_key" ON "usuarios"("oauthId");

-- CreateIndex
CREATE UNIQUE INDEX "professores_usuarioId_key" ON "professores"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "encarregados_usuarioId_key" ON "encarregados"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "disciplinas_nome_key" ON "disciplinas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "aluno_proficiencia_topicos_alunoId_topicoId_key" ON "aluno_proficiencia_topicos"("alunoId", "topicoId");

-- CreateIndex
CREATE UNIQUE INDEX "escolas_codigo_key" ON "escolas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "administradores_escola_usuarioId_key" ON "administradores_escola"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_professor_codigo_key" ON "codigos_professor"("codigo");

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encarregados" ADD CONSTRAINT "encarregados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_encarregadoId_fkey" FOREIGN KEY ("encarregadoId") REFERENCES "encarregados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topicos" ADD CONSTRAINT "topicos_disciplinaId_fkey" FOREIGN KEY ("disciplinaId") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mensagens" ADD CONSTRAINT "chat_mensagens_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mensagens" ADD CONSTRAINT "chat_mensagens_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "topicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicio_resultados" ADD CONSTRAINT "exercicio_resultados_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicio_resultados" ADD CONSTRAINT "exercicio_resultados_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "topicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno_proficiencia_topicos" ADD CONSTRAINT "aluno_proficiencia_topicos_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno_proficiencia_topicos" ADD CONSTRAINT "aluno_proficiencia_topicos_topicoId_fkey" FOREIGN KEY ("topicoId") REFERENCES "topicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administradores_escola" ADD CONSTRAINT "administradores_escola_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administradores_escola" ADD CONSTRAINT "administradores_escola_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_professor" ADD CONSTRAINT "codigos_professor_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorAlunos" ADD CONSTRAINT "_ProfessorAlunos_A_fkey" FOREIGN KEY ("A") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorAlunos" ADD CONSTRAINT "_ProfessorAlunos_B_fkey" FOREIGN KEY ("B") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorDisciplinas" ADD CONSTRAINT "_ProfessorDisciplinas_A_fkey" FOREIGN KEY ("A") REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorDisciplinas" ADD CONSTRAINT "_ProfessorDisciplinas_B_fkey" FOREIGN KEY ("B") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
