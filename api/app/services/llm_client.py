import os
import json
# import google.genai
from openai import OpenAI
from huggingface_hub import InferenceClient
# Certifica-te que adicionas o HF_TOKEN no teu app/config.py também!
from app.config import OPENROUTER_API_KEY, BASE_URL, GOOGLE_API_KEY, HF_TOKEN 

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
# if GOOGLE_API_KEY:
#     # ✅ Configuração Global da Google
#     genai.configure(api_key=GOOGLE_API_KEY)
# else:
#     print("⚠️ AVISO: API Key do Tutor (Google) em falta.")

# def get_tutor_model():
#     """
#     Retorna o OBJECTO do modelo Gemini (não faz a chamada ainda).
#     Configurado para JSON Mode nativo.
#     """
#     if not GOOGLE_API_KEY:
#         return None
    
#     # ✅ Inicializa o Objeto do Modelo
#     return genai.GenerativeModel(
#         model_name="gemini-1.5-flash", # (Atenção: o 2.5 ainda não saiu publicamente, usa o 1.5-flash ou pro)
#         generation_config={
#             "temperature": 0.4,
#             "response_mime_type": "application/json"
#         }
#     )


# ==========================================
# 3. CLIENTE SOCIAL (Hugging Face - Hermes)
# ==========================================
# Este é o modelo "Kani" (Mascote/Amigo)
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