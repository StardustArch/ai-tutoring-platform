import json
import re
from app.services.llm_client import get_rush_clients, generate_tutor_response
from app.services.voice_service import generate_voice_audio
from app.models.schemas import ChatRequest, ChatResponse
from app.utils.text_helpers import remove_broken_emojis
from app.config import LANG_VARIANT

# ==============================================================================
# BLOCOS PARTILHADOS
# ==============================================================================
_LANG_BLOCK = """
🌍 MOZAMBICAN LANGUAGE & CONTEXT RULES (CRITICAL):
1. Language: Portuguese from Mozambique (pt-MZ).
   - Use "Tu" (never "Você"). Use "a + infinitive" (not gerund).
   - Avoid Brazilian slang. Use "Fixe", "Maningue", "Eish" where natural.
2. Local References: Meticais, Machamba, Beira, Maputo, names like Ali, Fatima, Joao.
3. Tone: Warm, encouraging, protective — like a favourite teacher.
4. ENCODING: Native UTF-8 ONLY. NEVER use unicode escapes. Write 'é', 'ç', '🚀' directly.
5. FRAGMENTATION: Max 20 words per bubble. Use 2-3 short bubbles.
6. OUTPUT: Valid JSON ONLY. No markdown, no text before or after.
"""

_MATH_BLOCK = """
🧠 MATH ACCURACY (MANDATORY — run this before every answer):
Place value: remove dots → count from right to left:
  pos 0=unidades | pos 1=dezenas | pos 2=centenas
  pos 3=unidades de milhar | pos 4=dezenas de milhar
  pos 5=centenas de milhar | pos 6=milhões
  Example: 540.000 → 540000 → digit 5 is at pos 5 → centenas de milhar.
"""

# ==============================================================================
# PROMPT 1 — EXPLAIN
# Kani explica o conceito. NÃO testa nesta fase.
# ==============================================================================
PROMPT_EXPLAIN = """
ROLE: KMind (Kani), interactive Tutor for Mozambican kids, 3rd-4th grade.
CONTEXT: Subject="{subject}", Topic="{topic}".
YOUR TASK THIS TURN: EXPLAIN — teach one concept clearly. Do NOT test yet.
{lang_block}
{math_block}
📋 LESSON GUIDELINES:
{context_rules}

RULES FOR THIS TURN:
1. Explain using a short local analogy or example (Mozambican context).
2. Split into 2-3 short bubbles (max 20 words each).
3. LAST bubble MUST be a confirmation: "Ficou claro?", "Percebeste?".
4. NEVER ask a quiz question — testing happens in the next phase.
5. If history shows "Não percebi": use a COMPLETELY DIFFERENT analogy.

OUTPUT JSON:
{{
  "messages": ["Bubble 1.", "Bubble 2.", "Ficou claro? 😊"],
  "emotion": "HAPPY" | "INTERESTED" | "THOUGHTFUL",
  "interaction_type": "EXPLANATION",
  "assessment": null,
  "interaction_data": {{"options": ["Entendi!", "Não percebi..."]}}
}}
"""

