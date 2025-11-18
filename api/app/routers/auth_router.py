from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas import auth_schemas
from app.services import auth_service
from app.security import security
from app.models import models
from app.models.database import get_db

router = APIRouter()

# --- MUDANÇA: Usar 'OAuth2PasswordRequestForm' ---
# O FastAPI tem um schema próprio para login (email=username, password=password)
# Isto dá-nos um formulário automático na documentação /docs
@router.post(
    "/token", # <-- MUDANÇA: O nome da rota agora é /token (padrão OAuth2)
    response_model=auth_schemas.TokenResponse,
    summary="Login (Gera Tokens de Acesso e Actualização)"
)
async def login_para_tokens(
    # 'form_data' espera 'username' e 'password' (não JSON)
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    print(f"[Rota /api/auth/token]: Pedido de token recebido para {form_data.username}")
    
    # O email do utilizador vem no campo 'username'
    resultado = await services.auth_service.processar_login(
        db=db, 
        email=form_data.username, 
        password=form_data.password
    )
    
    if not resultado["sucesso"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=resultado["erro"],
            headers={"WWW-Authenticate": "Bearer"}, # Padrão OAuth2
        )
    
    # Devolve ambos os tokens
    return auth_schemas.TokenResponse(
        access_token=resultado["access_token"],
        refresh_token=resultado["refresh_token"]
    )

# --- NOVA ROTA: Actualizar o Token ---
# 'oauth2_scheme' define como o 'Access Token' deve ser enviado
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

@router.post(
    "/token/refresh", 
    response_model=auth_schemas.TokenResponse,
    summary="Actualiza um Access Token usando um Refresh Token"
)
async def refresh_access_token(
    token: str = Depends(oauth2_scheme), # Recebe o REFRESH token no header
    db: Session = Depends(get_db)
):
    """
    Endpoint para trocar um Refresh Token válido por um novo
    Access Token (e um novo Refresh Token).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Verificar se o Refresh Token é válido
    payload = security.verify_token(token, credentials_exception)
    
    # 2. (Opcional, mas recomendado) Verificar se o utilizador ainda existe
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == payload.user_id).first()
    if db_usuario is None:
        raise credentials_exception
        
    # 3. Criar NOVOS tokens
    token_data = {"sub": db_usuario.email, "user_id": db_usuario.id}
    new_access_token = security.create_access_token(data=token_data)
    new_refresh_token = security.create_refresh_token(data=token_data)
    
    return auth_schemas.TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )

# (A rota de registo não sofre alterações)
@router.post(
    "/register/encarregado",
    response_model=auth_schemas.EncarregadoRegistoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registo de novo Encarregado"
)
async def register_encarregado(
    registo_data: auth_schemas.EncarregadoRegistoRequest,
    db: Session = Depends(get_db)
):
    print(f"[Rota /api/auth/register/encarregado]: Pedido recebido para {registo_data.email}")
    db_usuario = await auth_service.processar_registo_encarregado(
        db=db, 
        dados_registo=registo_data
    )
    if db_usuario is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email já está registado."
        )
    return db_usuario

@router.post(
    "/register/professor",
    response_model=auth_schemas.ProfessorRegistoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registo de novo Professor"
)
async def register_professor(
    registo_data: auth_schemas.ProfessorRegistoRequest,
    db: Session = Depends(get_db)
):
    """
    Endpoint (Porteiro) para o registo de um novo Professor (Fluxo 2).
    """
    print(f"[Rota /api/auth/register/professor]: Pedido recebido para {registo_data.email}")
    
    db_usuario = await auth_service.processar_registo_professor(
        db=db, 
        dados_registo=registo_data
    )
    
    if db_usuario is None:
        # Se o cérebro devolveu None, o utilizador/perfil já existe
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email já está registado com um perfil de professor."
        )
    
    return db_usuario