import os
import json
import re
from typing import Any
from openai import OpenAI, RateLimitError
from huggingface_hub import InferenceClient
from app.config import OPENROUTER_API_KEY, BASE_URL, GOOGLE_API_KEY, HF_TOKEN, GITHUB_TOKEN
from app.utils.text_helpers import clean_json_text

# ==========================================
# 1. CLIENTE RUSH (OpenRouter - COM ROTAÇÃO)
# ==========================================
raw_or_tokens = os.environ.get("OPENROUTER_API_KEYS", os.environ.get("OPENROUTER_API_KEY", ""))
OPENROUTER_TOKENS_LIST = [t.strip().strip('"').strip("'") for t in raw_or_tokens.split(",") if t.strip()]

rush_clients = []
if OPENROUTER_TOKENS_LIST:
    print(f"✅ ROTAÇÃO RUSH ATIVADA: Carregadas {len(OPENROUTER_TOKENS_LIST)} chaves do OpenRouter.")
    for idx, token in enumerate(OPENROUTER_TOKENS_LIST):
        print(f"🔍 DEBUG Chave #{idx+1}: '{token[:12]}...' | Tamanho: {len(token)} caracteres")
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=token,
            default_headers={
                "HTTP-Referer": "https://kmind.vercel.app",
                "X-Title": "KMind TCC"
            }
        )
        rush_clients.append(client)
else:
    print("⚠️ AVISO: Nenhuma chave OPENROUTER encontrada.")

def get_rush_clients():
    return rush_clients

# ==========================================
# 2. CLIENTE TUTOR (GitHub Models - GPT-4o) - COM ROTAÇÃO
# ==========================================
raw_tokens = os.environ.get("GITHUB_TOKENS", os.environ.get("GITHUB_TOKEN", ""))
GITHUB_TOKENS_LIST = [t.strip() for t in raw_tokens.split(",") if t.strip()]

tutor_clients = []
current_tutor_index = 0  # 🔥 FIX: nome consistente (era current_client_index)

if GITHUB_TOKENS_LIST:
    print(f"✅ ROTAÇÃO TUTOR ATIVADA: Carregados {len(GITHUB_TOKENS_LIST)} tokens do GitHub.")
    for token in GITHUB_TOKENS_LIST:
        client = OpenAI(
            base_url="https://models.github.ai/inference",
            api_key=token
        )
        tutor_clients.append(client)
else:
    print("⚠️ AVISO: Nenhum GITHUB_TOKENS encontrado.")

# ==========================================
# 3. CLIENTE GROQ (Rush nativo - COM ROTAÇÃO)
# ==========================================
raw_groq_tokens = os.environ.get("GROQ_API_KEYS", os.environ.get("GROQ_API_KEY", ""))
GROQ_TOKENS_LIST = [t.strip().strip('"').strip("'") for t in raw_groq_tokens.split(",") if t.strip()]

rush_groq_clients = []
current_groq_index = 0

if GROQ_TOKENS_LIST:
    print(f"🚀 ROTAÇÃO GROQ ATIVADA: Carregadas {len(GROQ_TOKENS_LIST)} chaves do Groq.")
    for idx, token in enumerate(GROQ_TOKENS_LIST):
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=token
        )
        rush_groq_clients.append(client)
else:
    print("⚠️ AVISO: Nenhuma chave GROQ encontrada. O modo Rush pode falhar.")

def get_rush_groq_clients():
    return rush_groq_clients

# ==========================================
# UTILITÁRIOS
# ==========================================
def safe_load_json_object(text: str) -> Any | None:
    if not text:
        return None

    # 🔥 remove control characters (incluindo \u0000)
    text = re.sub(r'[\x00-\x1F\x7F]', '', text)

    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\r\n', '\n')

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


