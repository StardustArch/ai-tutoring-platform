"""
finite_domains.py
═══════════════════════════════════════════════════════════════════
Domínios finitos do currículo KMind (3ª e 4ª classe).

PRINCÍPIO: nenhum valor curricular fixo é gerado pela IA.
Python sorteia e calcula; a IA só escreve a narrativa.

Grupos:
  A — Matemática
  B — Português
"""

import random
import json
from typing import Optional

# ══════════════════════════════════════════════════════════════
# GRUPO A — MATEMÁTICA
# ══════════════════════════════════════════════════════════════

# ─── A1. NUMERAÇÃO ROMANA ────────────────────────────────────────────────────

_ROMAN_SYMBOLS = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100,  "C"), (90,  "XC"), (50,  "L"), (40,  "XL"),
    (10,   "X"), (9,   "IX"), (5,   "V"), (4,   "IV"), (1, "I"),
]

def _to_roman(n: int) -> str:
    result = ""
    for value, symbol in _ROMAN_SYMBOLS:
        while n >= value:
            result += symbol
            n -= value
    return result

def _roman_wrong_options(n: int, correct_roman: str, max_value: int) -> list[str]:
    """Gera 3 opções erradas plausíveis para numeração romana."""
    wrong: set[str] = set()
    candidates = []

    # Vizinhos próximos
    for delta in [-1, 1, -2, 2, -5, 5, -10, 10]:
        v = n + delta
        if 1 <= v <= max_value:
            r = _to_roman(v)
            if r != correct_roman:
                candidates.append(r)

    # Erros comuns: substituir subtractivo por aditivo
    common_errors = {
        "IV": "IIII", "IX": "VIIII", "XL": "XXXX", "XC": "LXXXX",
        "CD": "CCCC", "CM": "DCCCC",
    }
    mangled = correct_roman
    for sub, wrong_form in common_errors.items():
        if sub in mangled:
            candidates.append(mangled.replace(sub, wrong_form, 1))
            break

    random.shuffle(candidates)
    seen = {correct_roman}
    for c in candidates:
        if c not in seen and len(c) <= 8:
            wrong.add(c)
            seen.add(c)
        if len(wrong) == 3:
            break

    # Fallback: vizinhos garantidos
    i = 1
    while len(wrong) < 3:
        v = n + i if i % 2 == 1 else n - i
        i += 1
        if 1 <= v <= max_value:
            r = _to_roman(v)
            if r not in seen:
                wrong.add(r)
                seen.add(r)

    return list(wrong)[:3]

