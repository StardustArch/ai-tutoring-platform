import uvicorn
import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import RushRequest, RushResponse, ChatRequest, ChatResponse
from app.services.rush_service import generate_rush_question_logic
from app.services.chat_service import generate_chat_response_logic

# ==============================================================================
# 1. DEFINIR O LIFESPAN (O "Gestor" que liga/desliga coisas em background)
# ==============================================================================

# ==============================================================================
# 2. CRIAR A APP (Apenas UMA VEZ, já com o lifespan incluído)
# ==============================================================================
app = FastAPI(title="KMind Engine Modular", version="6.1.0")

if not os.path.exists("static"):
    os.makedirs("static")

# ==============================================================================
# 3. CONFIGURAÇÕES, MIDDLEWARES E ROTAS
# ==============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # No futuro, coloca aqui a URL do teu NestJS no Render
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/generate-rush-question", response_model=RushResponse)
async def generate_rush_question(request: RushRequest):
    return await generate_rush_question_logic(request)

@app.post("/generate-chat-response", response_model=ChatResponse)
async def generate_chat_response(request: ChatRequest):
    return await generate_chat_response_logic(request)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "KMind-ai"}

# ==============================================================================
# 4. ARRANQUE
# ==============================================================================
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)