"""
slot_state.py — Estado persistente dos slots por sessão (KMind)

Guarda em qual slot (subcapítulo) cada sessão se encontra.
Usa um ficheiro JSON local — sem base de dados, sem dependências externas.

Estrutura do ficheiro (session_slots.json):
{
  "sessao_42_Unidade 1": {
    "slot": 3,
    "topic": "Unidade 1: Números Naturais e Operações (1)",
    "ts": 1718000000
  },
  ...
}

Chave de sessão: f"{session_id}_{topic}" — evita colisões entre tópicos diferentes
na mesma sessão (ex: aluno muda de tópico a meio).

Limpeza automática: entradas com mais de 48h são removidas no próximo set_slot().
"""

import json
import time
from pathlib import Path

# ── Localização do ficheiro de estado ────────────────────────────────────────
# Coloca-se dois níveis acima de utils/ → na raiz do serviço Python
_SLOTS_FILE = Path(__file__).parent.parent / "session_slots.json"

# Entradas mais velhas que este limite são apagadas automaticamente
_TTL_SECONDS = 48 * 60 * 60  # 48 horas


def _make_key(session_id: int | str, topic: str) -> str:
    """Gera a chave única para a combinação sessão+tópico."""
    # Remove caracteres que podem causar problemas em JSON keys
    safe_topic = topic.replace('"', '').replace('\n', ' ').strip()
    return f"{session_id}_{safe_topic}"


def _load() -> dict:
    """Lê o ficheiro JSON. Devolve dict vazio se não existir ou estiver corrompido."""
    try:
        if _SLOTS_FILE.exists():
            return json.loads(_SLOTS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"⚠️ [slot_state] Erro ao ler {_SLOTS_FILE.name}: {e}")
    return {}


def _save(data: dict) -> None:
    """Escreve o ficheiro JSON de forma segura."""
    try:
        _SLOTS_FILE.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    except OSError as e:
        print(f"⚠️ [slot_state] Erro ao escrever {_SLOTS_FILE.name}: {e}")


def _cleanup(data: dict) -> dict:
    """Remove entradas expiradas (> TTL). Chamado automaticamente no set_slot."""
    now = time.time()
    return {
        k: v for k, v in data.items()
        if now - v.get("ts", 0) < _TTL_SECONDS
    }


# ── API pública ───────────────────────────────────────────────────────────────

def get_slot(session_id: int | str, topic: str) -> int:
    """
    Devolve o slot activo para esta sessão+tópico.
    Devolve 1 (primeiro slot) se não houver registo.

    Uso:
        slot = get_slot(request.session_id, request.topic)
    """
    if not session_id:
        return 1

    data = _load()
    key = _make_key(session_id, topic)
    entry = data.get(key, {})
    slot = entry.get("slot", 1)

    print(f"📖 [slot_state] get  → sessão={session_id} | tópico='{topic[:30]}...' | slot={slot}")
    return slot


def set_slot(session_id: int | str, topic: str, slot: int) -> None:
    """
    Guarda o slot activo para esta sessão+tópico.
    Faz limpeza automática de entradas antigas.

    Uso:
        set_slot(request.session_id, request.topic, novo_slot)
    """
    if not session_id:
        return

    data = _load()
    data = _cleanup(data)  # remove entradas expiradas antes de escrever

    key = _make_key(session_id, topic)
    data[key] = {
        "slot": slot,
        "topic": topic,
        "ts": int(time.time()),
    }

    _save(data)
    print(f"💾 [slot_state] set  → sessão={session_id} | tópico='{topic[:30]}...' | slot={slot}")


def advance_slot(session_id: int | str, topic: str, max_slots: int = 7) -> int:
    """
    Incrementa o slot actual em +1 (sem ultrapassar max_slots).
    Devolve o novo slot.

    Uso:
        novo_slot = advance_slot(request.session_id, request.topic)
    """
    current = get_slot(session_id, topic)
    new_slot = min(current + 1, max_slots)
    set_slot(session_id, topic, new_slot)
    print(f"⏭️  [slot_state] advance → {current} → {new_slot} (max={max_slots})")
    return new_slot


def reset_slot(session_id: int | str, topic: str) -> None:
    """
    Repõe o slot a 1 (ex: aluno reinicia o tópico).

    Uso:
        reset_slot(request.session_id, request.topic)
    """
    set_slot(session_id, topic, 1)
    print(f"🔄 [slot_state] reset → sessão={session_id} | tópico='{topic[:30]}...' | slot=1")