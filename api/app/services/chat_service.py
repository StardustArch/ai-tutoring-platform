import json
import re
from app.services.llm_client import get_rush_clients, generate_tutor_response
from app.services.voice_service import generate_voice_audio
from app.models.schemas import ChatRequest, ChatResponse
from app.utils.text_helpers import remove_broken_emojis
from app.utils.textos_ancora import get_ancora
from app.config import LANG_VARIANT
from app.seeds.loader import SeedLoader, SeedNotFoundError

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

# ==============================================================================
# PROMPT 1 — EXPLAIN
# Kani explica o conceito. NÃO testa nesta fase.
# ==============================================================================
PROMPT_EXPLAIN = """
ROLE: KMind (Kani), interactive Tutor for Mozambican kids, 3rd-4th grade.
CONTEXT: Subject="{subject}", Topic="{topic}".
YOUR TASK THIS TURN: EXPLAIN — teach one concept clearly. Do NOT test yet.
{lang_block}
📋 LESSON GUIDELINES:
{context_rules}

RULES FOR THIS TURN:
1. Explain using a short local analogy or example (Mozambican context).
2. Split into 2-3 short bubbles (max 20 words each).
3. LAST bubble MUST be a confirmation: "Ficou claro?", "Percebeste?".
4. NEVER ask a quiz question — testing happens in the next phase.
5. If history shows "Não percebi": use a COMPLETELY DIFFERENT analogy.
6. If history shows the student just completed a topic and chose to advance,
   START with a smooth transition: "Muito bem! Agora vamos aprender..."
   NEVER jump directly into new content without acknowledging the previous topic.

{vocab_block}
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
⚡ PHASE: TEST — your ONLY job this turn is to ask ONE quiz question.
DO NOT explain. DO NOT greet. DO NOT ask what the student needs.
Ask ONE question directly. That is all.

ROLE: KMind (Kani), interactive Tutor for Mozambican kids, 3rd-4th grade.
CONTEXT: Subject="{subject}", Topic="{topic}".
YOUR TASK THIS TURN: TEST — ask exactly ONE question to check understanding.
{lang_block}
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

{vocab_block}
OUTPUT JSON:
{{
  "messages": ["Então diz-me...", "A question here?"],
  "emotion": "INTERESTED",
  "interaction_type": "CHIPS" | "TRUE_FALSE" | "CLOZE" | "DIRECT_INPUT" | "DRAG_DROP",
  "assessment": null,
  "correct_answer": "the exact correct answer string",
"interaction_data": {{
  "options": [
    "{{correct_answer}}",           # ← resposta correta
    "distrator_plausivel_1",      # ← ex: para '8', use '7' ou '6'
    "distrator_plausivel_2"       # ← ex: erro comum de posição
  ]
}}
}}

CRITICAL — "correct_answer" field is MANDATORY:
- CHIPS/CLOZE/TRUE_FALSE: must exactly match one option string.
- DIRECT_INPUT: write the ideal/expected answer (used for grading).
- DRAG_DROP: items joined by space in correct order.
⚠️ CRITICAL: NEVER use placeholder text like "wrong_option_1". 
Generate REAL plausible wrong answers:
- For math: use common mistakes (off-by-one, wrong place value, digit swap)
- For concepts: use partially correct or common misconceptions
- Options must be distinct and believable
"""


