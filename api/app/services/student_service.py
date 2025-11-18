"""
Camada de Serviço (Cérebro) para Alunos.
"""
from sqlalchemy.orm import Session
from app.models import models
from app.schemas import student_schemas

async def processar_registo_aluno(
    db: Session, 
    dados_aluno: student_schemas.AlunoRegistoRequest,
    encarregado: models.Encarregado # O perfil do Encarregado (vem do token)
) -> models.Aluno:
    """
    Lógica de negócio REAL para registar um Aluno (Fluxo 1).
    """
    print(f"[Serviço de Aluno]: Encarregado {encarregado.id} a registar {dados_aluno.nome_aluno}")
    
    # 1. Criar o objecto Aluno
    db_aluno = models.Aluno(
        nome_aluno=dados_aluno.nome_aluno,
        classe=dados_aluno.classe,
        data_nascimento=dados_aluno.data_nascimento,
        encarregado_id=encarregado.id # Liga ao Encarregado que fez o pedido
    )
    
    db.add(db_aluno)
    db.commit()
    db.refresh(db_aluno)
    
    return db_aluno