async def processar_mensagem(mensagem_aluno: str, id_aluno: int) -> dict:
    print(f"[Serviço de Chat]: A processar mensagem async de {id_aluno}: '{mensagem_aluno}'")
    # (Lógica Futura: Chamar a IA 'await api_gemini(...)')
    resposta_ia = f"Eu sou a IA (FastAPI). Você (aluno {id_aluno}) disse: '{mensagem_aluno}'"
    return {"sucesso": True, "resposta": resposta_ia, "topico": "indefinido"}