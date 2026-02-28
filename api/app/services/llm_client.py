import os
import json
# import google.genai
from openai import OpenAI
from huggingface_hub import InferenceClient
# Certifica-te que adicionas o HF_TOKEN no teu app/config.py também!
from app.config import OPENROUTER_API_KEY, BASE_URL, GOOGLE_API_KEY, HF_TOKEN, GITHUB_TOKEN
from app.utils.text_helpers import clean_json_text

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
# 2. CLIENTE TUTOR (GitHub Models - GPT-4o)
# ==========================================
tutor_client = None

if GITHUB_TOKEN:
    # Configuração para usar os modelos gratuitos do GitHub
    tutor_client = OpenAI(
        base_url="https://models.github.ai/inference",
        api_key=GITHUB_TOKEN
    )
else:
    print("⚠️ AVISO: GITHUB_TOKEN em falta.")

def get_tutor_client():
    """Retorna o cliente OpenAI apontando para o GitHub Models"""
    return tutor_client

async def generate_tutor_response(system_prompt, user_query, history=[]):
    """
    Usa o GPT-4o-mini do GitHub de forma gratuita.
    """
    if not tutor_client:
        return {"error": "Serviço GitHub Models não configurado."}

    messages = [{"role": "system", "content": system_prompt}]
    
    # Adicionamos o histórico para a IA ter memória
    for msg in history[-6:]: # Últimas 6 para poupar tokens
        role = "assistant" if msg.get("role") in ["assistant", "model", "ai"] else "user"
        messages.append({"role": role, "content": str(msg.get("text", ""))})

    messages.append({"role": "user", "content": user_query})
    try:
        # Chamada ao modelo (Gratuito no GitHub)
        response = tutor_client.chat.completions.create(
            model="gpt-4o-mini", # Nome do modelo no GitHub Models
            messages=messages,
            temperature=0.7,
            # Nota: GitHub Models às vezes é rígido com JSON Mode, 
            # garantimos que o prompt pede JSON.
        )

        raw_text = response.choices[0].message.content
        cleaned_text = clean_json_text(raw_text)
        # Retorno
        return json.loads(cleaned_text)
    except Exception as e:
        print(f"❌ Erro GPT-4o/JSON: {e}")
        # Se falhar o parse, retornamos um fallback seguro
        return {
            "messages": ["Eish, tive um problema ao processar o que disseste. 🤖"],
            "emotion": "THOUGHTFUL",
            "interaction_type": "EXPLANATION",
            "interaction_data": {"options": ["Tentar novamente"]}
        }
# ==========================================
# 3. CLIENTE SOCIAL (Hugging Face - Hermes)
# ==========================================
# Este é o modelo "K" (Mascote/Amigo)
MODEL_ID = "llama-3.3-70b-versatile"

async def generate_groq_response(system_prompt, user_query, history=[]):
    """
    Gera resposta usando Groq Llama 3.3 70B com JSON Mode nativo.
    """
    # 1. Montar Histórico
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in history[-6:]:
        role = "assistant" if msg.get("role") in ["assistant", "model", "ai"] else "user"
        content = str(msg.get("text", ""))
        if content:
             messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_query})

    try:
        # 2. Chamada à API
        completion = rush_client.chat.completions.create(
            model=MODEL_ID,
            messages=messages,
            # 0.6 é o equilíbrio perfeito no Llama 3.3 para não alucinar mas ser simpático
            # Se ele estiver muito "duro", sobe para 0.7
            temperature=0.6, 
            max_tokens=1024,
            top_p=1,
            # 🚨 O SEGREDO: JSON MODE NATIVO
            # Isto garante que ele NUNCA responde com texto solto.
            response_format={"type": "json_object"} 
        )

        raw_text = completion.choices[0].message.content
        return json.loads(raw_text)

    except Exception as e:
        print(f"❌ Erro Groq: {e}")
        # Fallback
        return {
            "messages": ["Eish, a rede falhou! 📡", "Podes repetir?"],
            "emotion": "THOUGHTFUL",
            "interaction_type": "CHIPS",
            "interaction_data": {"options": ["Repetir"]}    
        }