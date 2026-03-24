# app/utils/geometry_validator.py
#
# Validador factual para perguntas de geometria.
# Usado em _sanitize_rush_payload para rejeitar respostas incorrectas
# antes de devolver ao frontend.
#
import re
from typing import Optional
 
# ─── OBJECTOS → SÓLIDO CORRECTO ───────────────────────────────────────────────
# Mapeamento de objectos do quotidiano para o sólido geométrico correcto.
# Usado para verificar se "garrafa → cilindro" e não "garrafa → pirâmide".
#
# Formato: "keyword_no_objecto": "nome_do_sólido"
 
OBJECTO_SOLIDO: dict[str, str] = {
    # Cilindros
    "lata":          "cilindro",
    "garrafa":       "cilindro",
    "copo":          "cilindro",
    "rolo":          "cilindro",
    "lápis":         "cilindro",
    "pilão":         "cilindro",
    "balde":         "cilindro",
    "tubo":          "cilindro",
    "tambor":        "cilindro",
    "barril":        "cilindro",
    # Esferas
    "bola":          "esfera",
    "pote":          "esfera",
    "globo":         "esfera",
    "laranja":       "esfera",
    "melancia":      "esfera",
    # Paralelepípedos / Cubos
    "tijolo":        "paralelepípedo",
    "caixa":         "paralelepípedo",
    "caixote":       "paralelepípedo",
    "livro":         "paralelepípedo",
    "caderno":       "paralelepípedo",
    "borracha":      "paralelepípedo",
    "sapato":        "paralelepípedo",
    "dado":          "cubo",         # dado de jogar = cubo
    "cubo":          "cubo",
    # Cones
    "cone":          "cone",
    "chapéu":        "cone",
    "funil":         "cone",
    "sorvete":       "cone",
    # Pirâmides
    "pirâmide":      "pirâmide",
    "tenda":         "pirâmide",
    "telhado":       "pirâmide",
}
 
# ─── PROPRIEDADES DOS SÓLIDOS ──────────────────────────────────────────────────
# Factos verificáveis sobre cada sólido: faces, arestas, vértices.
# Formato: nome_sólido → {propriedade: valor_correcto}
 
PROPRIEDADES_SOLIDO: dict[str, dict[str, int]] = {
    "cubo":          {"faces": 6, "arestas": 12, "vértices": 8},
    "paralelepípedo": {"faces": 6, "arestas": 12, "vértices": 8},
    "pirâmide":      {"faces": 5, "arestas": 8,  "vértices": 5},  # base quadrada
    "cilindro":      {"faces": 0, "arestas": 0,  "vértices": 0},  # não tem (superfície curva)
    "cone":          {"faces": 0, "arestas": 0,  "vértices": 1},  # só o vértice do topo
    "esfera":        {"faces": 0, "arestas": 0,  "vértices": 0},  # nenhum
}
 
# Sólidos que NÃO têm vértices nem arestas (superfícies curvas)
SOLIDOS_SEM_VERTICES = {"cilindro", "esfera", "cone"}
 
# ─── PROPRIEDADES DOS ÂNGULOS ─────────────────────────────────────────────────
# Graus → tipo de ângulo correcto
 
def _tipo_angulo_correcto(graus: int) -> str:
    if graus == 90:
        return "recto"
    elif graus < 90:
        return "agudo"
    elif graus == 180:
        return "raso"
    else:  # > 90 e < 180
        return "obtuso"
 
# ─── FUNÇÃO PRINCIPAL ──────────────────────────────────────────────────────────
 
