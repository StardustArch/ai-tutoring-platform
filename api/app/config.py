import os

OPENROUTER_API_KEY = os.environ.get("GROQ_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://api.groq.com/openai/v1")
LANG_VARIANT = "Português (Portugal)"