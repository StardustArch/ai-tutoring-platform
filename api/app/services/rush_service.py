import json
import re
import random
import operator
from typing import Any
from app.services.llm_client import get_rush_client
from app.models.schemas import RushRequest, RushResponse
from app.config import LANG_VARIANT

PROMPT_RUSH_JSON = """
Você é um professor experiente de Moçambique, criando um quiz interativo para alunos da {student_class}ª classe.
O seu objetivo é gerar APENAS UMA pergunta de escolha múltipla perfeita em formato JSON puro (sem marcação Markdown).

Disciplina: {subject}
Tópico Específico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 5)

REGRAS DE OURO (OBRIGATÓRIAS):
1. CONTEXTO: A pergunta ("question") TEM de ser autossuficiente. Crie pequenas histórias com contexto moçambicano (nomes locais, Meticais, cidades). NUNCA faça perguntas soltas como "Quanto é?".
2. REGRAS DO TÓPICO: Siga rigorosamente as restrições curriculares abaixo. Se disser que não pode usar operações, NÃO USE!
{context_rules}
3. DISTRATORES: Gere exatamente 4 opções ("options"). As opções devem ser ÚNICAS.
4. RESPOSTA CORRETA: A "correct_answer" DEVE ser uma cópia exata de uma das opções.
5. NÃO use NENHUMA formatação Markdown (sem asteriscos **, sem blocos ```json).

LINGUAGEM (OBRIGATÓRIO):
- Use frases curtas e simples.
- Evite termos técnicos como: "valor posicional", "ordem numérica", "classe decimal".
- Prefira linguagem natural usada por professores da 3ª/4ª classe.
- Em vez de "valor posicional", diga:
  - "O 4 está na casa de quê?"
  - "O 4 vale quanto?"
  - "O 4 representa quantos milhares?"
- Use vocabulário que uma criança de 8-10 anos entende facilmente.

EXEMPLO DO FORMATO ESPERADO (Siga esta exata ordem de chaves no JSON):
{{
  "_logic": "O número é 840.000. O 8 está nas centenas de milhar (800.000). O 4 está nas dezenas de milhar (40.000). A resposta será 40.000.",
  "topico": "{subtopic}",
  "question": "Qual é o valor do algarismo 4 no número 840.000?",
  "options": [
    "4.000",
    "40.000",
    "400.000",
    "400"
  ],
  "correct_answer": "40.000",
  "explanation": "Correto! O 4 está na casa das dezenas de milhar, por isso vale 40.000."
}}

HISTÓRICO RECENTE (NÃO REPITA ESTAS PERGUNTAS OU A MESMA ESTRUTURA):
{exclude_list}

Gere agora O SEU objeto JSON válido para o tópico "{subtopic}":
"""

def safe_load_json_object(text: str) -> Any | None:
    if not text: return None
    text = text.replace('“', '"').replace('”', '"').replace('\r\n', '\n')
    
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

def _is_arithmetic_topic(subtopic: str) -> bool:
    arithmetic_keywords = [
        "adição", "subtração", "soma", "multiplicação", "divisão", "expressões", "cálculo", "operações"
    ]
    sub = subtopic.lower()
    return any(k in sub for k in arithmetic_keywords)

def _detect_question_type(question: str) -> str:
    q = question.lower()
    if re.search(r'\d+\s*[+\-x×÷]\s*\d+', q):
        return "explicit_arithmetic"
    if re.search(r'\d+', q) and any(word in q for word in ["comprou", "vendeu", "tem", "gastou", "recebeu", "restam"]):
        return "word_problem"
    if any(word in q for word in ["triângulo", "quadrado", "ângulo", "círculo", "reta"]):
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

