import json
import re
from typing import Any

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


def _sanitize_rush_payload(raw_obj: dict) -> dict:
    """
    Função pura que recebe o dicionário bruto da IA e garante
    que a 'correct_answer' existe matematicamente dentro das 'options'.
    """
    # 1. Normalizar as opções (garantir string e sem espaços)
    raw_options = raw_obj.get("options", [])
    if not isinstance(raw_options, list):
        raw_options = []
    options = [str(o).strip() for o in raw_options]

    # Fallback crítico se a IA não gerar opções
    if not options:
        return {
            "question": "Erro na questão",
            "options": ["Erro"],
            "correct_answer": "Erro",
            "explanation": "Falha na geração."
        }

    # 2. Limpar a resposta correta (remover aspas extras, pontos finais)
    raw_correct = str(raw_obj.get("correct_answer", "")).strip()
    clean_correct = raw_correct.strip('"').strip("'").strip('.')
    
    final_correct = clean_correct

    # 3. Lógica de Recuperação (Se a resposta não bater exata)
    if final_correct not in options:
        print(f"⚠️ SANITIZER: A resposta '{clean_correct}' não bate com {options}. A corrigir...")
        
        # Ordenar por tamanho decrescente para evitar falsos positivos
        # (Ex: evitar que '3' dê match dentro de '300')
        sorted_options = sorted(options, key=len, reverse=True)
        
        found_fix = False
        for opt in sorted_options:
            # Verifica se a OPÇÃO está contida na FRASE da IA (Case Insensitive)
            # Ex: IA diz "A resposta é Azul.", Opção é "Azul" -> Match!
            if opt.lower() in clean_correct.lower():
                final_correct = opt
                found_fix = True
                print(f"✅ SANITIZER: Corrigido para '{final_correct}'")
                break
        
        # Fallback de Emergência: Se nada bater, usa a primeira opção
        if not found_fix:
            print(f"❌ SANITIZER: Correção falhou. Forçando primeira opção: '{options[0]}'")
            final_correct = options[0]

    return {
        "question": str(raw_obj.get("question", "")).strip(),
        "options": options,
        "correct_answer": final_correct, # Agora garantido que está em options
        "explanation": str(raw_obj.get("explanation", "")).strip()
    }


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


def remove_emojis(text: str) -> str:
    # Esta regex remove a maioria dos emojis e símbolos pictográficos do Unicode
    # Mantém letras, acentos (essenciais para pt-MZ) e pontuação.
    return re.sub(r'[^\x00-\x7F\u00C0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]', '', text)