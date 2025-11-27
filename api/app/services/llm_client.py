from openai import OpenAI
from app.config import OPENROUTER_API_KEY, BASE_URL

client = None
if OPENROUTER_API_KEY:
    client = OpenAI(base_url=BASE_URL, api_key=OPENROUTER_API_KEY)
else:
    print("⚠️ AVISO: API Key em falta.")

def get_client():
    return client