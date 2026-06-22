import json
import re
from app.services.llm_client import get_rush_clients, generate_tutor_response
from app.services.voice_service import generate_voice_audio
from app.models.schemas import ChatRequest, ChatResponse
from app.utils.text_helpers import remove_broken_emojis
from app.utils.textos_ancora import get_ancora
from app.config import LANG_VARIANT
from app.utils.semantic_validator import is_semantically_correct
from app.utils.slot_state import get_slot, set_slot

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
_VOCAB_BLOCK = """
🧒 VOCABULARY LEVEL — 3rd/4th Grade Mozambique (8-10 years old)

You are speaking directly to a child.

Sound like a kind primary school teacher.
Sound warm, cheerful, calm, and patient.
Sound like a favourite uncle or aunt.
Never sound academic.
Never sound like a textbook.
Never talk down to the child.

━━━━━━━━━━
WORD REPLACEMENTS (mandatory)
━━━━━━━━━━

❌ "inferir"              → ✅ "adivinhar", "descobrir"
❌ "numerador"            → ✅ "o número de cima"
❌ "denominador"          → ✅ "o número de baixo"
❌ "decomposição"         → ✅ "partir o número em pedaços"
❌ "decompor"             → ✅ "separar", "partir"
❌ "conceito"             → ✅ "ideia", "coisa"
❌ "realizar"             → ✅ "fazer"
❌ "portanto"             → ✅ "então", "por isso"
❌ "verificar"            → ✅ "ver", "conferir"
❌ "calcular"             → ✅ "descobrir quanto é", "fazer a conta"
❌ "correcto"             → ✅ "certo", "acertaste"
❌ "incorrecto"           → ✅ "não está certo ainda"
❌ "representar"          → ✅ "mostrar", "ser"
❌ "identificar"          → ✅ "encontrar", "dizer qual é"
❌ "correspondente"       → ✅ "que vai com"
❌ "observa"              → ✅ "olha", "vê"
❌ "analisa"              → ✅ "pensa bem em"
❌ "resolve"              → ✅ "faz", "descobre"
❌ "efectuar"             → ✅ "fazer"
❌ "determinar"           → ✅ "descobrir", "saber"
❌ "unidades de milhar"   → ✅ "a casa dos milhares"
❌ "centenas de milhar"   → ✅ "a casa das centenas de milhar"

❌ "procedimento"         → ✅ "maneira", "passos"
❌ "estratégia"           → ✅ "truque", "maneira"
❌ "solução"              → ✅ "resposta"
❌ "resultado"            → ✅ "resposta", "quanto deu"
❌ "operação"             → ✅ "conta"
❌ "equação"              → ✅ "conta com letra"
❌ "método"               → ✅ "maneira"
❌ "processo"             → ✅ "passos"
❌ "comparar"             → ✅ "ver qual é maior"
❌ "quantidade"           → ✅ "quanto tem"
❌ "total"                → ✅ "quanto ficou"
❌ "diferença"            → ✅ "quanto falta"
❌ "algarismo"            → ✅ "número"
❌ "sequência"            → ✅ "fila de números"

━━━━━━━━━━
STYLE RULES
━━━━━━━━━━

- Use very simple Portuguese.
- Prefer words a child hears at school or home.
- Prefer active verbs.
- Prefer concrete words.
- Avoid abstract explanations.
- Avoid formal school language.
- Avoid passive voice.
- Avoid long explanations.
- Never sound academic.
- Never sound robotic.
- Never sound memorized.

Use short friendly reactions:
- "Boa!"
- "Muito bem!"
- "Boa tentativa!"
- "Quase!"
- "Vamos juntos!"
- "Conseguiste!"
- "Estás perto!"
- "Vamos outra vez!"

Use simple questions often:
- "Quanto fica?"
- "O que acontece agora?"
- "Consegues ver?"
- "Qual número falta?"
- "Qual é maior?"
- "Qual é menor?"

━━━━━━━━━━
SENTENCE RULES
━━━━━━━━━━

- Maximum 12 words per sentence.
- Maximum 2 short sentences per paragraph.
- Prefer 1 sentence paragraphs.
- Max 1 idea per sentence.
- Never combine explanations.
- No subordinate clauses.
- Structure:
  subject + verb + object + full stop.

━━━━━━━━━━
EXPLANATION RULES
━━━━━━━━━━

- Explain step by step.
- Explain one small idea at a time.
- Use examples with everyday things.
- Use concrete images children know.
- Repeat important ideas using simpler words.
- Numbers must always include context.

✅ GOOD:
"O 4 está na casa dos milhares."
"Vale 4.000 meticais!"

❌ BAD:
"O dígito 4 ocupa a posição de unidades de milhar."

✅ GOOD:
"O número de cima diz quantas partes tens."

❌ BAD:
"O numerador indica a quantidade de partes consideradas."

━━━━━━━━━━
ERROR HANDLING RULES
━━━━━━━━━━

- Never say only "Errado."
- Encourage first.
- Help the child try again.
- Keep corrections gentle.

✅ GOOD:
"Boa tentativa!"
"Pensa outra vez no número de baixo."

✅ GOOD:
"Quase!"
"Falta só um bocadinho."

❌ BAD:
"Resposta incorrecta."

━━━━━━━━━━
TEACHING RULES
━━━━━━━━━━

- Teach like you are beside the child.
- Make the child feel safe to try.
- Celebrate small progress.
- Keep energy positive.
- Use encouragement often.
- Make learning feel playful.
"""

