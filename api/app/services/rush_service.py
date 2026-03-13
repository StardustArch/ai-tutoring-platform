import json
import re
import random
import asyncio
from typing import Any
from app.services.llm_client import get_rush_clients, get_rush_groq_clients
from app.models.schemas import RushRequest, RushResponse
from app.config import LANG_VARIANT
from openai import RateLimitError
from app.utils.textos_ancora import get_ancora

# ─── PROMPT GERAL ────────────────────────────────────────────────────────────
PROMPT_RUSH_JSON = """
Você é um professor criativo de Moçambique, criando um quiz interativo para alunos da {student_class}ª classe (8 a 10 anos).
O seu objetivo é gerar APENAS UMA pergunta de escolha múltipla perfeita em formato JSON puro.

Disciplina: {subject}
Tópico Específico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 4)

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

# ─── PROMPTS POSICIONAIS ──────────────────────────────────────────────────────
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

# ─── PROMPT TRUE/FALSE ────────────────────────────────────────────────────────
PROMPT_TRUE_FALSE = """
Você é um professor criativo de Moçambique, criando um quiz interativo para alunos da {student_class}ª classe.
O seu objetivo é gerar UMA pergunta do tipo Verdadeiro ou Falso.

Disciplina: {subject}
Tópico Específico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 4)

🎯 TIPO OBRIGATÓRIO: "{forced_structure}"

REGRAS DE OURO:
1. Crie uma afirmação direta que o aluno deve avaliar. Contextualize com a realidade moçambicana (nomes, meticais, machamba).
2. Siga rigorosamente estas restrições curriculares:
{context_rules}
3. A "correct_answer" DEVE ser exatamente "Verdadeiro" ou "Falso".
4. As "options" DEVEM ser EXATAMENTE ["Verdadeiro", "Falso"].
5. Não repita perguntas passadas: {exclude_list}

FORMATO OBRIGATÓRIO (JSON PURO):
{{
  "type": "true_false",
  "question": "O número 540.000 tem 5 dezenas de milhar.",
  "options": ["Verdadeiro", "Falso"],
  "correct_answer": "Verdadeiro",
  "explanation": "Explicação clara do porquê."
}}
"""

# ─── PROMPT CLOZE ─────────────────────────────────────────────────────────────
PROMPT_CLOZE = """
Você é um professor criativo de Moçambique, criando um quiz interativo para alunos da {student_class}ª classe.
O seu objetivo é gerar UMA pergunta de "Completar a Lacuna".

Disciplina: {subject}
Tópico Específico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 4)

🎯 TIPO OBRIGATÓRIO: "{forced_structure}"

REGRAS DE OURO:
1. A "question" DEVE conter uma lacuna representada por três sublinhados: "___". Contextualize com Moçambique.
2. Siga rigorosamente estas restrições curriculares:
{context_rules}
3. Gere exatamente 4 "options" únicas. Uma delas é a resposta que encaixa perfeitamente na lacuna.
4. A "correct_answer" DEVE ser a opção correta.
5. Não repita perguntas passadas: {exclude_list}

FORMATO OBRIGATÓRIO (JSON PURO):
{{
  "type": "cloze",
  "question": "O número que vem imediatamente depois de 999.999 é o ___.",
  "options": ["1.000.000", "99.000", "10.000", "1.000.001"],
  "correct_answer": "1.000.000",
  "explanation": "Explicação clara."
}}
"""

PROMPT_ANCORA = """
Você é um professor criativo de Moçambique, criando um quiz para alunos da {student_class}ª classe.
O seu objetivo é gerar APENAS UMA pergunta de escolha múltipla em formato JSON puro.
 
Disciplina: {subject}
Tópico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 4)
Tipo de pergunta obrigatório: "{forced_structure}"
 
══════════════════════════════════════════════
{ancora_label}:
"{ancora_conteudo}"
══════════════════════════════════════════════
 
REGRAS OBRIGATÓRIAS:
1. A tua pergunta DEVE ser exclusivamente sobre o {ancora_label_lower} acima.
2. NÃO inventes outro texto, cartaz ou sinal — usa APENAS o que está acima.
3. Respeita o currículo: {context_rules}
4. Gera exactamente 4 opções únicas.
5. A "correct_answer" DEVE ser uma cópia exacta de uma das opções.
6. Linguagem simples para crianças de 8-10 anos.
7. Contexto moçambicano (nomes: Ali, Fátima, Sónia, Hélio).
8. SEM MARKDOWN. Só JSON puro.
 
