import json
import re
import random
import asyncio
import operator
from typing import Any
from app.services.llm_client import get_rush_clients # 🚨 Importa a lista (plural)
from app.models.schemas import RushRequest, RushResponse
from app.config import LANG_VARIANT
from openai import RateLimitError # 🚨 Essencial para o Load Balancer

PROMPT_RUSH_JSON = """
Você é um professor criativo de Moçambique, criando um quiz interativo para alunos da {student_class}ª classe (8 a 10 anos).
O seu objetivo é gerar APENAS UMA pergunta de escolha múltipla perfeita em formato JSON puro.

Disciplina: {subject}
Tópico Específico: {subtopic}
Nível de Dificuldade: {difficulty_level} (1 a 5)

🧠 REGRAS DE VARIEDADE E LÓGICA (CRÍTICO - RASCUNHO OBRIGATÓRIO):
Você sofre de repetição. Para evitar isso, preencha o campo "_logic" PRIMEIRO com dois passos obrigatórios:
- PASSO 1 (Variedade): Olhe para o "HISTÓRICO RECENTE". Escolha um subconceito COMPLETAMENTE DIFERENTE. (Ex: Se o histórico tem decimais, você TEM de fazer sobre frações. Se tem valor de números, faça escrita por extenso).
- PASSO 2 (Matemática): Faça as contas e mapeie os valores passo-a-passo para não errar.

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

EXEMPLO DO FORMATO ESPERADO:
{{
  "_logic": "PASSO 1: O histórico tem decimais, logo VOU FAZER SOBRE FRAÇÕES. PASSO 2: A pergunta será sobre 1/3 de 12 maçãs. 12 a dividir por 3 é 4. A resposta é 4.",
  "topico": "{subtopic}",
  "question": "O Ali colheu 12 maçãs e deu a terça parte (um terço) à sua mãe. Quantas maçãs a mãe recebeu?",
  "options": [
    "3 maçãs",
    "4 maçãs",
    "6 maçãs",
    "2 maçãs"
  ],
  "correct_answer": "4 maçãs",
  "explanation": "Correto! Um terço de 12 é o mesmo que dividir 12 por 3, que dá 4."
}}

HISTÓRICO RECENTE (É EXTREMAMENTE PROIBIDO REPETIR ESTES CONCEITOS OU A MESMA ESTRUTURA):
{exclude_list}

Gere agora O SEU objeto JSON válido, começando OBRIGATORIAMENTE pelo campo "_logic":
"""

# Variável Global para a Rotação de Chaves
current_rush_client_index = 0

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

def _is_math_strict_topic(subtopic: str) -> bool:
    # 🔥 LISTA ATUALIZADA: Deteta valores numéricos, frações e decimais para cortar a criatividade e forçar o cálculo correto
    math_keywords = [
        "adição", "subtração", "soma", "multiplicação", "divisão", "expressões", "cálculo", "operações",
        "número", "números", "milhão", "milhões", "milhares", "fração", "frações", "decimal", "decimais"
    ]
    sub = subtopic.lower()
    return any(k in sub for k in math_keywords)

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

    word_count = len(question.split())
    if word_count < 6 and not _is_math_strict_topic(subtopic):
        raise ValueError("Pergunta demasiado simples ou sem contexto suficiente (< 6 palavras)")

    if subject == "matematica" and not _is_math_strict_topic(subtopic):
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


async def generate_rush_question_logic(request: RushRequest) -> RushResponse:
    
    print("\n🚀 [RushService] Chamado! A iniciar processo...", flush=True)

    global current_rush_client_index
    
    clients = get_rush_clients()
    if not clients:
        raise Exception("Nenhum cliente OpenRouter configurado.")

    subject = request.subject.lower()
    if subject not in ("matematica", "portugues"):
        subject = "matematica"
    
    subtopic = request.subtopic if request.subtopic else "Geral"
    exclude_text = "\n- ".join(request.recent_questions) if request.recent_questions else "Nenhuma"

    is_math_operation = _is_math_strict_topic(subtopic)
    dynamic_temperature = 0.4 if is_math_operation else 0.8

    prompt = PROMPT_RUSH_JSON.format(
        student_class=request.student_class,
        subject=subject,
        subtopic=subtopic,
        exclude_list=exclude_text,
        difficulty_level=request.difficulty_level,
        context_rules=request.context_rules
    )

    # 🔥 A LISTA DOS SOBREVIVENTES ESTÁVEIS (Modelos Fortes e Gratuitos)
    FREE_MODELS = [
        "qwen/qwen3-235b-a22b-thinking-2507",
        "qwen/qwen3-vl-235b-a22b-thinking"
        "arcee-ai/trinity-large-preview:free",
    ]

    for tentativa in range(5):
        client = clients[current_rush_client_index]
        used_index = current_rush_client_index
        
        current_rush_client_index = (current_rush_client_index + 1) % len(clients)
        chosen_model = FREE_MODELS[tentativa % len(FREE_MODELS)]

        try:
            print(f"🔄 Rush: Chave #{used_index + 1} | A testar modelo: {chosen_model}...")
            
            completion = client.chat.completions.create(
                model=chosen_model,
                # 🔥 CORREÇÃO DO ERRO 400: Alterado de "system" para "user". 
                # Modelos open-source adoram quando é um "User" a dar a instrução.
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=dynamic_temperature,
                top_p=0.9,
                frequency_penalty=0.8,
                presence_penalty=0.6,
                max_tokens=400, 
                # 🔥 REMOVIDO: response_format={"type": "json_object"}
                # Deixamos o nosso extrator (safe_load_json_object) fazer o trabalho sujo!
            )

            raw = completion.choices[0].message.content
            print(f"👀 RAW DA IA ({chosen_model}): {raw}", flush=True)

            obj = safe_load_json_object(raw)

            if not obj:
                raise ValueError("JSON inválido gerado pela IA (Falha na extração Regex).")

            clean_data = _sanitize_rush_payload(obj, subject, subtopic)

            print(f"✅ SUCESSO com o modelo: {chosen_model}")
            return RushResponse(**clean_data)

        except RateLimitError:
            print(f"⚠️ Limite esgotado no modelo {chosen_model}. A rodar chave e modelo...")
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





