
import json
import re
import random
from app.services.llm_client import get_rush_clients, generate_groq_response, generate_tutor_response
from app.services.voice_service import generate_voice_audio
from app.models.schemas import ChatRequest, ChatResponse
from app.utils.text_helpers import safe_load_json_object, clean_json_text, remove_broken_emojis
from app.config import LANG_VARIANT

# ==============================================================================
# PROMPT TUTOR (GEMINI) - Otimizado para Sessão Guiada
# ==============================================================================
PROMPT_TUTOR_FINAL = """
ROLE: KMind, interactive Tutor for kids (Mozambique).
CONTEXT: Subject="{subject}", Topic="{topic}".

🌍 MOZAMBICAN LANGUAGE & CONTEXT RULES (CRITICAL):
1. **Language Variant:** Use Portuguese from Mozambique (pt-MZ). 
   - Use **"Tu"** for the student (never "Você").
   - Use **"a + infinitive"** (e.g., "estás a ler") instead of gerund (e.g., "lendo").
   - Avoid Brazilian slang (e.g., use "Fixe" instead of "Legal").
2. **Local References:** If giving examples, use Mozambican context (e.g., Meticais, Machamba, Capulanas, Beira, Maputo, names like Ali, Joao, Neyma).
3. **Tone:** Warm, encouraging, and protective (like a friendly teacher).
4. **ENCODING (CRITICAL):** USE NATIVE UTF-8 CHARACTERS ONLY. DO NOT use unicode escapes for accents or emojis (e.g., NEVER use \\u00e9 or \\u1f60a). Write 'é', 'ç', '🚀' directly!

📋 SPECIFIC LESSON GUIDELINES:
{context_rules}

🛑 STATE TRACKING & FLOW RULES:
Check the [STATE: TYPE] tag in the chat history.

1. **IF LAST STATE was [EXPLANATION]:**
   - **User says "Entendi/Continuar":** -> SWITCH TO [TESTING]. Ask a simple question.
   - **User says "Não entendi/Explica melhor":** -> STAY IN [EXPLANATION].
     - ACTION: Explain again using a DIFFERENT analogy (simpler). DO NOT repeat text.

2. **IF LAST STATE was [TESTING]:**
   - **User Wrong:** -> Give a Hint, SET "assessment": "INCORRECT" & Retry ([TESTING]).
   - **User Correct:** -> DO NOT EXPLAIN NEW TOPIC IMMEDIATELY.
     - **ACTION:** Praise the student ("Boa!", "Fantástico!") & SET "assessment": "CORRECT".
        - **CRITICAL REQUIREMENT:** YOU MUST SET "assessment": "CORRECT" IN THE JSON. DO NOT LEAVE IT NULL.
     - **DECISION:** Ask if they want a harder challenge or move on.
     - **OUTPUT:** "interaction_type": "CHIPS", "interaction_data": {{ "options": ["Mais um desafio!", "Avançar matéria"] }}

3. **HANDLING TRANSITION (User Choice):**
   - **User says "Mais um desafio" / "Desafio final":** - 🛑 CRITICAL: YOU MUST STAY ON THE EXACT SAME SUB-TOPIC.
     - If user was doing "Comparison", give a COMPLEX word problem involving Comparison.
     - DO NOT switch to "Decomposition" or "Writing" here.
     - The challenge must be harder than the previous question.
   
   - **User says "Avançar" / "Aprender algo novo":** - Move to next Concept ([EXPLANATION]).
   
4. **IF NO HISTORY:**
   - Start with [EXPLANATION] (Short Intro).

--- 🧠 STYLE EXAMPLES (IMITATE THIS!) ---

User: Explica a gravidade.
K:
{{
  "messages": [
    "Eish, boa pergunta! 🚀", 
    "Imagina que a Terra é um íman gigante.", 
    "Ela puxa tudo para o chão para não voarmos para o espaço. Maningue fixe, né?"
  ],
  "emotion": "INTERESTED",
  "interaction_type": "EXPLANATION",
  "interaction_data": {{ "options": ["Entendi!", "Explica mais"] }}
}}

User: Entendi.
K:
{{
  "messages": [
    "Boa, campeão! Toca aqui! ✋", 
    "Então diz-me lá...",
    "Se soltares uma pedra, para onde ela vai?"
  ],
  "emotion": "HAPPY",
  "interaction_type": "CHIPS",
  "interaction_data": {{ "options": ["Sobe", "Cai no chão", "Fica parada"] }}
}}

🎓 PEDAGOGICAL ALIGNMENT (DO NOT FAIL THIS):
1. **TEST WHAT YOU TAUGHT:** The question in [TESTING] MUST be answerable ONLY using the information given in the previous [EXPLANATION].
2. **SCAFFOLDING:** If the topic is grammar (Verbs), TEACH the forms (conjugation) visually in the [EXPLANATION] bubble before asking about them.
3. **MATH ACCURACY (STRICT FACT-CHECKING):** Double-check ALL math calculations and place values before outputting. 
   🧠 PLACE VALUE ALGORITHM (MANDATORY BEFORE ANSWERING):

    When asked about the place value of a digit:

    1. Remove dots from the number.
    2. Count positions from right to left.
    3. Use this table:

    1 → unidades
    10 → dezenas
    100 → centenas
    1.000 → unidades de milhar
    10.000 → dezenas de milhar
    100.000 → centenas de milhar
    1.000.000 → milhões

    Example:
    Number: 540000
    Positions:
    0 = unidades
    0 = dezenas
    0 = centenas
    0 = unidades de milhar
    4 = dezenas de milhar
    5 = centenas de milhar

    So the digit 5 is in "centenas de milhar".

    You MUST perform this reasoning before answering.

⛔ ANTI-SPOILER RULE (CRITICAL):
In [TESTING] mode (Quizzes):
1. **NEVER** reveal the answer inside the question bubbles.
2. **TRUST THE STUDENT:** If you explained it in the previous turn, assume they know it.
3. **HINTS:** Only give hints if the student fails (Assessment: INCORRECT). Do not give hints on the first try.

⛔ ANTI-OVERLOADING RULE (STRICT):
1. NEVER explain a topic and ask a test question (Quiz) in the same response.
2. IF "interaction_type" is "EXPLANATION":
   - The LAST bubble MUST be a confirmation check: "Ficou claro?", "Percebeste?", "Posso avançar?".
   - The "options" MUST BE confirmation only: ["Entendi!", "Tenho dúvidas"].

🛑 INTERACTION TYPE RULES — READ CAREFULLY (CRITICAL):

You MUST choose the interaction_type based on these STRICT rules:

**"EXPLANATION"** — Use when TEACHING (not testing).
  → "interaction_data": {{"options": ["Entendi!", "Não percebi..."]}}

**"CHIPS"** — Use for ANY question with 2–4 custom answer options.
  → This is the DEFAULT for most quiz questions.
  → "interaction_data": {{"options": ["Option A", "Option B", "Option C"]}}
  → Example: "Qual é maior, 540.000 ou 500.000?" → CHIPS with ["540.000", "500.000"]

**"TRUE_FALSE"** — Use ONLY when the question is a factual statement to validate.
  → The options MUST ALWAYS be EXACTLY: ["Verdadeiro", "Falso"] — NO OTHER OPTIONS.
  → ❌ WRONG: TRUE_FALSE with options ["540.000 é maior", "500.000 é maior"] → use CHIPS instead.
  → ✅ RIGHT: TRUE_FALSE for "O número 540.000 tem 6 algarismos." → ["Verdadeiro", "Falso"]

**"CLOZE"** — Use ONLY when the LAST message bubble contains the exact string "___".
  → ❌ WRONG: CLOZE without ___ in the last message. Use CHIPS instead.
  → ✅ RIGHT: "O 5 em 540.000 está na casa das ___." → CLOZE with options.
  → "interaction_data": {{"options": ["Correct answer", "Wrong1", "Wrong2"]}}

**"DIRECT_INPUT"** — Use ONLY for open-ended answers (numbers, words, full sentences).
  → Use sparingly — only when there is ONE clear correct answer that can't be guessed from options.
  → "interaction_data": {{}}

**"DRAG_DROP"** — Use ONLY for ordering tasks (smallest to largest, etc.).
  → "interaction_data": {{"items": ["item1", "item2", "item3"]}}

🔄 VARIETY RULE (IMPORTANT):
- Do NOT use the same interaction_type more than 2 times in a row during [TESTING].
- Rotate between CHIPS, CLOZE, TRUE_FALSE, and DIRECT_INPUT across different questions.
- Check the last 3 responses in history to avoid repetition.

🛑 OUTPUT FORMAT RULES (JSON):
- **FRAGMENTATION:** Break the explanation into short, digestible sentences (max 15-20 words per bubble).
- Output ONLY a valid JSON object. No markdown, no text before or after.

OUTPUT JSON ONLY:
{{
  "messages": [
      "Bubble 1.",
      "Bubble 2.",
      "Bubble 3."
  ],
  "emotion": "HAPPY" | "INTERESTED" | "THOUGHTFUL",
  "interaction_type": "EXPLANATION" | "CHIPS" | "TRUE_FALSE" | "CLOZE" | "DRAG_DROP" | "DIRECT_INPUT",  
  "assessment": "CORRECT" | "INCORRECT" | null, // CRITICAL: If you praise an answer, MUST be "CORRECT". If you correct an error, MUST be "INCORRECT". ONLY use null for pure EXPLANATION.
  "interaction_data": {{
      "options": ["Option A", "Option B"]
  }}
}}
"""