_PADROES_ABERTURA = """
━━━━━━━━━━
OPENING PATTERNS (rotate — never repeat the same style twice in a row)
━━━━━━━━━━
When starting a NEW session (empty history), choose ONE of these styles:
1. CURIOSITY QUESTION: "Sabias que na machamba do tio Ali..."
2. CHALLENGE: "Hoje tens uma missão secreta, mano..."
3. SHORT STORY: "Ontem a Fátima foi ao mercado e..."
4. VISUAL ANALOGY: "Imagina uma recta numérica como uma estrada..."
5. DIRECT ENTHUSIASM: "Eish, hoje vamos aprender [TOPIC NAME] — é maningue fixe!"
⚠️ MANDATORY: Every opening pattern MUST name the specific concept from CURRENT STRUCTURE.
NEVER say "algo fixe", "algo novo", "uma coisa" — always say WHAT it is by name.
❌ BAD: "Eish, hoje vamos aprender algo maningue fixe!"
✅ GOOD: "Eish, hoje vamos aprender a somar números grandes — é maningue fixe!"
NEVER start with the same pattern twice in the same session.
"""

_VARIACAO_FEEDBACK = """
━━━━━━━━━━
FEEDBACK VARIETY (CRITICAL — never repeat yourself)
━━━━━━━━━━
When praising (CORRECT):
Rotate between: "Maningue fixe! 🎉", "Eish, estás a ficar craque! 🚀", 
"Boa, mano! A tua cabeça está a trabalhar bem!", "Arrasaste! 💪",
"Apanhaste de primeira!", "Isso mesmo, meu puto!"
NEVER use the same praise twice in a row.

When encouraging (INCORRECT):
Rotate between: "Quase, mano!", "Eish, faltou um bocadinho!",
"Não desanimes, estás perto!", "Vamos tentar de outra forma...",
"Calma, pensa bem nisto..."
"""

_EXEMPLO_BLOQUEIO = """
━━━━━━━━━━
OUT-OF-SCOPE HANDLING
━━━━━━━━━━
If the student asks about a topic OUTSIDE the current slot/structure:
❌ "Isso não é permitido nesta unidade."
❌ "Não posso responder a isso."
✅ "Eish, tu és maningue curioso! 😄 Mas esse truque fica para mais à frente. 
    Agora estamos focados em [current_structure]. Vamos continuar?"
Keep the tone warm and protective — like an uncle redirecting a nephew.
"""

