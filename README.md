# 🧠 KaniMente - Chatbot Educacional Infantil com IA

**Trabalho de Fim de Curso (TCC)**  
**Curso**: Licenciatura em Tecnologias de Informação  
**Autor**: Paulo João Candrinho  
**Local**: Beira, Moçambique  

## 📖 Sobre o Projeto

O **KaniMente** é uma plataforma educativa inovadora concebida para auxiliar crianças do ensino primário (3ª à 6ª classe) na aprendizagem de **Português** e **Matemática**.

O sistema utiliza **Inteligência Artificial Generativa** para atuar como um tutor personalizado, adaptando-se ao nível da criança, oferecendo explicações, exercícios e feedback pedagógico, enquanto permite aos **Encarregados** e **Professores** monitorizar o progresso.

## 🏗️ Arquitetura de Microserviços

Este projeto utiliza uma arquitetura moderna baseada em microserviços para garantir escalabilidade e separação de responsabilidades:

- **Frontend (SvelteKit)**: A interface do utilizador, rápida e reativa
- **Backend Core (NestJS)**: O "cérebro" do sistema. Gere utilizadores, autenticação, dados escolares e lógica de negócio
- **Microserviço de IA (FastAPI)**: O "oráculo". Um serviço Python dedicado a comunicar com os LLMs (Google Gemini)
- **Base de Dados (PostgreSQL)**: Persistência de dados relacional

## 🚀 Stack Tecnológica

### 🎨 Frontend
- **Framework**: SvelteKit (TypeScript)
- **Estilização**: Tailwind CSS v3
- **Componentes UI**: Skeleton UI v2
- **Ícones**: Lucide Svelte
- **Comunicação**: Axios

### 🧠 Backend Principal
- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma
- **Autenticação**: Passport.js, JWT (Access + Refresh Tokens), Google OAuth2
- **Base de Dados**: PostgreSQL

### 🤖 Microserviço de IA
- **Linguagem**: Python 3.12
- **Framework**: FastAPI
- **IA**: Google Gemini API (google-generativeai)

### 🐳 Infraestrutura
- **Docker & Docker Compose**: Orquestração dos serviços

## ✨ Funcionalidades Principais

- **Autenticação Híbrida**: Login manual seguro e Login social (Google)
- **Perfis Dinâmicos**: Um utilizador pode atuar como Professor, Encarregado ou ambos
- **Dashboard Interativo**:
  - Visão do Professor: Gestão de turmas e estatísticas de alunos
  - Visão do Encarrregado: Acompanhamento dos educandos
- **Chatbot Educacional**: Interface de chat amigável para crianças interagirem com a IA
- **Dark Mode**: Suporte nativo a temas Claro/Escuro (Wintry Theme)

## 🛠️ Instalação e Execução

### Pré-requisitos
- Docker e Docker Compose
- Conta Google Cloud (para OAuth)
- API Key do Google Gemini

### 1. Configuração de Ambiente

Crie um ficheiro `.env` na raiz do projeto com as seguintes variáveis:

```env
# Base de Dados
DATABASE_URL="postgresql://postgres:postgres@db:5432/km_db"

# Backend NestJS
JWT_SECRET_KEY="seu_segredo_access_token"
JWT_REFRESH_SECRET_KEY="seu_segredo_refresh_token"
FRONTEND_URL="http://localhost:4173"

# Google OAuth
GOOGLE_CLIENT_ID="seu_client_id_google"
GOOGLE_CLIENT_SECRET="seu_client_secret_google"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Microserviço IA
IA_API_URL="http://backend_ia:8000"
GEMINI_API_KEY="sua_api_key_gemini"
```

### 2. Executar a Aplicação Completa

Todos os serviços (frontend, backend, IA e base de dados) executam em containers Docker:

```bash
# Na raiz do projeto (modo desenvolvimento)
docker-compose up --build

# Ou em background
docker-compose up -d --build
```

**Serviços disponíveis:**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Microserviço IA**: http://localhost:8000
- **PostgreSQL**: localhost:5432

### 3. Comandos de Desenvolvimento

Se precisar de executar comandos dentro dos containers:

```bash
# Executar migrações da base de dados
docker-compose exec backend_main npx prisma migrate dev --name init

# Gerar cliente Prisma
docker-compose exec backend_main npx prisma generate

# Ver logs do backend
docker-compose logs backend_main

# Ver logs do frontend
docker-compose logs frontend

# Parar todos os serviços
docker-compose down
```

## 🗄️ Estrutura da Base de Dados

O projeto utiliza o Prisma ORM. O esquema principal inclui:

- **Usuario**: Dados de login e OAuth
- **Professor / Encarregado**: Perfis ligados ao utilizador
- **Aluno**: Ligado aos Encarregados e Professores (M-N)
- **Turma**: Para gestão de salas de aula
- **Topico / Disciplina**: Estrutura curricular

## 📋 Comandos Úteis

### Desenvolvimento com Docker
```bash
# Iniciar todos os serviços
docker-compose up --build

# Reiniciar um serviço específico
docker-compose restart backend_main

# Ver logs em tempo real
docker-compose logs -f frontend

# Executar comandos no container do backend
docker-compose exec backend_main npm run test

# Parar e remover containers
docker-compose down -v
```


## 🔧 Configuração do Google OAuth

1. Aceda ao [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Ative a API Google+
4. Crie credenciais OAuth 2.0
5. Adicione URIs de redirecionamento:
   - `http://localhost:3000/api/auth/google/callback`


## 🤝 Contribuição

Este é um projeto académico. Sugestões e pull requests são bem-vindos para fins de aprendizagem.

## 📄 Licença

Distribuído sob a licença MIT.

---

**Nota**: A aplicação está completamente containerizada. Todos os serviços executam em Docker, incluindo o frontend que é servido na porta 4173. Certifique-se de substituir as credenciais de exemplo pelas suas próprias credenciais antes de executar em produção.
