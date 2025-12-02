import os

# --- Configuração Rush (Llama 3 via OpenRouter/Groq) ---
OPENROUTER_API_KEY = os.environ.get("GROQ_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://api.groq.com/openai/v1")

# --- Configuração Tutor (Google Gemini) ---
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")

# --- Configuração Geral ---
LANG_VARIANT = "Português (Portugal)"