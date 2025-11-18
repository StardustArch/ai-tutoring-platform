"""
Configuração centralizada (lida a partir de variáveis de ambiente).
Usa o Pydantic-Settings para validar.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/km_db"
    
    # --- NOVAS ADIÇÕES PARA O JWT ---
    JWT_SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    JWT_ALGORITHM: str = "HS256"
    
    # --- MUDANÇA: Access Token agora é curto! ---
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15 # 15 minutos
    
    # --- NOVO: Refresh Token é longo ---
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7 # 7 dias

    class Config:
        env_file = ".env"

settings = Settings()
