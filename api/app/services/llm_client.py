import os
import json
from typing import Any
from openai import OpenAI, RateLimitError  # 🚨 Importante adicionar o RateLimitError
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
# 2. CLIENTE TUTOR (GitHub Models - GPT-4o) - COM ROTAÇÃO 🔄
# ==========================================

# 1. Carrega a lista de tokens do .env (separados por vírgula)
raw_tokens = os.environ.get("GITHUB_TOKENS", os.environ.get("GITHUB_TOKEN", ""))
GITHUB_TOKENS_LIST = [t.strip() for t in raw_tokens.split(",") if t.strip()]

tutor_clients = []
current_client_index = 0

# 2. Cria um "exército" de clientes, um para cada token
if GITHUB_TOKENS_LIST:
    print(f"✅ ROTAÇÃO ATIVADA: Carregados {len(GITHUB_TOKENS_LIST)} tokens do GitHub.")
    for token in GITHUB_TOKENS_LIST:
        client = OpenAI(
            base_url="https://models.github.ai/inference",
            api_key=token
        )
        tutor_clients.append(client)
else:
    print("⚠️ AVISO: Nenhum GITHUB_TOKENS encontrado.")


# ==========================================
# 2. CLIENTE TUTOR (GitHub Models - GPT-4o) - COM ROTAÇÃO 🔄
# ==========================================

def safe_load_json_object(text: str) -> Any | None:
    if not text: return None
    text = text.replace('“', '"').replace('”', '"').replace('\r\n', '\n')
    
    clean_text = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
    clean_text = re.sub(r"```", "", clean_text)
    
    start = clean_text.find('{')
    end = clean_text.rfind('}')
    
    if start != -1 and end != -1:
        candidate = clean_text[start:end+1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
    return None

async def generate_tutor_response(system_prompt, user_query, history=[]):
    """
    Usa o GPT-4o-mini do GitHub com rotação automática de tokens.
    """
    global current_client_index # Permite atualizar a posição na lista

    if not tutor_clients:
        return {"error": "Serviço GitHub Models não configurado."}

    # Prepara as mensagens
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-6:]:
        role = "assistant" if msg.get("role") in ["assistant", "model", "ai"] else "user"
        messages.append({"role": role, "content": str(msg.get("text", ""))})
    messages.append({"role": "user", "content": user_query})

    max_attempts = len(tutor_clients)
    attempts = 0

    while attempts < max_attempts:
        client = tutor_clients[current_client_index]
        used_index = current_client_index
        
        current_client_index = (current_client_index + 1) % len(tutor_clients)

        try:
            print(f"🔄 K-Mind: A processar com Token #{used_index + 1} de {len(tutor_clients)}...")
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                # 🔥 A MAGIA ACONTECE AQUI: Obriga a sair SÓ JSON
                response_format={"type": "json_object"} 
            )

            raw_text = response.choices[0].message.content
            
            # 🔥 SUBSTITUÍMOS O json.loads() PELO TEU EXTRATOR SEGURO
            obj = safe_load_json_object(raw_text)
            
            if obj:
                return obj
            else:
                raise ValueError("A IA devolveu um JSON vazio ou incompreensível.")

        except RateLimitError as e:
            print(f"⚠️ Token #{used_index + 1} esgotado (Rate Limit 429). A saltar rápido para o próximo...")
            attempts += 1
            continue

        except Exception as e:
            print(f"❌ Erro Fatal GPT-4o (Token #{used_index + 1}): {e}")
            attempts += 1
            continue
        
    print("🚨 ALERTA GERAL: Todos os tokens esgotaram ou falharam!")
    return {
        "messages": ["O Kani está a pensar muito devagar agora! 🔋 Podes dar-me um minuto para recarregar as energias?"],
        "emotion": "SAD",
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