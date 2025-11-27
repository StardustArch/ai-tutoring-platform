import uvicorn
import os
from fastapi import FastAPI, HTTPException
from app.models.schemas import RushRequest, RushResponse, ChatRequest, ChatResponse
from app.services.rush_service import generate_rush_question_logic
from app.services.chat_service import generate_chat_response_logic

app = FastAPI(title="KaniMente Engine Modular", version="6.1.0")

@app.post("/generate-rush-question", response_model=RushResponse)
async def generate_rush_question(request: RushRequest):
    return await generate_rush_question_logic(request)

@app.post("/generate-chat-response", response_model=ChatResponse)
async def generate_chat_response(request: ChatRequest):
    return await generate_chat_response_logic(request)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)