PROMPT_TEST_COM_ANCORA = """
Você é o Kani, tutor educativo moçambicano para alunos da {student_class}ª classe.
Disciplina: {subject} | Tópico: {topic}
 
══════════════════════════════════════════════
{ancora_label}:
"{ancora_conteudo}"
══════════════════════════════════════════════
 
FASE: TEST — faz UMA pergunta de avaliação sobre o {ancora_label_lower} acima.
A pergunta deve ser directamente baseada no {ancora_label_lower} — NÃO inventes outro texto ou imagem.
 
Regras do tópico:
{context_rules}
 
Histórico da conversa:
{history}
 
Última mensagem do aluno: "{user_query}"
 
Responde APENAS em JSON válido:
{{
  "messages": ["pergunta clara e directa sobre o {ancora_label_lower}"],
  "emotion": "CURIOUS",
  "interaction_type": "CHIPS",
  "assessment": null,
  "phase": "TEST",
  "interaction_data": {{
    "options": ["opção A", "opção B", "opção C", "opção D"]
  }}
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

{vocab_block}
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
{vocab_block}

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
  "interaction_data": {{
  "options": [
    "{correct_answer}",
    "outra_resposta_possivel",  # ← instrua: use erro comum do aluno
    "mais_uma_opcao_plausivel"
  ]
}}}}
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


def generate_math_distractors(correct_answer: str, number_context: str = None) -> list:
    """Gera 2 distratores plausíveis para respostas numéricas."""
    if not correct_answer.isdigit():
        return ["7", "9"]  # fallback
    
    num = int(correct_answer)
    distractors = []
    
    # Distrator 1: off-by-one (erro comum de contagem)
    distractors.append(str(num - 1 if num > 0 else num + 1))
    
    # Distrator 2: se tiver contexto de número completo, usa erro de posição
    if number_context:
        digits = number_context.replace(".", "").replace(",", "")
        if correct_answer in digits and len(digits) > 1:
            idx = digits.index(correct_answer)
            # Pega dígito da posição vizinha
            neighbor_idx = (idx + 1) % len(digits)
            distractors.append(digits[neighbor_idx])
        else:
            distractors.append(str(num + 2))
    else:
        distractors.append(str(num + 2))
    
    return distractors[:2]

def _fix_placeholder_options(options: list, correct_answer: str, subject: str, number_context: str = None) -> list:
    """Substitui placeholders por distratores gerados deterministicamente."""
    fixed = []
    placeholder_count = 0
    
    for opt in options:
        # Detecta placeholders literais
        if opt in ["wrong_option_1", "wrong_option_2", "wrong_option_3", 
                   "distrator_plausivel_1", "outra_resposta_possivel", "mais_uma_opcao_plausivel"]:
            placeholder_count += 1
            
            # Se for Matemática e resposta numérica → usa gerador inteligente
            if subject.lower() in ["matemática", "math", "matematica"] and correct_answer.isdigit():
                distractors = generate_math_distractors(correct_answer, number_context)
                # Adiciona distratores únicos que ainda não estão na lista
                for d in distractors:
                    if d not in fixed and d != correct_answer:
                        fixed.append(d)
                        if len([x for x in fixed if x != correct_answer]) >= 2:
                            break
            else:
                # Fallback genérico para outras matérias
                if correct_answer.isdigit():
                    num = int(correct_answer)
                    candidate = str(num - 1 if num > 0 else num + 1)
                    if candidate not in fixed:
                        fixed.append(candidate)
                else:
                    fixed.append(f"Outra opção")
        else:
            # Mantém opção válida gerada pelo LLM
            if opt not in fixed:
                fixed.append(opt)
    
    # Garante: [correta, distrator1, distrator2]
    # 1. Garante que a correta está em primeiro (por convenção do frontend)
    if correct_answer and correct_answer not in fixed:
        fixed = [correct_answer] + fixed
    elif correct_answer and fixed[0] != correct_answer:
        fixed.remove(correct_answer)
        fixed = [correct_answer] + fixed
    
    # 2. Completa com fallbacks se faltar opções
    fallbacks = ["7", "9", "5", "3", "1"]  # números genéricos
    i = 0
    while len(fixed) < 3:
        candidate = fallbacks[i % len(fallbacks)]
        if candidate not in fixed:
            fixed.append(candidate)
        i += 1
    
    return list(dict.fromkeys(fixed))  # remove duplicatas mantendo ordem



# ==============================================================================
# LÓGICA PRINCIPAL
# ==============================================================================
async def generate_chat_response_logic(request: ChatRequest) -> ChatResponse:
    # ── 1. Carregar seed ─────────────────────────────────────────────────────
    seed = None
    try:
        seed_id = request.topic_seed_id or f"{request.subject[:3].lower()}{request.student_class}_u{request.unit or 1}_{request.topic[:20].lower().replace(' ', '_')}"
        seed = SeedLoader.get(seed_id)
    except (SeedNotFoundError, KeyError, AttributeError):
        try:
            seed = SeedLoader.get_by_topic(request.topic or "Geral", subject=request.subject)
        except SeedNotFoundError:
            seed = None
            print(f"⚠️ [SeedLoader] Seed não encontrado para topic='{request.topic}', subject='{request.subject}'")

    # ── 2. Rush legacy ───────────────────────────────────────────────────────
    if request.mode == "rush_feedback":
        clients = get_rush_clients()
        if not clients:
            return ChatResponse(response_text="Erro: Rush indisponível.")
        try:
            completion = clients[0].chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct:free",
                messages=[{"role": "user", "content": f"{PROMPT_RUSH_LEGACY}\n{request.user_query}"}],
                temperature=0.8, max_tokens=150, response_format={"type": "json_object"}
            )
            return ChatResponse(response_text=completion.choices[0].message.content)
        except Exception:
            return ChatResponse(response_text="Muito bem! <<Continuar>>")

    # ── 3. Parâmetros e blocos dinâmicos ─────────────────────────────────────
    subject = request.subject or "Matemática"
    topic   = request.topic or "Geral"
    phase   = request.phase or "EXPLAIN"
    
    # Blocos do seed (ou fallback seguro)
    vocab_block = seed.compact_vocab_block() if seed else ""
    curriculum_block = "\n".join(seed.curriculum_notes) if (seed and seed.curriculum_notes) else (request.context_rules or "Sê divertido e usa exemplos do dia-a-dia.")
    lang_block = _LANG_BLOCK  # Mantido global para Layer 1 (não muda por tópico)

    assessment_override: str | None = None

    # ── 4. Construção do Prompt por Fase ─────────────────────────────────────
    if phase == "EXPLAIN":
        system_text = PROMPT_EXPLAIN.format(
            subject=subject, topic=topic,
            context_rules=curriculum_block,
            lang_block=lang_block,
            vocab_block=vocab_block
        )

    elif phase == "TEST":
        ancora_data = get_ancora(request.ancoras) if request.ancoras else None
        
        if ancora_data:
            ancora_label = "DESCRIÇÃO VISUAL (Cartaz ou Sinal)" if ancora_data["tipo"] == "visual" else "TEXTO DE SUPORTE"
            ancora_label_lower = "cartaz ou sinal descrito" if ancora_data["tipo"] == "visual" else "texto acima"
            
            system_text = PROMPT_TEST_COM_ANCORA.format(
                student_class=request.student_class, subject=subject, topic=topic,
                context_rules=curriculum_block,
                ancora_label=ancora_label, ancora_label_lower=ancora_label_lower,
                ancora_conteudo=ancora_data["conteudo"],
                history=request.history, user_query=request.user_query
            )
            print(f"⚓ [Tutor/TEST] Âncora '{request.ancoras}' → {ancora_data['tipo']}", flush=True)
        else:
            system_text = PROMPT_TEST.format(
                subject=subject, topic=topic,
                context_rules=curriculum_block,  # ✅ CORRIGIDO: usa seed.curriculum_notes
                history=request.history, user_query=request.user_query,
                lang_block=lang_block, vocab_block=vocab_block
            )

    elif phase == "FEEDBACK":
        user_answer    = request.user_query or ""
        correct_answer = request.last_correct_answer or ""
        last_itype     = request.last_interaction_type or "CHIPS"

        if correct_answer and _norm(user_answer) == _norm(correct_answer):
            assessment_override = "CORRECT"
            system_text = PROMPT_FEEDBACK_CORRECT.format(
                subject=subject, topic=topic, lang_block=lang_block, vocab_block=vocab_block,
                user_answer=user_answer, correct_answer=correct_answer,
                last_question=request.last_question or ""
            )
        elif correct_answer:
            assessment_override = "INCORRECT"
            system_text = PROMPT_FEEDBACK_INCORRECT.format(
                subject=subject, topic=topic, lang_block=lang_block, vocab_block=vocab_block,
                user_answer=user_answer, correct_answer=correct_answer,
                last_question=request.last_question or "", last_interaction_type=last_itype
            )
        else:
            print(f"⚠️ [FEEDBACK] Sem correct_answer — modelo avalia livremente.")
            system_text = PROMPT_FEEDBACK_INCORRECT.format(
                subject=subject, topic=topic, lang_block=lang_block, vocab_block=vocab_block,
                user_answer=user_answer, correct_answer="INFERIR_DO_CONTEXTO_DO_ALUNO",
                last_question=request.last_question or "", last_interaction_type=last_itype
            )
    else:
        phase = "EXPLAIN"
        system_text = PROMPT_EXPLAIN.format(
            subject=subject, topic=topic,
            context_rules=curriculum_block, lang_block=lang_block, vocab_block=vocab_block
        )

    # ── 5. Chamada ao Modelo & Pós-Processamento ─────────────────────────────
    try:
        json_obj = await generate_tutor_response(
            system_prompt=system_text, user_query=request.user_query,
            history=request.history, phase=phase
        )
        
        if phase == "TEST" and ancora_data:
            json_obj["ancora"] = ancora_data
            
        json_obj["assessment"] = assessment_override
        
        # Corrige distratores se necessário
        if json_obj.get("interaction_data", {}).get("options"):
            opts = json_obj["interaction_data"]["options"]
            correct = json_obj.get("correct_answer", "")
            number_context = None
            if subject.lower() in ["matemática", "math", "matematica"]:
                history_text = " ".join(msg.get("text", "") for msg in (request.history[-2:] if request.history else []))
                nums = re.findall(r'\b\d{3,}(?:\.\d{3})*(?:,\d+)?\b', (request.last_question or "") + " " + history_text)
                if nums: number_context = nums[0]
            json_obj["interaction_data"]["options"] = _fix_placeholder_options(opts, correct, subject, number_context=number_context)

        json_obj = _sanitize_interaction(json_obj)
        json_obj["messages"] = correct_place_value(json_obj.get("messages", []), request.last_question or "")

        # ✅ PÓS-PROCESSAMENTO DE VOCABULÁRIO (Seed)
        if seed:
            json_obj["messages"] = [seed.apply_vocab(remove_broken_emojis(clean_unicode(m))) for m in json_obj.get("messages", [])]
        else:
            json_obj["messages"] = [remove_broken_emojis(clean_unicode(m)) for m in json_obj.get("messages", [])]

        audio_file = await generate_voice_audio(json_obj.get("messages", []))
        json_obj["audio_url"] = f"/static/audio_cache/{audio_file}" if audio_file else None
        json_obj["phase"] = phase

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
            "emotion": "SAD", "interaction_type": "CHIPS", "assessment": None,
            "phase": phase, "interaction_data": {"options": ["Tentar de novo"]}, "audio_url": None
        }, ensure_ascii=False))