def _sanitize_rush_payload(raw_obj: dict, subject: str, subtopic: str) -> dict:
    if not isinstance(raw_obj, dict):
        raise ValueError("Payload inválido")

    question = str(raw_obj.get("question", "")).strip()
    explanation = str(raw_obj.get("explanation", "")).strip()
    raw_correct = str(raw_obj.get("correct_answer", "")).strip()

    # 1. VALIDAÇÃO DE CONTEXTO MÍNIMO (Bloqueia "João tem quantos lápis?")
    word_count = len(question.split())
    if word_count < 6 and not _is_arithmetic_topic(subtopic):
        raise ValueError("Pergunta demasiado simples ou sem contexto suficiente (< 6 palavras)")

    # 2. BLOQUEIO ESTRUTURAL DE OPERAÇÕES EM TÓPICOS CONCEITUAIS
    if subject == "matematica" and not _is_arithmetic_topic(subtopic):
        if re.search(r'\d+\s*[+\-x×÷]\s*\d+', question) or " vezes " in question.lower() or " a multiplicar " in question.lower():
            raise ValueError("Operações não permitidas neste tópico conceitual")

    raw_options = raw_obj.get("options", [])
    if not isinstance(raw_options, list):
        raise ValueError("Opções inválidas")

    options = []
    for opt in raw_options:
        clean = str(opt).strip().strip('"').strip("'").strip(".")
        if clean:
            options.append(clean)
    
    options = list(dict.fromkeys(options))
    if len(options) < 3:
        raise ValueError("Menos de 3 opções únicas")

    clean_correct = raw_correct.strip('"').strip("'").strip(".")
    if clean_correct not in options:
        raise ValueError("Resposta correta não corresponde às opções")

    # 3. VALIDAÇÃO MATEMÁTICA E DISTRATORES INTELIGENTES
    q_type = _detect_question_type(question)
    if subject == "matematica" and q_type == "explicit_arithmetic":
        try:
            correct_number = int(re.findall(r'\d+', clean_correct)[0])
            smart_distractors = _generate_smart_distractors(correct_number)
            options = [str(correct_number)] + [str(d) for d in smart_distractors]
            random.shuffle(options)
            clean_correct = str(correct_number)
        except (IndexError, ValueError):
            pass # Se não for número simples, ignora a injeção de distratores

    if not question or not explanation:
        raise ValueError("Pergunta ou explicação vazia")

    return {
        "question": question,
        "options": options,
        "correct_answer": clean_correct,
        "explanation": explanation
    }

async def generate_rush_question_logic(request: RushRequest) -> RushResponse:
    client = get_rush_client()
    if not client:
        raise Exception("LLM Client unavailable")

    subject = request.subject.lower()
    if subject not in ("matematica", "portugues"):
        subject = "matematica"
    
    subtopic = request.subtopic if request.subtopic else "Geral"
    exclude_text = "\n- ".join(request.recent_questions) if request.recent_questions else "Nenhuma"

    # 🔥 TEMPERATURA DINÂMICA
    is_math_operation = _is_arithmetic_topic(subtopic)
    dynamic_temperature = 0.3 if is_math_operation else 0.7

    prompt = PROMPT_RUSH_JSON.format(
        student_class=request.student_class,
        subject=subject,
        subtopic=subtopic,
        exclude_list=exclude_text,
        difficulty_level=request.difficulty_level,
        context_rules=request.context_rules
    )

    for tentativa in range(3):
        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": prompt}
                ],
                temperature=dynamic_temperature,
                top_p=0.9,
                frequency_penalty=0.6,
                presence_penalty=0.4,
                max_tokens=400,
                response_format={"type": "json_object"}
            )

            raw = completion.choices[0].message.content
            obj = safe_load_json_object(raw)

            if not obj:
                raise ValueError("JSON inválido gerado pelo Llama.")

            clean_data = _sanitize_rush_payload(obj, subject, subtopic)

            return RushResponse(**clean_data)

        except Exception as e:
            print(f"⚠️ Tentativa {tentativa+1} falhou no tópico '{subtopic}': {e}")

    # Fallback Seguro
    return RushResponse(
        question="Ocorreu uma pequena falha técnica. Qual é a capital de Moçambique?",
        options=["Beira", "Maputo", "Nampula", "Tete"],
        correct_answer="Maputo",
        explanation="O servidor precisou de um descanso, mas seguimos em frente!"
    )