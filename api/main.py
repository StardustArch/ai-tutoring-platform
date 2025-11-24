# kanimente_service.py
import os
import uvicorn
import json
import re
from typing import Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI

# ----------------------------
# CONFIG
# ----------------------------
app = FastAPI(title="KaniMente Engine", version="6.0.0")

OPENROUTER_API_KEY = os.environ.get("GROQ_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    print("AVISO: API key não encontrada. Endpoints LLM estarão desativados.")
    client = None
else:
    client = OpenAI(base_url=os.environ.get("OPENROUTER_BASE_URL","https://api.groq.com/openai/v1"),
                    api_key=OPENROUTER_API_KEY)

# Linguagem do produto
LANG_VARIANT = "Português (Portugal)"   # ajustar se quiser Português (Moçambique / Brasil)


# ----------------------------
# HELPERS: extração e sanitização de JSON
# ----------------------------
def extract_json_object(text: str) -> str | None:
    """
    Encontra o primeiro objeto JSON bem formado no texto, retornando o substring JSON.
    Estratégia: encontra a primeira '{' e faz contagem de chaves até fechar corretamente.
    Remove também blocos Markdown ```{json ... }```.
    """
    if not text:
        return None

    # Remove blocos de código que envolvem texto e outros prefixos comuns
    # Normaliza aspas “curly” -> regular
    text = text.replace('“', '"').replace('”', '"').replace('\r\n', '\n')

    # Remove leading explanations like "Sure, here's JSON:" usando regex
    # Não queremos remover o JSON, só prefixos comuns
    prefix_patterns = [
        r"(?is)^.*?(```json\s*)",   # text before ```json
        r"(?is)^.*?(```\s*)",       # text before ```
        r"(?is)^.*?json:\s*",       # text before 'json:'
        r"(?is)^.*?here is the json\s*", 
        r"(?is)^.*?here's the json\s*",
    ]
    for pat in prefix_patterns:
        m = re.search(pat, text)
        if m:
            text = text[m.end():]
            break

    # Find first '{'
    start = text.find('{')
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        c = text[i]
        if in_string:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == '"':
                in_string = False
            # else continue inside string
        else:
            if c == '"':
                in_string = True
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    candidate = text[start:i+1]
                    return candidate.strip()
    return None


def safe_load_json_object(text: str) -> Any | None:
    """
    Tenta extrair e carregar JSON de forma segura.
    Retorna None se falhar.
    """
    # tenta parse direto primeiro (caso o LLM tenha retornado só o object)
    try:
        return json.loads(text)
    except Exception:
        pass

    # tenta extrair substring JSON
    obj_str = extract_json_object(text)
    if not obj_str:
        return None
    try:
        return json.loads(obj_str)
    except Exception:
        # tentativa de correção simples: troca de aspas simples por duplas (último recurso)
        try:
            fixed = obj_str.replace("'", '"')
            return json.loads(fixed)
        except Exception:
            return None


def ensure_chips(text: str, chips: list[str]) -> str:
    """
    Garante que os chips estejam no fim do texto no formato <<A|B|C>>.
    Se já houver uma ocorrência de <<...>>, substitui por chips limpos.
    """
    chips_txt = f"<<{'|'.join(chips)}>>"
    # remove qualquer ocorrência anterior de <<...>>
    text = re.sub(r"<<.*?>>", "", text, flags=re.DOTALL).strip()
    # garante separação com duas novas linhas
    return text + "\n\n" + chips_txt


def truncate_history_by_chars(history: list[dict], max_chars: int = 4000) -> list[dict]:
    """
    Reduz o histórico (mantendo últimas mensagens) para que o total de caracteres
    não exceda max_chars. Retorna a sublista final.
    """
    if not history:
        return []
    total = 0
    kept = []
    # percorre de trás para frente (prioriza mensagens recentes)
    for msg in reversed(history):
        text = msg.get("text", "")
        if total + len(text) > max_chars:
            break
        kept.append(msg)
        total += len(text)
    return list(reversed(kept))


# ----------------------------
# PROMPTS OTIMIZADOS (FINAL)
# ----------------------------
PROMPT_RUSH_JSON = """
You are a Quiz Generator API for KaniMente.
OUTPUT RULES (STRICT):
- Output ONLY one single JSON object (no markdown, no explanation).
- JSON keys must be: "question", "options", "correct_answer", "explanation".
- "options" must be an array of 3 or 4 short strings.
- "correct_answer" must exactly match one of the options.
- Language: {lang}.
- Audience: {student_class}th grade (3-6).
- Subject: {subject}
- Specific Subtopic: {subtopic} (FOCUS HERE!)
- Difficulty Level: {difficulty_level} (1=muito fácil, 5=muito difícil)
Generate questions appropriate for this difficulty.

⚠️ ANTI-REPETITION RULE:
You MUST NOT generate any of the following questions (or very similar ones):{exclude_list}

TASK:
Generate a NEW and UNIQUE question specifically about "{subtopic}".
Do NOT repeat generic questions. Ensure variety within the subtopic.
Keep question and options short (<= 80 chars each).
"""

PROMPT_RUSH_FEEDBACK = """
You are KaniMente — Rush Feedback generator.
ROLE:
- The server already validated the user's answer as CORRECT or INCORRECT.
TASK:
- Return a VERY SHORT feedback in Portuguese (max 2 short sentences).
- If correct, include a very brief explanation (1 sentence) and a question "Próxima?"
- If incorrect, say the correct answer then ask "Vamos tentar outro?"
- MUST end with chips exactly: <<Continuar|Mudar Tema|Ajuda>>
- Use {lang}.
"""

PROMPT_TUTOR = """
You are KaniMente — Modo Tutor.
SCOPE:
- Teach ONLY Mathematics and Portuguese for 3rd-6th grade.
LANGUAGE RULES:
- Always answer in Portuguese ({lang}).
- Use short sentences, simple words.
- Do NOT use greetings like "Olá" or "Oi".
PEDAGOGY:
- Use the Socratic method: ask ONE short question that guides the student.
- Do NOT give the final answer of exercises immediately; ask a guiding question.
FORMAT:
1) One short instruction or micro-explanation (<= 2 short sentences).
2) One socratic question (short).
3) MUST end with chips: <<Quero pista|Outro exemplo|Explica de novo>>
- If the student's message is a request for "ajuda" for a specific problem, give ONE short hint and repeat the question.
- Do not wander outside Math/Portuguese.
"""

# ----------------------------
# Pydantic models
# ----------------------------
class RushRequest(BaseModel):
    student_class: int
    subject: str = "matematica"  # "matematica" | "portugues"
    subtopic: str               # Ex: "Multiplicação", "Verbos", "Frações"
    recent_questions: list[str] = [] # ✅ NOVO: O que a IA não pode criar
    difficulty_level: int = 3  # ✅ NOVO: 1-5


class RushResponse(BaseModel):
    question: str
    options: list[str]
    correct_answer: str
    explanation: str

class ChatRequest(BaseModel):
    student_id: int
    student_class: int
    user_query: str
    mode: str = "tutor"  # "tutor" | "rush_feedback"
    history: list = []

class ChatResponse(BaseModel):
    response_text: str

# ----------------------------
# RUSH: gerar questão estruturada (ATUALIZADO)
# ----------------------------
@app.post("/generate-rush-question", response_model=RushResponse)
async def generate_rush_question(request: RushRequest):
    if client is None:
        raise HTTPException(status_code=503, detail="API key missing")

    # Sanitiza inputs
    subject = request.subject.lower()
    if subject not in ("matematica", "portugues"):
        subject = "matematica"
    
    # Se não vier subtópico, usa um padrão genérico, mas o ideal é vir do front
    subtopic = request.subtopic if request.subtopic else ("Geral" if subject == "matematica" else "Gramática")
    exclude_text = "\n- ".join(request.recent_questions) if request.recent_questions else "None"
    system_prompt = PROMPT_RUSH_JSON.format(
        lang=LANG_VARIANT, 
        student_class=request.student_class, 
        subject=subject,
        subtopic=subtopic,
        exclude_list=exclude_text, # ✅ Injeta no prompt
        difficulty_level=request.difficulty_level,  # ✅ Adiciona esta linha

    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Generate one distinct question about {subtopic}."}
    ]

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.6,  # Aumentei um pouco a temperatura para variar as perguntas
            max_tokens=300,
        )

        # ... (Resto da lógica de parsing JSON mantém-se igual ao anterior)
        raw = completion.choices[0].message.content
        obj = safe_load_json_object(raw)
        
        # ... (Validações mantidas)
        
        if not obj: raise ValueError("JSON inválido")
        
        return RushResponse(
            question=obj["question"].strip(),
            options=[str(o).strip() for o in obj.get("options", [])],
            correct_answer=str(obj.get("correct_answer", "")).strip(),
            explanation=str(obj.get("explanation", "")).strip()
        )

    except Exception as e:
        print("ERRO RUSH:", e)
        return RushResponse(
            question="Quanto é 2 + 2?",
            options=["3", "4", "5"],
            correct_answer="4",
            explanation="Fallback error."
        )