# ==============================================================================
# PROMPT 2 — TEST
# Kani gera UMA pergunta de avaliação. NÃO explica conteúdo novo.
# ==============================================================================
PROMPT_TEST = """
ROLE: KMind (Kani), interactive Tutor for Mozambican kids, 3rd-4th grade.
CONTEXT: Subject="{subject}", Topic="{topic}".
YOUR TASK THIS TURN: TEST — ask exactly ONE question to check understanding.
{lang_block}
{math_block}
📋 LESSON GUIDELINES:
{context_rules}

RULES FOR THIS TURN:
1. Ask ONE question based ONLY on what was just explained in the history.
2. NEVER reveal the answer in the question bubbles.
3. Choose the interaction_type:

   CHIPS — 2-4 distinct answer options (DEFAULT for most questions).
     → {{"options": ["A", "B", "C"]}}

   TRUE_FALSE — factual statement to validate.
     → options MUST be EXACTLY: ["Verdadeiro", "Falso"]
     → ❌ WRONG: ["540.000 é maior", "500.000 é maior"] — use CHIPS instead.

   CLOZE — ONLY if the last bubble contains "___".
     → {{"options": ["correct", "wrong1", "wrong2"]}}

   DIRECT_INPUT — open-ended answer (number, word, sentence).
     → {{}}

   DRAG_DROP — ordering tasks only.
     → {{"items": ["item1", "item2", "item3"]}}

4. VARIETY: check last 3 history entries — do NOT repeat same type.
5. Start simple. Increase difficulty if student has answered correctly before.

OUTPUT JSON:
{{
  "messages": ["Então diz-me...", "A question here?"],
  "emotion": "INTERESTED",
  "interaction_type": "CHIPS" | "TRUE_FALSE" | "CLOZE" | "DIRECT_INPUT" | "DRAG_DROP",
  "assessment": null,
  "interaction_data": {{"options": ["A", "B", "C"]}}
}}
"""

# ==============================================================================
# PROMPT 3a — FEEDBACK CORRECT
# Kani elogia. assessment já foi calculado pelo Python como "CORRECT".
# ==============================================================================
PROMPT_FEEDBACK_CORRECT = """
ROLE: KMind (Kani), interactive Tutor for Mozambican kids, 3rd-4th grade.
CONTEXT: Subject="{subject}", Topic="{topic}".
YOUR TASK THIS TURN: PRAISE the student — they answered CORRECTLY!
{lang_block}

The question was: "{last_question}"
The student answered: "{user_answer}"
The correct answer: "{correct_answer}"

RULES FOR THIS TURN:
1. Celebrate with energy! ("Fantástico! 🎉", "Arrasei!", "Boa demais! 🚀")
2. Briefly confirm WHY the answer is correct (max 1 sentence).
3. Ask: more challenge on the same sub-topic, or advance to new content?
4. Do NOT introduce new content yet.

OUTPUT JSON:
{{
  "messages": ["Fantástico! 🎉", "Acertaste mesmo!", "Mais um desafio ou avançamos?"],
  "emotion": "HAPPY",
  "interaction_type": "CHIPS",
  "assessment": "CORRECT",
  "interaction_data": {{"options": ["Mais um desafio! 💪", "Avançar matéria ➡️"]}}
}}
"""

# ==============================================================================
# PROMPT 3b — FEEDBACK INCORRECT
# Kani encoraja e dá uma dica. assessment já foi calculado como "INCORRECT".
# ==============================================================================
PROMPT_FEEDBACK_INCORRECT = """
ROLE: KMind (Kani), interactive Tutor for Mozambican kids, 3rd-4th grade.
CONTEXT: Subject="{subject}", Topic="{topic}".
YOUR TASK THIS TURN: ENCOURAGE and give a HINT — the student answered incorrectly.
{lang_block}
{math_block}

The question was: "{last_question}"
The student answered: "{user_answer}"
The correct answer: "{correct_answer}"
The question type was: "{last_interaction_type}"

RULES FOR THIS TURN:
1. Be kind! NEVER say "Errado!" harshly. Use "Quase!", "Não desanimes!", "Pensa bem...".
2. Give ONE specific hint pointing toward the correct answer WITHOUT revealing it.
3. Retry the SAME question — same type ({last_interaction_type}), slightly reworded if needed.
4. Do NOT move to a new topic.

OUTPUT JSON:
{{
  "messages": ["Quase! 🤔", "Lembra-te: [hint].", "Tenta outra vez:"],
  "emotion": "THOUGHTFUL",
  "interaction_type": "{last_interaction_type}",
  "assessment": "INCORRECT",
  "interaction_data": {{"options": ["{correct_answer}", "wrong_option_1", "wrong_option_2"]}}
}}
"""

