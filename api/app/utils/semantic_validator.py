"""
semantic_validator.py
─────────────────────
Validação semântica de respostas do aluno usando FastEmbed (local, sem API).

Fluxo de avaliação no FEEDBACK:
  1. _norm(user) == _norm(correct)      → CORRECT  (match exato)
  2. is_semantically_correct(...)       → CORRECT  (equivalência semântica)
  3. fallthrough                        → INCORRECT (claramente errado)

Só se aplica a DIRECT_INPUT — para CHIPS/CLOZE/TRUE_FALSE o match exato é
suficiente (o aluno seleciona de uma lista).

Modelo: paraphrase-multilingual-MiniLM-L12-v2
  - Multilíngue (cobre pt-MZ, pt-PT, pt-BR)
  - Leve ~120MB, sem GPU necessária
  - Ideal para respostas curtas e concretas de crianças
"""

from __future__ import annotations

import re
import numpy as np

# ── Lazy init — modelo carregado uma vez ao primeiro uso ──────────────────────
_model = None

def _get_model():
    global _model
    if _model is None:
        try:
            from fastembed import TextEmbedding
            print("🔄 [SemanticValidator] A carregar modelo multilíngue...", flush=True)
            _model = TextEmbedding(
                model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            )
            print("✅ [SemanticValidator] Modelo pronto.", flush=True)
        except Exception as e:
            print(f"⚠️ [SemanticValidator] FastEmbed indisponível: {e}", flush=True)
            _model = None
    return _model


# ── Threshold ─────────────────────────────────────────────────────────────────
# 0.82 — calibrado para respostas curtas de matemática em português.
# Aumenta se houver falsos positivos; baixa se respostas corretas forem rejeitadas.
SEMANTIC_THRESHOLD = 0.82


# ── Normalização numérica pt-MZ ───────────────────────────────────────────────
# Cobre os casos mais comuns de 8-10 anos (números até 6 dígitos).
# "trezentos mil" → "300000", "300.000" → "300000", "300 mil" → "300000"

_PT_UNITS = {
    "zero": 0, "um": 1, "uma": 1, "dois": 2, "duas": 2, "três": 3,
    "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "oito": 8, "nove": 9,
    "dez": 10, "onze": 11, "doze": 12, "treze": 13, "catorze": 14,
    "quinze": 15, "dezasseis": 16, "dezassete": 17, "dezoito": 18, "dezanove": 19,
    "vinte": 20, "trinta": 30, "quarenta": 40, "cinquenta": 50,
    "sessenta": 60, "setenta": 70, "oitenta": 80, "noventa": 90,
    "cem": 100, "cento": 100,
    "duzentos": 200, "duzentas": 200, "trezentos": 300, "trezentas": 300,
    "quatrocentos": 400, "quatrocentas": 400, "quinhentos": 500, "quinhentas": 500,
    "seiscentos": 600, "seiscentas": 600, "setecentos": 700, "setecentas": 700,
    "oitocentos": 800, "oitocentas": 800, "novecentos": 900, "novecentas": 900,
}
_PT_MULTIPLIERS = {"mil": 1_000, "milhão": 1_000_000, "milhões": 1_000_000}


def _pt_words_to_number(text: str) -> int | None:
    """
    Converte expressão numérica em português para inteiro.
    Exemplos:
      "trezentos mil"        → 300000
      "trezentos e quarenta" → 340
      "dois mil e quinhentos" → 2500
    Devolve None se não conseguir converter.
    """
    t = text.strip().lower()
    # Remove "e" de ligação
    t = re.sub(r'\be\b', ' ', t)
    tokens = t.split()

    result = 0
    current = 0
    for token in tokens:
        if token in _PT_UNITS:
            current += _PT_UNITS[token]
        elif token in _PT_MULTIPLIERS:
            mult = _PT_MULTIPLIERS[token]
            current = current if current else 1
            result += current * mult
            current = 0
        else:
            return None  # token desconhecido — não é expressão numérica pura

    return result + current


