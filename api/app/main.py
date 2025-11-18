"""
Ponto de Entrada Principal da API (FastAPI)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_router, chat_router, student_router
from app.models.database import engine
from app.models import models   


models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KaniMente API",
    description="API para o TCC Chatbot Educacional Infantil com IA",
    version="1.0.0"
)

# Configurar o CORS (permite ao Next.js em localhost:3000 falar connosco)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir os nossos "Porteiros" (Routers/Blueprints)
app.include_router(auth_router.router, prefix="/api/auth", tags=["1. Autenticação"])
app.include_router(chat_router.router, prefix="/api/chat", tags=["2. Chatbot"])
app.include_router(student_router.router, prefix="/api/alunos", tags=["3. Alunos"])

# Rota de Teste de Fumo (Smoke Test)
@app.get("/api/test", tags=["0. Teste"])
def read_root():
    print("API de teste V3 (FastAPI) foi chamada!")
    return {"message": "Olá do Backend V3 (FastAPI)!"}