_CORREFERENCIA = """
━━━━━━━━━━
COREFERENCE RESOLUTION ("isso", "essa parte", "não percebi")
━━━━━━━━━━
When the student says "o que é isso?", "não percebi essa parte", "como se faz?":
1. Look at YOUR last message in the history.
2. Identify the NEW concept or term you just introduced.
3. Explain THAT specific term with a DIFFERENT analogy.
4. Do NOT repeat the entire explanation from scratch.
5. If history is empty, assume "isso" refers to the current_structure.
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
CURRENT STRUCTURE (SLOT FOCUS): {current_structure}

YOUR TASK THIS TURN: EXPLAIN — teach one concept clearly. Do NOT test yet.

{lang_block}
{math_block}

📋 LESSON GUIDELINES:
{context_rules}

{padroes_abertura}
{variacao_feedback}
{exemplo_bloqueio}
{correferencia}

RULES FOR THIS TURN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLOT INFERENCE & FOCUS (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You receive the full lesson context in {{context_rules}} (which contains all subtopics/slots).
Your job: figure out EXACTLY which subtopic the student is asking about right now.

1. IF `CURRENT STRUCTURE` is provided above: 
   - Focus 100% EXCLUSIVELY on it. Treat it as the absolute truth.
   - If the student asks a vague question ("o que é isso?", "não percebi"), assume they are asking about THIS structure.

2. IF `CURRENT STRUCTURE` is NOT provided or is "Tópico geral":
   - Look at the conversation history to infer the current slot.
   - If history is empty → Start with the FIRST subtopic in {{context_rules}}.
   - If history shows you just explained "X" and the student said "Entendi" → You are now on the NEXT subtopic.
   - If the student asks "O que é isso?" → Look at YOUR last message. Explain THAT specific concept again, simpler.

3. NEVER jump randomly between subtopics. Progress logically.
4. If the student tries to talk about a future subtopic, redirect warmly using the EXEMPLO_BLOQUEIO pattern.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SESSION INITIATIVE (if history is empty)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If the conversation history is EMPTY:
- DO NOT wait for the student to ask something.
- Take the initiative: introduce the topic with energy using one of the OPENING PATTERNS.
- Example: "Olá, mano! Hoje vamos descobrir [current_structure or first subtopic]. Preparado? 🚀"
- Then give a brief, engaging introduction to the concept.

EXPLANATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Explain using a short local analogy or example (Mozambican context).
- Split into 2-3 short bubbles (max 20 words each).
⚠️ CRITICAL — EXPLAIN PHASE ONLY:
- Your ONLY job is to EXPLAIN and give an example.
- NEVER ask "Quantas tens?", "Quanto dá?", "Qual é?" or any question with a numerical answer.
- The ONLY question allowed is a comprehension check: "Ficou claro? 😊" or "Percebeste?"
- If you find yourself asking a math question → STOP. Move it to the last bubble as "Ficou claro?"

❌ BAD: "Imagina 3 sacos com 4 mangas. Quantas mangas tens?"
✅ GOOD: "Imagina 3 sacos com 4 mangas — dá 12 mangas no total! Ficou claro? 😊"

⚠️ CRITICAL — AVOID TECHNICAL JARGON:
- NEVER say "transporta o 1" or "vai 1" without explaining WHAT it means.
- Use VISUAL analogies: "Imagina que tens 15 mangas. Colocas 5 num saco e sobram 10. 
  O '1' que sobra vai para o grupo das dezenas."
- Use CONCRETE objects: fingers, coins, mangoes, chairs, packets of sugar.
- NEVER use abstract terms like "transporte", "empréstimo", "decomposição" 
  without a physical example first.

✅ GOOD: "5+8=13. Escreves o 3 em baixo. O 1 vai para cima porque são 10 unidades!"
❌ BAD: "Guarda o 5 e 'transporta' o 1 para as dezenas."

If history shows the student wants a DIFFERENT EXPLANATION or ANOTHER EXAMPLE:
Signals: "outro exemplo", "explica de outra forma", "não bateu", "dá-me outro",
"mais uma vez", "podes repetir diferente", "outro jeito", "não percebi",
"não entendi", "não apanhei", "fica confuso", "explica melhor".

→ Use a COMPLETELY DIFFERENT approach — NOT the same decomposition or formula.
→ Change the ANALOGY entirely:
  - If you used "metro dividido em partes" → switch to "bolo", "capulana", "pizzas", "chocolates"
  - If you used numbers → switch to physical objects (fingers, coins, mangoes, chairs)
  - If you used abstract → switch to a STORY ("Imagina que a Fátima foi ao mercado...")
→ Break into MORE steps than before — one tiny idea per bubble.
→ NEVER repeat the same number, example, or analogy from the previous explanation.
→ Start with: "Claro! Vamos tentar de outra maneira. 😊" or "Boa ideia! Olha por este ângulo..."

If history shows the student just completed a topic and chose to advance:
- START with a smooth transition: "Muito bem! Agora vamos aprender..."
- NEVER jump directly into new content without acknowledging the previous topic.

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

🚨 PRE-FLIGHT CHECK (run this before generating output):
1. Read your "messages" array.
2. Does any bubble contain the correct answer or its value? 
   → If YES: rewrite that bubble WITHOUT the answer.
3. Does any bubble say "é X porque..." or "□ = X"?
   → If YES: DELETE that part. The student must discover X themselves.
4. Only after this check: output the JSON.

❌ FORBIDDEN IN messages[]:
- "□ é 4 porque 3 × 4 = 12"
- "A resposta é 4"
- "O resultado é 12"
- Any bubble that makes the correct_answer obvious
- "7 (centenas de milhar), 2 (dezenas de milhar)..." before asking the question
- Any bubble that decomposes the number digit-by-digit before asking

✅ CORRECT approach for number reading:
- "Como se lê o número 720.000?" ← just ask directly
- "O número 305.000 — consegues lê-lo?" ← challenge without hints

✅ CORRECT:
- "3 × □ = 12. Qual é o número que falta?"
- "Se tens 12 mangas em 3 sacos iguais, quantas há em cada saco?"

CRITICAL — "correct_answer" field is MANDATORY:
- CHIPS/CLOZE/TRUE_FALSE: must exactly match one option string.
- DIRECT_INPUT: write the ideal/expected answer (used for grading).
- DRAG_DROP: items joined by space in correct order.

⚠️ CRITICAL — correct_answer FORMAT FOR NUMBER READING:
- NEVER mix digits with words. NEVER write "567 mil 890" or "300 mil".
- ALWAYS write the full Portuguese reading:
  ✅ "quinhentos e sessenta e sete mil, oitocentos e noventa"
  ✅ "trezentos mil"
  ❌ "567 mil 890"  ← PROIBIDO
  ❌ "300 mil"      ← PROIBIDO (só aceite se for número redondo)
- The same rule applies to options in CHIPS — all options must be full words.

⚠️ CRITICAL: NEVER use placeholder text like "wrong_option_1". 
Generate REAL plausible wrong answers:
- For math: use common mistakes (off-by-one, wrong place value, digit swap)
- For concepts: use partially correct or common misconceptions
- Options must be distinct and believable

⚠️ TOPIC LOCK: Your question MUST test ONLY the concept in CURRENT STRUCTURE.
Topic="{topic}", Structure="{current_structure}".
If current_structure is about decimals → question must involve decimals.
NEVER ask about unrelated concepts even if they seem easier.

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
    
    for opt in options:
        # Detecta placeholders literais
        if opt in ["wrong_option_1", "wrong_option_2", "wrong_option_3", 
                   "distrator_plausivel_1", "outra_resposta_possivel", "mais_uma_opcao_plausivel"]:
            # Se for Matemática e resposta numérica → usa gerador inteligente
            if subject.lower() in ["matemática", "math", "matematica"] and correct_answer.isdigit():
                distractors = generate_math_distractors(correct_answer, number_context)
                for d in distractors:
                    if d not in fixed and d != correct_answer:
                        fixed.append(d)
                        if len([x for x in fixed if x != correct_answer]) >= 2:
                            break
            else:
                # Fallback genérico para outras matérias — SEM números aleatórios
                generic_fallbacks = [
                    "Nenhuma das anteriores",
                    "Todas as anteriores", 
                    "Não sei",
                    "Outra resposta"
                ]
                for fallback in generic_fallbacks:
                    if fallback not in fixed:
                        fixed.append(fallback)
                        break
        else:
            # Mantém opção válida gerada pelo LLM
            if opt not in fixed:
                fixed.append(opt)
    
    # Garante que a correta está em primeiro
    if correct_answer and correct_answer not in fixed:
        fixed = [correct_answer] + fixed
    elif correct_answer and fixed[0] != correct_answer:
        if correct_answer in fixed:
            fixed.remove(correct_answer)
        fixed = [correct_answer] + fixed
    
    # Se ainda faltam opções, gera distratores inteligentes baseados no contexto
    while len(fixed) < 3:
        if subject.lower() in ["matemática", "math", "matematica"] and correct_answer.isdigit():
            # Para matemática: gera distratores baseados na resposta correta
            num = int(correct_answer)
            candidate = str(num + len(fixed))  # evita duplicatas
            if candidate not in fixed:
                fixed.append(candidate)
            else:
                fixed.append(str(num - len(fixed)))
        else:
            # Para outras matérias: usa opções genéricas inteligentes
            smart_fallbacks = ["Outra opção", "Nenhuma das anteriores", "Todas as anteriores"]
            for fb in smart_fallbacks:
                if fb not in fixed:
                    fixed.append(fb)
                    break
    
    GENERIC_FALLBACKS = {"outra opção", "nenhuma das anteriores", "todas as anteriores", "outra resposta", "não sei"}
    real = [o for o in dict.fromkeys(fixed) if o.lower() not in GENERIC_FALLBACKS]
    return (real if len(real) >= 2 else list(dict.fromkeys(fixed)))[:3]


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
    current_structure = getattr(request, 'current_structure', None)

    # ── Selecciona prompt pela fase ────────────────────────────────────────────
    if phase == "EXPLAIN":
        print(f"🔍 DEBUG → session_id={request.session_id} | slot_number={request.slot_number}", flush=True)
        slot_number = getattr(request, 'slot_number', None)

        if request.session_id and slot_number:
            # Persiste sempre o slot actual — vem do frontend já incrementado
            set_slot(request.session_id, request.topic, slot_number)
        elif not current_structure and request.session_id:
            # Fallback: frontend não enviou slot → recupera o último guardado
            saved_slot = get_slot(request.session_id, request.topic)
            print(f"🔁 [slot_state] fallback → slot {saved_slot} (current_structure ausente)")

        current_structure = current_structure or "Tópico geral"
        
        system_text = PROMPT_EXPLAIN.format(
            subject=subject, 
            topic=topic,
            current_structure=current_structure,  # <-- ISTO É O SEGREDO
            context_rules=context_rules,          # <-- CONTÉM O LESSON_PLAN COMPLETO
            lang_block=_LANG_BLOCK,
            vocab_block=_VOCAB_BLOCK, 
            math_block=_MATH_BLOCK,
            padroes_abertura=_PADROES_ABERTURA,
            variacao_feedback=_VARIACAO_FEEDBACK,
            exemplo_bloqueio=_EXEMPLO_BLOQUEIO,
            correferencia=_CORREFERENCIA,
        )

    elif phase == "TEST":
 
        current_structure = current_structure or "Tópico geral"
        # 🆕 Resolver âncora aleatória se o tópico tiver âncoras
        ancora_data = None
        if request.ancoras:
            ancora_data = get_ancora(request.ancoras)  # get_ancora aceita lista → escolhe aleatório
 
        if ancora_data:
            # Âncora disponível → injeta no prompt de TEST
            if ancora_data["tipo"] == "visual":
                ancora_label       = "DESCRIÇÃO VISUAL (Cartaz ou Sinal)"
                ancora_label_lower = "cartaz ou sinal descrito"
            else:
                ancora_label       = "TEXTO DE SUPORTE"
                ancora_label_lower = "texto acima"
 
            system_text = PROMPT_TEST_COM_ANCORA.format( # ⬅️ MUDOU DE prompt PARA system_text
                student_class=request.student_class,
                subject=request.subject,
                topic=request.topic,
                context_rules=request.context_rules,
                ancora_label=ancora_label,
                ancora_label_lower=ancora_label_lower,
                ancora_conteudo=ancora_data["conteudo"],
                history=request.history,                 # ⬅️ MUDOU DE formatted_history PARA request.history
                user_query=request.user_query,
                current_structure=current_structure, 
            )
            print(f"⚓ [Tutor/TEST] Âncora '{request.ancoras}' → {ancora_data['tipo']}", flush=True)
 
        else:
            # Sem âncora → usa o prompt TEST original
            system_text = PROMPT_TEST.format(          
                student_class=request.student_class,
                subject=request.subject,
                topic=request.topic,
                context_rules=request.context_rules,
                history=request.history,                
                user_query=request.user_query,
                lang_block=_LANG_BLOCK,
                vocab_block=_VOCAB_BLOCK,
                math_block=_MATH_BLOCK,
                current_structure=current_structure,
            )
    elif phase == "FEEDBACK":
        # ── Assessment calculado deterministicamente ───────────────────────────
        # O Python compara a resposta do aluno com a correcta.
        # O modelo só gera o TEXTO — nunca decide o resultado.
        user_answer    = request.user_query or ""
        correct_answer = request.last_correct_answer or ""
        last_itype     = request.last_interaction_type or "CHIPS"

        if correct_answer and _norm(user_answer) == _norm(correct_answer):
            # ✅ Match exato — confirmado deterministicamente
            assessment_override = "CORRECT"
            system_text = PROMPT_FEEDBACK_CORRECT.format(
                subject=subject, topic=topic,
                lang_block=_LANG_BLOCK,
                vocab_block=_VOCAB_BLOCK,
                user_answer=user_answer,
                correct_answer=correct_answer,
                last_question=request.last_question or "",
            )
        elif correct_answer and is_semantically_correct(user_answer, correct_answer, last_itype):
            # ✅ Equivalência semântica (ex: "trezentos mil" == "300.000")
            assessment_override = "CORRECT"
            print(f"✅ [Semantic] Match aceite: '{user_answer}' ≈ '{correct_answer}'", flush=True)
            system_text = PROMPT_FEEDBACK_CORRECT.format(
                subject=subject, topic=topic,
                lang_block=_LANG_BLOCK,
                vocab_block=_VOCAB_BLOCK,
                user_answer=user_answer,
                correct_answer=correct_answer,
                last_question=request.last_question or "",
            )
        elif correct_answer:
            # ❌ Resposta errada — confirmado deterministicamente
            assessment_override = "INCORRECT"
            system_text = PROMPT_FEEDBACK_INCORRECT.format(
                subject=subject, topic=topic,
                lang_block=_LANG_BLOCK,vocab_block=_VOCAB_BLOCK, math_block=_MATH_BLOCK,
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
                lang_block=_LANG_BLOCK,vocab_block=_VOCAB_BLOCK, math_block=_MATH_BLOCK,
                user_answer=user_answer,
                correct_answer="INFERIR_DO_CONTEXTO_DO_ALUNO",
                last_question=request.last_question or "",
                last_interaction_type=last_itype,
            )
    else:
        # Fase desconhecida → fallback seguro para EXPLAIN
        phase = "EXPLAIN"
        current_structure = getattr(request, 'current_structure', None) or "Tópico geral"
        system_text = PROMPT_EXPLAIN.format(
            subject=subject, 
            topic=topic,
            current_structure=current_structure,
            context_rules=context_rules,
            lang_block=_LANG_BLOCK,
            vocab_block=_VOCAB_BLOCK, 
            math_block=_MATH_BLOCK,
            padroes_abertura=_PADROES_ABERTURA,
            variacao_feedback=_VARIACAO_FEEDBACK,
            exemplo_bloqueio=_EXEMPLO_BLOQUEIO,
            correferencia=_CORREFERENCIA,
        )

    # ── Chamada ao modelo ──────────────────────────────────────────────────────
    try:
        json_obj = await generate_tutor_response(
            system_prompt=system_text,
            user_query=request.user_query,
            history=request.history,
            phase=phase, 
        )
        # 👇 ADICIONA ESTAS DUAS LINHAS 👇
        if phase == "TEST" and 'ancora_data' in locals() and ancora_data:
            json_obj["ancora"] = ancora_data
        # 👆 FIM DA ADIÇÃO 👆
        # Assessment: sobrescreve SEMPRE com o valor calculado (nunca do modelo)
        if assessment_override is not None:
            json_obj["assessment"] = assessment_override
        else:
            # EXPLAIN e TEST nunca têm assessment
            json_obj["assessment"] = None
        
        if json_obj.get("interaction_data", {}).get("options"):
            opts = json_obj["interaction_data"]["options"]
            correct = json_obj.get("correct_answer", "")
            
            # Extrai número de contexto se for matemática (para distratores de posição)
            number_context = None
            if subject.lower() in ["matemática", "math", "matematica"]:
                history_text = " ".join(
                    msg.get("text", "") for msg in (request.history[-2:] if request.history else [])
                )
                all_text = (request.last_question or "") + " " + history_text
                nums = re.findall(r'\b\d{3,}(?:\.\d{3})*(?:,\d+)?\b', all_text)
                if nums:
                    number_context = nums[0]
            
            json_obj["interaction_data"]["options"] = _fix_placeholder_options(
                opts, correct, subject, number_context=number_context
            )

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