HISTÓRICO RECENTE (NÃO REPETIR):
{exclude_list}
 
FORMATO OBRIGATÓRIO:
{{
  "_logic": "Vou fazer uma pergunta do tipo '{forced_structure}' sobre o {ancora_label_lower} fornecido.",
  "topico": "{subtopic}",
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correct_answer": "...",
  "explanation": "..."
}}
 
Gera agora o JSON:
"""

current_rush_client_index = 0

# ─── NARRATIVAS ──────────────────────────────────────────────────────────────
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

NARRATIVES_SIMPLE = [
    ("O professor da {nome} diz:", ["Ana", "João", "Ali", "Maria", "Pedro"]),
    ("No livro da escola de {nome} está escrito:", ["Maputo", "Beira", "Nampula"]),
    ("A {nome} leu na sua aula de hoje:", ["Fátima", "Rosa", "Lurdes"]),
    ("O {nome} aprendeu hoje na escola:", ["Américo", "Carlos", "Domingos"]),
    ("Na aula de {nome}:", ["Chimoio", "Quelimane", "Tete"]),
]

def _pick_narrative(number_fmt: str) -> str:
    template, names = random.choice(NARRATIVES)
    name = random.choice(names)
    return template.format(nome=name, number_fmt=number_fmt)

def _pick_narrative_simple() -> str:
    template, names = random.choice(NARRATIVES_SIMPLE)
    name = random.choice(names)
    return template.format(nome=name)

FALLBACK_STRUCTURES = {
    "número":        ["Escrita por extenso", "Valor de um dígito", "Identificar a casa do dígito",
                      "Ordenar do menor para o maior", "Decompor o número em classes",
                      "Verdadeiro ou Falso sobre o número"],
    "fração":        ["Identificar a fração representada", "Comparar frações",
                      "Soma de frações com mesmo denominador", "Verdadeiro ou Falso sobre frações"],
    "decimal":       ["Identificar parte decimal", "Comparar decimais", "Escrever decimal por extenso"],
    "adição":        ["Problema de história com soma", "Calcular resultado de adição",
                      "Completar a lacuna na adição"],
    "subtração":     ["Problema de história com subtração", "Calcular resultado de subtração",
                      "Completar a lacuna na subtração"],
    "multiplicação": ["Problema de história com multiplicação", "Calcular resultado de tabuada",
                      "Multiplicar por 10 ou 100", "Completar a lacuna na multiplicação"],
    "divisão":       ["Problema de distribuição equitativa", "Calcular quociente e resto",
                      "Divisão exata", "Verdadeiro ou Falso sobre divisão"],
    "geometria":     ["Identificar a figura geométrica", "Contar lados e vértices",
                      "Classificar o ângulo", "Verdadeiro ou Falso sobre figuras"],
    "verbo":         ["Conjugar o verbo no tempo correto", "Identificar o verbo na frase",
                      "Transformar para negativa", "Completar a lacuna com o verbo correto"],
    "sinónimo":      ["Encontrar o sinónimo", "Encontrar o antónimo",
                      "Substituir a palavra no contexto", "Completar a lacuna com a palavra correta"],
    "frase":         ["Transformar para interrogativa", "Transformar para negativa",
                      "Identificar o tipo de frase", "Completar a lacuna na frase",
                      "Verdadeiro ou Falso sobre a frase"],
    "medida":        ["Escolher a unidade correta", "Comparar medidas",
                      "Ler as horas no relógio", "Verdadeiro ou Falso sobre medidas"],
}

PLACE_VALUES = [
    (100_000_0, "milhões"),
    (100_000,   "centenas de milhar"),
    (10_000,    "dezenas de milhar"),
    (1_000,     "unidades de milhar"),
    (100,       "centenas"),
    (10,        "dezenas"),
    (1,         "unidades"),
]


# ─── DETECTORES ──────────────────────────────────────────────────────────────

def _is_positional_structure(structure: str) -> bool:
    keywords = ["valor posicional", "identificar a casa", "decomposição",
                "milhar", "centena", "dezena", "unidade de milhar"]
    return any(k in structure.lower() for k in keywords)

def _is_true_false_structure(structure: str) -> bool:
    keywords = ["verdadeiro ou falso", "verdadeiro/falso", "true/false", "v ou f", "v/f"]
    return any(k in structure.lower() for k in keywords)

def _is_cloze_structure(structure: str) -> bool:
    keywords = ["completar a lacuna", "completar a frase", "preencher a lacuna",
                "completar com", "lacuna", "cloze", "completar o espaço"]
    return any(k in structure.lower() for k in keywords)


# ─── CONSTRUTOR TRUE/FALSE ────────────────────────────────────────────────────



# ─── CONSTRUTOR CLOZE ────────────────────────────────────────────────────────


# ─── CONSTRUTOR POSICIONAL ───────────────────────────────────────────────────

def _build_positional_question(subtopic: str, difficulty: int) -> dict:
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
    number = random.randint(
        10_000 if difficulty <= 2 else 100_000,
        99_999 if difficulty <= 2 else 999_999
    )
    digits_str = str(number)
    n = len(digits_str)

    parts = []
    for i, d in enumerate(digits_str):
        if d != "0":
            val = int(d) * (10 ** (n - 1 - i))
            parts.append(f"{val:,}".replace(",", "."))
    correct_decomp = " + ".join(parts)

    def make_wrong():
        lst = list(digits_str)
        i, j = random.sample(range(n), 2)
        lst[i], lst[j] = lst[j], lst[i]
        wp = [int(c) * (10 ** (n - 1 - k)) for k, c in enumerate(lst) if c != "0"]
        return " + ".join(f"{v:,}".replace(",", ".") for v in wp)

    wrong_options = set()
    attempts = 0
    while len(wrong_options) < 3 and attempts < 30:
        w = make_wrong()
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


# ─── _pick_forced_structure ───────────────────────────────────────────────────
#
# PROBLEMA ANTERIOR: _was_recently_used comparava palavras das PERGUNTAS com
# as ESTRUTURAS → eliminava quase tudo porque as perguntas contêm palavras
# como "número", "valor", "maior" que batem nas estruturas. Resultado: só
# sobrava multiple_choice.
#
# SOLUÇÃO: separar completamente a lógica de "variedade de tipos" da lógica
# de "evitar perguntas repetidas". A variedade é garantida por um roulette
# com pesos que olha para os TIPOS das últimas perguntas (not o texto).
#
# PESOS:
#   - multiple_choice : peso base 5
#   - true_false      : peso base 3  (mas aumenta +4 se a última foi MC)
#   - cloze           : peso base 3  (mas aumenta +4 se as últimas 2 foram MC)
#
# Efeito prático: a cada 10 perguntas teremos ~3 TF e ~2 Cloze garantidos,
# sem nunca bloquear por causa do texto das perguntas.

def _classify_recent_types(recent_questions: list[str]) -> list[str]:
    """
    Infere os tipos das últimas perguntas pelo seu texto, já que o
    RushRequest só passa os textos e não os tipos.
    """
    types = []
    for q in recent_questions[-5:]:
        ql = q.lower()
        if "verdadeiro" in ql or "falso" in ql or "v ou f" in ql:
            types.append("true_false")
        elif "___" in ql or "completa" in ql or "lacuna" in ql:
            types.append("cloze")
        else:
            types.append("multiple_choice")
    return types


def _pick_forced_structure(subtopic: str, context_rules: str, recent_questions: list[str]) -> str:

    # ── 1. Colecta as estruturas disponíveis ──────────────────────────────────
    structures_mc   = []   # estruturas que geram multiple_choice
    structures_tf   = []   # estruturas que geram true_false
    structures_cloze = []  # estruturas que geram cloze

    raw_structures = []
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
                raw_structures.append(s)

    if not raw_structures:
        sub = subtopic.lower()
        for key, vals in FALLBACK_STRUCTURES.items():
            if key in sub:
                raw_structures = list(vals)
                break
        if not raw_structures:
            raw_structures = [
                "Escrita por extenso",
                "Valor de um dígito",
                "Identificar a casa do dígito",
                "Decompor o número",
                "Verdadeiro ou Falso sobre o número",
                "Completar a lacuna",
            ]

    # Mapeia estruturas vagas para concretas
    VAGUE_MAP = {
        "leitura e compreensão":    ["Escrita por extenso", "Decomposição do número"],
        "identificação de classes": ["Valor posicional", "Identificar a casa do dígito"],
        "identificação de ordens":  ["Valor posicional", "Identificar a casa do dígito"],
    }
    expanded: list[str] = []
    seen: set = set()
    for s in raw_structures:
        replaced = False
        for vague_key, concretes in VAGUE_MAP.items():
            if vague_key in s.lower():
                for c in concretes:
                    if c not in seen:
                        expanded.append(c)
                        seen.add(c)
                replaced = True
                break
        if not replaced and s not in seen:
            expanded.append(s)
            seen.add(s)

    # Separa por tipo
    for s in expanded:
        if _is_true_false_structure(s):
            structures_tf.append(s)
        elif _is_cloze_structure(s):
            structures_cloze.append(s)
        else:
            structures_mc.append(s)

    # Garante que TF e Cloze têm sempre pelo menos uma opção genérica
    if not structures_tf:
        structures_tf = [f"Verdadeiro ou Falso sobre {subtopic.split()[0].lower() if subtopic else 'o tema'}"]
    if not structures_cloze:
        structures_cloze = [f"Completar a lacuna sobre {subtopic.split()[0].lower() if subtopic else 'o tema'}"]
    if not structures_mc:
        structures_mc = ["Escolha múltipla sobre o tópico"]

    # ── 2. Roulette com pesos baseado nos tipos recentes ─────────────────────
    recent_types = _classify_recent_types(recent_questions)
    last_type    = recent_types[-1] if recent_types else "multiple_choice"
    last_2_types = recent_types[-2:] if len(recent_types) >= 2 else recent_types

    # Pesos base
    weight_mc    = 5
    weight_tf    = 3
    weight_cloze = 3

    # Se a última foi MC, aumenta a probabilidade de TF ou Cloze
    if last_type == "multiple_choice":
        weight_tf    += 4
        weight_cloze += 3

    # Se as últimas 2 foram MC, força ainda mais a variedade
    if all(t == "multiple_choice" for t in last_2_types) and len(last_2_types) == 2:
        weight_tf    += 5
        weight_cloze += 5

    # Se a última foi TF, reduz TF para não repetir
    if last_type == "true_false":
        weight_tf    = max(1, weight_tf - 6)

    # Se a última foi Cloze, reduz Cloze para não repetir
    if last_type == "cloze":
        weight_cloze = max(1, weight_cloze - 6)

    # Sorteia o tipo
    type_pool = (
        ["mc"]    * weight_mc +
        ["tf"]    * weight_tf +
        ["cloze"] * weight_cloze
    )
    chosen_type = random.choice(type_pool)

    if chosen_type == "tf":
        chosen = random.choice(structures_tf)
    elif chosen_type == "cloze":
        chosen = random.choice(structures_cloze)
    else:
        chosen = random.choice(structures_mc)

    print(
        f"🎯 [ForcedStructure] tipo={chosen_type} (w_mc={weight_mc} w_tf={weight_tf} w_cloze={weight_cloze}) "
        f"| últimos={recent_types[-3:]} | escolhida='{chosen}'",
        flush=True
    )
    return chosen


# ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

def safe_load_json_object(text: str) -> Any | None:
    if not text:
        return None
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\r\n', '\n')
    clean_text = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
    clean_text = re.sub(r"```", "", clean_text)
    start = clean_text.find('{')
    end   = clean_text.rfind('}')
    if start != -1 and end != -1:
        candidate = clean_text[start:end+1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
    return None


def _is_math_strict_topic(subtopic: str) -> bool:
    math_keywords = [
        "adição", "subtração", "soma", "multiplicação", "divisão", "expressões", "cálculo",
        "operações", "número", "números", "milhão", "milhões", "milhares",
        "fração", "frações", "decimal", "decimais"
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

    new_norm  = normalize(new_question)
    new_start = " ".join(new_question.lower().split()[:8])

    for prev in recent_questions:
        prev_norm  = normalize(prev)
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

    question    = str(raw_obj.get("question",      "")).strip()
    explanation = str(raw_obj.get("explanation",   "")).strip()
    raw_correct = str(raw_obj.get("correct_answer","")).strip()
    q_type      = str(raw_obj.get("type", "multiple_choice")).strip()

    # ── TRUE/FALSE ────────────────────────────────────────────────────────────
    if q_type == "true_false":
        options       = ["Verdadeiro", "Falso"]
        clean_correct = raw_correct if raw_correct in options else "Verdadeiro"
        if not question or not explanation:
            raise ValueError("Pergunta ou explicação vazia (true_false)")
        return {"type": "true_false", "question": question, "options": options,
                "correct_answer": clean_correct, "explanation": explanation}

    # ── CLOZE ─────────────────────────────────────────────────────────────────
    if q_type == "cloze":
        if "___" not in question:
            raise ValueError("Pergunta cloze sem lacuna ___")
        raw_options = raw_obj.get("options", [])
        options = list(dict.fromkeys([
            str(opt).strip().strip('"').strip("'").strip(".")
            for opt in raw_options if str(opt).strip()
        ]))
        clean_correct = raw_correct.strip('"').strip("'").strip(".")
        if clean_correct not in options:
            raise ValueError("Resposta cloze não corresponde às opções")
        if not question or not explanation:
            raise ValueError("Pergunta ou explicação vazia (cloze)")
        return {"type": "cloze", "question": question, "options": options,
                "correct_answer": clean_correct, "explanation": explanation}

    # ── MULTIPLE CHOICE (caminho original) ────────────────────────────────────
    if len(question.split()) < 6 and not _is_math_strict_topic(subtopic):
        raise ValueError("Pergunta demasiado simples (< 6 palavras)")

    if subject == "matematica" and not _is_math_strict_topic(subtopic):
        if re.search(r'\d+\s*[+\-x×÷]\s*\d+', question) or \
           " vezes " in question.lower() or " a multiplicar " in question.lower():
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

    detected = _detect_question_type(question)
    if subject == "matematica" and detected == "explicit_arithmetic":
        try:
            correct_number  = int(re.findall(r'\d+', clean_correct)[0])
            smart_distractors = _generate_smart_distractors(correct_number)
            options = [str(correct_number)] + [str(d) for d in smart_distractors]
            random.shuffle(options)
            clean_correct = str(correct_number)
        except (IndexError, ValueError):
            pass

    if not question or not explanation:
        raise ValueError("Pergunta ou explicação vazia")

    return {
        "type": "multiple_choice",
        "question": question,
        "options": options,
        "correct_answer": clean_correct,
        "explanation": explanation,
    }


# ─── LÓGICA PRINCIPAL ─────────────────────────────────────────────────────────
# ── 2. generate_rush_question_logic — início da função ───────────────────────
#
# Substituir APENAS o bloco onde o forced_structure é escolhido.
# Antes era SEMPRE _pick_forced_structure().
# Agora verifica primeiro se veio override do NestJS.
 
async def generate_rush_question_logic(request: RushRequest) -> RushResponse:
 
    print(f"\n🚀 [RushService] Chamado!\n{request}", flush=True)
 
    global current_rush_client_index
 
    clients = get_rush_groq_clients()
    if not clients:
        raise Exception("Nenhum cliente Groq configurado.")
 
    subject = request.subject.lower()
    if subject not in ("matematica", "portugues"):
        subject = "matematica"
 
    subtopic     = request.subtopic if request.subtopic else "Geral"
    last_3       = request.recent_questions[-3:] if request.recent_questions else []
    exclude_list = "\n- ".join(last_3) if last_3 else "Nenhuma pergunta anterior."
 
    is_math_operation   = _is_math_strict_topic(subtopic)
    dynamic_temperature = 0.4 if is_math_operation else 0.85
 
    FREE_MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
    ]
 
    for tentativa in range(5):
 
        # 🆕 BLOCO NOVO — escolha do forced_structure
        # Se o NestJS enviou um override (vem do lesson_plan do slot),
        # usa directamente. Caso contrário, sorteia como antes (Rush/Cron).
        if request.forced_structure_override:
            forced_structure = request.forced_structure_override
            print(
                f"📌 [ForcedStructure] Override do LessonService: '{forced_structure}'",
                flush=True
            )
        else:
            forced_structure = _pick_forced_structure(
                subtopic, request.context_rules, request.recent_questions
            )
 
        # ── A partir daqui o código é 100% igual ao original ─────────────────
 
        is_decomp     = "decomposição" in forced_structure.lower() or "decomp" in forced_structure.lower()
        is_positional = _is_positional_structure(forced_structure)
        is_tf         = _is_true_false_structure(forced_structure)
        is_cloze_q    = _is_cloze_structure(forced_structure)
 
        math_data     = None
        override_type = "multiple_choice"
  # ── ÂNCORA (textual ou visual) ────────────────────────────────────────
        # Se o slot tem âncora definida no seed, usa o PROMPT_ANCORA.
        # A IA é obrigada a basear a pergunta no texto/descrição fornecido.
        ancora_data = None
        if request.ancora:
            ancora_data = get_ancora(request.ancora)
 
        if ancora_data:
            # Distingue o label para o prompt ficar natural
            if ancora_data["tipo"] == "visual":
                ancora_label       = "DESCRIÇÃO VISUAL (Cartaz ou Sinal)"
                ancora_label_lower = "cartaz ou sinal descrito"
            else:
                ancora_label       = "TEXTO DE SUPORTE"
                ancora_label_lower = "texto acima"
 
            prompt = PROMPT_ANCORA.format(
                student_class=request.student_class,
                subject=subject,
                subtopic=subtopic,
                difficulty_level=request.difficulty_level,
                forced_structure=forced_structure,
                ancora_label=ancora_label,
                ancora_label_lower=ancora_label_lower,
                ancora_conteudo=ancora_data["conteudo"],
                context_rules=request.context_rules,
                exclude_list=exclude_list,
            )
            override_type = "multiple_choice"
            print(
                f"⚓ [Âncora/{ancora_data['tipo']}] '{request.ancora}' | struct='{forced_structure}'",
                flush=True
            )
        elif is_tf:
            override_type = "true_false"
            prompt = PROMPT_TRUE_FALSE.format(
                student_class=request.student_class,
                subject=subject,
                subtopic=subtopic,
                difficulty_level=request.difficulty_level,
                context_rules=request.context_rules,
                forced_structure=forced_structure,
                exclude_list=exclude_list,
            )
 
        elif is_cloze_q:
            override_type = "cloze"
            prompt = PROMPT_CLOZE.format(
                student_class=request.student_class,
                subject=subject,
                subtopic=subtopic,
                difficulty_level=request.difficulty_level,
                context_rules=request.context_rules,
                forced_structure=forced_structure,
                exclude_list=exclude_list,
            )
 
        elif is_decomp:
            decomp    = _build_decomposition_question(request.difficulty_level)
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
            print(f"🔢 [Decomposição] {decomp['number_fmt']}", flush=True)
 
        elif is_positional:
            positional = _build_positional_question(subtopic, request.difficulty_level)
            q_type     = positional["type"]
            narrative  = _pick_narrative(positional["number_fmt"])
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
            print(f"🔢 [Posicional/{q_type}] {positional['number_fmt']}", flush=True)
 
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
 
        client      = clients[current_rush_client_index]
        used_index  = current_rush_client_index
        current_rush_client_index = (current_rush_client_index + 1) % len(clients)
        chosen_model = FREE_MODELS[tentativa % len(FREE_MODELS)]
 
        try:
            print(f"🔄 Rush #{used_index+1} | {chosen_model} | {forced_structure} | {override_type}")
 
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
            print(f"👀 RAW ({chosen_model}): {raw}", flush=True)
 
            obj = safe_load_json_object(raw)
            if not obj:
                raise ValueError("JSON inválido.")
 
            if math_data:
                obj["correct_answer"] = math_data["correct_answer"]
                obj["options"]        = math_data["options"]
            obj["type"] = override_type
 
            clean_data = _sanitize_rush_payload(obj, subject, subtopic)
 
            if _is_duplicate(clean_data["question"], request.recent_questions):
                raise ValueError("Pergunta duplicada.")
 
            print(f"✅ [{override_type}] SUCESSO com {chosen_model}")
            return RushResponse(**clean_data)
 
        except RateLimitError:
            print(f"⚠️ Rate limit em {chosen_model}.")
            await asyncio.sleep(1)
            continue
        except Exception as e:
            print(f"⚠️ Erro em {chosen_model}: {e}")
            await asyncio.sleep(1)
            continue
 
    return RushResponse(
        type="multiple_choice",
        question="Ocorreu uma pequena falha técnica. Qual é a capital de Moçambique?",
        options=["Beira", "Maputo", "Nampula", "Tete"],
        correct_answer="Maputo",
        explanation="O servidor precisou de um descanso, mas seguimos em frente!"
    )
 
