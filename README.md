
**Final Year Project (TCC)**

## Architecture

The project follows a modern **Microservices Architecture**:

* **Frontend (SvelteKit):** Reactive UI/UX with a mobile-first approach.
* **Core Backend (NestJS):** Handles auth, user management, and business logic.
* **AI Service (FastAPI):** Python microservice bridging the application with LLMs (Google Gemini and llama 3).
* **Database (PostgreSQL):** Relational data persistence managed via Prisma ORM.

## Tech Stack

| Component | Technology |
| --- | --- |
| **Frontend** | SvelteKit, TypeScript, Tailwind CSS, Skeleton UI |
| **Backend Core** | NestJS, Prisma ORM, Passport.js (JWT/OAuth) |
| **AI Microservice** | Python 3.12, FastAPI |
| **Database** | PostgreSQL |
| **Infra** | Docker & Docker Compose // Podman & Podman Compose |

## Key Features

**AI Tutor:** Interactive chat with "Tutor" (guided learning) and "Rush" (gamified quiz) modes.

**Multi-Role System:** Distinct dashboards for Students, Teachers, and Guardians.

**Hybrid Auth:** Support for secure local login and Google OAuth2.

**Analytics:** Progress tracking, XP system, and performance reports.

**UI:** Responsive design with native Dark Mode support.

## Getting Started

### Prerequisites

* Docker & Docker Compose // Podman & Podman Compose
* Google Gemini API Key and GROQ API Key

### 1. Environment Setup

Create a `.env` file in the root directory:

```env
# Database Secrets (Postgers)
POSTGRES_USER="your_postgres_user"
POSTGRES_PASSWORD="your_postgres_password"
POSTGRES_DB="your_postgres_database_name"

# Backend Core (NestJS)
JWT_SECRET_KEY="your_access_secret"
JWT_REFRESH_SECRET_KEY="your_refresh_secret"
FRONTEND_URL="http://localhost:5173"
DATABASE_URL="postgresql://postgres:postgres@db:5432/{your_postgres_database_name}"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Frontend (SvelteKit) 
PUBLIC_API_URL="http://backend:3000" # Used for Server-Side Rendering (Internal Docker Network)
PUBLIC_API_URL_HOST="http://localhost:3000" # Used for Client-Side Fetching (Browser Access)
PUBLIC_IA_HOST_API_URL="http://localhost:8000" # Used for serving Audio/Assets directly to browser

# AI Service (FastAPI)
IA_API_URL="http://api:8000"
GEMINI_API_KEY="your_gemini_api_key"
GROQ_API_KEY="your_groq_api_key"
```

### 2. Run Application

Start the entire stack using Docker/Podman Compose:

```bash
docker-compose up --build

or

podman compose up --build
```

### 3. Access

* **Frontend:** `http://localhost:5173`
* **Backend API:** `http://localhost:3000`
* **AI Service Docs:** `http://localhost:8000/docs`

---