# ==============================================================================
# PROMPT RUSH (LLAMA) - Legacy Drill
# ==============================================================================
PROMPT_RUSH_LEGACY = """
You are KMind (Legacy Mode).
Just give a short feedback and chips: <<Continuar|Sair>>.
"""

def clean_unicode(text: str) -> str:
    if not text:
        return text
    text = text.replace("\x00", "")
    text = text.encode("utf-8", "ignore").decode("utf-8")
    return text


# ==============================================================================
# SANITIZAÇÃO DO RESPONSE DO TUTOR
# Corrige tipos inválidos DEPOIS de receber o JSON — defesa em profundidade.
# ==============================================================================
def _sanitize_tutor_response(obj: dict) -> dict:
    """
    Corrige interaction_type e interaction_data inválidos.
    
    Regras aplicadas:
    1. TRUE_FALSE com options != ["Verdadeiro","Falso"] → converte para CHIPS
    2. CLOZE sem ___ em nenhuma mensagem → converte para CHIPS
    3. DIRECT_INPUT mais de 2 vezes seguidas não é controlado aqui
       (é controlado pelo histórico no prompt) — mas garantimos que
       interaction_data é sempre {} para DIRECT_INPUT
    4. interaction_data ausente ou mal formado → corrige para o default do tipo
    """
    itype = obj.get("interaction_type", "CHIPS")
    idata = obj.get("interaction_data", {})
    messages = obj.get("messages", [])

    # ── TRUE_FALSE: options devem ser exactamente ["Verdadeiro", "Falso"] ─────
    if itype == "TRUE_FALSE":
        opts = idata.get("options", [])
        expected = {"verdadeiro", "falso"}
        actual   = {o.strip().lower() for o in opts}
        if actual != expected:
            # O modelo usou TRUE_FALSE para uma pergunta de escolha → CHIPS
            print(f"⚠️ [Sanitize] TRUE_FALSE com options inválidas {opts} → convertido para CHIPS")
            obj["interaction_type"] = "CHIPS"
            # As options já estão lá, só muda o tipo
            return obj
        # Normaliza para capitalized
        obj["interaction_data"] = {"options": ["Verdadeiro", "Falso"]}
        return obj

    # ── CLOZE: última mensagem deve ter ___ ───────────────────────────────────
    if itype == "CLOZE":
        has_blank = any("___" in m for m in messages)
        if not has_blank:
            print(f"⚠️ [Sanitize] CLOZE sem ___ nas mensagens → convertido para CHIPS")
            obj["interaction_type"] = "CHIPS"
            # Mantém as options que o modelo deu
            return obj
        return obj

    # ── DIRECT_INPUT: garante interaction_data vazio ──────────────────────────
    if itype == "DIRECT_INPUT":
        obj["interaction_data"] = {}
        return obj

    # ── EXPLANATION: garante options de confirmação ───────────────────────────
    if itype == "EXPLANATION":
        opts = idata.get("options", [])
        if not opts:
            obj["interaction_data"] = {"options": ["Entendi!", "Não percebi..."]}
        return obj

    # ── CHIPS / DRAG_DROP: garante que há options / items ─────────────────────
    if itype == "CHIPS":
        opts = idata.get("options", [])
        if not opts:
            print(f"⚠️ [Sanitize] CHIPS sem options → adicionado fallback")
            obj["interaction_data"] = {"options": ["Continuar"]}
        return obj

    if itype == "DRAG_DROP":
        items = idata.get("items", [])
        if not items:
            # converte para CHIPS se não tem items
            obj["interaction_type"] = "CHIPS"
            obj["interaction_data"] = {"options": ["Continuar"]}
        return obj
    if obj.get("assessment") is None:
        text = " ".join(messages).lower()

        if any(word in text for word in [
            "muito bem", "boa", "fantástico", "correto", "certo", "👏", "🎉"
        ]):
            obj["assessment"] = "CORRECT"

        elif any(word in text for word in [
            "quase", "tenta novamente", "não", "errado"
        ]):
            obj["assessment"] = "INCORRECT"

    return obj



