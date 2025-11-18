"""
Schemas (Segurança) para a gestão de Alunos.
"""
from pydantic import BaseModel, constr
from datetime import date

class AlunoRegistoRequest(BaseModel):
    """ O que o Encarregado envia para registar o seu filho """
    nome_aluno: constr(min_length=3)
    classe: int # O "ponto de partida" (ex: 3, 4, 5)
    data_nascimento: date | None = None

class AlunoBaseResponse(BaseModel):
    """ A resposta que enviamos de volta """
    id: int
    nome_aluno: str
    classe: int
    encarregado_id: int
    
    class Config:
        from_attributes = True