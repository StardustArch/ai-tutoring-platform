from pydantic import BaseModel

class ChatRequest(BaseModel):
    mensagem: str
    id_aluno: int

class ChatResponse(BaseModel):
    sucesso: bool
    resposta: str
    topico: str | None = None