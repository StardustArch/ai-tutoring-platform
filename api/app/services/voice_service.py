import edge_tts
import uuid
import os
import time

STORAGE_PATH = "static/audio_cache"

def cleanup_old_audio(max_age_seconds=600): # 10 minutos por padrão
    """Remove ficheiros .mp3 que já não são necessários."""
    try:
        now = time.time()
        for f in os.listdir(STORAGE_PATH):
            if f.endswith(".mp3"):
                file_path = os.path.join(STORAGE_PATH, f)
                # Verifica a idade do ficheiro
                if os.path.getmtime(file_path) < now - max_age_seconds:
                    os.remove(file_path)
                    print(f"🧹 Cache limpo: {f} removido.")
    except Exception as e:
        print(f"Erro ao limpar cache de áudio: {e}")

async def generate_voice_audio(text_list):
    if not text_list:
        return None
        
    # 🚨 PASSO 1: Antes de gerar um novo, limpa os velhos
    cleanup_old_audio()

    try:
        full_text = " ".join(text_list)
        file_name = f"voice_{uuid.uuid4().hex}.mp3"
        file_path = os.path.join(STORAGE_PATH, file_name)
        communicate = edge_tts.Communicate(
            full_text, 
            "pt-PT-RaquelNeural", 
            pitch="+20Hz", 
            rate="+5%"
        )
        await communicate.save(file_path)
        
        return file_name
    except Exception as e:
        print(f"Erro no TTS: {e}")
        return None