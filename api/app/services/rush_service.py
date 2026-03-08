import json
import re
import random
import asyncio
from typing import Any
from app.services.llm_client import get_rush_clients, get_rush_groq_clients
from app.models.schemas import RushRequest, RushResponse
from app.config import LANG_VARIANT
from openai import RateLimitError

# ─── PROMPT GERAL ────────────────────────────────────────────────────────────
PROMPT_RUSH_JSON = """
Você é um professor criativo de Moçambique, criando um quiz interativo para alunos da {student_class}ª classe (8 a 10 anos).
O seu objetivo é gerar APENAS UMA pergunta de escolha múltipla perfeita em formato JSON puro.

Disciplina: {subject}
Tópico Específico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 5)

🎯 TIPO DE PERGUNTA OBRIGATÓRIO: "{forced_structure}"
Você TEM de fazer uma pergunta deste tipo exato. Não escolhas. Não decides. Só executa este tipo.

REGRAS DE OURO (OBRIGATÓRIAS):
1. CONTEXTO: Crie histórias curtas com contexto moçambicano (nomes locais, Meticais, machamba).
2. REGRAS DO TÓPICO: Siga rigorosamente estas restrições curriculares:
{context_rules}
3. DISTRATORES: Gere exatamente 4 "options" ÚNICAS.
4. RESPOSTA CORRETA: A "correct_answer" DEVE ser uma cópia exata de uma das opções.
5. SEM MARKDOWN: Não use ```json.

LINGUAGEM (OBRIGATÓRIO):
- Fale como uma criança fala! Frases curtas e simples.
- PROIBIDO usar: "algarismo", "valor posicional", "centenas de milhar", "ordem numérica", "classe decimal".
- Substitua por: "Quanto vale o 4 no número...?", "Quem está na casa dos milhares?".

HISTÓRICO RECENTE (PROIBIDO REPETIR QUALQUER PERGUNTA DESTE GÉNERO):
{exclude_list}

FORMATO ESPERADO:
{{
  "_logic": "O tipo obrigatório é '{forced_structure}'. Vou criar uma pergunta desse tipo diferente do histórico.",
  "topico": "{subtopic}",
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correct_answer": "...",
  "explanation": "..."
}}

Gere agora O SEU objeto JSON válido:
"""

# ─── PROMPT POSICIONAL (modelo só cria o contexto, não calcula nada) ──────────
# Pergunta tipo A: "Quanto vale o X em N?"
PROMPT_POSICIONAL_VALOR = """
Você é um professor criativo de Moçambique. O seu único trabalho é criar UMA frase de contexto moçambicano para esta pergunta já calculada.

DADOS JÁ CALCULADOS — NÃO ALTERES NENHUM VALOR:
- Número: {number_fmt}
- Dígito em destaque: {digit}
- Valor correto: {correct_value}
- Opções (já incluem a correta): {options_json}

CONTEXTO JÁ ESCOLHIDO (usa exatamente esta frase, não inventes outra):
{narrative}

INSTRUÇÕES:
1. Usa o contexto acima — NÃO inventes outro.
2. A pergunta deve ser: "{narrative} Quanto vale o {digit} no número {number_fmt}?"
3. NÃO calcules nada. Usa EXATAMENTE os valores acima.
4. SEM MARKDOWN. Só JSON puro.

FORMATO OBRIGATÓRIO:
{{
  "topico": "{subtopic}",
  "question": "{narrative} Quanto vale o {digit} no número {number_fmt}?",
  "options": {options_json},
  "correct_answer": "{correct_value}",
  "explanation": "O {digit} está na casa dos {house_name}, por isso vale {correct_value}."
}}
"""

# Pergunta tipo B: "Qual dígito está na casa das [X]?"
PROMPT_POSICIONAL_CASA = """
Você é um professor criativo de Moçambique. O seu único trabalho é criar UMA frase de contexto moçambicano para esta pergunta já calculada.

DADOS JÁ CALCULADOS — NÃO ALTERES NENHUM VALOR:
- Número: {number_fmt}
- Casa em destaque: {house_name}
- Dígito correto nessa casa: {digit}
- Opções (já incluem o correto): {options_json}

CONTEXTO JÁ ESCOLHIDO (usa exatamente esta frase, não inventes outra):
{narrative}

INSTRUÇÕES:
1. Usa o contexto acima — NÃO inventes outro.
2. A pergunta deve ser: "{narrative} Qual é o dígito que está na casa das {house_name} no número {number_fmt}?"
3. NÃO calcules nada. Usa EXATAMENTE os valores acima.
4. SEM MARKDOWN. Só JSON puro.

FORMATO OBRIGATÓRIO:
{{
  "topico": "{subtopic}",
  "question": "{narrative} Qual é o dígito que está na casa das {house_name} no número {number_fmt}?",
  "options": {options_json},
  "correct_answer": "{digit}",
  "explanation": "No número {number_fmt}, o dígito {digit} está na casa das {house_name}."
}}
"""