# ==============================================================================
# PROMPT RUSH LEGACY
# ==============================================================================
PROMPT_RUSH_LEGACY = """
You are KMind (Legacy Mode).
Just give a short feedback and chips: <<Continuar|Sair>>.
"""

# ==============================================================================
# UTILITÁRIOS
# ==============================================================================
def clean_unicode(text: str) -> str:
    if not text:
        return text
    text = text.replace("\x00", "")
    text = text.encode("utf-8", "ignore").decode("utf-8")
    return text


def _norm(s: str) -> str:
    """Normaliza para comparação: remove espaços/pontos/vírgulas, lowercase."""
    return re.sub(r'[\s.,]', '', s).strip().lower()


PLACE_VALUES = {
    0: "unidades", 1: "dezenas", 2: "centenas",
    3: "unidades de milhar", 4: "dezenas de milhar",
    5: "centenas de milhar", 6: "milhões"
}

def correct_place_value(messages: list) -> list:
    text = " ".join(messages)
    match = re.search(r"(\d)\s+em\s+([\d\.]+)", text)
    if not match:
        return messages
    digit = match.group(1)
    number = match.group(2).replace(".", "")
    for i, d in enumerate(number):
        if d == digit:
            pos = len(number) - i - 1
            correct_value = PLACE_VALUES.get(pos)
            if not correct_value:
                return messages
            return [
                re.sub(r"casa das [a-zA-ZÀ-ú\s]+", f"casa das {correct_value}", m)
                if "casa" in m.lower() else m
                for m in messages
            ]
    return messages


def _sanitize_interaction(obj: dict) -> dict:
    """Corrige interaction_type inválido. NÃO toca no assessment."""
    itype = obj.get("interaction_type", "CHIPS")
    idata = obj.get("interaction_data", {})
    messages = obj.get("messages", [])

    if itype == "TRUE_FALSE":
        opts = idata.get("options", [])
        if {o.strip().lower() for o in opts} != {"verdadeiro", "falso"}:
            print(f"⚠️ [Sanitize] TRUE_FALSE options inválidas → CHIPS")
            obj["interaction_type"] = "CHIPS"
        else:
            obj["interaction_data"] = {"options": ["Verdadeiro", "Falso"]}
        return obj

    if itype == "CLOZE":
        if not any("___" in m for m in messages):
            print(f"⚠️ [Sanitize] CLOZE sem ___ → CHIPS")
            obj["interaction_type"] = "CHIPS"
        return obj

    if itype == "DIRECT_INPUT":
        obj["interaction_data"] = {}
        return obj

    if itype == "EXPLANATION":
        if not idata.get("options"):
            obj["interaction_data"] = {"options": ["Entendi!", "Não percebi..."]}
        return obj

    if itype == "CHIPS":
        if not idata.get("options"):
            obj["interaction_data"] = {"options": ["Continuar"]}
        return obj

    if itype == "DRAG_DROP":
        if not idata.get("items"):
            obj["interaction_type"] = "CHIPS"
            obj["interaction_data"] = {"options": ["Continuar"]}
        return obj

    return obj


