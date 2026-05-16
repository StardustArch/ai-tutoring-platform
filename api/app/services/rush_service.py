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
from app.utils.finite_domains import get_finite_domain_data
from app.utils.prompts_finite  import PROMPT_FINITE_DOMAIN, PROMPT_FINITE_WITH_NARRATIVE
from app.utils.geometry_validator import validate_geometry_answer
from app.seeds.loader import SeedLoader, SeedNotFoundError

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
6. RECTA NUMÉRICA: Se a pergunta for sobre completar a recta/sequência, DEVE haver um padrão aritmético claro (ex: 10, 20, __, 40). É ESTRITAMENTE PROIBIDO usar "qual número fica entre X e Y".

LINGUAGEM (OBRIGATÓRIO):
- Fale como uma criança fala! Frases curtas e simples.
- PROIBIDO usar: "algarismo", "valor posicional", "centenas de milhar", "ordem numérica", "classe decimal".
- Substitua por: "Quanto vale o 4 no número...?", "Quem está na casa dos milhares?".

⚠️ VERIFICAÇÃO FACTUAL OBRIGATÓRIA (lê antes de gerar):
- A tua "correct_answer" DEVE ser factualmente correcta e verificável.
- Se a pergunta usar "cada X" (cada pé, cada mão, cada lado, cada asa...),
  a resposta refere-se a UMA unidade, NÃO ao total de duas ou mais.
  Exemplos de erros a NUNCA cometer:
    ❌ "Dedos em cada pé?" → 10  (cada pé tem 5, não 10)
    ❌ "Lados de cada triângulo?" → 4  (são 3)
    ❌ "Patas de cada cadeira?" → 8  (são 4)
  Exemplos correctos:
    ✅ "Dedos em cada pé?" → 5
    ✅ "Lados de um triângulo?" → 3
- Se tiveres dúvida sobre o facto, escolhe outro aspecto do tópico.
- O "_logic" deve confirmar: "Verifiquei que a resposta é factualmente correcta."

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
PROMPT_TRUE_FALSE_LESSON = """
Você é um professor criativo de Moçambique, criando um quiz interativo para alunos da {student_class}ª classe.
O seu objetivo é gerar UMA pergunta do tipo Verdadeiro ou Falso.
 
Disciplina: {subject}
Tópico Específico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 4)
 
🎯 CONTEÚDO A AVALIAR: "{forced_structure}"
Use este conteúdo para criar a afirmação. O tipo é Verdadeiro/Falso — não mudes isso.
 
REGRAS DE OURO:
1. Crie uma afirmação directa e clara. Contextualize com Moçambique (nomes locais, Meticais).
2. Siga rigorosamente estas restrições curriculares:
{context_rules}
3. A "correct_answer" DEVE ser exactamente "Verdadeiro" ou "Falso".
4. As "options" DEVEM ser EXACTAMENTE ["Verdadeiro", "Falso"].
5. Não repita perguntas passadas: {exclude_list}
 
⚠️ VERIFICAÇÃO FACTUAL OBRIGATÓRIA:
- A afirmação DEVE ser factualmente correcta ou incorrecta de forma inequívoca.
- Evita afirmações ambíguas ou dependentes de contexto.
- Quando tiveres dúvida sobre um facto, escolhe outro aspecto do tópico.
 
FORMATO OBRIGATÓRIO (JSON PURO):
{{
  "type": "true_false",
  "question": "...",
  "options": ["Verdadeiro", "Falso"],
  "correct_answer": "Verdadeiro",
  "explanation": "Explicação clara do porquê."
}}
"""