def build_roman_question(student_class: int, difficulty: int) -> dict:
    """
    Gera pergunta de Numeração Romana.
    3ª classe: até L (50). 4ª classe: até M (1000).
    """
    max_value = 50 if student_class == 3 else 1000
    # Difficulty ajusta o intervalo
    if difficulty <= 1:
        n = random.randint(1, 20)
    elif difficulty == 2:
        n = random.randint(10, max_value // 2)
    else:
        n = random.randint(max_value // 2, max_value)

    correct_roman = _to_roman(n)
    wrong = _roman_wrong_options(n, correct_roman, max_value)
    options = [correct_roman] + wrong
    random.shuffle(options)

    direction = random.choice(["arabe_para_romano", "romano_para_arabe"])

    if direction == "arabe_para_romano":
        question_template = f"Como se escreve o número {n} em numeração romana?"
        correct_answer = correct_roman
    else:
        question_template = f"Qual é o valor do número romano {correct_roman}?"
        correct_answer = str(n)
        # Recalcula opções como números árabes
        wrong_arabe = [str(n + d) for d in [-1, 1, -2, 2, 5, -5, 10, -10]
                       if 1 <= n + d <= max_value and n + d != n]
        wrong_arabe = list(dict.fromkeys(wrong_arabe))[:3]
        while len(wrong_arabe) < 3:
            v = random.randint(1, max_value)
            if str(v) not in wrong_arabe and v != n:
                wrong_arabe.append(str(v))
        options = [str(n)] + wrong_arabe
        random.shuffle(options)

    return {
        "type": "roman",
        "direction": direction,
        "n": n,
        "roman": correct_roman,
        "question_template": question_template,
        "correct_answer": correct_answer,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
    }


# ─── A2. NÚMEROS ORDINAIS ────────────────────────────────────────────────────

_ORDINALS = {
    1: "primeiro", 2: "segundo", 3: "terceiro", 4: "quarto", 5: "quinto",
    6: "sexto", 7: "sétimo", 8: "oitavo", 9: "nono", 10: "décimo",
    11: "décimo primeiro", 12: "décimo segundo", 13: "décimo terceiro",
    14: "décimo quarto", 15: "décimo quinto", 16: "décimo sexto",
    17: "décimo sétimo", 18: "décimo oitavo", 19: "décimo nono",
    20: "vigésimo", 21: "vigésimo primeiro", 22: "vigésimo segundo",
    23: "vigésimo terceiro", 24: "vigésimo quarto", 25: "vigésimo quinto",
    26: "vigésimo sexto", 27: "vigésimo sétimo", 28: "vigésimo oitavo",
    29: "vigésimo nono", 30: "trigésimo", 40: "quadragésimo",
    41: "quadragésimo primeiro", 42: "quadragésimo segundo",
    50: "quinquagésimo", 51: "quinquagésimo primeiro",
    60: "sexagésimo", 70: "septuagésimo", 80: "octogésimo",
    90: "nonagésimo", 100: "centésimo",
}
# Preenche 31–49, 52–59, etc. por composição
for _base, _base_name in [(30,"trigésimo"),(60,"sexagésimo"),(70,"septuagésimo"),(80,"octogésimo"),(90,"nonagésimo")]:
    for _i in range(1, 10):
        _ORDINALS[_base + _i] = f"{_base_name} {_ORDINALS[_i]}"

def build_ordinal_question(student_class: int, difficulty: int) -> dict:
    max_ord = 50 if student_class == 3 else 100
    if difficulty <= 1:
        pool = list(range(1, 16))
    elif difficulty == 2:
        pool = list(range(10, 35))
    else:
        pool = list(range(30, max_ord + 1))

    pool = [p for p in pool if p <= max_ord and p in _ORDINALS]
    n = random.choice(pool)
    correct = _ORDINALS[n]

    # 3 opções erradas: vizinhos ±1, ±2, ±3
    wrong_pool = [p for p in pool if p != n and p in _ORDINALS]
    random.shuffle(wrong_pool)
    wrong_candidates = [_ORDINALS[p] for p in wrong_pool[:6] if _ORDINALS[p] != correct]
    wrong = list(dict.fromkeys(wrong_candidates))[:3]

    while len(wrong) < 3:
        v = random.randint(1, max_ord)
        if v != n and v in _ORDINALS and _ORDINALS[v] not in wrong:
            wrong.append(_ORDINALS[v])

    direction = random.choice(["numero_para_ordinal", "ordinal_para_numero"])
    if direction == "numero_para_ordinal":
        options = [correct] + wrong
        random.shuffle(options)
        return {
            "type": "ordinal",
            "n": n,
            "correct_ordinal": correct,
            "direction": direction,
            "correct_answer": correct,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Qual é o número ordinal da posição {n}?",
        }
    else:
        # opções são números
        wrong_nums = [str(p) for p in wrong_pool[:3] if p != n]
        while len(wrong_nums) < 3:
            v = random.randint(1, max_ord)
            if str(v) not in wrong_nums and v != n:
                wrong_nums.append(str(v))
        options = [str(n)] + wrong_nums[:3]
        random.shuffle(options)
        return {
            "type": "ordinal",
            "n": n,
            "correct_ordinal": correct,
            "direction": direction,
            "correct_answer": str(n),
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"O ordinal '{correct}' é a posição número ___ numa fila.",
        }


# ─── A3. FRACÇÕES BÁSICAS (3ª classe: 1/2, 1/3, 1/4) ────────────────────────

_FRACTION_NAMES = {
    (1, 2): "metade",
    (1, 3): "terço",
    (1, 4): "quarto",
}

def build_fraction_question(difficulty: int) -> dict:
    """3ª classe apenas: 1/2, 1/3, 1/4."""
    fractions = list(_FRACTION_NAMES.keys())
    num, den = random.choice(fractions)
    name = _FRACTION_NAMES[(num, den)]

    # Gerar número divisível
    if difficulty <= 2:
        base = random.randint(2, 10)
    else:
        base = random.randint(5, 20)
    total = base * den
    correct_value = base  # num/den de total = base

    # Distractores: outros resultados plausíveis
    wrong_vals: set[int] = set()
    for _, d2 in fractions:
        if d2 != den:
            wrong_vals.add(total // d2 if total % d2 == 0 else total // d2 + 1)
    wrong_vals.discard(correct_value)
    wrong_vals.add(total)           # confundir fracção com o todo
    wrong_vals.add(correct_value + 1)
    wrong_vals.discard(0)
    wrong_list = [v for v in wrong_vals if v > 0 and v != correct_value]
    random.shuffle(wrong_list)

    options = [str(correct_value)] + [str(w) for w in wrong_list[:3]]
    while len(options) < 4:
        v = random.randint(1, total)
        if str(v) not in options:
            options.append(str(v))
    random.shuffle(options)

    return {
        "type": "fraction",
        "fraction_num": num,
        "fraction_den": den,
        "fraction_name": name,
        "total": total,
        "correct_value": correct_value,
        "correct_answer": str(correct_value),
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": f"Qual é a {name} de {total}?",
    }


# ─── A4. METICAL — NOTAS E MOEDAS ────────────────────────────────────────────

_METICAL_3 = {
    "moedas": [1, 2, 5, 10, 20, 50],
    "notas":  [50, 100, 200, 500],
}
_METICAL_4 = {
    "moedas": [1, 2, 5, 10, 20, 50],
    "notas":  [50, 100, 200, 500, 1000],
}

def build_metical_question(student_class: int, difficulty: int) -> dict:
    config = _METICAL_3 if student_class == 3 else _METICAL_4
    all_denominations = config["moedas"] + config["notas"]

    q_type = random.choice(["identificar", "total", "troco"])

    if q_type == "identificar":
        # "Qual destas NÃO é uma nota/moeda do Metical?"
        valid = random.choice(all_denominations)
        # Valor inválido: algo que não existe
        invalid_pool = [3, 7, 15, 25, 30, 40, 75, 150, 250, 300, 400, 750, 2000]
        invalid = random.choice([v for v in invalid_pool if v not in all_denominations])
        correct_answer = str(invalid)
        wrong = random.sample([str(v) for v in all_denominations if v != valid], 2)
        options = [str(invalid), str(valid)] + wrong
        random.shuffle(options)
        return {
            "type": "metical_identificar",
            "correct_answer": correct_answer,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": "Qual destes valores NÃO existe como nota ou moeda do Metical moçambicano?",
        }

    elif q_type == "total":
        # Sorteia 2-3 itens com preços reais
        n_items = 2 if difficulty <= 2 else 3
        prices = []
        for _ in range(n_items):
            base = random.choice([5, 10, 20, 25, 30, 50, 100, 150, 200])
            prices.append(base)
        total = sum(prices)
        wrong_totals = {total + 10, total - 10, total + 5, total * 2 // 3}
        wrong_totals.discard(total)
        wrong_list = [v for v in wrong_totals if v > 0][:3]
        while len(wrong_list) < 3:
            wrong_list.append(total + random.randint(5, 50))
        options = [str(total)] + [str(w) for w in wrong_list]
        random.shuffle(options)
        items_str = " + ".join([f"{p} MT" for p in prices])
        return {
            "type": "metical_total",
            "prices": prices,
            "total": total,
            "correct_answer": str(total),
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Comprou itens que custam {items_str}. Qual é o total a pagar?",
        }

    else:  # troco
        paid = random.choice([50, 100, 200, 500])
        spend = random.choice([p for p in [10, 20, 30, 40, 50, 75, 100, 150] if p < paid])
        troco = paid - spend
        wrong_trocas = {troco + 5, troco - 5, troco + 10, spend}
        wrong_trocas.discard(troco)
        wrong_list = [v for v in wrong_trocas if v > 0 and v != troco][:3]
        options = [str(troco)] + [str(w) for w in wrong_list]
        random.shuffle(options)
        return {
            "type": "metical_troco",
            "paid": paid,
            "spend": spend,
            "troco": troco,
            "correct_answer": str(troco),
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Pagou {paid} MT e a compra custou {spend} MT. Qual é o troco?",
        }


# ─── A5. SÓLIDOS GEOMÉTRICOS ──────────────────────────────────────────────────

_SOLIDOS = {
    "Cubo":           {"faces": 6, "arestas": 12, "vertices": 8,  "faces_curvas": False},
    "Paralelepípedo": {"faces": 6, "arestas": 12, "vertices": 8,  "faces_curvas": False},
    "Esfera":         {"faces": 0, "arestas": 0,  "vertices": 0,  "faces_curvas": True},
    "Cilindro":       {"faces": 2, "arestas": 0,  "vertices": 0,  "faces_curvas": True},
    "Cone":           {"faces": 1, "arestas": 0,  "vertices": 1,  "faces_curvas": True},
    "Pirâmide":       {"faces": 5, "arestas": 8,  "vertices": 5,  "faces_curvas": False},
}

def build_solido_question(difficulty: int) -> dict:
    solido = random.choice(list(_SOLIDOS.keys()))
    props = _SOLIDOS[solido]
    prop_key = random.choice(["faces", "faces_curvas"] if difficulty <= 2 else ["faces", "arestas", "vertices"])

    if prop_key == "faces_curvas":
        correct_answer = "Sim" if props["faces_curvas"] else "Não"
        wrong = ["Não", "Sim"]
        wrong.remove(correct_answer)
        options = [correct_answer] + wrong
        random.shuffle(options)
        return {
            "type": "solido",
            "solido": solido,
            "prop_key": prop_key,
            "correct_answer": correct_answer,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"O {solido} tem faces curvas?",
        }
    else:
        correct_val = props[prop_key]
        prop_name = {"faces": "faces", "arestas": "arestas", "vertices": "vértices"}[prop_key]
        wrong_vals = {v[prop_key] for k, v in _SOLIDOS.items() if v[prop_key] != correct_val}
        wrong_list = list(wrong_vals)[:3]
        while len(wrong_list) < 3:
            wrong_list.append(correct_val + random.randint(1, 4))
        options = [str(correct_val)] + [str(w) for w in wrong_list[:3]]
        random.shuffle(options)
        return {
            "type": "solido",
            "solido": solido,
            "prop_key": prop_key,
            "correct_answer": str(correct_val),
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Quantas {prop_name} tem um {solido}?",
        }


# ─── A6. QUADRILÁTEROS (4ª classe) ───────────────────────────────────────────

_QUADRILATEROS = {
    "Quadrado":       {"lados_iguais": 4, "angulos_rectos": 4, "pares_paralelos": 2, "lados_opostos_iguais": True},
    "Rectângulo":     {"lados_iguais": 2, "angulos_rectos": 4, "pares_paralelos": 2, "lados_opostos_iguais": True},
    "Paralelogramo":  {"lados_iguais": 2, "angulos_rectos": 0, "pares_paralelos": 2, "lados_opostos_iguais": True},
    "Losango":        {"lados_iguais": 4, "angulos_rectos": 0, "pares_paralelos": 2, "lados_opostos_iguais": True},
    "Trapézio":       {"lados_iguais": 0, "angulos_rectos": 0, "pares_paralelos": 1, "lados_opostos_iguais": False},
}

def build_quadrilatero_question(difficulty: int) -> dict:
    quad = random.choice(list(_QUADRILATEROS.keys()))
    props = _QUADRILATEROS[quad]

    if difficulty <= 2:
        prop_key = "angulos_rectos"
        correct_val = props["angulos_rectos"]
        question_template = f"Quantos ângulos rectos tem um {quad}?"
    else:
        prop_key = "pares_paralelos"
        correct_val = props["pares_paralelos"]
        question_template = f"Quantos pares de lados paralelos tem um {quad}?"

    wrong_vals = list({v[prop_key] for k, v in _QUADRILATEROS.items() if v[prop_key] != correct_val})
    random.shuffle(wrong_vals)
    wrong_list = [str(v) for v in wrong_vals[:3]]
    while len(wrong_list) < 3:
        wrong_list.append(str(correct_val + random.randint(1, 3)))

    options = [str(correct_val)] + wrong_list[:3]
    random.shuffle(options)

    return {
        "type": "quadrilatero",
        "quad": quad,
        "prop_key": prop_key,
        "correct_answer": str(correct_val),
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": question_template,
    }


# ─── A7. TIPOS DE ÂNGULO (4ª classe) ─────────────────────────────────────────

_ANGULO_TIPOS = {
    "recto":   (90, 90),
    "agudo":   (1, 89),
    "obtuso":  (91, 179),
    "raso":    (180, 180),
}

def build_angulo_question(difficulty: int) -> dict:
    tipo = random.choice(list(_ANGULO_TIPOS.keys()))
    mn, mx = _ANGULO_TIPOS[tipo]
    graus = mn if mn == mx else random.randint(mn, mx)

    correct_answer = tipo.capitalize()
    wrong = [t.capitalize() for t in _ANGULO_TIPOS if t != tipo]
    random.shuffle(wrong)
    options = [correct_answer] + wrong[:3]
    random.shuffle(options)

    templates = [
        f"Um ângulo de {graus}° é um ângulo ___.",
        f"Classifica este ângulo: {graus}°. É um ângulo ___.",
        f"O ângulo que mede {graus}° chama-se ângulo ___.",
        f"Na figura, o ângulo marcado mede {graus}°. Que tipo de ângulo é este?",
    ]
    question_template = random.choice(templates)

    return {
        "type": "angulo",
        "graus": graus,
        "tipo": tipo,
        "correct_answer": correct_answer,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": question_template,
    }

# ─── A8. CONVERSÕES FIXAS (4ª classe) ────────────────────────────────────────

_CONVERSOES = [
    ("comprimento", "m",  "cm",  100,   "metro",      "centímetros"),
    ("comprimento", "cm", "m",   100,   "centímetros","metro"),
    ("comprimento", "km", "m",   1000,  "quilómetro", "metros"),
    ("comprimento", "m",  "km",  1000,  "metros",     "quilómetro"),
    ("massa",       "kg", "g",   1000,  "quilograma", "gramas"),
    ("massa",       "g",  "kg",  1000,  "gramas",     "quilograma"),
    ("tempo",       "h",  "min", 60,    "hora",       "minutos"),
    ("tempo",       "min","s",   60,    "minuto",     "segundos"),
    ("tempo",       "dia","h",   24,    "dia",        "horas"),
    ("tempo",       "sem","dia", 7,     "semana",     "dias"),
]

def build_conversao_question(difficulty: int) -> dict:
    grandeza, unit_from, unit_to, factor, name_from, name_to = random.choice(_CONVERSOES)

    if unit_to in ("km", "m", "kg") and factor == 1000:
        # inverso: dado valor grande, achar valor pequeno
        if random.random() < 0.5:
            # directo: 3 km = ? m
            qty = random.randint(1, 5) if difficulty <= 2 else random.randint(2, 15)
            correct_val = qty * factor
            q_template = f"{qty} {name_from} equivale a quantos {name_to}?"
        else:
            # inverso: 3000 m = ? km
            qty = random.randint(1, 5) if difficulty <= 2 else random.randint(2, 15)
            correct_val = qty
            given = qty * factor
            q_template = f"{given} {name_to} equivale a quantos {name_from}?"
    else:
        qty = random.randint(1, 5) if difficulty <= 2 else random.randint(2, 20)
        correct_val = qty * factor
        q_template = f"{qty} {name_from} equivale a quantos {name_to}?"

    wrong_vals = {correct_val + factor, correct_val - factor, correct_val * 2, correct_val // 2}
    wrong_vals.discard(correct_val)
    wrong_list = [v for v in wrong_vals if v > 0][:3]
    while len(wrong_list) < 3:
        wrong_list.append(correct_val + random.randint(1, factor))

    options = [str(correct_val)] + [str(w) for w in wrong_list[:3]]
    random.shuffle(options)

    return {
        "type": "conversao",
        "grandeza": grandeza,
        "correct_answer": str(correct_val),
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": q_template,
    }


# ─── A9. CALENDÁRIO (3ª classe) ──────────────────────────────────────────────

_DIAS_SEMANA = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
                "Sexta-feira", "Sábado", "Domingo"]
_MESES_ANO   = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

def build_calendario_question(difficulty: int) -> dict:
    q_type = random.choice(["total_dias", "total_meses", "posicao_dia", "posicao_mes"])

    if q_type == "total_dias":
        correct_answer = "7"
        wrong = ["5", "6", "8"]
        options = ["7", "5", "6", "8"]
        random.shuffle(options)
        return {"type": "calendario", "correct_answer": "7", "options": options,
                "options_json": json.dumps(options, ensure_ascii=False),
                "question_template": "Quantos dias tem uma semana?"}

    elif q_type == "total_meses":
        correct_answer = "12"
        options = ["10", "11", "12", "13"]
        random.shuffle(options)
        return {"type": "calendario", "correct_answer": "12", "options": options,
                "options_json": json.dumps(options, ensure_ascii=False),
                "question_template": "Quantos meses tem um ano?"}

    elif q_type == "posicao_dia":
        idx = random.randint(0, 6)
        dia = _DIAS_SEMANA[idx]
        pos = idx + 1
        correct_answer = dia
        wrong_pool = [d for d in _DIAS_SEMANA if d != dia]
        random.shuffle(wrong_pool)
        options = [dia] + wrong_pool[:3]
        random.shuffle(options)
        return {"type": "calendario", "correct_answer": dia, "options": options,
                "options_json": json.dumps(options, ensure_ascii=False),
                "question_template": f"Qual é o {pos}º dia da semana?"}

    else:  # posicao_mes
        idx = random.randint(0, 11)
        mes = _MESES_ANO[idx]
        pos = idx + 1
        correct_answer = mes
        wrong_pool = [m for m in _MESES_ANO if m != mes]
        random.shuffle(wrong_pool)
        options = [mes] + wrong_pool[:3]
        random.shuffle(options)
        return {"type": "calendario", "correct_answer": mes, "options": options,
                "options_json": json.dumps(options, ensure_ascii=False),
                "question_template": f"Qual é o {pos}º mês do ano?"}

SOLIDOS_FACES_ARESTAS = {
    "Cubo":           {"faces": 6, "arestas": 12, "vertices": 8},
    "Paralelepípedo": {"faces": 6, "arestas": 12, "vertices": 8},
    "Pirâmide":       {"faces": 5, "arestas": 8,  "vertices": 5},
    "Cone":           {"faces": 2, "arestas": 1,  "vertices": 1},
    "Cilindro":       {"faces": 3, "arestas": 2,  "vertices": 0},
    "Esfera":         {"faces": 1, "arestas": 0,  "vertices": 0},
}

PROPRIEDADES = ["faces", "arestas", "vértices"]
PROPRIEDADES_MAP = {"faces": "faces", "arestas": "arestas", "vértices": "vertices"}

def _build_solido_contagem(difficulty: int) -> dict:
    nome, dados = random.choice(list(SOLIDOS_FACES_ARESTAS.items()))
    prop = random.choice(PROPRIEDADES)
    correct = dados[PROPRIEDADES_MAP[prop]]
    
    # Distratores: outros valores plausíveis
    todos_valores = list({v for d in SOLIDOS_FACES_ARESTAS.values() 
                          for v in d.values() if v != correct})
    random.shuffle(todos_valores)
    wrong = todos_valores[:3]
    while len(wrong) < 3:
        wrong.append(correct + random.choice([-1, 1, 2, -2]))
    
    options = [str(correct)] + [str(w) for w in wrong[:3]]
    random.shuffle(options)
    
    return {
        "type": "solido_contagem",
        "question_template": f"Quantas {prop} tem um {nome}?",
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "correct_answer": str(correct),
    }
# ══════════════════════════════════════════════════════════════
# GRUPO B — PORTUGUÊS
# ══════════════════════════════════════════════════════════════

# ─── B1. ADVÉRBIOS DE LUGAR ───────────────────────────────────────────────────

_ADVERBIOS_LUGAR_3 = ["aqui", "ali", "lá"]
_ADVERBIOS_LUGAR_4 = ["perto", "longe", "onde", "aonde"]
# Distractores: advérbios de OUTROS tipos (para mostrar a diferença)
_ADVERBIOS_LUGAR_DISTRACTORES = ["hoje", "rapidamente", "nunca", "muito", "sempre", "bem", "mal", "já"]

def build_adverbio_lugar_question(student_class: int) -> dict:
    pool = _ADVERBIOS_LUGAR_3 if student_class == 3 else _ADVERBIOS_LUGAR_4
    correct = random.choice(pool)

    q_type = random.choice(["identificar", "completar"])

    if q_type == "identificar":
        # "Qual destas palavras é um advérbio de lugar?"
        wrong_pool = [w for w in _ADVERBIOS_LUGAR_DISTRACTORES]
        random.shuffle(wrong_pool)
        options = [correct] + wrong_pool[:3]
        random.shuffle(options)
        return {
            "type": "adverbio_lugar",
            "correct": correct,
            "correct_answer": correct,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": "Qual destas palavras é um advérbio de lugar?",
        }
    else:
        # "O gato está ___ da janela." → completar com advérbio de lugar correcto
        wrong = [w for w in pool if w != correct]
        if len(wrong) < 3:
            wrong += random.sample(_ADVERBIOS_LUGAR_DISTRACTORES, 3 - len(wrong))
        options = [correct] + wrong[:3]
        random.shuffle(options)
        return {
            "type": "adverbio_lugar",
            "correct": correct,
            "correct_answer": correct,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Completa com o advérbio de lugar correcto: O livro está ___ da mesa.",
        }


# ─── B2. ADVÉRBIOS DE TEMPO (4ª Un.7) ────────────────────────────────────────

_ADVERBIOS_TEMPO_4 = ["cedo", "tarde", "logo", "sempre", "quando"]
_ADVERBIOS_TEMPO_DISTRACTORES = ["rapidamente", "perto", "não", "muito", "bem", "mal"]

def build_adverbio_tempo_question() -> dict:
    correct = random.choice(_ADVERBIOS_TEMPO_4)
    wrong_pool = [w for w in _ADVERBIOS_TEMPO_DISTRACTORES]
    random.shuffle(wrong_pool)
    options = [correct] + wrong_pool[:3]
    random.shuffle(options)
    return {
        "type": "adverbio_tempo",
        "correct": correct,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": "Qual destas palavras é um advérbio de tempo?",
    }


# ─── B3. ADVÉRBIOS DE MODO (4ª Un.8) ─────────────────────────────────────────

_ADVERBIOS_MODO_BASE  = ["bem", "mal", "depressa", "devagar"]
_ADVERBIOS_MODO_MENTE = ["rapidamente", "lentamente", "alegremente",
                          "calmamente", "tristemente", "cuidadosamente"]
_ADVERBIOS_MODO_DISTRACTORES = ["cedo", "perto", "não", "aqui", "sempre"]

def build_adverbio_modo_question(difficulty: int) -> dict:
    pool = _ADVERBIOS_MODO_BASE if difficulty <= 2 else _ADVERBIOS_MODO_BASE + _ADVERBIOS_MODO_MENTE
    correct = random.choice(pool)
    wrong_pool = [w for w in _ADVERBIOS_MODO_DISTRACTORES]
    random.shuffle(wrong_pool)
    options = [correct] + wrong_pool[:3]
    random.shuffle(options)
    return {
        "type": "adverbio_modo",
        "correct": correct,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": "Qual destas palavras é um advérbio de modo?",
    }


# ─── B4. ADVÉRBIOS DE NEGAÇÃO (4ª Un.9) ──────────────────────────────────────

_ADVERBIOS_NEGACAO = ["não", "nunca", "jamais"]
_ADVERBIOS_NEGACAO_DISTRACTORES = ["sempre", "cedo", "bem", "muito"]

def build_adverbio_negacao_question() -> dict:
    correct = random.choice(_ADVERBIOS_NEGACAO)
    wrong_pool = [w for w in _ADVERBIOS_NEGACAO_DISTRACTORES]
    random.shuffle(wrong_pool)
    options = [correct] + wrong_pool[:3]
    random.shuffle(options)
    return {
        "type": "adverbio_negacao",
        "correct": correct,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": "Qual destas palavras é um advérbio de negação?",
    }


# ─── B5. ONOMATOPEIAS DE ANIMAIS (4ª Un.4) ───────────────────────────────────

_ONOMATOPEIAS_ANIMAIS = {
    "cão":      "au au",
    "gato":     "miau",
    "vaca":     "mu",
    "galinha":  "có có",
    "pato":     "quá quá",
    "leão":     "rooaar",
    "burro":    "i-á",
    "porco":    "oinc",
    "ovelha":   "bé",
    "cobra":    "ssss",
    "sapo":     "croac",
    "pinto":    "piu piu",
}

def build_onomatopeia_animal_question() -> dict:
    animal = random.choice(list(_ONOMATOPEIAS_ANIMAIS.keys()))
    correct = _ONOMATOPEIAS_ANIMAIS[animal]
    wrong_pool = [v for k, v in _ONOMATOPEIAS_ANIMAIS.items() if k != animal]
    random.shuffle(wrong_pool)
    options = [correct] + wrong_pool[:3]
    random.shuffle(options)
    return {
        "type": "onomatopeia_animal",
        "animal": animal,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": f"Qual é o som que o {animal} faz?",
    }


# ─── B6. ONOMATOPEIAS DE TRANSPORTES (4ª Un.7) ───────────────────────────────

_ONOMATOPEIAS_TRANSPORTES = {
    "comboio":  "chu-chu",
    "carro":    "brum-brum",
    "mota":     "vrum",
    "buzina":   "bi-bi",
    "avião":    "zuuum",
    "barco":    "buuum",
}

def build_onomatopeia_transporte_question() -> dict:
    transporte = random.choice(list(_ONOMATOPEIAS_TRANSPORTES.keys()))
    correct = _ONOMATOPEIAS_TRANSPORTES[transporte]
    wrong_pool = [v for k, v in _ONOMATOPEIAS_TRANSPORTES.items() if k != transporte]
    random.shuffle(wrong_pool)
    options = [correct] + wrong_pool[:3]
    random.shuffle(options)
    return {
        "type": "onomatopeia_transporte",
        "transporte": transporte,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": f"Qual é o som associado ao {transporte}?",
    }


# ─── B7. NOMES COLECTIVOS (4ª Un.4) ──────────────────────────────────────────

_NOMES_COLETIVOS = {
    "ovelhas":   "rebanho",
    "elefantes": "manada",
    "búfalos":   "manada",
    "lobos":     "alcateia",
    "cães":      "matilha",
    "pássaros":  "bando",
    "peixes":    "cardume",
    "abelhas":   "enxame",
    "formigas":  "formigueiro",
    "leões":     "alcateia",
    "bois":      "boiada",
    "árvores":   "floresta",
}

def build_coletivo_question() -> dict:
    animal = random.choice(list(_NOMES_COLETIVOS.keys()))
    correct = _NOMES_COLETIVOS[animal]
    wrong_pool = list({v for k, v in _NOMES_COLETIVOS.items() if v != correct})
    random.shuffle(wrong_pool)
    options = [correct] + wrong_pool[:3]
    random.shuffle(options)
    return {
        "type": "coletivo",
        "animal": animal,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": f"Como se chama um grupo de {animal}?",
    }


# ─── B8. VERBO VIR — PRESENTE (3ª Un.3) ──────────────────────────────────────

_VERBO_VIR = {
    "eu":   "venho",
    "tu":   "vens",
    "ele":  "vem",
    "nós":  "vimos",
    "eles": "vêm",
}
# Formas erradas plausíveis (regularizações ou interferências do Português MZ)
_VERBO_VIR_ERROS = {
    "eu":   ["veno", "venio", "vinho"],
    "tu":   ["venis", "vines", "vems"],
    "ele":  ["veni", "vine", "viene"],
    "nós":  ["venimos", "víamos", "vêmos"],
    "eles": ["venos", "veniam", "veem"],
}

def build_verbo_vir_question() -> dict:
    pessoa = random.choice(list(_VERBO_VIR.keys()))
    correct = _VERBO_VIR[pessoa]
    wrong = _VERBO_VIR_ERROS[pessoa][:]
    random.shuffle(wrong)
    options = [correct] + wrong[:3]
    random.shuffle(options)
    return {
        "type": "verbo_vir",
        "pessoa": pessoa,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": f"Qual é a forma correcta do verbo VIR para '{pessoa}'?",
    }


# ─── B9. VERBOS IRREGULARES NO PRESENTE (4ª Un.3) ────────────────────────────

_VERBOS_IRREGULARES = {
    "ser":   {"eu":"sou",    "tu":"és",     "ele":"é",     "nós":"somos",  "eles":"são"},
    "estar": {"eu":"estou",  "tu":"estás",  "ele":"está",  "nós":"estamos","eles":"estão"},
    "dar":   {"eu":"dou",    "tu":"dás",    "ele":"dá",    "nós":"damos",  "eles":"dão"},
    "ter":   {"eu":"tenho",  "tu":"tens",   "ele":"tem",   "nós":"temos",  "eles":"têm"},
    "ler":   {"eu":"leio",   "tu":"lês",    "ele":"lê",    "nós":"lemos",  "eles":"leem"},
}
_VERBOS_IRREGULARES_ERROS = {
    "ser":   {"eu":["sejo","sou","sero"],    "tu":["seres","ser","seis"],   "ele":["ser","ê","seja"],  "nós":["sermos","semos","somos"], "eles":["seram","serem","são"]},
    "estar": {"eu":["estão","estás","esto"], "tu":["estou","estas","esteis"],"ele":["estão","estam","estám"],"nós":["estão","estais","estamo"],"eles":["está","estam","estais"]},
    "dar":   {"eu":["dou","dao","dás"],      "tu":["da","das","dou"],        "ele":["dao","dão","das"],  "nós":["damos","dão","daros"],   "eles":["da","dão","damos"]},
    "ter":   {"eu":["teno","tens","tere"],   "tu":["tenho","tem","teres"],   "ele":["tenho","tens","tere"],"nós":["tenho","têmos","termos"],"eles":["tem","tenha","teram"]},
    "ler":   {"eu":["leo","lero","les"],     "tu":["leio","ler","leres"],    "ele":["leio","lê","ler"],   "nós":["lemos","lermos","leemos"],"eles":["lê","leram","leemos"]},
}

def build_verbo_irregular_question() -> dict:
    verbo  = random.choice(list(_VERBOS_IRREGULARES.keys()))
    pessoa = random.choice(list(_VERBOS_IRREGULARES[verbo].keys()))
    correct = _VERBOS_IRREGULARES[verbo][pessoa]
    wrong = _VERBOS_IRREGULARES_ERROS[verbo][pessoa][:]
    # Filtrar se por acaso algum coincide com o correcto
    wrong = [w for w in wrong if w != correct]
    random.shuffle(wrong)
    options = [correct] + wrong[:3]
    random.shuffle(options)
    return {
        "type": "verbo_irregular",
        "verbo": verbo,
        "pessoa": pessoa,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": f"Qual é a forma correcta do verbo '{verbo.upper()}' para '{pessoa}' no Presente?",
    }


# ─── B10. PRONOMES DEMONSTRATIVOS (4ª Un.3) ──────────────────────────────────

_PRON_DEM = {
    "perto_fala": {
        "m_sg": "este",  "f_sg": "esta",  "m_pl": "estes",  "f_pl": "estas",  "neutro": "isto"
    },
    "perto_ouve": {
        "m_sg": "esse",  "f_sg": "essa",  "m_pl": "esses",  "f_pl": "essas",  "neutro": "isso"
    },
    "longe": {
        "m_sg": "aquele","f_sg": "aquela","m_pl": "aqueles","f_pl": "aquelas","neutro": "aquilo"
    },
}

def build_pronome_dem_question() -> dict:
    distancia = random.choice(list(_PRON_DEM.keys()))
    genero_num = random.choice(["m_sg", "f_sg", "m_pl", "f_pl"])
    correct = _PRON_DEM[distancia][genero_num]

    # Distractores: mesma forma mas das outras distâncias
    wrong = [_PRON_DEM[d][genero_num] for d in _PRON_DEM if d != distancia]
    # Adicionar forma neutra da distância errada
    wrong.append(_PRON_DEM[distancia]["neutro"] if genero_num != "neutro" else _PRON_DEM[distancia]["m_sg"])
    wrong = [w for w in wrong if w != correct]
    random.shuffle(wrong)
    options = [correct] + wrong[:3]
    random.shuffle(options)

    dist_label = {"perto_fala": "perto de quem fala", "perto_ouve": "perto de quem ouve", "longe": "longe de ambos"}[distancia]
    gen_label  = {"m_sg": "masculino singular", "f_sg": "feminino singular", "m_pl": "masculino plural", "f_pl": "feminino plural"}[genero_num]

    return {
        "type": "pronome_dem",
        "distancia": distancia,
        "genero_num": genero_num,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": f"Qual é o pronome demonstrativo {gen_label} para algo {dist_label}?",
    }


# ─── B11. PRONOMES POSSESSIVOS (4ª Un.6) ─────────────────────────────────────

_PRON_POSS = {
    "1sg": {"m_sg":"meu",   "f_sg":"minha",  "m_pl":"meus",   "f_pl":"minhas"},
    "2sg": {"m_sg":"teu",   "f_sg":"tua",    "m_pl":"teus",   "f_pl":"tuas"},
    "3sg": {"m_sg":"seu",   "f_sg":"sua",    "m_pl":"seus",   "f_pl":"suas"},
    "1pl": {"m_sg":"nosso", "f_sg":"nossa",  "m_pl":"nossos", "f_pl":"nossas"},
    "2pl": {"m_sg":"vosso", "f_sg":"vossa",  "m_pl":"vossos", "f_pl":"vossas"},
}

def build_pronome_poss_question() -> dict:
    pessoa     = random.choice(list(_PRON_POSS.keys()))
    genero_num = random.choice(list(_PRON_POSS[pessoa].keys()))
    correct    = _PRON_POSS[pessoa][genero_num]

    wrong = [_PRON_POSS[p][genero_num] for p in _PRON_POSS if p != pessoa]
    wrong = [w for w in wrong if w != correct]
    random.shuffle(wrong)
    options = [correct] + wrong[:3]
    random.shuffle(options)

    pessoa_label = {"1sg":"eu","2sg":"tu","3sg":"ele/ela","1pl":"nós","2pl":"vós"}[pessoa]
    gen_label    = {"m_sg":"masculino singular","f_sg":"feminino singular","m_pl":"masculino plural","f_pl":"feminino plural"}[genero_num]

    return {
        "type": "pronome_poss",
        "pessoa": pessoa,
        "genero_num": genero_num,
        "correct_answer": correct,
        "options": options,
        "options_json": json.dumps(options, ensure_ascii=False),
        "question_template": f"Qual é o pronome possessivo de '{pessoa_label}' no {gen_label}?",
    }


# ─── B12. SINAIS DE PONTUAÇÃO (3ª Un.2) ──────────────────────────────────────

_PONTUACAO = {
    "ponto final":          {"sinal": ".", "uso": "terminar uma frase afirmativa"},
    "ponto de interrogação":{"sinal": "?", "uso": "fazer uma pergunta"},
    "ponto de exclamação":  {"sinal": "!", "uso": "expressar surpresa ou ordem"},
    "vírgula":              {"sinal": ",", "uso": "fazer uma pausa ou separar elementos"},
}

def build_pontuacao_question() -> dict:
    nome, info = random.choice(list(_PONTUACAO.items()))
    correct_sinal = info["sinal"]
    correct_nome  = nome

    q_type = random.choice(["sinal_para_nome", "nome_para_sinal"])

    if q_type == "sinal_para_nome":
        wrong = [n for n in _PONTUACAO if n != nome]
        random.shuffle(wrong)
        options = [nome] + wrong[:3]
        random.shuffle(options)
        return {
            "type": "pontuacao",
            "correct_answer": nome,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Como se chama o sinal '{correct_sinal}'?",
        }
    else:
        wrong_sinais = [v["sinal"] for k, v in _PONTUACAO.items() if k != nome]
        options = [correct_sinal] + wrong_sinais[:3]
        random.shuffle(options)
        return {
            "type": "pontuacao",
            "correct_answer": correct_sinal,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Qual é o sinal de '{nome}'?",
        }


# ─── B13. ESTRUTURA DE TIPOS DE TEXTO ────────────────────────────────────────

_TIPOS_TEXTO = {
    "bilhete": {
        "elementos": ["destinatário", "mensagem", "remetente", "data"],
        "nao_elementos": ["título", "introdução", "conclusão", "refrão"],
    },
    "convite": {
        "elementos": ["destinatário", "motivo", "local", "data", "hora"],
        "nao_elementos": ["remetente anónimo", "preço", "resumo", "moral"],
    },
    "carta familiar": {
        "elementos": ["cabeçalho", "corpo da carta", "desfecho"],
        "nao_elementos": ["refrão", "introdução formal", "conclusão técnica"],
    },
    "aviso": {
        "elementos": ["título", "destinatário", "conteúdo", "data", "assinatura"],
        "nao_elementos": ["refrão", "moral", "desfecho poético"],
    },
    "entrevista": {
        "elementos": ["título", "introdução", "perguntas", "respostas", "conclusão"],
        "nao_elementos": ["refrão", "desfecho", "moral"],
    },
}

def build_tipo_texto_question() -> dict:
    tipo, info = random.choice(list(_TIPOS_TEXTO.items()))
    q_type = random.choice(["elemento_pertence", "elemento_nao_pertence"])

    if q_type == "elemento_pertence":
        correct = random.choice(info["elementos"])
        wrong = random.sample(info["nao_elementos"], min(3, len(info["nao_elementos"])))
        while len(wrong) < 3:
            wrong.append(random.choice(["refrão", "moral", "apêndice", "índice"]))
        options = [correct] + wrong[:3]
        random.shuffle(options)
        return {
            "type": "tipo_texto",
            "tipo": tipo,
            "correct_answer": correct,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Qual destes elementos FAZ PARTE de um {tipo}?",
        }
    else:
        correct = random.choice(info["nao_elementos"])
        wrong = random.sample(info["elementos"], min(3, len(info["elementos"])))
        options = [correct] + wrong[:3]
        random.shuffle(options)
        return {
            "type": "tipo_texto",
            "tipo": tipo,
            "correct_answer": correct,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Qual destes elementos NÃO FAZ PARTE de um {tipo}?",
        }


# ─── B14. CLASSIFICAÇÃO DE TRANSPORTES (4ª Un.7) ─────────────────────────────

_TRANSPORTES = {
    "terrestre": [
        "chapa 100", "machimbombo", "autocarro", "comboio",
        "bicicleta", "motorizada", "mota", "carro", "camião",
    ],
    "marítimo": [
        "barco", "dhow", "canoa", "navio", "lancha",
    ],
    "aéreo": [
        "avião", "helicóptero",
    ],
}
# Índice inverso: transporte → categoria
_TRANSPORTE_CATEGORIA = {
    t: cat for cat, lista in _TRANSPORTES.items() for t in lista
}

def build_classificacao_transporte_question() -> dict:
    q_type = random.choice(["transporte_para_categoria", "categoria_para_exemplo"])

    if q_type == "transporte_para_categoria":
        transporte = random.choice(list(_TRANSPORTE_CATEGORIA.keys()))
        correct    = _TRANSPORTE_CATEGORIA[transporte].capitalize()
        wrong      = [c.capitalize() for c in _TRANSPORTES if c != _TRANSPORTE_CATEGORIA[transporte]]
        # Garante 3 opções erradas — adiciona variante se necessário
        while len(wrong) < 3:
            wrong.append(random.choice(["Subterrâneo", "Espacial", "Fluvial"]))
        options = [correct] + wrong[:3]
        random.shuffle(options)
        return {
            "type": "classificacao_transporte",
            "transporte": transporte,
            "correct_answer": correct,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"O {transporte} é um meio de transporte ___.",
        }

    else:  # categoria_para_exemplo
        categoria = random.choice(list(_TRANSPORTES.keys()))
        correct   = random.choice(_TRANSPORTES[categoria])
        # Distractores: um de cada outra categoria
        wrong = [random.choice(v) for k, v in _TRANSPORTES.items() if k != categoria]
        while len(wrong) < 3:
            wrong.append(random.choice(_TRANSPORTES[categoria]))
        wrong = [w for w in wrong if w != correct][:3]
        options = [correct] + wrong
        random.shuffle(options)
        return {
            "type": "classificacao_transporte",
            "categoria": categoria,
            "correct_answer": correct,
            "options": options,
            "options_json": json.dumps(options, ensure_ascii=False),
            "question_template": f"Qual destes é um meio de transporte {categoria}?",
        }


# ══════════════════════════════════════════════════════════════
# DISPATCHER PRINCIPAL
# ══════════════════════════════════════════════════════════════

def get_finite_domain_data(structure: str, student_class: int, difficulty: int) -> Optional[dict]:
    """
    Recebe a structure do slot/rush e devolve dados pré-calculados
    se for um domínio finito. Devolve None caso contrário.
    """
    s = structure.lower()

    # ── Matemática ──
    if any(k in s for k in ["romano", "numeração romana", "converter número"]):
        return build_roman_question(student_class, difficulty)

    if any(k in s for k in ["ordinal", "número ordinal"]):
        return build_ordinal_question(student_class, difficulty)

    if any(k in s for k in ["metade", "terço", "quarto", "fracção básica", "1/2", "1/3", "1/4"]) and student_class == 3:
        return build_fraction_question(difficulty)

    if any(k in s for k in ["metical", "nota", "moeda", "troco", "compra"]):
        return build_metical_question(student_class, difficulty)

    if any(k in s for k in ["faces curvas", "tem faces curvas", "quantas faces"]):
        return build_solido_question(difficulty)

    if any(k in s for k in ["contar faces", "arestas", "vértices"]):
        return _build_solido_contagem(difficulty)

    if any(k in s for k in ["quadrilátero", "quadrilatero", "trapézio", "losango", "paralelogramo"]):
        return build_quadrilatero_question(difficulty)

    if any(k in s for k in ["tipo de ângulo", "classificar o ângulo", "identificar o ângulo",
                            "ângulo recto", "ângulo agudo", "ângulo obtuso", "ângulo raso",
                            "recto (90", "agudo (menor", "obtuso (entre", "raso (180"]):
        return build_angulo_question(difficulty)

    if any(k in s for k in ["converter", "conversão", "m↔cm", "km↔m", "kg↔g"]):
        return build_conversao_question(difficulty)

    if any(k in s for k in ["calendário", "dias da semana", "meses do ano", "semana", "mês do ano"]):
        return build_calendario_question(difficulty)
    
    if any(k in s for k in ["contar faces", "arestas", "vértices", "faces, arestas"]):
        return _build_solido_contagem(difficulty)

    # ── Português ──
    if any(k in s for k in ["advérbio de lugar", "adverbio de lugar"]):
        return build_adverbio_lugar_question(student_class)

    if any(k in s for k in ["advérbio de tempo", "adverbio de tempo"]):
        return build_adverbio_tempo_question()

    if any(k in s for k in ["advérbio de modo", "adverbio de modo"]):
        return build_adverbio_modo_question(difficulty)

    if any(k in s for k in ["advérbio de negação", "adverbio de negacao", "negação"]):
        return build_adverbio_negacao_question()

    if any(k in s for k in ["onomatopeia", "som que o", "voz do animal", "som do animal"]):
        if any(k in s for k in ["transporte", "comboio", "carro", "avião"]):
            return build_onomatopeia_transporte_question()
        return build_onomatopeia_animal_question()

    if any(k in s for k in ["nome colectivo", "nome coletivo", "colectivo", "coletivo"]):
        return build_coletivo_question()

    if any(k in s for k in ["verbo vir", "verbo 'vir'", "conjugar o verbo vir"]):
        return build_verbo_vir_question()

    if any(k in s for k in ["verbo irregular", "ser/estar", "ser, estar", "conjugar verbo irregular"]):
        return build_verbo_irregular_question()

    if any(k in s for k in ["pronome demonstrativo", "pronome dem"]):
        return build_pronome_dem_question()

    if any(k in s for k in ["pronome possessivo", "pronome poss"]):
        return build_pronome_poss_question()

    if any(k in s for k in ["sinal de pontuação", "pontuação", "ponto final", "ponto de interrogação"]):
        return build_pontuacao_question()

    if any(k in s for k in ["tipo de texto", "elementos de um", "elementos do", "bilhete", "convite", "carta familiar", "aviso", "entrevista"]):
        return build_tipo_texto_question()

    if any(k in s for k in ["classificar transporte", "tipo de transporte", "terrestre", "marítimo", "aéreo"]):
        return build_classificacao_transporte_question()

    return None