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
  "correct_answer": "the exact correct answer string",
  "interaction_data": {{"options": ["correct_answer", "wrong1", "wrong2"]}}
}}

CRITICAL — "correct_answer" field is MANDATORY:
- CHIPS/CLOZE/TRUE_FALSE: must exactly match one option string.
- DIRECT_INPUT: write the ideal/expected answer (used for grading).
- DRAG_DROP: items joined by space in correct order.
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

# Padrão ordenado por comprimento decrescente para evitar substituições parciais
# ("centenas de milhar" deve ser apanhado antes de "centenas")
_PLACE_NAMES_SORTED = sorted(PLACE_VALUES.values(), key=len, reverse=True)
_PLACE_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(name) for name in _PLACE_NAMES_SORTED) + r')\b',
    re.IGNORECASE
)
_DIGIT_PATTERN = re.compile(r'\bo\s+(\d)\b|\bdo\s+(\d)\b|\bdígito\s+(\d)\b', re.IGNORECASE)


def _build_place_map(number_str: str) -> dict:
    """Devolve {dígito: nome_correcto} para todos os dígitos do número."""
    digits = number_str.replace(".", "").replace(",", "")
    result = {}
    for i, d in enumerate(digits):
        pos = len(digits) - i - 1
        if pos in PLACE_VALUES and d not in result:
            result[d] = PLACE_VALUES[pos]
    return result


def correct_place_value(messages: list, last_question: str = "") -> list:
    """
    Corrige deterministicamente valores posicionais errados no output do Kani.

    Quando o modelo diz "o 7 está nas centenas de milhar" mas o 7 em 567.890
    está nas unidades de milhar, esta função detecta e corrige automaticamente.

    last_question: a última pergunta do Kani — usada para extrair o número de
    referência quando as mensagens de feedback não repetem o número.

    Versão 2 — fixes vs versão original:
    - Substitui nomes compostos como unidade atómica (evita "de milhar de milhar")
    - Usa last_question como contexto quando o número não está nas mensagens
    - Procura o número mais longo (mais provável de ser o número do exercício)
    """
    all_text = " ".join(messages) + " " + (last_question or "")
    numbers_found = re.findall(r'\b\d[\d\.]*\d\b', all_text)
    if not numbers_found:
        return messages

    ref_number = max(numbers_found, key=lambda n: len(n.replace(".", "")))
    place_map = _build_place_map(ref_number)

    corrected = []
    for msg in messages:
        digit_match = _DIGIT_PATTERN.search(msg)
        if not digit_match:
            corrected.append(msg)
            continue

        digit = next(g for g in digit_match.groups() if g)
        correct_pv = place_map.get(digit)
        if not correct_pv:
            corrected.append(msg)
            continue

        def replace_pv(m, cpv=correct_pv, d=digit, ref=ref_number):
            found = m.group(1).lower()
            if found == cpv:
                return m.group(0)  # já correcto
            print(f"🔧 [PlaceValue] '{found}' → '{cpv}' (dígito {d} em {ref})")
            return cpv

        corrected.append(_PLACE_PATTERN.sub(replace_pv, msg))

    return corrected


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
            # ✅ Resposta correcta — confirmado deterministicamente
            assessment_override = "CORRECT"
            system_text = PROMPT_FEEDBACK_CORRECT.format(
                subject=subject, topic=topic,
                lang_block=_LANG_BLOCK,
                user_answer=user_answer,
                correct_answer=correct_answer,
                last_question=request.last_question or "",
            )
        elif correct_answer:
            # ❌ Resposta errada — confirmado deterministicamente
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
            # ⚠️ Sem correct_answer (DIRECT_INPUT aberto, ou frontend antigo)
            # Não forçamos assessment — o modelo avalia pelo contexto do histórico.
            # assessment_override fica None → modelo decide (melhor que forçar INCORRECT)
            print(f"⚠️ [FEEDBACK] Sem correct_answer — modelo avalia livremente.")
            system_text = PROMPT_FEEDBACK_INCORRECT.format(
                subject=subject, topic=topic,
                lang_block=_LANG_BLOCK, math_block=_MATH_BLOCK,
                user_answer=user_answer,
                correct_answer="(avalia tu com base na pergunta e na resposta do aluno)",
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
        json_obj["messages"] = correct_place_value(json_obj.get("messages", []), request.last_question or "")

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

        # Em fase TEST, garante que correct_answer existe no output para o frontend.
        # O frontend guarda-o e reenvia no próximo pedido (fase FEEDBACK).
        # Se o modelo não o devolveu, tenta extrair das options (1º elemento = correcto por convenção).
        if phase == "TEST" and not json_obj.get("correct_answer"):
            opts = json_obj.get("interaction_data", {}).get("options", [])
            if opts:
                json_obj["correct_answer"] = opts[0]
                print(f"⚠️ [TEST] correct_answer em falta — inferido das options: '{opts[0]}'")

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