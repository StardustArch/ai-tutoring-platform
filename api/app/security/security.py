from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from app.config import config

# 1. Configuração do Hashing (sem alteração)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- 2. NOVAS Funções de Token ---

class TokenPayload(BaseModel):
    """ O 'payload' (carga útil) que guardamos dentro do token """
    sub: EmailStr # O 'subject' (o email do utilizador)
    user_id: int

def create_access_token(data: dict) -> str:
    """Cria um novo Access Token (curta duração)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Cria um novo Refresh Token (longa duração)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def verify_token(token: str, credentials_exception) -> TokenPayload:
    """
    Verifica e descodifica um token (Access ou Refresh).
    Se falhar, levanta a 'credentials_exception'.
    """
    try:
        payload_dict = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Valida o payload com o nosso schema Pydantic
        payload = TokenPayload(**payload_dict)
        
        if payload.sub is None or payload.user_id is None:
            raise credentials_exception
        
        return payload
        
    except JWTError:
        # Se o token estiver expirado ou for inválido, levanta a excepção
        raise credentials_exception