PROMPT_POSICIONAL = """"""

PROMPT_POSICIONAL_DECOMP = """
Você é um professor criativo de Moçambique. O seu único trabalho é criar UMA frase de contexto moçambicano para esta pergunta já calculada.

DADOS JÁ CALCULADOS — NÃO ALTERES NENHUM VALOR:
- Número: {number_fmt}
- Decomposição correta: {correct_answer}
- Opções (já incluem a correta): {options_json}

CONTEXTO JÁ ESCOLHIDO (usa exatamente esta frase, não inventes outra):
{narrative}

INSTRUÇÕES:
1. Usa o contexto acima — NÃO inventes outro.
2. A pergunta deve ser: "{narrative} Como se decompõe o número {number_fmt}?"
3. NÃO calcules nada. Usa EXATAMENTE os valores acima.
4. SEM MARKDOWN. Só JSON puro.

FORMATO OBRIGATÓRIO:
{{
  "topico": "{subtopic}",
  "question": "{narrative} Como se decompõe o número {number_fmt}?",
  "options": {options_json},
  "correct_answer": "{correct_answer}",
  "explanation": "O número {number_fmt} decompõe-se assim: {correct_answer}."
}}
"""



current_rush_client_index = 0

# Contextos narrativos moçambicanos — sorteados pelo código para forçar variedade
NARRATIVES = [
    ("A {nome} tem {number_fmt} meticais na poupança.", ["Ana", "Fátima", "Rosa", "Lurdes", "Beatriz"]),
    ("O {nome} colheu {number_fmt} espigas de milho na machamba.", ["Américo", "Feliciano", "Armando", "Custódio", "Hélder"]),
    ("A escola de {nome} tem {number_fmt} livros na biblioteca.", ["Maputo", "Beira", "Nampula", "Quelimane", "Tete"]),
    ("O {nome} vendeu {number_fmt} meticais de peixe no mercado.", ["João", "Carlos", "Tomás", "Rui", "Sérgio"]),
    ("A {nome} recebeu {number_fmt} meticais de salário este mês.", ["Olívia", "Conceição", "Graça", "Esperança", "Vitória"]),
    ("O hospital de {nome} atendeu {number_fmt} doentes este ano.", ["Maputo", "Chimoio", "Lichinga", "Inhambane", "Pemba"]),
    ("A machamba do {nome} produziu {number_fmt} quilos de amendoim.", ["Zacarias", "Domingos", "Alfredo", "Ernesto", "Virgílio"]),
    ("O autocarro da rota de {nome} percorreu {number_fmt} quilómetros.", ["Maputo", "Beira", "Nacala", "Xai-Xai", "Mocuba"]),
    ("O {nome} guardou {number_fmt} meticais no banco.", ["pai do Ali", "tio da Maria", "avô do João", "irmão da Rute", "vizinho do Pedro"]),
    ("A cooperativa de {nome} vendeu {number_fmt} sacos de arroz.", ["Zambezia", "Sofala", "Gaza", "Manica", "Cabo Delgado"]),
]

def _pick_narrative(number_fmt: str) -> str:
    """Sorteia um contexto narrativo e substitui os placeholders."""
    template, names = random.choice(NARRATIVES)
    name = random.choice(names)
    return template.format(nome=name, number_fmt=number_fmt)

