"""
Camada de Rotas (Porteiro) para Alunos.
ROTAS PROTEGIDAS.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.models import models
from app.schemas import student_schemas
from app.services import student_service
from app.models.database import get_db
from app.dependencies.dependencies import get_current_user # <-- 1. Importar o "Guarda"

router = APIRouter()

@router.post(
    "/registar",
    response_model=student_schemas.AlunoBaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registar um novo Aluno (só para Encarregados)"
)
async def registar_aluno(
    aluno_data: student_schemas.AlunoRegistoRequest,
    db: Session = Depends(get_db),
    # --- 2. ROTA PROTEGIDA ---
    # Esta rota 'Depende' do 'Guarda'. 
    # Se o token for mau, o 'Guarda' pára o pedido (erro 401).
    # Se for bom, recebemos o 'db_usuario'.
    db_usuario: models.Usuario = Depends(get_current_user)
):
    """
    Endpoint (Porteiro) para um Encarregado registar um Aluno (Fluxo 1).
    """
    print(f"[Rota /api/alunos/registar]: Pedido recebido do utilizador {db_usuario.email}")
    
    # 3. Verificar se o utilizador é um Encarregado
    # (O 'db_usuario' vem do 'get_current_user')
    if db_usuario.perfil_encarregado is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, # 403 Proibido
            detail="Apenas Encarregados podem registar alunos."
        )
    
    # 4. Chamar o "Cérebro" (passando o perfil verificado)
    db_aluno = await aluno_service.processar_registo_aluno(
        db=db,
        dados_aluno=aluno_data,
        encarregado=db_usuario.perfil_encarregado
    )
    
    return db_aluno