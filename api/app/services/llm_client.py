import os
import json
import re
import itertools
import threading
from typing import Any
from openai import OpenAI, RateLimitError

# ============================================================
# CLIENTES
# ============================================================

# ── Groq (Tutor: Qwen3-32b + validador: Llama 3.3 70b) ─────
raw_groq = os.environ.get("GROQ_API_KEYS", os.environ.get("GROQ_API_KEY", ""))
GROQ_KEYS = [k.strip().strip('"').strip("'") for k in raw_groq.split(",") if k.strip()]

_groq_clients: list[OpenAI] = []
if GROQ_KEYS:
    print(f"🚀 GROQ: {len(GROQ_KEYS)} chave(s) carregada(s).")
    for key in GROQ_KEYS:
        _groq_clients.append(OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=key,
        ))
else:
    print("⚠️ GROQ: nenhuma chave encontrada.")

_groq_lock   = threading.Lock()
_groq_cycle  = itertools.cycle(_groq_clients) if _groq_clients else None

def _next_groq() -> OpenAI | None:
    if not _groq_cycle:
        return None
    with _groq_lock:
        return next(_groq_cycle)

# ── OpenRouter (Rush + fallback do Tutor) ───────────────────
raw_or = os.environ.get("OPENROUTER_API_KEYS", os.environ.get("OPENROUTER_API_KEY", ""))
OR_KEYS = [k.strip().strip('"').strip("'") for k in raw_or.split(",") if k.strip()]

_or_clients: list[OpenAI] = []
if OR_KEYS:
    print(f"✅ OPENROUTER: {len(OR_KEYS)} chave(s) carregada(s).")
    for key in OR_KEYS:
        _or_clients.append(OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=key,
            default_headers={
                "HTTP-Referer": "https://tcc-tutor.vercel.app",
                "X-Title": "TCC AI Tutor",
            },
        ))
else:
    print("⚠️ OPENROUTER: nenhuma chave encontrada.")

_or_lock  = threading.Lock()
_or_cycle = itertools.cycle(_or_clients) if _or_clients else None

def _next_or() -> OpenAI | None:
    if not _or_cycle:
        return None
    with _or_lock:
        return next(_or_cycle)

# ── GitHub Models (fallback legacy) ─────────────────────────
raw_gh = os.environ.get("GITHUB_TOKENS", os.environ.get("GITHUB_TOKEN", ""))
GH_KEYS = [k.strip() for k in raw_gh.split(",") if k.strip()]

_gh_clients: list[OpenAI] = []
if GH_KEYS:
    print(f"✅ GITHUB: {len(GH_KEYS)} token(s) carregado(s).")
    for key in GH_KEYS:
        _gh_clients.append(OpenAI(
            base_url="https://models.github.ai/inference",
            api_key=key,
        ))

_gh_lock  = threading.Lock()
_gh_cycle = itertools.cycle(_gh_clients) if _gh_clients else None

def _next_gh() -> OpenAI | None:
    if not _gh_cycle:
        return None
    with _gh_lock:
        return next(_gh_cycle)

# Compatibilidade com rush_service.py (não muda nada lá)
def get_rush_clients():
    return _or_clients

def get_rush_groq_clients():
    return _groq_clients

# ============================================================
# MODELOS
# ============================================================
TUTOR_MODEL     = "qwen/qwen3-32b"        # gerador principal
VALIDATOR_MODEL = "llama-3.3-70b-versatile"  # validador — mesmo provider, sem latência extra
RUSH_MODEL      = "llama-3.3-70b-versatile"  # Rush mantém igual

