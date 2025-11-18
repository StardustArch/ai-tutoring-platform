"""
Dependências de Segurança

Funções que o FastAPI pode "injectar" nas nossas rotas
para garantir que o utilizador está autenticado.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
from app.models import models
from app.security import security
from app.models.database import get_db

# Esta é a "porta" onde o FastAPI espera que o token seja enviado.
# 'tokenUrl' aponta para a nossa rota de login.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Excepção padrão para erros de autenticação
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenciais inválidas ou token expirado",
    headers={"WWW-Authenticate": "Bearer"},
)

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> models.Usuario:
    """
    O nosso "Guarda" de segurança.
    1. Depende do token (via 'oauth2_scheme') e da BD (via 'get_db').
    2. Verifica se o token é válido.
    3. Vai à BD buscar o utilizador correspondente.
    4. Devolve o objecto 'models.Usuario' completo.
    
    Qualquer rota que 'Dependa' disto, falhará com 401 se o token for mau.
    """
    try:
        # Verifica o token (expiração, assinatura)
        payload = security.verify_token(token, CREDENTIALS_EXCEPTION)
        
        # O payload contém o email (sub) e o id
        user_id: int = payload.user_id
        
        if user_id is None:
            raise CREDENTIALS_EXCEPTION
            
    except JWTError:
        raise CREDENTIALS_EXCEPTION
    
    # Se o token é válido, vamos buscar o utilizador à BD
    user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    
    if user is None:
        # Se o utilizador (do token) não existir na BD
        raise CREDENTIALS_EXCEPTION
        
    return user