# ─── PROMPT CLOZE ─────────────────────────────────────────────────────────────
PROMPT_CLOZE_LESSON = """
Você é um professor criativo de Moçambique, criando um quiz interativo para alunos da {student_class}ª classe.
O seu objetivo é gerar UMA pergunta de "Completar a Lacuna".
 
Disciplina: {subject}
Tópico Específico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 4)
 
🎯 CONTEÚDO A TRABALHAR: "{forced_structure}"
Use este conteúdo para criar a frase com lacuna. O tipo é Completar a Lacuna — não mudes isso.
 
REGRAS DE OURO:
1. A "question" DEVE conter uma lacuna representada por três sublinhados: "___". Contextualize com Moçambique.
2. Siga rigorosamente estas restrições curriculares:
{context_rules}
3. Gere exactamente 4 "options" únicas. Uma delas é a resposta que encaixa perfeitamente na lacuna.
4. A "correct_answer" DEVE ser a opção correta.
5. Não repita perguntas passadas: {exclude_list}
 
⚠️ VERIFICAÇÃO FACTUAL OBRIGATÓRIA:
- A palavra ou forma que preenche a lacuna DEVE ser factualmente correcta.
- Quando tiveres dúvida sobre um facto, escolhe outro aspecto do tópico.
 
FORMATO OBRIGATÓRIO (JSON PURO):
{{
  "type": "cloze",
  "question": "O Ali ___ para a escola todos os dias.",
  "options": ["vai", "vou", "vão", "vais"],
  "correct_answer": "vai",
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
3. {ancora_ref_instrucao}
4. Respeita o currículo: {context_rules}
5. Gera exactamente 4 opções únicas.
6. A "correct_answer" DEVE ser uma cópia exacta de uma das opções.
7. Linguagem simples para crianças de 8-10 anos.
8. Contexto moçambicano (nomes: Ali, Fátima, Sónia, Hélio).
9. SEM MARKDOWN. Só JSON puro.
 
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

 
def _resolve_interaction_type(structure: str) -> str:
    """
    Dado o texto descritivo de uma structure do seed, devolve o tipo
    de interacção mais adequado:
      "true_false"       — afirmação a avaliar V/F
      "cloze"            — frase com lacuna a completar
      "multiple_choice"  — escolha múltipla (default)
 
    REGRAS:
    - "Completar" + frase/lacuna → cloze
    - "Distinguir" / "Verdadeiro ou Falso" / "Afirmar se" → true_false
    - "Identificar" / "Escolher" / "Classificar" / "Interpretar" → multiple_choice
    - "Conjugar" / "Passar" / "Ordenar" → multiple_choice
    - "Calcular" / "Ler valor" → multiple_choice
 
    Critério: cloze quando há uma transformação directa com lacuna óbvia.
              true_false quando é uma avaliação binária.
              multiple_choice em tudo o resto.
    """
    s = structure.lower().strip()
 
    # ── TRUE / FALSE ──────────────────────────────────────────────────
    TF_PATTERNS = [
        r"\bverdadeiro ou falso\b",
        r"\bafirmar se\b",
        r"\bdizer se.*é\b",
        r"\bidentificar se\b",
        r"\bdistinguir\b",          # "distinguir X de Y" → TF: é X ou é Y?
        r"\bé (?:correcto|certo|verdadeiro)\b",
        r"\bapenas\b.*\bcorrect[ao]\b",
        r"\bsom(?:ente)? uma\b",
    ]
    for pat in TF_PATTERNS:
        if re.search(pat, s):
            return "true_false"
 
    # ── CLOZE ─────────────────────────────────────────────────────────
    CLOZE_PATTERNS = [
        r"\bcompletar? (?:a |uma )?frase\b",
        r"\bcompletar? (?:com|o|a)\b",
        r"\bpreencher\b",
        r"\bsubstituir\b",          # "Substituir palavra pelo antónimo" → cloze
        r"\bpassar (?:para|os?|as?)\b",   # "Passar para o Feminino" → cloze
        r"\bpontu(?:ar|ação)\b",    # "Pontuar um texto" → cloze
        r"\bordenar\b",             # "Ordenar acções" → cloze
        r"\bformar?\b.*\bplural\b",
        r"\bcolocar?\b.*\btempos?\b",
        r"\bforma correct[ao]\b",
    ]
    for pat in CLOZE_PATTERNS:
        if re.search(pat, s):
            return "cloze"
 
    # ── MULTIPLE CHOICE (default) ─────────────────────────────────────
    return "multiple_choice"


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

    # ── 1. Extracção de estruturas ─────────────────────────────────────────
    raw_structures = _parse_structures_from_rules(context_rules)
    if not raw_structures:
        raw_structures = _get_structured_fallback(subtopic, context_rules)

    # ── 2. Separa por tipo de interacção ───────────────────────────────────
    structures_mc, structures_tf, structures_cloze = [], [], []
    for s in raw_structures:
        t = _resolve_interaction_type(s)
        if t == "true_false":
            structures_tf.append(s)
        elif t == "cloze":
            structures_cloze.append(s)
        else:
            structures_mc.append(s)

    # Garante pelo menos 1 opção em cada tipo
    if not structures_tf:
        structures_tf = [f"Distinguir se a afirmação sobre {subtopic.split()[0].lower()} é verdadeira"]
    if not structures_cloze:
        structures_cloze = [f"Completar a lacuna sobre {subtopic.split()[0].lower()}"]
    if not structures_mc:
        structures_mc = ["Identificar o conceito correcto"]

    # ── 3. Roulette com pesos baseado nos tipos recentes ──────────────────
    recent_types = _classify_recent_types(recent_questions)
    last_type    = recent_types[-1] if recent_types else "multiple_choice"
    last_2_types = recent_types[-2:] if len(recent_types) >= 2 else recent_types

    weight_mc    = 5
    weight_tf    = 3
    weight_cloze = 3

    if last_type == "multiple_choice":
        weight_tf    += 4
        weight_cloze += 3

    if all(t == "multiple_choice" for t in last_2_types) and len(last_2_types) == 2:
        weight_tf    += 5
        weight_cloze += 5

    if last_type == "true_false":
        weight_tf = max(1, weight_tf - 6)

    if last_type == "cloze":
        weight_cloze = max(1, weight_cloze - 6)

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

# ══════════════════════════════════════════════════════════════════════════════
# SUBSTITUIR as duas funções abaixo no rush_service.py
# ══════════════════════════════════════════════════════════════════════════════


def _parse_structures_from_rules(context_rules: str) -> list[str]:
    """
    Extrai estruturas exercitáveis do context_rules do seed.
    Nunca devolve linhas cruas de definição — só structures accionáveis.
    """
    # Mapeamento: padrão encontrado na linha → structure pedagógica accionável
    DEFINITION_TO_STRUCTURE = [
        # Ângulos
        (r"recto.*90|90.*recto",                   "Identificar o ângulo recto (90°) numa descrição"),
        (r"agudo.*<\s*90|<\s*90.*agudo",            "Identificar o ângulo agudo (menor que 90°)"),
        (r"obtuso.*>\s*90|>\s*90.*obtuso",          "Identificar o ângulo obtuso (entre 90° e 180°)"),
        (r"raso.*180|180.*raso",                    "Identificar o ângulo raso (180°)"),
        (r"tipo.*ângulo|identificar.*ângulo|noção.*ângulo", "Classificar o ângulo pela descrição (recto/agudo/obtuso/raso)"),
        # Circunferência/Círculo
        (r"raio.*diâmetro|diâmetro.*raio|2.*raio|raio.*÷",  "Calcular o raio ou diâmetro do círculo"),
        (r"centro|circunferência.*fechada|região interior",  "Identificar centro, raio e diâmetro no círculo"),
        # Triângulos — lados
        (r"equilátero.*3|3.*iguais.*equilátero",    "Classificar triângulo como equilátero (3 lados iguais)"),
        (r"isósceles.*2|2.*iguais.*isósceles",      "Classificar triângulo como isósceles (2 lados iguais)"),
        (r"escaleno.*diferentes|diferentes.*escaleno", "Classificar triângulo como escaleno (3 lados diferentes)"),
        (r"pelos lados|classificaç.*lado",          "Classificar triângulo pelos lados (equilátero/isósceles/escaleno)"),
        # Triângulos — ângulos
        (r"rectângulo.*ângulo recto|ângulo recto.*triâng", "Identificar triângulo rectângulo (tem 90°)"),
        (r"acutângulo|todos.*agudos",               "Identificar triângulo acutângulo (todos ângulos agudos)"),
        (r"obtusângulo|ângulo obtuso.*triâng",      "Identificar triângulo obtusângulo (tem ângulo obtuso)"),
        (r"pelos ângulos|classificaç.*ângulo.*triâng", "Classificar triângulo pelos ângulos (rectângulo/acutângulo/obtusângulo)"),
        # Quadriláteros
        (r"quadrado.*4 lados iguais.*4 ângulos|4 lados iguais.*4 ângulos rectos.*quadrado", "Identificar o quadrado pela descrição"),
        (r"rectângulo.*lados opostos|lados opostos.*4 ângulos rectos", "Identificar o rectângulo pela descrição"),
        (r"paralelogramo.*paralelos",               "Identificar o paralelogramo pela descrição"),
        (r"losango.*4 lados iguais",                "Identificar o losango pela descrição"),
        (r"trapézio.*par.*paralelos",               "Identificar o trapézio (único par de lados paralelos)"),
        (r"5 tipos.*quadrilátero|quadrilátero.*5 tipos", "Classificar o quadrilátero (quadrado/rectângulo/losango/trapézio/paralelogramo)"),
        # Sólidos
        (r"identificar.*cubo|paralelepípedo|esfera|cilindro|cone|pirâmide", "Identificar o sólido geométrico pela descrição"),
        (r"faces.*arestas.*vértices|vértices.*faces|noção básica",          "Contar faces, arestas ou vértices de um sólido"),
    ]

    import re

    STOP_HEADERS = re.compile(
        r'^(PROIBIDO|CONTEXTO|NOTAS?|ATENÇÃO)',
        re.IGNORECASE
    )
    CONTENT_HEADERS = re.compile(
        r'^(PERMITIDO|CONTEÚDOS DETALHADOS|CONTEÚDOS|GRAMÁTICA|VOCABULÁRIO'
        r'|TIPOS DE TEXTO|SUBCAPÍTULOS)',
        re.IGNORECASE
    )

    found: list[str] = []
    seen: set[str] = set()
    in_content = False

    for raw_line in context_rules.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if STOP_HEADERS.match(line.rstrip(':')):
            in_content = False
            continue
        if CONTENT_HEADERS.match(line.rstrip(':')):
            in_content = True
            continue
        if re.match(r'^\d+\.\d+\s+\w', line):
            in_content = True
            continue

        if in_content and line.startswith('-'):
            content = line.lstrip('- ').strip()
            if not content or len(content) < 4:
                continue
            # Tenta mapear a linha crua para uma structure accionável
            mapped = False
            for pattern, structure in DEFINITION_TO_STRUCTURE:
                if re.search(pattern, content, re.IGNORECASE):
                    if structure not in seen:
                        found.append(structure)
                        seen.add(structure)
                    mapped = True
                    break
            # Se não mapeou E a linha já é uma structure accionável (tem verbo),
            # usa directamente (ex: seeds que já têm "Identificar X")
            if not mapped:
                ACTION_WORDS = re.compile(
                    r'^(identificar|classificar|calcular|conjugar|distinguir|comparar'
                    r'|ordenar|completar|substituir|transformar|reconhecer|ler|interpretar'
                    r'|aplicar|usar|escolher|encontrar|converter|associar|resolver'
                    r'|decompor|escrever|passar|construir|expandir|flexionar)',
                    re.IGNORECASE
                )
                if ACTION_WORDS.match(content) and content not in seen:
                    found.append(content)
                    seen.add(content)

    return found


def _pick_forced_structure_with_diversity(
    subtopic: str,
    context_rules: str,
    recent_questions: list,
) -> str:
    """
    Sorteia o TIPO primeiro, depois escolhe structure compatível.
    Garante que structures de Português nunca aparecem em tópicos de Matemática.
    """
    sub_lower = subtopic.lower()
    cr_lower  = context_rules.lower()

    is_geometria = any(k in sub_lower or k in cr_lower for k in [
        "espaço", "forma", "ângulo", "triângulo", "quadrilátero",
        "sólido", "circunferência", "círculo"
    ])
    is_numeros = any(k in sub_lower for k in [
        "número", "milhão", "fração", "decimal", "medida"
    ])

    is_port = (not is_geometria and not is_numeros) and (
    "portugu" in sub_lower or any(
        k in cr_lower for k in ["verbo", "frase", "pronome", "sinónimo"]
        # REMOVER "palavra" e "texto" — aparecem em context_rules de matemática
    )
    )
    tipo = random.choices(
        ["multiple_choice", "true_false", "cloze"],
        weights=[50, 25, 25],
        k=1
    )[0]

    if tipo == "true_false":
        if is_port:
            pool = [
                "Distinguir se a frase está correctamente formada",
                "Identificar se o verbo está no tempo correcto",
                "Distinguir se a afirmação sobre a palavra é verdadeira",
            ]
        elif is_geometria:
            pool = [
                "Distinguir se a afirmação sobre a figura geométrica é verdadeira",
                "Identificar se o sólido descrito tem ou não vértices",
                "Distinguir se o ângulo descrito é agudo ou obtuso",
                "Identificar se o quadrilátero descrito é um quadrado ou rectângulo",
                "Distinguir se a afirmação sobre o triângulo é verdadeira",
                "Identificar se o triângulo descrito é equilátero ou isósceles",
            ]
        elif is_numeros:
            pool = [
                "Distinguir se a afirmação sobre o número é verdadeira ou falsa",
                "Identificar se o número é par ou ímpar",
                "Verificar se a decomposição do número está correcta",
            ]
        else:
            pool = [
                "Distinguir se a afirmação sobre o tema é verdadeira ou falsa",
            ]
        return random.choice(pool)

    elif tipo == "cloze":
        if is_port:
            pool = [
                "Completar frase com o verbo conjugado correctamente",
                "Completar frase com a palavra na forma correcta",
                "Completar frase com o pronome correcto",
            ]
        elif is_geometria:
            pool = [
                "Completar a frase identificando o nome da figura geométrica",
                "Completar a frase com o tipo de ângulo correcto",
                "Completar a frase com o nome do sólido geométrico correcto",
                "Completar a frase com o tipo de triângulo correcto",
            ]
        elif is_numeros:
            pool = [
                "Completar a operação com o número em falta",
                "Completar a sequência numérica com o valor correcto",
                "Completar a frase com a unidade de medida correcta",
            ]
        else:
            pool = ["Completar a frase com o termo correcto"]
        return random.choice(pool)

    else:
        # multiple_choice — usa _pick_forced_structure que lê o seed
        return _pick_forced_structure(subtopic, context_rules, recent_questions)
        
STRUCTURED_FALLBACKS: dict[str, list[str]] = {
    # Matemática — Espaço e Forma
    "ângulo":        ["Classificar o ângulo (recto/agudo/obtuso/raso)",
                      "Identificar ângulo recto numa figura descrita",
                      "Distinguir se o ângulo descrito é agudo ou obtuso"],
    "circunferência": ["Identificar centro, raio e diâmetro no círculo",
                       "Calcular o raio dado o diâmetro",
                       "Calcular o diâmetro dado o raio"],
    "círculo":       ["Identificar centro, raio e diâmetro no círculo",
                      "Calcular o raio dado o diâmetro"],
    "triângulo":     ["Classificar triângulo pelos lados (equilátero/isósceles/escaleno)",
                      "Classificar triângulo pelos ângulos (rectângulo/acutângulo/obtusângulo)",
                      "Identificar número de lados de um triângulo"],
    "quadrilátero":  ["Identificar o quadrilátero pela descrição (quadrado/rectângulo/losango/trapézio/paralelogramo)",
                      "Distinguir quadrado de rectângulo",
                      "Identificar o número de ângulos rectos do quadrilátero"],
    "sólido":        ["Identificar o sólido geométrico pela descrição (cubo/esfera/cilindro/cone/pirâmide)",
                      "Contar faces de um cubo ou paralelepípedo",
                      "Associar objecto do quotidiano ao sólido geométrico correcto"],
    # Matemática — Operações
    "adição":        ["Calcular soma de dois números",
                      "Problema de história com adição",
                      "Completar a lacuna na adição"],
    "subtracção":    ["Calcular diferença de dois números",
                      "Problema de história com subtracção"],
    "multiplicação": ["Calcular produto (tabuada)",
                      "Multiplicar por 10 ou 100",
                      "Problema de história com multiplicação"],
    "divisão":       ["Calcular quociente e resto",
                      "Divisão exacta (sem resto)",
                      "Problema de distribuição equitativa"],
    "fracção":       ["Identificar fracção própria ou imprópria",
                      "Adicionar fracções com mesmo denominador",
                      "Reconhecer fracções equivalentes simples"],
    "decimal":       ["Ler número decimal (décimas/centésimas)",
                      "Comparar dois decimais",
                      "Adicionar decimais alinhando a vírgula"],
    # Português — estruturas genéricas
    "verbo":         ["Conjugar verbo no Presente do Indicativo",
                      "Identificar o verbo na frase",
                      "Completar frase com verbo no tempo correcto"],
    "nome":          ["Passar nome para o feminino",
                      "Passar nome para o plural",
                      "Distinguir nome próprio de nome comum"],
    "adjectivo":     ["Identificar adjectivo na frase",
                      "Concordar adjectivo com nome em género e número"],
    "pronome":       ["Identificar pronome possessivo na frase",
                      "Escolher pronome demonstrativo correcto pela distância"],
    "frase":         ["Transformar frase afirmativa em negativa",
                      "Construir frase interrogativa",
                      "Identificar sujeito e predicado"],
}
 
 
def _get_structured_fallback(subtopic: str, context_rules: str) -> list[str]:
    """
    Devolve estruturas pedagógicas específicas baseadas no subtopic e/ou
    no conteúdo do context_rules. Muito mais preciso que o FALLBACK_STRUCTURES
    anterior que usava só uma palavra-chave genérica.
    """
    combined = (subtopic + " " + context_rules).lower()
    results: list[str] = []
    seen: set[str] = set()
 
    for keyword, structs in STRUCTURED_FALLBACKS.items():
        if keyword in combined:
            for s in structs:
                if s not in seen:
                    results.append(s)
                    seen.add(s)
 
    # Se ainda nada, devolve estruturas completamente genéricas
    if not results:
        results = [
            "Identificar o conceito correcto pela descrição",
            "Escolher a opção correcta de entre as alternativas",
            "Distinguir se a afirmação sobre o tópico é verdadeira ou falsa",
            "Completar a frase com o termo correcto",
        ]
 
    return results
 
 
# ──────────────────────────────────────────────────────────────────────────────
# FIX 3: Remover secção CONTEXTO do context_rules antes de enviar ao modelo
# Evita que o modelo se fixe nos exemplos do CONTEXTO (pote→esfera, lata→cilindro)
# ──────────────────────────────────────────────────────────────────────────────
 
def _strip_contexto_section(context_rules: str) -> str:
    """
    Remove a secção 'CONTEXTO:' do context_rules antes de enviar ao modelo.
    Versão robusta: funciona mesmo quando CONTEXTO: é a última linha do texto.
    """
    import re
    # Tenta remover até ao próximo cabeçalho maiúsculo
    cleaned = re.sub(
        r'\nCONTEXTO\s*:.*?(?=\n[A-ZÁÉÍÓÚÀÃÕÇ]{2,}[^a-záéíóúàãõç\n]*:|\Z)',
        '',
        context_rules,
        flags=re.DOTALL | re.IGNORECASE
    )
    # Se não mudou nada (CONTEXTO no fim sem cabeçalho a seguir),
    # remove tudo a partir de CONTEXTO: até ao fim
    if cleaned == context_rules:
        cleaned = re.sub(
            r'\nCONTEXTO\s*:.*$',
            '',
            context_rules,
            flags=re.DOTALL | re.IGNORECASE
        )
    return cleaned.strip()
 

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


# ══════════════════════════════════════════════════════════════════════════════
# SUBSTITUIR a função _is_duplicate no rush_service.py pela versão abaixo.
# Adiciona verificação semântica: bloqueia quando o mesmo par
# (objecto, sólido/figura) já apareceu nas perguntas recentes,
# mesmo que o tipo de interacção seja diferente (cloze vs true_false vs MC).
# ══════════════════════════════════════════════════════════════════════════════

# Nomes de sólidos e figuras geométricas que o modelo usa
_SOLIDOS = [
    "paralelepípedo", "cilindro", "esfera", "cubo", "cone", "pirâmide",
    "triângulo", "quadrado", "rectângulo", "losango", "trapézio",
    "paralelogramo", "circunferência", "círculo",
    "equilátero", "isósceles", "escaleno",
    "acutângulo", "obtusângulo",
]

# Palavras-chave que indicam que a pergunta é sobre identificar um objecto→sólido
_OBJETO_KEYWORDS = [
    "é um exemplo de", "tem a forma de", "é chamado de",
    "é um sólido", "é um tipo de sólido", "chamado de",
    "tem faces", "tem arestas", "tem vértices",
]


def _extract_geometric_pair(question: str) -> tuple[str, str] | None:
    """
    Extrai o par (objecto_contexto, sólido_geométrico) de uma pergunta.
    Ex: "Um tijolo é um exemplo de paralelepípedo" → ("tijolo", "paralelepípedo")
    Ex: "Um ângulo de 45° é um ângulo agudo" → ("angulo_45", "agudo")
    Devolve None se não conseguir extrair.
    """
    q = question.lower().strip().rstrip('.')

    # Detecta o sólido/figura mencionado
    found_solid = None
    for s in _SOLIDOS:
        if s in q:
            found_solid = s
            break

    if not found_solid:
        # Tenta ângulos (recto/agudo/obtuso/raso)
        for angulo in ["recto", "agudo", "obtuso", "raso"]:
            if angulo in q:
                found_solid = angulo
                break

    if not found_solid:
        return None

    # Detecta o objecto do contexto (palavra antes do padrão "é um exemplo de...")
    # Estratégia: pegar as primeiras 2-3 palavras significativas da pergunta
    # como identificador do objecto
    words = re.sub(r'[^\w\s]', ' ', q).split()
    # Remove artigos, preposições comuns
    stopwords = {'um', 'uma', 'o', 'a', 'os', 'as', 'de', 'do', 'da',
                 'que', 'é', 'em', 'com', 'para', 'por', 'se', 'no', 'na'}
    content_words = [w for w in words[:8] if w not in stopwords and len(w) > 2]

    if not content_words:
        return None

    # Usa as primeiras 2 palavras de conteúdo como chave do objecto
    obj_key = "_".join(content_words[:2])
    return (obj_key, found_solid)


def _is_duplicate(new_question: str, recent_questions: list[str], has_ancora: bool = False) -> bool:
    def normalize(text: str) -> str:
        return re.sub(r'[\d\.,]+', 'N', text.lower().strip())

    new_norm  = normalize(new_question)
    new_start = " ".join(new_question.lower().split()[:8])

    for prev in recent_questions:
        prev_norm  = normalize(prev)
        prev_start = " ".join(prev.lower().split()[:8])

        # ── check de início — desactivado quando há âncora ──────────────────
        if not has_ancora and new_start == prev_start:
            print(f"🔁 [DuplicateCheck] Início idêntico: '{prev[:70]}'", flush=True)
            return True

        # ── check de template — compara a partir da palavra 8 se há âncora ──
        if has_ancora:
            # ignora os primeiros 8 tokens (referência à figura) e compara o resto
            new_core  = " ".join(new_question.lower().split()[8:])
            prev_core = " ".join(prev.lower().split()[8:])
            new_core_norm  = normalize(new_core)
            prev_core_norm = normalize(prev_core)
            if new_core_norm and new_core_norm[:60] == prev_core_norm[:60]:
                print(f"🔁 [DuplicateCheck] Core idêntico (âncora): '{prev[:70]}'", flush=True)
                return True
        else:
            if new_norm[:80] == prev_norm[:80]:
                print(f"🔁 [DuplicateCheck] Template idêntico: '{prev[:70]}'", flush=True)
                return True

    # check semântico (par objecto/sólido) — mantém igual
    new_pair = _extract_geometric_pair(new_question)
    if new_pair:
        for prev in recent_questions:
            prev_pair = _extract_geometric_pair(prev)
            if prev_pair and new_pair == prev_pair:
                print(f"🔁 [DuplicateCheck] Par semântico idêntico: obj='{new_pair[0]}' sólido='{new_pair[1]}'", flush=True)
                return True

    return False
# ══════════════════════════════════════════════════════════════════════════════
# SUBSTITUIR _sanitize_rush_payload no rush_service.py pela versão abaixo.
#
# O único problema: validate_geometry_answer só era chamado no caminho
# multiple_choice. Perguntas true_false e cloze saíam antes.
# Agora a validação é feita para os 3 tipos.
# ══════════════════════════════════════════════════════════════════════════════

def _sanitize_rush_payload(raw_obj: dict, subject: str, subtopic: str) -> dict:
    if not isinstance(raw_obj, dict):
        raise ValueError("Payload inválido")

    question    = str(raw_obj.get("question",      "")).strip()
    explanation = str(raw_obj.get("explanation",   "")).strip()
    raw_correct = str(raw_obj.get("correct_answer","")).strip()
    q_type      = str(raw_obj.get("type", "multiple_choice")).strip()

    # ── TRUE/FALSE ────────────────────────────────────────────────────────────
    if q_type == "true_false":
        options = ["Verdadeiro", "Falso"]
        clean_correct = raw_correct if raw_correct in options else "Verdadeiro"
        if not question or not explanation:
            raise ValueError("Pergunta ou explicação vazia (true_false)")

        # Validação específica para ângulos em TF
        # Detecta padrão "X° é um ângulo Y" e verifica se V/F está correcto
        angulo_match = re.search(r'(\d+)°.*ângulo\s+(recto|agudo|obtuso|raso)', question.lower())
        if angulo_match:
            graus = int(angulo_match.group(1))
            tipo_afirmado = angulo_match.group(2)
            tipo_correcto = (
                "recto" if graus == 90 else
                "agudo" if graus < 90 else
                "raso"  if graus == 180 else
                "obtuso"
            )
            afirmacao_correcta = (tipo_afirmado == tipo_correcto)
            resposta_esperada = "Verdadeiro" if afirmacao_correcta else "Falso"
            if clean_correct != resposta_esperada:
                raise ValueError(
                    f"TF ângulo errado: {graus}° é {tipo_correcto}, "
                    f"afirmação diz {tipo_afirmado} → resposta devia ser {resposta_esperada}"
                )

        decomp_match = re.search(r'([\d\.]+)\s*=\s*([\d\.\s\+]+)', question)
        if decomp_match:
            try:
                target_num_str = decomp_match.group(1).replace('.', '')
                target_num = int(target_num_str)
                
                # Extrai as parcelas da soma (ex: 900.000 + 40.000...)
                parts_str = decomp_match.group(2).split('+')
                parts = [int(p.replace('.', '').strip()) for p in parts_str if p.strip().replace('.', '').isdigit()]
                
                if parts:
                    real_sum = sum(parts)
                    is_correct = (target_num == real_sum)
                    expected_ans = "Verdadeiro" if is_correct else "Falso"
                    
                    if clean_correct != expected_ans:
                        print(f"🔧 [Sanitize] TF Decomposição: Modelo diz '{clean_correct}', mas a soma real é {real_sum} (alvo: {target_num}). Forçando '{expected_ans}'.")
                        clean_correct = expected_ans
                        explanation = f"A soma de {' + '.join(str(p) for p in parts)} é {real_sum}, por isso a afirmação é {expected_ans.lower()}."
            except Exception as e:
                print(f"⚠️ Erro ao validar decomposição TF: {e}")
        # 👆 FIM DO NOVO BLOCO 👆

        return {"type": "true_false", "question": question, "options": options,
                "correct_answer": clean_correct, "explanation": explanation}

    # ── CLOZE ─────────────────────────────────────────────────────────────────
    if q_type == "cloze":
        if question.count("___") != 1:
            raise ValueError("Cloze deve ter exactamente uma lacuna ___")
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

        # Validação factual — cobre "Uma garrafa de ___ → Pirâmide"
        geo_error = validate_geometry_answer(question, clean_correct, options)
        if geo_error:
            raise ValueError(f"Facto geométrico incorrecto (cloze): {geo_error}")

        return {"type": "cloze", "question": question, "options": options,
                "correct_answer": clean_correct, "explanation": explanation}

    # ── MULTIPLE CHOICE ───────────────────────────────────────────────────────
    if len(question.split()) < 6 and not _is_math_strict_topic(subtopic):
        raise ValueError("Pergunta demasiado simples (< 6 palavras)")

    if subject == "matematica" and not _is_math_strict_topic(subtopic):
        if re.search(r'\d+\s*[+\-x×÷]\s*\d+', question) or \
           " vezes " in question.lower() or " a multiplicar " in question.lower():
            raise ValueError("Operações não permitidas neste tópico conceitual")

    raw_options = raw_obj.get("options", [])
    if not isinstance(raw_options, list):
        raise ValueError("Opções inválidas")

    # 👇 NOVO BLOCO 1: Filtro de Opções Proibidas (ex: "Não sei") 👇
    OPCOES_PROIBIDAS = ["não sei", "nao sei", "nenhuma", "nenhum dos", "nenhuma das", "todas as", "todas opções"]
    options = []
    for opt in raw_options:
        s_opt = str(opt).strip().strip('"').strip("'").strip(".")
        s_lower = s_opt.lower()
        if s_opt and not any(p in s_lower for p in OPCOES_PROIBIDAS):
            options.append(s_opt)

    options = list(dict.fromkeys(options))

    if len(options) < 3:
        raise ValueError("Menos de 3 opções válidas após remover proibidas.")
    # 👆 FIM DO BLOCO 1 👆

    clean_correct = raw_correct.strip('"').strip("'").strip(".")
    if clean_correct not in options:
        raise ValueError("Resposta correta não corresponde às opções válidas.")

    # 👇 NOVO BLOCO 2: Verificação Factual de Distâncias (Maputo-Beira) 👇
    q_lower = question.lower()
    if "maputo" in q_lower and "beira" in q_lower and ("distância" in q_lower or "km" in q_lower or "quilómetros" in q_lower):
        nums = re.findall(r'\d+', clean_correct.replace('.', ''))
        if nums:
            val = int(nums[0])
            if not (1100 <= val <= 1300): # Maputo-Beira por estrada é ~1200km
                raise ValueError(f"Distância Maputo-Beira absurda: {val} km (real ~1200 km). Forçando nova geração.")
    # 👆 FIM DO BLOCO 2 👆

    # 👇 NOVO BLOCO 3: Validador de Recta Numérica Aberta 👇
    if "recta" in q_lower or "reta" in q_lower or "sequência" in q_lower:
        # Se o modelo tentar a marosca do "número entre X e Y" (onde várias respostas podem estar certas)
        if "entre" in q_lower and re.search(r'\d+\s+e\s+\d+', q_lower):
            raise ValueError("Intervalo aberto na recta numérica detectado. Forçando nova geração para garantir padrão aritmético único.")
    # 👆 FIM DO BLOCO 3 👆
    detected = _detect_question_type(question)
    if subject == "matematica" and detected == "explicit_arithmetic":
        try:
            correct_number    = int(re.findall(r'\d+', clean_correct)[0])
            smart_distractors = _generate_smart_distractors(correct_number)
            options       = [str(correct_number)] + [str(d) for d in smart_distractors]
            random.shuffle(options)
            clean_correct = str(correct_number)
        except (IndexError, ValueError):
            pass

    if not question or not explanation:
        raise ValueError("Pergunta ou explicação vazia")

    geo_error = validate_geometry_answer(question, clean_correct, options)
    if geo_error:
        raise ValueError(f"Facto geométrico incorrecto: {geo_error}")
    # Em _sanitize_rush_payload, antes do return final de multiple_choice:
    q_lower = question.lower()
    # Detecta "cada lado mede X" ou "todos os lados medem X" → todos iguais → não pode ser rectângulo
    if re.search(r'cada lado|todos os lados', q_lower):
        if clean_correct.lower() == "rectângulo":
            raise ValueError("Contradição: todos os lados iguais → Quadrado, não Rectângulo")

    if "quatro lados iguais" in q_lower or "4 lados iguais" in q_lower:
        if clean_correct.lower() == "rectângulo":
            raise ValueError("Contradição: 4 lados iguais → Quadrado, não Rectângulo")
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
        "openai/gpt-oss-120b",
        "qwen/qwen3-32b",
        "llama-3.1-8b-instant",
    ]
    session_blacklist = set()
    for tentativa in range(5):
 
        # 🆕 BLOCO NOVO — escolha do forced_structure
        # Se o NestJS enviou um override (vem do lesson_plan do slot),
        # usa directamente. Caso contrário, sorteia como antes (Rush/Cron).
        # ── Carregar seed para obter structures do rush ─────────────────────────
        seed = None
        try:
            # Tenta carregar por ID direto (ex: "mat3_u1_numeros_naturais")
            seed_id = request.topic_seed_id
            if seed_id:
                seed = SeedLoader.get(seed_id)
        except (SeedNotFoundError, KeyError, AttributeError):
            # Fallback: busca por nome do tópico + disciplina
            try:
                seed = SeedLoader.get_by_topic(subtopic, subject=request.subject)
            except SeedNotFoundError:
                seed = None
                print(f"⚠️ [Rush/Seed] Seed não encontrado para topic='{subtopic}', subject='{request.subject}'")

        # ── Escolher forced_structure: seed > override > fallback antigo ─────────
        if request.forced_structure_override:
            # Override do NestJS tem prioridade máxima (vem do lesson_plan)
            forced_structure = request.forced_structure_override
        elif seed and seed.rush.structures:
            # Usa structures definidas no YAML do seed
            available = seed.rush.structures
            # Filtra por difficulty_range se estiver definido
            if seed.rush.difficulty_range:
                min_d, max_d = seed.rush.difficulty_range
                # Se a dificuldade atual estiver dentro do range, usa todas
                # (a filtragem fina pode ser feita depois se necessário)
            # Escolhe aleatoriamente, evitando blacklist
            for _ in range(5):
                candidate = random.choice(available)
                if candidate not in session_blacklist:
                    forced_structure = candidate
                    break
            else:
                # Se todas estiverem na blacklist, escolhe mesmo assim
                forced_structure = random.choice(available)
            print(f"🌱 [Rush/Seed] {seed.id} | structures: {len(available)} | escolhida='{forced_structure}'", flush=True)
        else:
            # Fallback: lógica antiga de extração de context_rules
            for _ in range(5):
                forced_structure = _pick_forced_structure_with_diversity(
                    subtopic, request.context_rules, request.recent_questions
                )
                if forced_structure not in session_blacklist:
                    break
 
        # ── A partir daqui o código é 100% igual ao original ─────────────────
 
        _fs_lower = forced_structure.lower()
        _sub_lower = subtopic.lower()
 
        # Detecta se a forced_structure é claramente de Português
        _is_port_structure = any(k in _fs_lower for k in [
            "verbo", "frase", "pronome", "palavra", "plural", "sinónimo",
            "afirmativa", "negativa", "pontuad", "conjugad"
        ])
        # Detecta se o subtopic é de Matemática
        _is_math_subtopic = any(k in _sub_lower for k in [
            "matemática", "número", "espaço", "forma", "medida", "fração",
            "decimal", "adição", "subtração", "multiplicação", "divisão",
            "ângulo", "triângulo", "quadrilátero", "sólido", "circunferência"
        ])
        # Detecta se a forced_structure é claramente de Matemática
        _is_math_structure = any(k in _fs_lower for k in [
            "ângulo", "triângulo", "quadrilátero", "sólido", "circunferência",
            "número", "decomp", "milhar", "fração", "decimal", "calcular"
        ])
        # Detecta se o subtopic é de Português
        _is_port_subtopic = any(k in _sub_lower for k in [
            "português", "leitura", "escrita", "gramática"
        ])
 
        # Bloqueia FiniteDomain se há conflito de domínio
        _domain_conflict = (_is_port_structure and _is_math_subtopic) or \
                           (_is_math_structure and _is_port_subtopic)
 
        if _domain_conflict:
            finite_data = None
            session_blacklist.add(forced_structure) # 👈 NOVO: Mete na blacklist!
            print(
                f"🚫 [FiniteDomain] Bloqueado — conflito de domínio: "
                f"subtopic='{subtopic}' vs structure='{forced_structure}'",
                flush=True,
            )
        else:
            finite_data = get_finite_domain_data(
                forced_structure,
                request.student_class,
                request.difficulty_level,
            )
 
        ancora_data = None
        if request.ancora:
            ancora_data = get_ancora(request.ancora)

        if finite_data:
            # Valores pré-calculados — IA só escreve narrativa + explicação
            override_type = "multiple_choice"
            math_data     = finite_data   # reutiliza o mecanismo já existente
 
            # Decide se usa prompt simples ou com narrativa contextual
            NARRATIVE_TYPES = {
                "roman", "fraction", "metical_total",
                "metical_troco", "conversao", "calendario",
                "verbo_vir", "verbo_irregular",
            }
            use_narrative = finite_data.get("type") in NARRATIVE_TYPES
 
            if use_narrative:
                calculated_data_str = "\n".join([
                    f'- Pergunta base: "{finite_data["question_template"]}"',
                    f'- Opções: {finite_data["options_json"]}',
                    f'- Resposta correcta: "{finite_data["correct_answer"]}"',
                ])
                prompt = PROMPT_FINITE_WITH_NARRATIVE.format(
                    student_class=request.student_class,
                    subtopic=subtopic,
                    calculated_data=calculated_data_str,
                    options_json=finite_data["options_json"],
                    correct_answer=finite_data["correct_answer"],
                )
            else:
                prompt = PROMPT_FINITE_DOMAIN.format(
                    student_class=request.student_class,
                    subtopic=subtopic,
                    question_template=finite_data["question_template"],
                    options_json=finite_data["options_json"],
                    correct_answer=finite_data["correct_answer"],
                )
 
            print(
                f"🔒 [FiniteDomain] type={finite_data['type']} | "
                f"correct='{finite_data['correct_answer']}' | struct='{forced_structure}'",
                flush=True,
            )
 
        else:
            # ── NÃO é domínio finito — fluxo original ────────────────────────
            math_data     = None
            override_type = "multiple_choice"
 
            is_decomp     = "decomposição" in forced_structure.lower() or "decomp" in forced_structure.lower()
            is_positional = _is_positional_structure(forced_structure)
            interaction_type = _resolve_interaction_type(forced_structure)
            is_tf      = interaction_type == "true_false"
            is_cloze_q = interaction_type == "cloze" 
 
            if ancora_data:
                if ancora_data["tipo"] == "visual":
                    ancora_label        = "FIGURA / IMAGEM DESCRITA"
                    ancora_label_lower  = "figura acima"
                    ancora_ref_instrucao = (
                        'A pergunta DEVE começar com "Na figura acima," ou "Observando a figura acima,"\n'
                        '   — NUNCA usar "De acordo com o texto" ou "Olhando para o cartaz".'
                    )
                else:
                    ancora_label        = "TEXTO DE SUPORTE"
                    ancora_label_lower  = "texto acima"
                    ancora_ref_instrucao = (
                        'A pergunta DEVE começar com "De acordo com o texto acima," ou "Com base no texto acima,"\n'
                        '   — NUNCA usar "Observando a figura" ou "Na imagem".'
                    )
 
                prompt = PROMPT_ANCORA.format(
                    student_class=request.student_class,
                    subject=subject,
                    subtopic=subtopic,
                    difficulty_level=request.difficulty_level,
                    forced_structure=forced_structure,
                    ancora_label=ancora_label,
                    ancora_label_lower=ancora_label_lower,
                    ancora_conteudo=ancora_data["conteudo"],
                    ancora_ref_instrucao=ancora_ref_instrucao,
                    context_rules=request.context_rules,
                    exclude_list=exclude_list,
                )
                override_type = "multiple_choice"
                print(
                    f"⚓ [Âncora/{ancora_data['tipo']}] '{request.ancora}' | struct='{forced_structure}'",
                    flush=True,
                )
 
            elif is_tf:
                override_type = "true_false"
                prompt = PROMPT_TRUE_FALSE_LESSON.format(
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
                prompt = PROMPT_CLOZE_LESSON.format(
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
                clean_rules = _strip_contexto_section(request.context_rules)
                prompt = PROMPT_RUSH_JSON.format(
                    student_class=request.student_class,
                    subject=subject,
                    subtopic=subtopic,
                    exclude_list=exclude_list,
                    difficulty_level=request.difficulty_level,
                    context_rules=clean_rules,
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
 
            if _is_duplicate(clean_data["question"], request.recent_questions, has_ancora=bool(ancora_data)):
                raise ValueError("Pergunta duplicada.")
 
            print(f"✅ [{override_type}] SUCESSO com {chosen_model}")
            return RushResponse(**clean_data,     ancora_chave=request.ancora or None,
    ancora_tipo=ancora_data["tipo"] if ancora_data else None,
    ancora_conteudo=ancora_data["conteudo"] if ancora_data else None,)
 
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
 
