from pydantic import BaseModel, EmailStr

# (Schema 'EncarregadoRegistoRequest' - sem alteração)
class EncarregadoRegistoRequest(BaseModel):
    nome_completo: str
    email: EmailStr
    password: str
    telefone: str | None = None

# (Schema 'EncarregadoRegistoResponse' - sem alteração)
class EncarregadoRegistoResponse(BaseModel):
    id: int
    email: str
    nome_completo: str
    class Config:
        from_attributes = True

# (Schema 'LoginRequest' - sem alteração)
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# --- MUDANÇA CRÍTICA: Resposta do Login ---
# Agora devolve os dois tokens
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str # <-- NOVO
    token_type: str = "bearer"

class ProfessorRegistoRequest(BaseModel):
    nome_completo: str
    email: EmailStr
    password: str
    escola: str | None = None # Opcional

class ProfessorRegistoResponse(BaseModel):
    id: int
    email: str
    nome_completo: str
    class Config:
        from_attributes = True