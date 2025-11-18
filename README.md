🧠 KaniMente - Chatbot Educacional Infantil com IA

Trabalho de Fim de Curso (TCC) > Curso: Licenciatura em Tecnologias de Informação

Autor: Paulo João Candrinho

Local: Beira, Moçambique

📖 Sobre o Projeto

O KaniMente é uma plataforma educativa inovadora concebida para auxiliar crianças do ensino primário (3ª à 6ª classe) na aprendizagem de Português e Matemática.

O sistema utiliza Inteligência Artificial Generativa para atuar como um tutor personalizado, adaptando-se ao nível da criança, oferecendo explicações, exercícios e feedback pedagógico, enquanto permite aos Encarregados e Professores monitorizar o progresso.

🏗️ Arquitetura de Microserviços

Este projeto utiliza uma arquitetura moderna baseada em microserviços para garantir escalabilidade e separação de responsabilidades:

Frontend (SvelteKit): A interface do utilizador, rápida e reativa.

Backend Core (NestJS): O "cérebro" do sistema. Gere utilizadores, autenticação, dados escolares e lógica de negócio.

Microserviço de IA (FastAPI): O "oráculo". Um serviço Python dedicado a comunicar com os LLMs (Google Gemini).

Base de Dados (PostgreSQL): Persistência de dados relacional.

🚀 Stack Tecnológica

🎨 Frontend

Framework: SvelteKit (TypeScript)

Estilização: Tailwind CSS v3

Componentes UI: Skeleton UI v2

Ícones: Lucide Svelte

Comunicação: Axios

🧠 Backend Principal

Framework: NestJS (TypeScript)

ORM: Prisma

Autenticação: Passport.js, JWT (Access + Refresh Tokens), Google OAuth2

Base de Dados: PostgreSQL

🤖 Microserviço de IA

Linguagem: Python 3.12

Framework: FastAPI

IA: Google Gemini API (google-generativeai)

🐳 Infraestrutura

Docker & Docker Compose: Orquestração dos serviços.

✨ Funcionalidades Principais

Autenticação Híbrida: Login manual seguro e Login social (Google).

Perfis Dinâmicos: Um utilizador pode atuar como Professor, Encarregado ou ambos.

Dashboard Interativo:

Visão do Professor: Gestão de turmas e estatísticas de alunos.

Visão do Encarregado: Acompanhamento dos educandos.

Chatbot Educacional: Interface de chat amigável para crianças interagirem com a IA.

Dark Mode: Suporte nativo a temas Claro/Escuro (Wintry Theme).

🛠️ Instalação e Execução

Pré-requisitos

Node.js (v18+)

Docker e Docker Compose

Conta Google Cloud (para OAuth)

API Key do Google Gemini

1. Configuração de Ambiente

Crie um ficheiro .env na raiz do projeto com as seguintes variáveis:

# Base de Dados
DATABASE_URL="postgresql://postgres:postgres@db:5432/km_db"

# Backend NestJS
JWT_SECRET_KEY="seu_segredo_access_token"
JWT_REFRESH_SECRET_KEY="seu_segredo_refresh_token"
FRONTEND_URL="http://localhost:5173"

# Google OAuth
GOOGLE_CLIENT_ID="seu_client_id_google"
GOOGLE_CLIENT_SECRET="seu_client_secret_google"
GOOGLE_CALLBACK_URL="http://localhost:4000/api/auth/google/callback"

# Microserviço IA
IA_API_URL="http://backend_ia:8000"
GEMINI_API_KEY="sua_api_key_gemini"


2. Iniciar os Backends (Docker)

O Backend NestJS, o Microserviço Python e a Base de Dados correm em contentores.

# Na raiz do projeto
docker-compose up --build


Backend API: http://localhost:4000

Swagger Docs: http://localhost:4000/api

Microserviço IA: http://localhost:8000

3. Iniciar o Frontend (Local)

Para melhor experiência de desenvolvimento (HMR), corremos o frontend localmente.

cd frontend
npm install
npm run dev


Acesse a Aplicação: http://localhost:5173

🗄️ Estrutura da Base de Dados

O projeto utiliza o Prisma ORM. O esquema principal inclui:

Usuario: Dados de login e OAuth.

Professor / Encarregado: Perfis ligados ao utilizador.

Aluno: Ligado aos Encarregados e Professores (M-N).

Turma: Para gestão de salas de aula.

Topico / Disciplina: Estrutura curricular.

Para popular a base de dados com dados iniciais (Admin, Disciplinas):

docker-compose exec backend_main npx prisma migrate dev --name init
# O seed corre automaticamente após a migração


🤝 Contribuição

Este é um projeto académico. Sugestões e pull requests são bem-vindos para fins de aprendizagem.

📄 Licença

Distribuído sob a licença MIT.