FALLBACK_STRUCTURES = {
    "número":        ["Escrita por extenso", "Valor de um dígito", "Identificar a casa do dígito", "Ordenar do menor para o maior", "Decompor o número em classes"],
    "fração":        ["Identificar a fração representada", "Comparar frações", "Soma de frações com mesmo denominador"],
    "decimal":       ["Identificar parte decimal", "Comparar decimais", "Escrever decimal por extenso"],
    "adição":        ["Problema de história com soma", "Calcular resultado de adição", "Completar a operação"],
    "subtração":     ["Problema de história com subtração", "Calcular resultado de subtração", "Completar a operação"],
    "multiplicação": ["Problema de história com multiplicação", "Calcular resultado de tabuada", "Multiplicar por 10 ou 100"],
    "divisão":       ["Problema de distribuição equitativa", "Calcular quociente e resto", "Divisão exata"],
    "geometria":     ["Identificar a figura geométrica", "Contar lados e vértices", "Classificar o ângulo"],
    "verbo":         ["Conjugar o verbo no tempo correto", "Identificar o verbo na frase", "Transformar para negativa"],
    "sinónimo":      ["Encontrar o sinónimo", "Encontrar o antónimo", "Substituir a palavra no contexto"],
    "frase":         ["Transformar para interrogativa", "Transformar para negativa", "Identificar o tipo de frase"],
    "medida":        ["Escolher a unidade correta", "Comparar medidas", "Ler as horas no relógio"],
}

# Nomes das casas posicionais para números até 1 milhão
PLACE_VALUES = [
    (100_000_0, "milhões"),
    (100_000,   "centenas de milhar"),
    (10_000,    "dezenas de milhar"),
    (1_000,     "unidades de milhar"),
    (100,       "centenas"),
    (10,        "dezenas"),
    (1,         "unidades"),
]


# ─── VALOR POSICIONAL CALCULADO PELO CÓDIGO ──────────────────────────────────

def _is_positional_structure(structure: str) -> bool:
    keywords = [
        "valor posicional", "identificar a casa", "decomposição",
        "milhar", "centena", "dezena", "unidade de milhar"
    ]
    s = structure.lower()
    return any(k in s for k in keywords)


def _build_positional_question(subtopic: str, difficulty: int) -> dict:
    """
    Gera dados para pergunta de valor posicional.
    Sorteia entre dois tipos:
      "valor" → Quanto vale o X em N?
      "casa"  → Qual dígito está na casa das X em N?
    Garante dígito único no número (sem ambiguidade).
    """
    number = random.randint(
        10_000 if difficulty <= 2 else 100_000,
        99_999 if difficulty <= 2 else 999_999
    )
    for _ in range(50):
        digits_str = str(number)
        unique_positions = [
            (i, d) for i, d in enumerate(digits_str)
            if d != "0" and digits_str.count(d) == 1
        ]
        if unique_positions:
            break
        number = random.randint(
            10_000 if difficulty <= 2 else 100_000,
            99_999 if difficulty <= 2 else 999_999
        )
    else:
        unique_positions = [(i, d) for i, d in enumerate(digits_str) if d != "0"]

    number_fmt = f"{number:,}".replace(",", ".")
    pos_idx, digit_char = random.choice(unique_positions)
    digit = int(digit_char)
    digits_str = str(number)
    power = 10 ** (len(digits_str) - 1 - pos_idx)
    correct_value = digit * power

    house_name = "unidades"
    for threshold, name in PLACE_VALUES:
        if power >= threshold:
            house_name = name
            break

    def fmt(n):
        return f"{n:,}".replace(",", ".")

    # Opções para tipo "valor": outras casas do mesmo dígito
    wrong_powers = [p for p, _ in PLACE_VALUES if p != power and p <= 1_000_000]
    random.shuffle(wrong_powers)
    wrong_vals, seen = [], {correct_value}
    for wp in wrong_powers:
        v = digit * wp
        if v not in seen and v > 0:
            wrong_vals.append(v)
            seen.add(v)
        if len(wrong_vals) == 3:
            break
    options_valor = [fmt(correct_value)] + [fmt(w) for w in wrong_vals]
    random.shuffle(options_valor)

    # Opções para tipo "casa": outros dígitos do número
    other_digits = list({int(d) for d in digits_str if d != "0" and int(d) != digit})
    random.shuffle(other_digits)
    wrong_digits = [str(d) for d in other_digits[:3]]
    while len(wrong_digits) < 3:
        c = str(random.randint(1, 9))
        if c != str(digit) and c not in wrong_digits:
            wrong_digits.append(c)
    options_casa = [str(digit)] + wrong_digits
    random.shuffle(options_casa)

    q_type = random.choice(["valor", "casa"])
    options = options_valor if q_type == "valor" else options_casa
    correct_answer = fmt(correct_value) if q_type == "valor" else str(digit)

    return {
        "type": q_type,
        "number_fmt": number_fmt,
        "digit": digit,
        "correct_value": fmt(correct_value),
        "correct_answer": correct_answer,
        "house_name": house_name,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
    }