# ============================================================
# UTILITÁRIOS
# ============================================================
def safe_load_json(text: str) -> Any | None:
    if not text:
        return None
    text = re.sub(r'[\x00-\x1F\x7F]', ' ', text)
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\r\n', '\n')
    text = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```", "", text)
    # remove bloco <think>...</think> que o Qwen3 inclui quando pensa
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    start, end = text.find('{'), text.rfind('}')
    if start != -1 and end != -1:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    return None

# ============================================================
# VALIDADOR
# ============================================================
# Palavras que o modelo não deve usar com crianças de 8-10 anos.
_FORBIDDEN = [
    "inferir", "numerador", "denominador", "decomposição", "decompor",
    "conceito", "realizar", "portanto", "verificar", "calcular",
    "representar", "identificar", "correspondente", "observa", "analisa",
    "efectuar", "determinar", "procedimento", "estratégia", "equação",
    "método", "processo", "algarismo", "sequência", "valor posicional", "transporta", "□",
]

_REQUIRED_BY_PHASE = {
    "TEST":     {"correct_answer", "interaction_type", "messages", "interaction_data"},
    "EXPLAIN":  {"interaction_type", "messages", "interaction_data"},
    "FEEDBACK": {"assessment", "interaction_type", "messages", "interaction_data"},
}

def _validate(obj: dict, phase: str) -> list[str]:
    """
    Devolve lista de erros encontrados.
    Lista vazia = output aprovado.
    """
    errors: list[str] = []

    # 1. Campos obrigatórios pela fase
    required = _REQUIRED_BY_PHASE.get(phase, set())
    for field in required:
        if field not in obj or obj[field] is None:
            errors.append(f"Campo obrigatório em falta: '{field}' (fase {phase})")

    # 2. TEST precisa de correct_answer não vazio
    if phase == "TEST":
        ca = obj.get("correct_answer", "")
        if not ca or not str(ca).strip():
            errors.append("TEST: 'correct_answer' está vazio")

    # 3. EXPLAIN não deve ter correct_answer (é pergunta, não explicação)
    if phase == "EXPLAIN" and obj.get("correct_answer"):
        errors.append("EXPLAIN: não deve conter 'correct_answer'")

    # 4. Mensagens devem ser lista de strings
    msgs = obj.get("messages", [])
    if not isinstance(msgs, list) or len(msgs) == 0:
        errors.append("'messages' deve ser lista não vazia")
    else:
        for i, m in enumerate(msgs):
            if not isinstance(m, str):
                errors.append(f"messages[{i}] não é string: {type(m)}")

    # 5. Vocabulário proibido nas mensagens
    all_text = " ".join(str(m) for m in msgs).lower()
    found_forbidden = [w for w in _FORBIDDEN if w in all_text]
    if found_forbidden:
        errors.append(f"Vocabulário inapropriado para crianças: {found_forbidden}")

    # 6. CHIPS/CLOZE/TRUE_FALSE precisam de options
    itype = obj.get("interaction_type", "")
    idata = obj.get("interaction_data", {})
    if itype in ("CHIPS", "CLOZE", "TRUE_FALSE"):
        opts = idata.get("options", [])
        if not opts or len(opts) < 2:
            errors.append(f"{itype}: precisa de pelo menos 2 opções")

    # 7. TRUE_FALSE — opções têm de ser exactamente Verdadeiro/Falso
    if itype == "TRUE_FALSE":
        opts = idata.get("options", [])
        if {o.strip().lower() for o in opts} != {"verdadeiro", "falso"}:
            errors.append("TRUE_FALSE: opções devem ser exactamente ['Verdadeiro', 'Falso']")

    # 8. TEST — tem de conter uma pergunta real (pelo menos uma mensagem com "?")
    if phase == "TEST":
        has_question = any("?" in str(m) for m in msgs)
        if not has_question:
            errors.append("TEST: nenhuma mensagem contém uma pergunta (?) — o modelo explicou em vez de perguntar")

    return errors


_VALIDATOR_SYSTEM = """
You are a strict JSON output validator for a children's educational AI tutor.

Your job: inspect the JSON object produced by the tutor and return a corrected version.

RULES:
1. Return ONLY a valid JSON object. No markdown, no explanation.
2. Fix any issues listed in the ERROR REPORT below.
3. Do NOT change the meaning of the content — only fix the reported problems.
4. Keep all original fields. Add missing fields if needed.
5. Replace forbidden vocabulary with child-friendly alternatives:
   - "valor posicional" → "a casa do número"
   - "numerador" → "o número de cima"
   - "denominador" → "o número de baixo"
   - "calcular" → "descobrir quanto é"
   - "identificar" → "encontrar"
   - "sequência" → "fila de números"
   - "algarismo" → "número"
   - "decompor" / "decomposição" → "separar em partes"
   - "transporta" → "vai"
   - "□" → "x"
6. If phase is TEST and correct_answer is missing or empty, infer it from the options (first option is correct by convention).
7. Keep sentences short — max 12 words each.
"""


async def _run_validator(obj: dict, errors: list[str], phase: str) -> dict:
    """
    Chama o Llama 3.3 70b para corrigir o output com base nos erros detectados.
    """
    client = _next_groq()
    if not client:
        # sem cliente → devolve original sem correcção
        return obj

    error_report = "\n".join(f"- {e}" for e in errors)
    prompt = (
        f"PHASE: {phase}\n\n"
        f"ERROR REPORT:\n{error_report}\n\n"
        f"ORIGINAL JSON:\n{json.dumps(obj, ensure_ascii=False)}\n\n"
        "Return the corrected JSON object:"
    )

    try:
        resp = client.chat.completions.create(
            model=VALIDATOR_MODEL,
            messages=[
                {"role": "system", "content": _VALIDATOR_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.1,   # baixa temperatura — queremos correcção determinística
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        fixed = safe_load_json(resp.choices[0].message.content)
        if fixed:
            print(f"🔧 [Validator] Corrigido: {errors}", flush=True)
            return fixed
    except Exception as e:
        print(f"⚠️ [Validator] Falhou: {e}", flush=True)

    return obj  # se o validador falhar, devolve o original


# ============================================================
# GERADOR PRINCIPAL — Tutor (Qwen3-32b via Groq)
# ============================================================
async def generate_tutor_response(
    system_prompt: str,
    user_query: str,
    history: list,
    phase: str = "EXPLAIN",
) -> dict:
    """
    1. Gera com Qwen3-32b (Groq)
    2. Valida deterministicamente
    3. Se falhar → envia erros ao Llama 3.3 70b para corrigir
    4. Valida o output corrigido
    5. Se ainda falhar → fallback OpenRouter → fallback GitHub
    """
    messages = [{"role": "system", "content": system_prompt}]
    for msg in (history or [])[-12:]:
        role = "assistant" if msg.get("role") in ("assistant", "model", "ai") else "user"
        text = msg.get("text", "")
        if isinstance(text, str) and text.strip():
            messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": user_query})

    # ── Tentativa 1: Qwen3-32b (Groq) ───────────────────────
    obj = await _call_groq(messages, TUTOR_MODEL, temperature=0.6)

    if obj:
        errors = _validate(obj, phase)
        if not errors:
            print(f"✅ [Tutor/Qwen3] OK — fase {phase}", flush=True)
            return obj

        # Há erros → validador corrige
        print(f"⚠️ [Tutor/Qwen3] {len(errors)} erro(s) → a corrigir...", flush=True)
        obj = await _run_validator(obj, errors, phase)
        errors_after = _validate(obj, phase)
        if not errors_after:
            return obj
        print(f"⚠️ [Validator] Ainda {len(errors_after)} erro(s) após correcção", flush=True)

    # ── Tentativa 2: fallback GitHub (GPT-4o-mini) ──────────
    print("🔄 [Tutor] Fallback → GitHub", flush=True)
    obj = await _call_github(messages, temperature=0.6)
    if obj:
        errors = _validate(obj, phase)
        if not errors:
            return obj
        obj = await _run_validator(obj, errors, phase)
        if not _validate(obj, phase):
            return obj

    # ── Tentativa 3: fallback OpenRouter (Qwen3-32b ou Llama) ─
    print("🔄 [Tutor] Fallback → OpenRouter", flush=True)
    obj = await _call_openrouter(messages, temperature=0.6)
    if obj:
        return obj  # aceita sem validar — último recurso

    # ── Fallback total ───────────────────────────────────────
    print("🚨 [Tutor] Todos os providers falharam — fallback total", flush=True)
    return {
        "messages": ["Eish, algo correu mal! ⚙️", "Podes tentar de novo?"],
        "emotion": "SAD",
        "interaction_type": "CHIPS",
        "assessment": None,
        "interaction_data": {"options": ["Tentar de novo"]},
    }


# ============================================================
# CHAMADAS AOS PROVIDERS
# ============================================================
async def _call_groq(messages: list, model: str, temperature: float = 0.6) -> dict | None:
    client = _next_groq()
    if not client:
        return None
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        print(f"[Groq/{model}] {raw[:200]}", flush=True)
        return safe_load_json(raw)
    except RateLimitError:
        print(f"⚠️ [Groq/{model}] Rate limit", flush=True)
        return None
    except Exception as e:
        print(f"❌ [Groq/{model}] {e}", flush=True)
        return None


OR_FALLBACK_MODELS = [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
]

async def _call_openrouter(messages: list, temperature: float = 0.6) -> dict | None:
    client = _next_or()
    if not client:
        return None
    for model in OR_FALLBACK_MODELS:
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content
            print(f"[OpenRouter/{model}] {raw[:200]}", flush=True)
            obj = safe_load_json(raw)
            if obj:
                return obj
        except RateLimitError:
            print(f"⚠️ [OpenRouter/{model}] Rate limit — a tentar próximo", flush=True)
            continue
        except Exception as e:
            print(f"❌ [OpenRouter/{model}] {e}", flush=True)
            continue
    return None


async def _call_github(messages: list, temperature: float = 0.7) -> dict | None:
    client = _next_gh()
    if not client:
        return None
    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=temperature,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        print(f"[GitHub/gpt-4o-mini] {raw[:200]}", flush=True)
        return safe_load_json(raw)
    except Exception as e:
        print(f"❌ [GitHub] {e}", flush=True)
        return None


# ============================================================
# GROQ RUSH (compatibilidade com rush_service.py)
# ============================================================
async def generate_groq_response(
    system_prompt: str,
    user_query: str,
    history: list = [],
) -> dict:
    messages = [{"role": "system", "content": system_prompt}]
    for msg in (history or [])[-12:]:
        role = "assistant" if msg.get("role") in ("assistant", "model", "ai") else "user"
        content = str(msg.get("text", ""))
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_query})

    obj = await _call_groq(messages, RUSH_MODEL, temperature=0.6)
    if obj:
        return obj

    return {
        "messages": ["Eish, a rede falhou! 📡", "Podes repetir?"],
        "emotion": "THOUGHTFUL",
        "interaction_type": "CHIPS",
        "interaction_data": {"options": ["Repetir"]},
    }