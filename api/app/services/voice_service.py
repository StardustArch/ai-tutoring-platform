import edge_tts
import uuid
import os
import time
from app.utils.text_helpers import remove_emojis

STORAGE_PATH = "static/audio_cache"

def cleanup_old_audio(max_age_seconds=600):
    """Remove ficheiros .mp3 antigos para não encher o disco."""
    # 🚨 FIX: Se a pasta não existe, não há nada para limpar
    if not os.path.exists(STORAGE_PATH):
        return

    try:
        now = time.time()
        for f in os.listdir(STORAGE_PATH):
            if f.endswith(".mp3"):
                file_path = os.path.join(STORAGE_PATH, f)
                if os.path.getmtime(file_path) < now - max_age_seconds:
                    os.remove(file_path)
    except Exception as e:
        print(f"Erro ao limpar cache: {e}")

async def generate_voice_audio(text_list):
    if not text_list:
        return None
        
    # 🚨 PASSO CRÍTICO: Garante que a pasta existe antes de tentar gravar
    if not os.path.exists(STORAGE_PATH):
        os.makedirs(STORAGE_PATH, exist_ok=True)
        print(f"📁 Pasta {STORAGE_PATH} criada no Render.")

    cleanup_old_audio()

    try:
        full_text = " ".join(text_list)
        # O segredo para o áudio limpo:
        clean_text = remove_emojis(full_text)
        
        file_name = f"voice_{uuid.uuid4().hex}.mp3"
        file_path = os.path.join(STORAGE_PATH, file_name)
        
        communicate = edge_tts.Communicate(
            clean_text, 
            "pt-BR-FranciscaNeural", 
            pitch="+20Hz", 
            rate="+5%"
        )
        await communicate.save(file_path)
        
        return file_name
    except Exception as e:
        print(f"Erro no TTS: {e}")
        return None