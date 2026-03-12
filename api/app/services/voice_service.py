import edge_tts
import uuid
import os
import time
from app.utils.text_helpers import remove_emojis, remove_broken_emoji_codes

ROOT_DIR = os.getcwd()
STORAGE_PATH = os.path.join(ROOT_DIR, "static", "audio_cache")

# Limite de caracteres para o TTS.
# edge_tts no Render (free tier) tem timeout com textos longos.
# 500 chars cobre ~3 bubbles normais de forma confortável.
TTS_MAX_CHARS = 500


def cleanup_old_audio(max_age_seconds: int = 600) -> None:
    if not os.path.exists(STORAGE_PATH):
        return
    try:
        now = time.time()
        for f in os.listdir(STORAGE_PATH):
            if f.endswith(".mp3"):
                file_path = os.path.join(STORAGE_PATH, f)
                try:
                    if os.path.getmtime(file_path) < now - max_age_seconds:
                        os.remove(file_path)
                except OSError:
                    pass  # ficheiro já apagado por outro processo — ignora
    except Exception as e:
        print(f"⚠️ [TTS] Erro ao limpar cache: {e}")


async def generate_voice_audio(text_list: list) -> str | None:
    """
    Gera áudio TTS para a lista de mensagens.
    Devolve o nome do ficheiro (ex: "voice_abc123.mp3") ou None se falhar.
    
    Problemas que este código resolve:
    1. Texto demasiado longo → timeout no Render → trunca a TTS_MAX_CHARS
    2. Ficheiro apagado pelo cleanup antes do request HTTP → cleanup só apaga
       ficheiros com mais de 10 minutos (600s), não os recentes
    3. Falha silenciosa → agora tem print de erro visível nos logs
    """
    if not text_list:
        return None

    if not os.path.exists(STORAGE_PATH):
        os.makedirs(STORAGE_PATH, exist_ok=True)
        print(f"📁 [TTS] Pasta {STORAGE_PATH} criada.")

    # Limpa áudios antigos ANTES de gerar — nunca apaga o que acabou de ser criado
    cleanup_old_audio()

    try:
        full_text = " ".join(text_list)
        clean_text = remove_emojis(full_text)
        clean_text = remove_broken_emoji_codes(clean_text)

        # Trunca se necessário para evitar timeout no Render
        if len(clean_text) > TTS_MAX_CHARS:
            # Corta na última frase completa antes do limite
            truncated = clean_text[:TTS_MAX_CHARS]
            last_period = max(
                truncated.rfind('. '),
                truncated.rfind('! '),
                truncated.rfind('? '),
            )
            if last_period > TTS_MAX_CHARS // 2:
                clean_text = truncated[:last_period + 1]
            else:
                clean_text = truncated
            print(f"⚠️ [TTS] Texto truncado de {len(full_text)} para {len(clean_text)} chars.")

        if not clean_text.strip():
            print("⚠️ [TTS] Texto vazio após limpeza — sem áudio.")
            return None

        file_name = f"voice_{uuid.uuid4().hex}.mp3"
        file_path = os.path.join(STORAGE_PATH, file_name)

        communicate = edge_tts.Communicate(
            clean_text,
            "pt-BR-FranciscaNeural",
            pitch="+20Hz",
            rate="+5%",
        )
        await communicate.save(file_path)

        # Confirma que o ficheiro foi mesmo criado e não está vazio
        if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
            print(f"❌ [TTS] Ficheiro gerado está vazio ou não existe: {file_path}")
            return None

        print(f"✅ [TTS] Áudio gerado: {file_name} ({os.path.getsize(file_path)} bytes)")
        return file_name

    except Exception as e:
        # Log visível — antes era silencioso e difícil de diagnosticar
        print(f"❌ [TTS] Falha ao gerar áudio: {type(e).__name__}: {e}")
        return None