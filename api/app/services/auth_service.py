from sqlalchemy.orm import Session
from app.schemas import auth_schemas
from app.services import auth_service
from app.security import security
from app.models import models
from app.models.database import get_db

async def processar_login(db: Session, email: str, password: str) -> dict:
    print(f"[Serviço de Auth]: A processar login async para {email}")
    
    db_usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    
    if not db_usuario or not security.verify_password(password, db_usuario.password_hash):
        return {"sucesso": False, "erro": "Email ou password inválidos"}
    
    # --- MUDANÇA CRÍTICA: Criar os dois tokens ---
    token_data = {"sub": db_usuario.email, "user_id": db_usuario.id}
    
    access_token = security.create_access_token(data=token_data)
    refresh_token = security.create_refresh_token(data=token_data) # <-- NOVO
    
    return {
        "sucesso": True,
        "access_token": access_token,
        "refresh_token": refresh_token, # <-- NOVO
    }

# (A função 'processar_registo_encarregado' não sofre alterações)
async def processar_registo_encarregado(
    db: Session, 
    dados_registo: auth_schemas.EncarregadoRegistoRequest
) -> models.Usuario | None:
    """
    Regista um perfil de Encarregado.
    Cria um novo Usuario SE ele não existir.
    Liga o perfil de Encarregado ao Usuario.
    """
    print(f"[Serviço de Auth]: A processar registo de Encarregado para {dados_registo.email}")
    
    # 1. Procurar o utilizador pelo email
    db_usuario = db.query(models.Usuario).filter(models.Usuario.email == dados_registo.email).first()
    
    if db_usuario:
        # Utilizador já existe. Verificar se já tem este perfil.
        if db_usuario.perfil_encarregado:
            return None # Erro: Já está registado como Encarregado
    else:
        # Utilizador não existe. Criar um novo Usuario.
        password_hash = security.get_password_hash(dados_registo.password)
        db_usuario = models.Usuario(
            email=dados_registo.email,
            nome_completo=dados_registo.nome_completo,
            password_hash=password_hash
        )
        # Nota: Não adicionamos à BD ainda
    
    # 2. Criar o novo perfil de Encarregado
    db_encarregado = models.Encarregado(
        telefone=dados_registo.telefone,
        usuario=db_usuario # Liga o perfil ao login (novo ou existente)
    )
    
    db.add(db_encarregado)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

async def processar_registo_professor(
    db: Session,
    dados_registo: auth_schemas.ProfessorRegistoRequest
) -> models.Usuario | None:
    """
    Regista um perfil de Professor.
    Cria um novo Usuario SE ele não existir.
    Liga o perfil de Professor ao Usuario.
    """
    print(f"[Serviço de Auth]: A processar registo de Professor para {dados_registo.email}")

    # 1. Procurar o utilizador pelo email
    db_usuario = db.query(models.Usuario).filter(models.Usuario.email == dados_registo.email).first()
    
    if db_usuario:
        # Utilizador já existe. Verificar se já tem este perfil.
        if db_usuario.perfil_professor:
            return None # Erro: Já está registado como Professor
        
        # (Opcional) Se ele se registou com Google, não tem password.
        # Aqui podemos decidir se queremos adicionar a password. Por agora, vamos assumir OK.
            
    else:
        # Utilizador não existe. Criar um novo Usuario.
        password_hash = security.get_password_hash(dados_registo.password)
        db_usuario = models.Usuario(
            email=dados_registo.email,
            nome_completo=dados_registo.nome_completo,
            password_hash=password_hash
        )
    
    # 2. Criar o novo perfil de Professor
    db_professor = models.Professor(
        escola=dados_registo.escola,
        usuario=db_usuario # Liga o perfil ao login (novo ou existente)
    )
    
    db.add(db_professor)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario