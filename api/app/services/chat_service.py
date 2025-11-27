import json
from app.services.llm_client import get_client
from app.models.schemas import ChatRequest, ChatResponse
from app.utils.text_helpers import truncate_history_by_chars, safe_load_json_object
from app.config import LANG_VARIANT

# ==============================================================================
# PROMPT TUTOR "ENRICHED" (Gera JSON de UI)
# ==============================================================================
PROMPT_TUTOR_ENRICHED = """
You are KaniMente, an interactive Tutor for 3rd-4th grade students in Mozambique.
Language: {lang}.

SCOPE & RESTRICTIONS (STRICT):
1. TEACH ONLY: Mathematics and Portuguese.
2. IF the student asks for Geography, Science, History, or unrelated topics:
   - Politely refuse.
   - Say: "Eu só sei ensinar Matemática e Português por enquanto! O que queres estudar?"
   - Provide CHIPS options: ["Matemática", "Português"].
3. NEVER hallucinate or try to teach outside your scope.

PEDAGOGY:
- Socratic Method: Guide the student with questions.
- Tone: Encouraging, patient, short sentences.
- Context: Use Mozambican references (names, cities, Metical) when appropriate.

⚠️ SUBJECT CONSISTENCY & SWITCHING:
1. **Current Subject**: Infer the subject from the conversation history and the user's last message.
2. **Staying on Track**:
   - If in **Math Mode**, focus on numbers and logic. Do not analyze grammar unless asked.
   - If in **Portuguese Mode**, focus on language. Do not solve math problems unless asked.
3. **Switching**:
   - If the user explicitly asks to switch (e.g., "Vamos para Português"), switch immediately.
   - If the user asks a question that clearly belongs to the *other* subject (e.g., asks about "verbs" while in Math), assume they want to switch. Validate briefly ("Ah, queres falar de verbos?") and proceed with the new subject.

⚠️ CRITICAL FLOW RULES - "NO DEAD ENDS":
1. NEVER just say "Correct" or "Good job" and stop.
2. If the student answered correctly:
   - Validate briefly ("Boa! É isso mesmo.").
   - IMMEDIATELY propose the next exercise or question.
   - Use "CLOZE" (fill-in-the-blank) or "CHIPS" for the next step.
   - ONLY use "FREE_TEXT" if you genuinely need the student to write a complex opinion (rare).
3. **NO RECAP LOOPS:** Once a student answers correctly, validate it briefly and **IMMEDIATELY DROP** the old topic/example. Start fresh.
4. **NEW CONTEXT:** When moving to a new question, use NEW objects/numbers. Do not reuse the exact same example from the previous turn.

⚠️ CLOZE INTERACTION RULES (STRICT):
1. **WHOLE WORDS ONLY:** Never ask to complete letters (e.g., "c__po"). Always ask to complete a full word in a sentence.
   - ❌ BAD: "A palavra é c__po." (Options: o, a)
   - ✅ GOOD: "O meu amigo tem um [[BLANK]] forte." (Options: corpo, braço)
2. **MANDATORY TOKEN:** The 'sentence' field MUST contain the tag `[[BLANK]]`. If you forget this tag, the app crashes.
3. **LOGIC:** The 'correct' option must make semantic sense in the sentence.

⚠️ INTERACTION RULES (CRITICAL UX):
1. **CLOZE (Fill-in-the-blank) IS FOR FACTS ONLY:** - NEVER use CLOZE for personal questions (e.g., "What is your name?", "What color is your house?"). 
   - CLOZE is ONLY for Math results (2+2=_) or Grammar rules (Plural of 'Cão' is _).
   - If there is no single correct answer, DO NOT use CLOZE.
2. **FREE_TEXT IS FOR OPINIONS/PERSONAL:**
   - If asking about the student's life ("What do you like to eat?", "What color is your door?"), use FREE_TEXT.
3. **CHIPS FOR NAVIGATION/CHOICE:**
   - Use CHIPS for selecting topics or simple Yes/No/Maybe answers.

⚠️ OUTPUT FORMAT (CRITICAL):
You must output a SINGLE JSON object representing the UI state.
Structure:
{{
  "text": "Validation + New Question text here. Keep it short (max 2 sentences).",
  "emotion": "HAPPY" | "NEUTRAL" | "THOUGHTFUL",
  "interaction_type": "TYPE",
  "interaction_data": {{ ... }}
}}

EMOTION RULES:
- "HAPPY": If the student answered correctly.
- "THOUGHTFUL": If the student made a mistake or needs a hint.
- "NEUTRAL": Standard conversation.

INTERACTION TYPES (Choose the best for the moment):

1. "CHIPS" (Multiple Choice / Decisions):
   - Use for: Selecting a topic, Yes/No questions, or choosing a path.
   - data: {{ "options": ["Option A", "Option B", "Help"] }}

2. "CLOZE" (Fill-in-the-blank / Completes):
   - Use for: Testing specific concepts (math results, grammar words). High engagement!
   - data: {{ "sentence": "Complete: O sol nasce a [[BLANK]].", "options": ["Este", "Oeste", "Norte"], "correct": "Este" }}
   - Rule: You MUST include [[BLANK]] in the sentence where the word goes.

3. "FREE_TEXT" (Open Input):
   - Use for: Asking for the student's name, opinion, or complex doubt.
   - data: {{ "placeholder": "Escreve a tua resposta..." }}

EXAMPLES:
- Math Flow: {{ "text": "Certo! 10+5 é 15. E quanto é 20 - 5?", "emotion": "HAPPY", "interaction_type": "CLOZE", "interaction_data": {{ "sentence": "20 - 5 é igual a [[BLANK]].", "options": ["15", "10", "25"], "correct": "15" }} }}
- Subject Switch: {{ "text": "Ah, queres mudar para Português? Sem problema! O que são verbos?", "emotion": "NEUTRAL", "interaction_type": "CHIPS", "interaction_data": {{ "options": ["Ações", "Nomes", "Qualidades"] }} }}
"""

# Mantemos o Rush Feedback simples apenas por compatibilidade (legacy)
PROMPT_RUSH_LEGACY = """
You are KaniMente (Legacy Mode).
Just give a short feedback and chips: <<Continuar|Sair>>.
"""

async def generate_chat_response_logic(request: ChatRequest) -> ChatResponse:
    client = get_client()
    if not client: raise Exception("LLM Client unavailable")

    # 1. Selecionar o Prompt
    if request.mode == "rush_feedback":
        # Se por acaso ainda for chamado, usa texto simples
        system_prompt = PROMPT_RUSH_LEGACY
        response_format = None
    else:
        # Modo Tutor Principal -> JSON UI
        system_prompt = PROMPT_TUTOR_ENRICHED.format(lang=LANG_VARIANT)
        response_format = {"type": "json_object"}

    # 2. Preparar Histórico
    short_history = truncate_history_by_chars(request.history, max_chars=3500)
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in short_history:
        role = "assistant" if msg.get("role") == "model" else "user"
        content = str(msg.get("text", ""))
        
        # 🧹 LIMPEZA DE MEMÓRIA (SANITIZER)
        # Se o histórico tiver JSON da IA anterior, extraímos SÓ o texto.
        # Isto impede que a IA leia "interaction_type: CLOZE" e fique viciada nisso.
        if role == "assistant":
            try:
                # Tenta limpar blocos de código se existirem
                clean_content = content.replace("```json", "").replace("```", "").strip()
                prev_json = json.loads(clean_content)
                
                # Se for um JSON válido de UI, ficamos só com o texto falado
                if "text" in prev_json:
                    content = prev_json["text"]
            except:
                # Se falhar, é porque era texto normal (rush feedback ou erro), mantemos igual
                pass

        messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": f"[CLASSE {request.student_class}] {request.user_query}"})

    try:
        # 3. Chamada à API
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.4, 
            max_tokens=350,
            response_format=response_format # JSON Mode para Tutor
        )
        
        raw_response = completion.choices[0].message.content.strip()

        # 4. Tratamento da Resposta
        if request.mode == "rush_feedback":
            # Legacy: Retorna texto direto
            return ChatResponse(response_text=raw_response)
        
        else:
            # Tutor: Garante que é JSON válido para o Frontend
            obj = safe_load_json_object(raw_response)
            
            if not obj or "text" not in obj:
                # Fallback se a IA falhar o JSON
                print("⚠️ Falha no JSON do Tutor. Usando Fallback.")
                fallback_obj = {
                    "text": raw_response if raw_response else "Tive um pequeno erro. Podes repetir?",
                    "interaction_type": "FREE_TEXT",
                    "interaction_data": {"placeholder": "Responde aqui..."}
                }
                return ChatResponse(response_text=json.dumps(fallback_obj))

            if obj.get("interaction_type") == "CLOZE":
                data = obj.get("interaction_data", {})
                sentence = data.get("sentence", "")
                
                # Se a IA se esqueceu do [[BLANK]], vamos tentar salvar o dia
                if "[[BLANK]]" not in sentence:
                    # Se houver underscores "___", substitui
                    if "_" in sentence:
                        data["sentence"] = re.sub(r"_+", "[[BLANK]]", sentence)
                    else:
                        # Se não houver nada, adiciona no fim
                        data["sentence"] = sentence + " [[BLANK]]"
                    
                    # Atualiza o objeto
                    obj["interaction_data"] = data
            
            # Sucesso: Retorna o JSON como string
            return ChatResponse(response_text=json.dumps(obj))

    except Exception as e:
        print(f"ERRO CHAT SERVICE: {e}")
        # Retorna um JSON de erro válido para o Svelte não quebrar
        error_obj = {
            "text": "Ocorreu um erro técnico. Vamos tentar de novo?",
            "interaction_type": "CHIPS",
            "interaction_data": {"options": ["Tentar Novamente"]}
        }
        return ChatResponse(response_text=json.dumps(error_obj))