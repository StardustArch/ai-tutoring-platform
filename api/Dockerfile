# Versão 2.0 (FastAPI)
FROM python:3.12-slim

WORKDIR /app

RUN mkdir -p static/audio_cache && chmod 777 static/audio_cache

# Copiar o NOVO ficheiro de requisitos
COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
# Instalar as dependências

# Copiar todo o código da app
COPY . .

# Expor a nova porta do FastAPI
EXPOSE 8000

# O NOVO comando para iniciar o servidor Uvicorn (que corre o FastAPI)
# --reload activa o hot-reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]