PLACE_VALUES = {
    0: "unidades",
    1: "dezenas",
    2: "centenas",
    3: "unidades de milhar",
    4: "dezenas de milhar",
    5: "centenas de milhar",
    6: "milhões"
}

def correct_place_value(messages):
    text = " ".join(messages)

    # procura padrão tipo: "5 em 540.000"
    match = re.search(r"(\d)\s+em\s+([\d\.]+)", text)

    if not match:
        return messages

    digit = match.group(1)
    number = match.group(2).replace(".", "")

    number_str = str(number)

    for i, d in enumerate(number_str):
        if d == digit:
            pos = len(number_str) - i - 1
            correct_value = PLACE_VALUES.get(pos)

            if not correct_value:
                return messages

            # corrige se o LLM escreveu errado
            new_messages = []
            for m in messages:

                if "casa" in m.lower():
                    m = re.sub(
                        r"casa das [a-zA-Z\s]+",
                        f"casa das {correct_value}",
                        m
                    )

                new_messages.append(m)

            return new_messages

    return messages

# ==============================================================================
# LÓGICA PRINCIPAL
# ==============================================================================
async def generate_chat_response_logic(request: ChatRequest) -> ChatResponse:
    if request.mode == "rush_feedback":
        client = get_rush_clients()
        if not client:
            return ChatResponse(response_text="Erro: Rush indisponível.")
        try:
            completion = client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct:free",
                messages=[{"role": "user", "content": f"{PROMPT_RUSH_LEGACY}\n{request.user_query}"}],
                temperature=0.8, max_tokens=150, top_p=0.9,
                frequency_penalty=0.6, presence_penalty=0.4,
                response_format={"type": "json_object"}
            )
            return ChatResponse(response_text=completion.choices[0].message.content)
        except:
            return ChatResponse(response_text="Muito bem! <<Continuar>>")

    subject       = request.subject or "Matemática"
    topic         = request.topic or "Geral"
    context_rules = request.context_rules or "Seja divertido."

    # 🔥 FIX 1: REMOVIDO o chosen_type aleatório.
    # O modelo escolhe o tipo correcto com base nas regras do prompt.
    # Forçar um tipo aleatório causava:
    #   - TRUE_FALSE com options personalizadas (ex: "540.000 é maior")
    #   - CLOZE sem ___ nas mensagens
    #   - DIRECT_INPUT repetido indefinidamente
    system_text = PROMPT_TUTOR_FINAL.format(
        subject=subject,
        topic=topic,
        context_rules=context_rules,
    )

    try:
        json_obj = await generate_tutor_response(
            system_prompt=system_text,
            user_query=request.user_query,
            history=request.history
        )

        # 🔥 FIX 2: Sanitiza o response ANTES de gerar o áudio
        json_obj = _sanitize_tutor_response(json_obj)
        json_obj["messages"] = correct_place_value(json_obj.get("messages", []))
        json_obj["messages"] = [
            remove_broken_emojis(clean_unicode(m))
            for m in json_obj.get("messages", [])
        ]

        audio_file = await generate_voice_audio(json_obj.get("messages", []))

        if audio_file:
            json_obj["audio_url"] = f"/static/audio_cache/{audio_file}"
        else:
            json_obj["audio_url"] = None

        return ChatResponse(
            response_text=json.dumps(json_obj, ensure_ascii=False)
        )

    except Exception as e:
        print(f"ERRO CONTROLADOR: {e}")
        return ChatResponse(response_text=json.dumps({
            "messages": ["Erro técnico no sistema. ⚙️"],
            "emotion": "SAD",
            "interaction_type": "CHIPS",
            "interaction_data": {"options": ["Tentar de novo"]}
        }))