def validate_geometry_answer(
    question: str,
    correct_answer: str,
    options: list[str],
) -> Optional[str]:
    """
    Valida factualmente a resposta de uma pergunta de geometria.
    Devolve uma string com o erro se encontrar problema, ou None se ok.
 
    Verifica:
    1. Objecto → Sólido: "garrafa é um exemplo de ___" → deve ser cilindro
    2. Propriedades numéricas: "cilindro tem ___ vértices" → deve ser 0
    3. Ângulos: "Um ângulo de 45° é um ângulo ___" → deve ser agudo
    4. Sólidos sem lados/vértices sendo perguntados com números
    """
    q = question.lower().strip()
    ans = correct_answer.lower().strip().rstrip('.')
 
    # ── 1. Verificar Objecto → Sólido ─────────────────────────────────────────
    # Detecta padrões como: "X é um exemplo de ___" ou "X tem a forma de ___"
    # ou "X é chamado de Y"
    is_identification = any(p in q for p in [
        "é um exemplo", "tem a forma", "chamado de", "é um sólido",
        "é chamado", "como se chama", "que sólido"
    ])
 
    if is_identification:
        # Em perguntas true_false a resposta é "Verdadeiro"/"Falso" —
        # não podemos validar pelo nome do sólido na resposta.
        # Nesses casos, verificamos que o sólido mencionado na PERGUNTA
        # é compatível com o objecto mencionado.
        is_tf = ans in ("verdadeiro", "falso")
 
        for obj_key, solido_correcto in OBJECTO_SOLIDO.items():
            if obj_key in q:
                if is_tf:
                    correcto_clean = _normalise(solido_correcto)
                    q_norm = _normalise(q)
                    if correcto_clean not in q_norm:
                        if ans == "verdadeiro":
                            return (
                                f"TF: '{obj_key}' deve ser '{solido_correcto}' "
                                f"mas a pergunta afirma outro sólido como Verdadeiro"
                            )
                    break
                else:
                    # Para MC/cloze: a resposta deve ser o nome do sólido correcto
                    ans_clean = _normalise(ans)
                    correcto_clean = _normalise(solido_correcto)
                    if correcto_clean not in ans_clean and ans_clean not in correcto_clean:
                        if obj_key == "caixa" and "paralelepípedo" in ans_clean:
                            return None
                        if obj_key == "caixa" and "cubo" in ans_clean:
                            return None
                        return (
                            f"Objecto '{obj_key}' deve corresponder a '{solido_correcto}', "
                            f"não '{correct_answer}'"
                        )
                    break
 
    # ── 2. Verificar Sólidos sem lados/vértices ────────────────────────────────
    # Bloqueia perguntas sobre "lados iguais" de sólidos que não têm lados planos
    # iguais (esfera, cilindro, cone) ou que tornam a questão sem resposta clara
    SOLIDOS_SEM_LADOS_IGUAIS = SOLIDOS_SEM_VERTICES | {"pirâmide"}
    for solido in SOLIDOS_SEM_LADOS_IGUAIS:
        if solido in q or (solido == "esfera" and "pote" in q):
            if any(p in q for p in ["lados iguais", "quantos lados", "número de lados"]):
                return (
                    f"Pergunta inválida: '{solido}' não tem lados planos — "
                    f"a questão não tem resposta correcta."
                )
 
    # ── 3. Verificar Faces/Arestas/Vértices de sólidos conhecidos ─────────────
    for solido, props in PROPRIEDADES_SOLIDO.items():
        if solido in q:
            for prop_name, valor_correcto in props.items():
                if prop_name in q:
                    # Tenta extrair número da resposta
                    numeros = re.findall(r'\d+', ans)
                    if numeros:
                        valor_resposta = int(numeros[0])
                        if valor_resposta != valor_correcto:
                            return (
                                f"'{solido}' tem {valor_correcto} {prop_name}, "
                                f"não {valor_resposta}"
                            )
                    break
 
    # ── 4. Verificar Ângulos ──────────────────────────────────────────────────
    # "Um ângulo de 45° é um ângulo ___" → agudo
    angulo_match = re.search(r'ângulo de (\d+)\s*°', q)
    if angulo_match:
        graus = int(angulo_match.group(1))
        tipo_correcto = _tipo_angulo_correcto(graus)
        if tipo_correcto not in ans:
            return (
                f"Ângulo de {graus}° deve ser '{tipo_correcto}', "
                f"não '{correct_answer}'"
            )
 
    # ── 5. Verificar Diâmetro/Raio ────────────────────────────────────────────
    # "Se o raio é X, qual é o diâmetro?" → deve ser 2X
    raio_match = re.search(r'raio[^\d]*(\d+)', q)
    diam_pergunta = "diâmetro" in q and "raio" in q
    if raio_match and diam_pergunta and "qual" in q:
        raio_val = int(raio_match.group(1))
        diametro_correcto = raio_val * 2
        numeros_resposta = re.findall(r'\d+', ans)
        if numeros_resposta and int(numeros_resposta[0]) != diametro_correcto:
            return (
                f"Se o raio é {raio_val}, o diâmetro deve ser {diametro_correcto}, "
                f"não {numeros_resposta[0]}"
            )
 
    # Diâmetro dado, perguntar raio
    diam_match = re.search(r'diâmetro[^\d]*(\d+)', q)
    raio_pergunta = "raio" in q and "diâmetro" in q
    if diam_match and raio_pergunta and "qual" in q and not raio_match:
        diam_val = int(diam_match.group(1))
        raio_correcto = diam_val // 2
        numeros_resposta = re.findall(r'\d+', ans)
        if numeros_resposta and int(numeros_resposta[0]) != raio_correcto:
            return (
                f"Se o diâmetro é {diam_val}, o raio deve ser {raio_correcto}, "
                f"não {numeros_resposta[0]}"
            )
 
    return None  # tudo ok
 
 
def _normalise(text: str) -> str:
    """Remove acentos e normaliza para comparação."""
    replacements = {
        'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
        'é': 'e', 'ê': 'e', 'è': 'e',
        'í': 'i', 'î': 'i',
        'ó': 'o', 'ô': 'o', 'õ': 'o',
        'ú': 'u', 'û': 'u',
        'ç': 'c',
        'í': 'i',
    }
    result = text.lower()
    for acc, plain in replacements.items():
        result = result.replace(acc, plain)
    return result
 