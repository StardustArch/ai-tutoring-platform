import json
import re
from app.services.llm_client import get_tutor_model, get_rush_client
from app.models.schemas import ChatRequest, ChatResponse
from app.utils.text_helpers import safe_load_json_object
from app.config import LANG_VARIANT

# ==============================================================================
# PROMPT TUTOR (GEMINI) - Otimizado para Sessão Guiada
# ==============================================================================
PROMPT_TUTOR_FINAL = """
ROLE: KaniMente, interactive Tutor for kids (Mozambique).
CONTEXT: Subject="{subject}", Topic="{topic}".

📋 SPECIFIC LESSON GUIDELINES:
{context_rules}

🛑 STATE TRACKING & FLOW RULES:
Check the [STATE: TYPE] tag in the chat history.

1. **IF LAST STATE was [EXPLANATION]:**
   - **User says "Entendi/Continuar":** -> SWITCH TO [TESTING]. Ask a simple question.
   - **User says "Não entendi/Explica melhor":** -> STAY IN [EXPLANATION].
     - ACTION: Explain again using a DIFFERENT analogy (simpler). DO NOT repeat text.

2. **IF LAST STATE was [TESTING]:**
   - **User Wrong:** -> Give a Hint & Retry ([TESTING]).
   - **User Correct:** -> DO NOT EXPLAIN NEW TOPIC IMMEDIATELY.
     - **ACTION:** Praise the student ("Boa!", "Fantástico!").
     - **DECISION:** Ask if they want a harder challenge or move on.
     - **OUTPUT:** "interaction_type": "CHIPS", "interaction_data": {{ "options": ["Mais um desafio!", "Avançar matéria"] }}

3. **HANDLING TRANSITION (User Choice):**
   - **User says "Mais um desafio" / "Desafio final":** - 🛑 CRITICAL: YOU MUST STAY ON THE EXACT SAME SUB-TOPIC.
     - If user was doing "Comparison", give a COMPLEX word problem involving Comparison.
     - DO NOT switch to "Decomposition" or "Writing" here.
     - The challenge must be harder than the previous question.
   
   - **User says "Avançar" / "Aprender algo novo":** - Move to next Concept ([EXPLANATION]).
   
4. **IF NO HISTORY:**
   - Start with [EXPLANATION] (Short Intro).

🛑 OUTPUT FORMAT RULES (JSON):
- Use "interaction_type": "EXPLANATION" for teaching.
- **CRITICAL:** For Explanations, "interaction_data" MUST have "options": ["Entendi!", "Não percebi..."]
- For Testing/Transitions, use "options" for the user's answer or choice.

OUTPUT JSON ONLY:
{{
  "text": "Kid-friendly text",
  "emotion": "HAPPY",
  "interaction_type": "EXPLANATION" | "CHIPS" | "CLOZE",
  "interaction_data": {{
      "options": ["Option A", "Option B"]
  }}
}}
"""
# ==============================================================================
# PROMPT RUSH (LLAMA) - Legacy Drill
# ==============================================================================
PROMPT_RUSH_LEGACY = """
You are KaniMente (Legacy Mode).
Just give a short feedback and chips: <<Continuar|Sair>>.
"""
async def generate_chat_response_logic(request: ChatRequest) -> ChatResponse:
    
    # --- MODO RUSH ---
    if request.mode == "rush_feedback":
        client = get_rush_client()
        if not client: return ChatResponse(response_text="Erro: Rush indisponível.")
        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": f"{PROMPT_RUSH_LEGACY}\n{request.user_query}"}],
                temperature=0.2, max_tokens=150
            )
            return ChatResponse(response_text=completion.choices[0].message.content)
        except: return ChatResponse(response_text="Muito bem! <<Continuar>>")

   # --- MODO TUTOR (Gemini) ---
    model = get_tutor_model()
    
    # 1. Configurar Variáveis e Regras de Contexto
    subject = request.subject or "Matemática"
    topic = request.topic or "Geral"
    # ✅ AQUI: Pegamos as regras vindas do NestJS (metadata do tópico)
    context_rules = request.context_rules or "Use standard primary school pedagogy."
    
    # Injetamos as regras no Prompt
    system_text = PROMPT_TUTOR_FINAL.format(
        subject=subject, 
        topic=topic,
        context_rules=context_rules 
    )

    # 2. Histórico Inteligente (Com Correção de Regex e Estado)
    chat_history = []
    
    raw_history = request.history[-6:] 
    
    for msg in raw_history:
        role = "model" if msg.get("role") in ["assistant", "model"] else "user"
        
        # Garante que content é string limpa
        parts = msg.get("parts", [])
        if isinstance(parts, list) and parts:
            content = str(parts[0])
        else:
            content = str(msg.get("text", ""))

        prefix = ""
        
        # Lógica de Estado (Recuperada da nossa conversa anterior)
        if role == "model":
            found_type = "UNKNOWN"
            
            # Tenta ler do campo explícito (se o NestJS mandar)
            if msg.get("type"):
                 found_type = msg.get("type")
            # Senão, usa REGEX para ler dentro do JSON stringify
            else:
                match = re.search(r'"interaction_type":\s*"([A-Z_]+)"', content)
                if match:
                    found_type = match.group(1)
            
            # Traduz para Tags
            if found_type in ["EXPLICACAO", "EXPLANATION"]:
                prefix = "[STATE: EXPLANATION] "
            elif found_type in ["PERGUNTA", "TESTING", "CHIPS", "CLOZE"]:
                prefix = "[STATE: TESTING] "
            else:
                # Fallback visual
                if "options" in content: prefix = "[STATE: TESTING] "
                else: prefix = "[STATE: EXPLANATION] "

        chat_history.append({"role": role, "parts": [prefix + content]})

    # === DIAGNÓSTICO (Opcional, podes remover depois) ===
    print(f"✅ CONTEXT RULES ATIVAS: {context_rules}")
    # ====================================================

    # 3. Executar
    try:
        chat = model.start_chat(history=chat_history)
        
        final_msg = f"{system_text}\n\nUSER: {request.user_query}"
        
        response = chat.send_message(final_msg)
        
        # 4. Limpeza de JSON Robusta
        raw_text = response.text
        json_str = re.search(r'\{.*\}', raw_text, re.DOTALL)
        
        if json_str:
            json_obj = json.loads(json_str.group())
        else:
            json_obj = {
                "text": raw_text, 
                "emotion": "NEUTRAL", 
                "interaction_type": "EXPLANATION",
                "interaction_data": {"button_text": "Continuar"}
            }

        return ChatResponse(response_text=json.dumps(json_obj))

    except Exception as e:
        print(f"ERRO GEMINI: {e}")
        return ChatResponse(response_text=json.dumps({
            "text": "Tive um problema técnico. Tenta de novo!",
            "emotion": "THOUGHTFUL",
            "interaction_type": "CHIPS",
            "interaction_data": {"options": ["Recarregar"]}
        }))