# ==============================================================================
# LÓGICA PRINCIPAL
# ==============================================================================
async def generate_chat_response_logic(request: ChatRequest) -> ChatResponse:

    # ── Rush legacy ────────────────────────────────────────────────────────────
    if request.mode == "rush_feedback":
        clients = get_rush_clients()
        if not clients:
            return ChatResponse(response_text="Erro: Rush indisponível.")
        try:
            completion = clients[0].chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct:free",
                messages=[{"role": "user", "content": f"{PROMPT_RUSH_LEGACY}\n{request.user_query}"}],
                temperature=0.8, max_tokens=150,
                response_format={"type": "json_object"}
            )
            return ChatResponse(response_text=completion.choices[0].message.content)
        except Exception:
            return ChatResponse(response_text="Muito bem! <<Continuar>>")

    # ── Parâmetros ─────────────────────────────────────────────────────────────
    subject       = request.subject or "Matemática"
    topic         = request.topic or "Geral"
    context_rules = request.context_rules or "Seja divertido e usa exemplos do dia-a-dia."
    phase         = request.phase or "EXPLAIN"

    assessment_override: str | None = None

    # ── Selecciona prompt pela fase ────────────────────────────────────────────
    if phase == "EXPLAIN":
        system_text = PROMPT_EXPLAIN.format(
            subject=subject, topic=topic,
            context_rules=context_rules,
            lang_block=_LANG_BLOCK, math_block=_MATH_BLOCK,
        )

    elif phase == "TEST":
        system_text = PROMPT_TEST.format(
            subject=subject, topic=topic,
            context_rules=context_rules,
            lang_block=_LANG_BLOCK, math_block=_MATH_BLOCK,
        )

    elif phase == "FEEDBACK":
        # ── Assessment calculado deterministicamente ───────────────────────────
        # O Python compara a resposta do aluno com a correcta.
        # O modelo só gera o TEXTO — nunca decide o resultado.
        user_answer    = request.user_query or ""
        correct_answer = request.last_correct_answer or ""
        last_itype     = request.last_interaction_type or "CHIPS"

        if correct_answer and _norm(user_answer) == _norm(correct_answer):
            assessment_override = "CORRECT"
            system_text = PROMPT_FEEDBACK_CORRECT.format(
                subject=subject, topic=topic,
                lang_block=_LANG_BLOCK,
                user_answer=user_answer,
                correct_answer=correct_answer,
                last_question=request.last_question or "",
            )
        else:
            assessment_override = "INCORRECT"
            system_text = PROMPT_FEEDBACK_INCORRECT.format(
                subject=subject, topic=topic,
                lang_block=_LANG_BLOCK, math_block=_MATH_BLOCK,
                user_answer=user_answer,
                correct_answer=correct_answer,
                last_question=request.last_question or "",
                last_interaction_type=last_itype,
            )
    else:
        # Fase desconhecida → fallback seguro para EXPLAIN
        phase = "EXPLAIN"
        system_text = PROMPT_EXPLAIN.format(
            subject=subject, topic=topic,
            context_rules=context_rules,
            lang_block=_LANG_BLOCK, math_block=_MATH_BLOCK,
        )

    # ── Chamada ao modelo ──────────────────────────────────────────────────────
    try:
        json_obj = await generate_tutor_response(
            system_prompt=system_text,
            user_query=request.user_query,
            history=request.history,
        )

        # Assessment: sobrescreve SEMPRE com o valor calculado (nunca do modelo)
        if assessment_override is not None:
            json_obj["assessment"] = assessment_override
        else:
            # EXPLAIN e TEST nunca têm assessment
            json_obj["assessment"] = None

        # Sanitiza interaction_type (não toca no assessment)
        json_obj = _sanitize_interaction(json_obj)

        # Correcção determinística de valor posicional
        json_obj["messages"] = correct_place_value(json_obj.get("messages", []))

        # Limpeza de encoding
        json_obj["messages"] = [
            remove_broken_emojis(clean_unicode(m))
            for m in json_obj.get("messages", [])
        ]

        # Áudio
        audio_file = await generate_voice_audio(json_obj.get("messages", []))
        json_obj["audio_url"] = f"/static/audio_cache/{audio_file}" if audio_file else None

        # Devolve a fase ao NestJS para calcular a próxima transição
        json_obj["phase"] = phase

        return ChatResponse(response_text=json.dumps(json_obj, ensure_ascii=False))

    except Exception as e:
        print(f"ERRO CONTROLADOR [{phase}]: {e}")
        return ChatResponse(response_text=json.dumps({
            "messages": ["Eish, algo correu mal! ⚙️", "Podes tentar de novo?"],
            "emotion": "SAD",
            "interaction_type": "CHIPS",
            "assessment": None,
            "phase": phase,
            "interaction_data": {"options": ["Tentar de novo"]},
            "audio_url": None,
        }, ensure_ascii=False))