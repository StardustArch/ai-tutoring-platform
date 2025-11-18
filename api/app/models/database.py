"""
O "Motor" da Base de Dados (SQLAlchemy).
Cria a ligação e a gestão de sessões.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from ..config.config import settings # Importa o nosso URL da BD

# 1. Criar o "Motor" (Engine)
# Este é o objecto principal que o SQLAlchemy usa para falar com a BD.
engine = create_engine(
    settings.DATABASE_URL
)

# 2. Criar um "Criador de Sessões" (SessionMaker)
# Cada pedido (request) à API usará uma destas sessões para falar com a BD.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Criar a "Base"
# Esta é a classe da qual todos os nossos modelos (em models.py) vão herdar.
Base = declarative_base()

# --- NOVO: A Dependência (Dependency) ---
# Esta função é o "canal" que os nossos "Porteiros" (routers)
# vão usar para obter uma sessão da BD.
def get_db():
    db = SessionLocal()
    try:
        yield db # Entrega a sessão
    finally:
        db.close() # Fecha a sessão no fim (mesmo que dê erro)