def _to_canonical_number(text: str) -> str | None:
    """
    Tenta converter texto em número canónico (string de inteiro).
    Aceita:
      - "300.000" / "300 000" / "300000"  → "300000"
      - "trezentos mil"                   → "300000"
      - "300 mil"                         → "300000"
    Devolve None se não conseguir.
    """
    # Remove pontos/espaços de milhares e vírgula decimal
    cleaned = re.sub(r'[\s.]', '', text.strip().lower())
    cleaned = cleaned.replace(',', '.')

    # Tenta parse direto como número
    try:
        val = float(cleaned)
        if val == int(val):
            return str(int(val))
        return str(val)
    except ValueError:
        pass

    # Tenta conversão "X mil" (ex: "300 mil")
    m = re.match(r'^(\d+)\s*mil$', text.strip().lower())
    if m:
        return str(int(m.group(1)) * 1000)

    # Tenta conversão "X mil Y" (ex: "567 mil 890") — formato misto dígitos+palavras
    m = re.match(r'^(\d+)\s*mil\s+(\d+)$', text.strip().lower())
    if m:
        return str(int(m.group(1)) * 1000 + int(m.group(2)))

    # Tenta conversão por palavras
    result = _pt_words_to_number(text.strip())
    if result is not None:
        return str(result)

    return None


def _numeric_match(user: str, correct: str) -> bool:
    """
    Verifica equivalência numérica entre resposta do aluno e resposta correta.
    "trezentos mil" == "300.000" → True
    """
    u = _to_canonical_number(user)
    c = _to_canonical_number(correct)
    if u is not None and c is not None:
        match = (u == c)
        if match:
            print(
                f"🔢 [SemanticValidator] Match numérico: '{user}' ↔ '{correct}' = {u}",
                flush=True,
            )
        return match
    return False


# ── Similaridade coseno ───────────────────────────────────────────────────────

def _cosine_similarity(text_a: str, text_b: str) -> float | None:
    """
    Devolve similaridade coseno [0,1] entre dois textos.
    Devolve None se o modelo não estiver disponível.
    """
    model = _get_model()
    if model is None:
        return None
    try:
        embeddings = list(model.embed([text_a, text_b]))
        a = np.array(embeddings[0], dtype=float)
        b = np.array(embeddings[1], dtype=float)
        norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
    except Exception as e:
        print(f"⚠️ [SemanticValidator] Erro ao calcular similaridade: {e}", flush=True)
        return None


# ── API pública ───────────────────────────────────────────────────────────────

def is_semantically_correct(
    user_answer: str,
    correct_answer: str,
    interaction_type: str = "DIRECT_INPUT",
    threshold: float = SEMANTIC_THRESHOLD,
) -> bool:
    """
    Devolve True se a resposta do aluno for semanticamente equivalente
    à resposta correta.

    Aplica-se APENAS a DIRECT_INPUT (resposta aberta).
    Para CHIPS / CLOZE / TRUE_FALSE o match exato (_norm) é suficiente.

    Ordem de verificação:
      1. Match numérico (ex: "trezentos mil" == "300.000")
      2. Similaridade coseno ≥ threshold via FastEmbed
    """
    # Só para respostas abertas
    if interaction_type not in ("DIRECT_INPUT",):
        return False

    if not user_answer or not correct_answer:
        return False

    u = user_answer.strip()
    c = correct_answer.strip()

    # 1. Match numérico (cobre a maioria dos casos de matemática)
    if _numeric_match(u, c):
        return True

    # 2. Similaridade semântica (FastEmbed)
    sim = _cosine_similarity(u, c)
    if sim is None:
        # Modelo indisponível — não penaliza o aluno, assume INCORRECT
        return False

    print(
        f"🧠 [SemanticValidator] '{u}' ↔ '{c}' = {sim:.3f} "
        f"(threshold={threshold})",
        flush=True,
    )
    return sim >= threshold