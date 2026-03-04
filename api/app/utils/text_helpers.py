import json
import re
from typing import Any
import random

def safe_load_json_object(text: str) -> Any | None:
    if not text: return None
    text = text.replace('“', '"').replace('”', '"').replace('\r\n', '\n')
    
    # Remove markdown ```json ... ```
    clean_text = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
    clean_text = re.sub(r"```", "", clean_text)
    
    # Tenta encontrar o primeiro { e o último }
    start = clean_text.find('{')
    end = clean_text.rfind('}')
    
    if start != -1 and end != -1:
        candidate = clean_text[start:end+1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
    
    return None

def truncate_history_by_chars(history: list[dict], max_chars: int = 4000) -> list[dict]:
    if not history: return []
    total = 0
    kept = []
    for msg in reversed(history):
        text = str(msg.get("text", ""))
        if total + len(text) > max_chars: break
        kept.append(msg)
        total += len(text)
    return list(reversed(kept))


import re
import operator

def _sanitize_rush_payload(raw_obj: dict, subject: str, subtopic: str) -> dict:
    """
    Sanitizador universal com validação condicional inteligente.
    """

    if not isinstance(raw_obj, dict):
        raise ValueError("Payload inválido")

    question = str(raw_obj.get("question", "")).strip()
    explanation = str(raw_obj.get("explanation", "")).strip()
    raw_correct = str(raw_obj.get("correct_answer", "")).strip()

    raw_options = raw_obj.get("options", [])
    if not isinstance(raw_options, list):
        raise ValueError("Opções inválidas")

    # -------------------------
    # Normalizar opções
    # -------------------------
    options = []
    for opt in raw_options:
        clean = str(opt).strip().strip('"').strip("'").strip(".")
        if clean:
            options.append(clean)

    # Remover duplicadas
    options = list(dict.fromkeys(options))

    if len(options) < 3:
        raise ValueError("Menos de 3 opções únicas")

    # -------------------------
    # Garantir resposta correta válida
    # -------------------------
    clean_correct = raw_correct.strip('"').strip("'").strip(".")

    if clean_correct not in options:
        raise ValueError("Resposta correta não corresponde às opções")

    # -------------------------
    # 🔥 VALIDAÇÃO MATEMÁTICA CONDICIONAL
    # -------------------------
    q_type = _detect_question_type(question)

    if subject == "matematica" and q_type == "explicit_arithmetic":
        correct_number = int(re.findall(r'\d+', clean_correct)[0])
        smart_distractors = _generate_smart_distractors(correct_number)
        options = [str(correct_number)] + [str(d) for d in smart_distractors]
        random.shuffle(options)
        clean_correct = str(correct_number)

    if not question or not explanation:
        raise ValueError("Pergunta ou explicação vazia")

    if _pedagogical_score(question, options) < 3:
        raise ValueError("Pergunta fraca pedagogicamente")

    return {
        "question": question,
        "options": options,
        "correct_answer": clean_correct,
        "explanation": explanation
    }

# ------------------------------------------
# Detecta se o tópico é de operação direta
# ------------------------------------------
def _is_arithmetic_topic(subtopic: str) -> bool:
    arithmetic_keywords = [
        "adição",
        "subtração",
        "somas",
        "multiplicação",
        "divisão",
        "expressões"
    ]

    sub = subtopic.lower()
    return any(k in sub for k in arithmetic_keywords)


# ------------------------------------------
# Validação simples de expressão matemática
# ------------------------------------------
def _validate_arithmetic_question(question: str, correct_answer: str):

    # Extrair expressão tipo: 345 + 120
    match = re.search(r'(\d+)\s*([+\-x×÷])\s*(\d+)', question)
    
    if not match:
        return  # Não encontrou expressão explícita → ignora

    a = int(match.group(1))
    op = match.group(2)
    b = int(match.group(3))

    ops = {
        '+': operator.add,
        '-': operator.sub,
        'x': operator.mul,
        '×': operator.mul,
        '÷': operator.floordiv
    }

    if op not in ops:
        return

    result = ops[op](a, b)

    # Extrair número da resposta correta
    correct_number = int(re.findall(r'\d+', correct_answer)[0])

    if result != correct_number:
        raise ValueError(
            f"Erro matemático detectado: {a} {op} {b} != {correct_number}"
        )

def _detect_question_type(question: str) -> str:
    q = question.lower()

    # expressão matemática explícita
    if re.search(r'\d+\s*[+\-x×÷]\s*\d+', q):
        return "explicit_arithmetic"

    # problema textual com números
    if re.search(r'\d+', q) and any(word in q for word in [
        "comprou", "vendeu", "tem", "gastou", "recebeu", "restam"
    ]):
        return "word_problem"

    # conceitos geométricos
    if any(word in q for word in [
        "triângulo", "quadrado", "ângulo", "círculo", "reta"
    ]):
        return "geometry"

    return "conceptual"

def clean_json_text(raw_text):
    """
    Remove lixo que a IA coloca antes ou depois do JSON.
    Ex: Remove '[STATE: EXPLANATION]', '```json', etc.
    """
    # 1. Remove blocos de código Markdown
    text = raw_text.replace("```json", "").replace("```", "")
    
    # 2. Remove a tag de estado se ela aparecer (Ex: [STATE: EXPLANATION])
    text = re.sub(r'\[STATE:.*?\]', '', text)
    
    # 3. Remove espaços extras no início/fim
    text = text.strip()
    
    # 4. Procura o primeiro '{' e o último '}'
    # Isto ignora qualquer texto introdutório como "Aqui está o JSON:"
    match = re.search(r'\{.*\}', text, re.DOTALL)
    
    if match:
        return match.group()
    return text

def _pedagogical_score(question: str, options: list) -> int:
    score = 0

    if len(question) > 15:
        score += 1

    if len(options) >= 4:
        score += 1

    if not any(opt == options[0] for opt in options[1:]):
        score += 1

    if "?" in question:
        score += 1

    return score


def _generate_smart_distractors(correct_value: int):

    distractors = set()

    # erro comum: trocar dígitos
    swapped = int(str(correct_value)[::-1])
    if swapped != correct_value:
        distractors.add(swapped)

    # erro comum: esquecer zero
    if correct_value > 10:
        distractors.add(correct_value // 10)

    # erro comum: +10 ou -10
    distractors.add(correct_value + 10)
    distractors.add(correct_value - 10)

    # garantir 3 únicos
    distractors = [d for d in distractors if d > 0]
    random.shuffle(distractors)

    return distractors[:3]

def remove_emojis(text: str) -> str:
    # Esta regex remove a maioria dos emojis e símbolos pictográficos do Unicode
    # Mantém letras, acentos (essenciais para pt-MZ) e pontuação.
    return re.sub(r'[^\x00-\x7F\u00C0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]', '', text)