def _build_decomposition_question(difficulty: int) -> dict:
    """
    Gera pergunta de decomposição: dado N, qual a decomposição correta?
    Ex: 345.678 = 300.000 + 40.000 + 5.000 + 600 + 70 + 8
    O código gera o número e calcula a decomposição — o modelo só cria o contexto.
    """
    number = random.randint(
        10_000 if difficulty <= 2 else 100_000,
        99_999 if difficulty <= 2 else 999_999
    )
    digits_str = str(number)
    n = len(digits_str)

    # Decomposição correcta
    parts = []
    for i, d in enumerate(digits_str):
        if d != "0":
            val = int(d) * (10 ** (n - 1 - i))
            parts.append(f"{val:,}".replace(",", "."))
    correct_decomp = " + ".join(parts)

    # 3 decomposições erradas: troca dois dígitos
    def make_wrong():
        lst = list(digits_str)
        i, j = random.sample(range(n), 2)
        lst[i], lst[j] = lst[j], lst[i]
        wrong_num = int("".join(lst))
        wp = [int(c) * (10 ** (n - 1 - k)) for k, c in enumerate(lst) if c != "0"]
        return " + ".join(f"{v:,}".replace(",", ".") for v in wp), wrong_num

    wrong_options = set()
    attempts = 0
    while len(wrong_options) < 3 and attempts < 30:
        w, _ = make_wrong()
        if w != correct_decomp:
            wrong_options.add(w)
        attempts += 1

    options = [correct_decomp] + list(wrong_options)[:3]
    random.shuffle(options)
    number_fmt = f"{number:,}".replace(",", ".")

    return {
        "type": "decomposição",
        "number_fmt": number_fmt,
        "correct_answer": correct_decomp,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
    }


# ─── ESTRUTURA FORÇADA ────────────────────────────────────────────────────────

def _pick_forced_structure(subtopic: str, context_rules: str, recent_questions: list[str]) -> str:
    structures = []
    in_permitido = False
    for line in context_rules.splitlines():
        line = line.strip()
        if "PERMITIDO" in line.upper():
            in_permitido = True
            continue
        if "PROIBIDO" in line.upper():
            in_permitido = False
            continue
        if in_permitido and line.startswith("-"):
            s = line.lstrip("- ").strip()
            if s:
                structures.append(s)

    if not structures:
        sub = subtopic.lower()
        for key, vals in FALLBACK_STRUCTURES.items():
            if key in sub:
                structures = vals
                break
        if not structures:
            structures = ["Escrita por extenso", "Valor de um dígito", "Comparação e ordenação", "Identificar a casa do dígito", "Decompor o número"]

    last_3 = recent_questions[-3:] if recent_questions else []
    history_text = " ".join(last_3).lower()

    def _was_recently_used(structure: str) -> bool:
        keywords = [w for w in structure.lower().split() if len(w) > 4]
        return any(kw in history_text for kw in keywords)

    unused = [s for s in structures if not _was_recently_used(s)]
    pool = unused if unused else structures

    # Mapeia estruturas vagas do livro para subtipos concretos que o código sabe executar
    VAGUE_MAP = {
        "leitura e compreensão": ["Escrita por extenso", "Decomposição do número em classes"],
        "identificação de classes": ["Valor posicional", "Identificar a casa do dígito"],
        "identificação de ordens": ["Valor posicional", "Identificar a casa do dígito"],
    }
    expanded = []
    for s in pool:
        replaced = False
        for vague_key, concretes in VAGUE_MAP.items():
            if vague_key in s.lower():
                expanded.extend(concretes)
                replaced = True
                break
        if not replaced:
            expanded.append(s)

    # Remove duplicados mantendo ordem
    seen_pool = set()
    pool = [s for s in expanded if not (s in seen_pool or seen_pool.add(s))]

    chosen = random.choice(pool)
    print(f"🎯 [ForcedStructure] Escolhida: '{chosen}' | Pool: {pool}", flush=True)
    return chosen


# ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

def safe_load_json_object(text: str) -> Any | None:
    if not text:
        return None
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\r\n', '\n')
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


def _is_math_strict_topic(subtopic: str) -> bool:
    math_keywords = [
        "adição", "subtração", "soma", "multiplicação", "divisão", "expressões", "cálculo", "operações",
        "número", "números", "milhão", "milhões", "milhares", "fração", "frações", "decimal", "decimais"
    ]
    return any(k in subtopic.lower() for k in math_keywords)


