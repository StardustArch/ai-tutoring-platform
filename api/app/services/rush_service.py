from app.services.llm_client import get_rush_client
from app.models.schemas import RushRequest, RushResponse
from app.utils.text_helpers import safe_load_json_object, _sanitize_rush_payload
from app.config import LANG_VARIANT

PROMPT_RUSH_JSON = """
ROLE: You are the KMind Quiz Generator API for Mozambican students (Grades 3-6).
Your job is to generate highly engaging, flawless, and varied multiple-choice questions for a fast-paced game.

🌍 MOZAMBICAN CONTEXT & LANGUAGE (CRITICAL):
1. Language: Portuguese from Mozambique (pt-MZ). Use "Tu" (never "Você"). 
2. Local Flavour: Whenever generating Word Problems (Problemas de História), USE local context to make it fun. 
   - Examples: Meticais (MT), machamba, capulanas, mcel, chapa, cities (Beira, Maputo), or local names (Neyma, Ali, João).
   - Instead of "John bought 5 apples", use "O Ali comprou 5 mangas na Beira".

🛑 OUTPUT FORMAT RULES (STRICT):
1. Output ONLY a valid JSON object. No preamble, no conversational text.
2. NO MARKDOWN: DO NOT use asterisks (*), bold (**), or italics anywhere in the JSON. Keep it purely plain text to avoid UI bugs.
3. JSON keys strictly as: "_logic", "question", "options", "correct_answer", "explanation".

🧠 PEDAGOGICAL & LOGIC CHECKS:
1. "question": Must be clear, short (<= 85 chars), and age-appropriate.
2. "_logic": Write your step-by-step reasoning HERE FIRST to guarantee absolute mathematical and grammatical correctness.
3. "correct_answer": Must EXACTLY match ONE item in the "options" array.
4. "options": Array of 3 or 4 short strings.
   - 🎯 SMART DISTRACTORS: Wrong options MUST NOT be random numbers. They must reflect common student mistakes (e.g., forgetting a zero, swapping digits like 412 instead of 421, or adding instead of multiplying).
5. "explanation": A short, encouraging explanation (<= 100 chars) that praises the logic (e.g., "Boa! 5 capulanas x 400 MT = 2000 MT.").

⚠️ ANTI-REPETITION & CONCEPTUAL DIVERSITY RULE:
You MUST NOT generate any questions conceptually similar to these recent ones:
{exclude_list}
If the recent questions were direct calculations, generate a Word Problem. If they were word problems, generate a logic sequence or conceptual question. FORCE VARIETY.

📚 TARGET SPECIFICATIONS:
- Audience: {student_class}ª Classe (Kids aged 8-11).
- Subject: {subject}
- Specific Subtopic: {subtopic} (FOCUS EXCLUSIVELY ON THIS)
- Difficulty Level: {difficulty_level} (1=muito fácil, 5=muito difícil)

⚠️ STRICT CURRICULUM CONSTRAINTS:
{context_rules}
(You MUST follow these constraints above all else).

TASK:
Generate a NEW, UNIQUE, and FLAWLESS question about "{subtopic}". Make it engaging!
"""

async def generate_rush_question_logic(request: RushRequest) -> RushResponse:
    client = get_rush_client()
    if not client:
        raise Exception("LLM Client unavailable")

    subject = request.subject.lower()
    if subject not in ("matematica", "portugues"):
        subject = "matematica"
    
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

    # 🔁 Tenta até 3 vezes gerar algo válido
    for tentativa in range(3):
        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": prompt}
                ],
                temperature=0.2,
                top_p=0.8,
                frequency_penalty=0.3,
                max_tokens=400,
                response_format={"type": "json_object"}
            )

            raw = completion.choices[0].message.content
            obj = safe_load_json_object(raw)

            if not obj:
                raise ValueError("JSON inválido")

            clean_data = _sanitize_rush_payload(obj, subject, subtopic)

            return RushResponse(**clean_data)

        except Exception as e:
            print(f"⚠️ Tentativa {tentativa+1} falhou: {e}")

    # 🚨 Fallback seguro
    return RushResponse(
        question="Quanto é 1 + 1?",
        options=["1", "2", "3", "4"],
        correct_answer="2",
        explanation="Erro técnico. Tente novamente."
    )