from fastapi import APIRouter, HTTPException, status
from ..schemas import chat_schemas
from ..services import chat_service

router = APIRouter()

@router.post("/send", response_model=chat_schemas.ChatResponse)
async def send_message(chat_data: chat_schemas.ChatRequest):
    resultado = await chat_service.processar_mensagem(chat_data.mensagem, chat_data.id_aluno)
    if not resultado["sucesso"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar mensagem"
        )
    return chat_schemas.ChatResponse(**resultado)