def _detect_question_type(question: str) -> str:
    q = question.lower()
    if re.search(r'\d+\s*[+\-x×÷]\s*\d+', q):
        return "explicit_arithmetic"
    if re.search(r'\d+', q) and any(w in q for w in ["comprou", "vendeu", "tem", "gastou", "recebeu", "restam"]):
        return "word_problem"
    if any(w in q for w in ["triângulo", "quadrado", "ângulo", "círculo", "reta"]):
        return "geometry"
    return "conceptual"


def _generate_smart_distractors(correct_value: int):
    distractors = set()
    swapped = int(str(correct_value)[::-1])
    if swapped != correct_value:
        distractors.add(swapped)
    if correct_value > 10:
        distractors.add(correct_value // 10)
    distractors.add(correct_value + 10)
    distractors.add(correct_value - 10)
    distractors = [d for d in distractors if d > 0]
    random.shuffle(distractors)
    return distractors[:3]


def _is_duplicate(new_question: str, recent_questions: list[str]) -> bool:
    def normalize(text: str) -> str:
        return re.sub(r'[\d\.,]+', 'N', text.lower().strip())

    new_norm = normalize(new_question)
    new_start = " ".join(new_question.lower().split()[:8])

    for prev in recent_questions:
        prev_norm = normalize(prev)
        prev_start = " ".join(prev.lower().split()[:8])
        if new_start == prev_start:
            print(f"🔁 [DuplicateCheck] Início idêntico: '{prev[:70]}'", flush=True)
            return True
        if new_norm[:80] == prev_norm[:80]:
            print(f"🔁 [DuplicateCheck] Template idêntico: '{prev[:70]}'", flush=True)
            return True
    return False


def _sanitize_rush_payload(raw_obj: dict, subject: str, subtopic: str) -> dict:
    if not isinstance(raw_obj, dict):
        raise ValueError("Payload inválido")

    question = str(raw_obj.get("question", "")).strip()
    explanation = str(raw_obj.get("explanation", "")).strip()
    raw_correct = str(raw_obj.get("correct_answer", "")).strip()

    if len(question.split()) < 6 and not _is_math_strict_topic(subtopic):
        raise ValueError("Pergunta demasiado simples (< 6 palavras)")

    if subject == "matematica" and not _is_math_strict_topic(subtopic):
        if re.search(r'\d+\s*[+\-x×÷]\s*\d+', question) or " vezes " in question.lower() or " a multiplicar " in question.lower():
            raise ValueError("Operações não permitidas neste tópico conceitual")

    raw_options = raw_obj.get("options", [])
    if not isinstance(raw_options, list):
        raise ValueError("Opções inválidas")

    options = list(dict.fromkeys([
        str(opt).strip().strip('"').strip("'").strip(".")
        for opt in raw_options if str(opt).strip()
    ]))

    if len(options) < 3:
        raise ValueError("Menos de 3 opções únicas")

    clean_correct = raw_correct.strip('"').strip("'").strip(".")
    if clean_correct not in options:
        raise ValueError("Resposta correta não corresponde às opções")

    q_type = _detect_question_type(question)
    if subject == "matematica" and q_type == "explicit_arithmetic":
        try:
            correct_number = int(re.findall(r'\d+', clean_correct)[0])
            smart_distractors = _generate_smart_distractors(correct_number)
            options = [str(correct_number)] + [str(d) for d in smart_distractors]
            random.shuffle(options)
            clean_correct = str(correct_number)
        except (IndexError, ValueError):
            pass

    if not question or not explanation:
        raise ValueError("Pergunta ou explicação vazia")

    return {
        "question": question,
        "options": options,
        "correct_answer": clean_correct,
        "explanation": explanation
    }


# ─── LÓGICA PRINCIPAL ─────────────────────────────────────────────────────────

async def generate_rush_question_logic(request: RushRequest) -> RushResponse:

    print(f"\n🚀 [RushService] Chamado! A iniciar processo... \n {request}", flush=True)

    global current_rush_client_index

    clients = get_rush_groq_clients()
    if not clients:
        raise Exception("Nenhum cliente Groq configurado.")

    subject = request.subject.lower()
    if subject not in ("matematica", "portugues"):
        subject = "matematica"

    subtopic = request.subtopic if request.subtopic else "Geral"
    last_3 = request.recent_questions[-3:] if request.recent_questions else []
    exclude_list = "\n- ".join(last_3) if last_3 else "Nenhuma pergunta anterior."

    is_math_operation = _is_math_strict_topic(subtopic)
    dynamic_temperature = 0.4 if is_math_operation else 0.85

    FREE_MODELS = [
        "llama-3.3-70b-versatile",
        "qwen/qwen3-vl-235b-a22b-thinking",
        "arcee-ai/trinity-large-preview:free",
    ]

    for tentativa in range(5):
        forced_structure = _pick_forced_structure(
            subtopic, request.context_rules, request.recent_questions
        )

        # ── CAMINHO ESPECIAL: matemática calculada pelo código ──────────────
        is_decomp = "decomposição" in forced_structure.lower() or "decomp" in forced_structure.lower()
        is_positional = _is_positional_structure(forced_structure)

        if is_decomp:
            decomp = _build_decomposition_question(request.difficulty_level)
            narrative = _pick_narrative(decomp["number_fmt"])
            prompt = PROMPT_POSICIONAL_DECOMP.format(
                student_class=request.student_class,
                subtopic=subtopic,
                number_fmt=decomp["number_fmt"],
                correct_answer=decomp["correct_answer"],
                options_json=decomp["options_json"],
                narrative=narrative,
            )
            math_data = decomp
            print(f"🔢 [Decomposição] Número: {decomp['number_fmt']} | Narrativa: {narrative}", flush=True)
        elif is_positional:
            positional = _build_positional_question(subtopic, request.difficulty_level)
            q_type = positional["type"]
            narrative = _pick_narrative(positional["number_fmt"])
            if q_type == "valor":
                prompt = PROMPT_POSICIONAL_VALOR.format(
                    student_class=request.student_class,
                    subtopic=subtopic,
                    number_fmt=positional["number_fmt"],
                    digit=positional["digit"],
                    correct_value=positional["correct_value"],
                    house_name=positional["house_name"],
                    options_json=positional["options_json"],
                    narrative=narrative,
                )
            else:
                prompt = PROMPT_POSICIONAL_CASA.format(
                    student_class=request.student_class,
                    subtopic=subtopic,
                    number_fmt=positional["number_fmt"],
                    digit=positional["digit"],
                    house_name=positional["house_name"],
                    options_json=positional["options_json"],
                    narrative=narrative,
                )
            math_data = positional
            print(f"🔢 [Posicional/{q_type}] Número: {positional['number_fmt']} | Narrativa: {narrative}", flush=True)
        else:
            prompt = PROMPT_RUSH_JSON.format(
                student_class=request.student_class,
                subject=subject,
                subtopic=subtopic,
                exclude_list=exclude_list,
                difficulty_level=request.difficulty_level,
                context_rules=request.context_rules,
                forced_structure=forced_structure,
            )

        client = clients[current_rush_client_index]
        used_index = current_rush_client_index
        current_rush_client_index = (current_rush_client_index + 1) % len(clients)
        chosen_model = FREE_MODELS[tentativa % len(FREE_MODELS)]

        try:
            print(f"🔄 Rush: Chave #{used_index + 1} | Modelo: {chosen_model} | Estrutura: '{forced_structure}'...")

            completion = client.chat.completions.create(
                model=chosen_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=dynamic_temperature,
                top_p=0.9,
                frequency_penalty=0.8,
                presence_penalty=0.6,
                max_tokens=400,
                response_format={"type": "json_object"}
            )

            raw = completion.choices[0].message.content
            print(f"👀 RAW DA IA ({chosen_model}): {raw}", flush=True)

            obj = safe_load_json_object(raw)
            if not obj:
                raise ValueError("JSON inválido gerado pela IA.")

            # Sobrescreve sempre com os valores calculados pelo código
            if is_decomp or is_positional:
                obj["correct_answer"] = math_data["correct_answer"]
                obj["options"] = math_data["options"]

            clean_data = _sanitize_rush_payload(obj, subject, subtopic)

            if _is_duplicate(clean_data["question"], request.recent_questions):
                raise ValueError("Pergunta duplicada. A tentar novamente...")

            print(f"✅ SUCESSO com o modelo: {chosen_model}")
            return RushResponse(**clean_data)

        except RateLimitError:
            print(f"⚠️ Rate limit no modelo {chosen_model}. A rodar...")
            await asyncio.sleep(1)
            continue

        except Exception as e:
            print(f"⚠️ Erro no modelo {chosen_model}: {e}")
            await asyncio.sleep(1)
            continue

    return RushResponse(
        question="Ocorreu uma pequena falha técnica. Qual é a capital de Moçambique?",
        options=["Beira", "Maputo", "Nampula", "Tete"],
        correct_answer="Maputo",
        explanation="O servidor precisou de um descanso, mas seguimos em frente!"
    )