# ----------------------------
# CHAT / TUTOR / RUSH FEEDBACK
# ----------------------------
@app.post("/generate-chat-response", response_model=ChatResponse)
async def generate_chat_response(request: ChatRequest):
    if client is None:
        raise HTTPException(status_code=503, detail="API key missing")

    # escolher prompt pelo modo
    if request.mode == "rush_feedback":
        system_prompt = PROMPT_RUSH_FEEDBACK.format(lang=LANG_VARIANT)
    else:
        system_prompt = PROMPT_TUTOR.format(lang=LANG_VARIANT)

    # truncar histórico por chars (prioriza recência)
    short_history = truncate_history_by_chars(request.history, max_chars=3500)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in short_history:
        role = "assistant" if msg.get("role") == "model" else "user"
        messages.append({"role": role, "content": msg.get("text", "")})

    # Adiciona a entrada do utilizador
    messages.append({"role": "user", "content": f"[CLASSE {request.student_class}] {request.user_query}"})

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.45 if request.mode != "rush_feedback" else 0.2,
            max_tokens=200,
        )
        text = completion.choices[0].message.content.strip()

        # Se modo tutor: garante chips finais padronizados
        if request.mode != "rush_feedback":
            # remove qualquer chips presentes e adiciona os padrão
            text = re.sub(r"<<.*?>>", "", text, flags=re.DOTALL).strip()
            text = text + "\n\n<<Quero pista|Outro exemplo|Explica de novo>>"
        else:
            # rush feedback: garante chips padronizados
            text = re.sub(r"<<.*?>>", "", text, flags=re.DOTALL).strip()
            text = text + "\n\n<<Continuar|Mudar Tema|Ajuda>>"

        return ChatResponse(response_text=text)

    except Exception as e:
        print("ERRO CHAT:", e)
        return ChatResponse(response_text="Erro técnico. Tenta de novo! <<Repetir>>")


# ----------------------------
# MAIN (dev)
# ----------------------------
if __name__ == "__main__":
    uvicorn.run("kanimente_service:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
