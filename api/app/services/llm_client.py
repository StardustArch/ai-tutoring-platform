import os
import google.generativeai as genai # ✅ Import correto para a versão estável
from openai import OpenAI
from app.config import OPENROUTER_API_KEY, BASE_URL, GOOGLE_API_KEY

# ==========================================
# 1. CLIENTE RUSH (Llama / OpenRouter)
# ==========================================
rush_client = None

if OPENROUTER_API_KEY:
    rush_client = OpenAI(base_url=BASE_URL, api_key=OPENROUTER_API_KEY)
else:
    print("⚠️ AVISO: API Key do Rush (OpenRouter/Groq) em falta.")

def get_rush_client():
    """Retorna o cliente para o Modo Rush (Drill/Quiz)"""
    return rush_client


# ==========================================
# 2. CLIENTE TUTOR (Google Gemini)
# ==========================================
if GOOGLE_API_KEY:
    # ✅ Configuração Global da Google
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("⚠️ AVISO: API Key do Tutor (Google) em falta.")

def get_tutor_model():
    """
    Retorna o OBJETO do modelo Gemini (não faz a chamada ainda).
    Configurado para JSON Mode nativo.
    """
    if not GOOGLE_API_KEY:
        return None
    
    # ✅ Inicializa o Objeto do Modelo (não chama generate_content aqui)
    return genai.GenerativeModel(
        model_name="gemini-2.5-pro",
        generation_config={
            "temperature": 0.4,
            "response_mime_type": "application/json" # Força JSON sempre
        }
    )