# ==========================================
# TUTOR: generate_tutor_response (GPT-4o via GitHub)
# ==========================================
async def generate_tutor_response(system_prompt: str, user_query: str, history: list = []) -> dict:
    global current_tutor_index

    if not tutor_clients:
        return {"error": "Serviço GitHub Models não configurado."}

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-6:]:
        role = "assistant" if msg.get("role") in ["assistant", "model", "ai"] else "user"
        messages.append({"role": role, "content": str(msg.get("text", ""))})
    messages.append({"role": "user", "content": user_query})

    max_attempts = len(tutor_clients)
    attempts = 0

    while attempts < max_attempts:
        client = tutor_clients[current_tutor_index]
        used_index = current_tutor_index
        current_tutor_index = (current_tutor_index + 1) % len(tutor_clients)

        try:
            print(f"🔄 Tutor: Token #{used_index + 1} de {len(tutor_clients)}...")
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                # response_format={"type": "json_object"}
            )
            raw_text = response.choices[0].message.content
            print(raw_text, flush=True)
            obj = safe_load_json_object(raw_text)
            if obj:
                return obj
            else:
                raise ValueError("A IA devolveu um JSON vazio ou incompreensível.")

        except RateLimitError:
            print(f"⚠️ Token #{used_index + 1} esgotado (Rate Limit). A saltar...")
            attempts += 1
            continue
        except Exception as e:
            print(f"❌ Erro GPT-4o (Token #{used_index + 1}): {e}")
            attempts += 1
            continue

    print("🚨 ALERTA: Todos os tokens do Tutor esgotaram!")
    return {
        "messages": ["O Kani está a recarregar energias! 🔋 Podes tentar em breve?"],
        "emotion": "SAD",
        "interaction_type": "EXPLANATION",
        "interaction_data": {"options": ["Tentar novamente"]}
    }

# ==========================================
# GROQ: generate_groq_response — 🔥 BUG CORRIGIDO
# Antes usava `rush_client` (não definido). Agora usa rush_groq_clients com rotação.
# ==========================================
GROQ_MODEL = "llama-3.3-70b-versatile"

async def generate_groq_response(system_prompt: str, user_query: str, history: list = []) -> dict:
    global current_groq_index  # 🔥 FIX: usa o índice correcto

    if not rush_groq_clients:
        print("⚠️ generate_groq_response: sem clientes Groq configurados.")
        return {
            "messages": ["Eish, a rede falhou! 📡", "Podes repetir?"],
            "emotion": "THOUGHTFUL",
            "interaction_type": "CHIPS",
            "interaction_data": {"options": ["Repetir"]}
        }

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-6:]:
        role = "assistant" if msg.get("role") in ["assistant", "model", "ai"] else "user"
        content = str(msg.get("text", ""))
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_query})

    # 🔥 FIX: rotação correcta em vez de variável inexistente
    client = rush_groq_clients[current_groq_index]
    used_index = current_groq_index
    current_groq_index = (current_groq_index + 1) % len(rush_groq_clients)

    try:
        print(f"🔄 Groq Social: Chave #{used_index + 1}")
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.6,
            max_tokens=1024,
            top_p=1,
            response_format={"type": "json_object"}
        )
        raw_text = completion.choices[0].message.content
        return json.loads(raw_text)

    except RateLimitError:
        print(f"⚠️ Groq rate limit na chave #{used_index + 1}")
        # tenta a próxima chave se existir
        if len(rush_groq_clients) > 1:
            next_idx = current_groq_index
            current_groq_index = (current_groq_index + 1) % len(rush_groq_clients)
            try:
                completion = rush_groq_clients[next_idx].chat.completions.create(
                    model=GROQ_MODEL,
                    messages=messages,
                    temperature=0.6,
                    max_tokens=1024,
                    top_p=1,
                    response_format={"type": "json_object"}
                )
                return json.loads(completion.choices[0].message.content)
            except Exception:
                pass
        return {
            "messages": ["Eish, a rede falhou! 📡", "Podes repetir?"],
            "emotion": "THOUGHTFUL",
            "interaction_type": "CHIPS",
            "interaction_data": {"options": ["Repetir"]}
        }

    except Exception as e:
        print(f"❌ Erro Groq: {e}")
        return {
            "messages": ["Eish, a rede falhou! 📡", "Podes repetir?"],
            "emotion": "THOUGHTFUL",
            "interaction_type": "CHIPS",
            "interaction_data": {"options": ["Repetir"]}
        }