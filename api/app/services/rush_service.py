from app.services.llm_client import get_rush_client
from app.models.schemas import RushRequest, RushResponse
from app.utils.text_helpers import safe_load_json_object, _sanitize_rush_payload
from app.config import LANG_VARIANT

PROMPT_RUSH_JSON = """
You are a Quiz Generator API for KaniMente.
OUTPUT RULES (STRICT):
- Output ONLY one single JSON object (no markdown, no explanation).
- JSON keys must be: "_logic", "question", "options", "correct_answer", "explanation".
- "_logic": Write step-by-step reasoning here FIRST to verify math/spelling (e.g. "9000=nove mil, 800=oitocentos").
- "options" must be an array of 3 or 4 short strings.
- "correct_answer" must exactly match one of the options.
- Language: {lang}.
- Audience: {student_class}th grade (3-6).
- Subject: {subject}
- Specific Subtopic: {subtopic} (FOCUS HERE!)
- Difficulty Level: {difficulty_level} (1=muito fácil, 5=muito difícil)
Generate questions appropriate for this difficulty.

CRITICAL LOGIC CHECKS (Must Validate Before Generating):
1. If the question is about ordering/sequences, verify the order TWICE.
   - Example: "Decreasing 10, 8, _" -> Answer MUST be smaller than 8.
2. The "correct_answer" MUST be mathematically unequivocally correct.
3. The "correct_answer" MUST be present in "options".
4. "options" must contain 1 correct answer and 2-3 plausible distractors.

⚠️ STRICT CURRICULUM CONSTRAINTS:
{context_rules}
(You MUST follow these constraints. E.g., if it says "no multiplication", do not generate multiplication).

⚠️ ANTI-REPETITION RULE:
You MUST NOT generate any of the following questions (or very similar ones):{exclude_list}

TASK:
Generate a NEW and UNIQUE question specifically about "{subtopic}".
Do NOT repeat generic questions. Ensure variety within the subtopic.
Keep question and options short (<= 80 chars each).
"""


async def generate_rush_question_logic(request: RushRequest) -> RushResponse:
    client = get_rush_client()
    if not client: raise Exception("LLM Client unavailable")

    subject = request.subject.lower()
    if subject not in ("matematica", "portugues"): subject = "matematica"
    
    subtopic = request.subtopic if request.subtopic else "Geral"
    exclude_text = "\n- ".join(request.recent_questions) if request.recent_questions else "None"

    prompt = PROMPT_RUSH_JSON.format(
        lang=LANG_VARIANT, 
        student_class=request.student_class, 
        subject=subject,
        subtopic=subtopic,
        exclude_list=exclude_text,
        difficulty_level=request.difficulty_level,
        context_rules=request.context_rules
    )

    try:
        # Temperatura 0.3 para reduzir alucinações lógicas
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Generate one question about {subtopic}."}
            ],
            temperature=0.2, 
            max_tokens=400,
            response_format={"type": "json_object"}
        )
        
        raw = completion.choices[0].message.content
        obj = safe_load_json_object(raw)
        
        if not obj: raise ValueError("JSON inválido ou vazio")
        
        # ✅ Chama o sanitizador isolado aqui
        clean_data = _sanitize_rush_payload(obj)
        
        return RushResponse(**clean_data)

    except Exception as e:
        print(f"ERRO RUSH: {e}")
        return RushResponse(
            question="Quanto é 1 + 1?",
            options=["1", "2", "3", "4"],
            correct_answer="2",
            explanation="Erro técnico. Tente novamente."
        )

