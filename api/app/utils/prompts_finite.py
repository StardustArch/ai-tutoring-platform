"""
prompts_finite.py
═══════════════════════════════════════════════════════════════════
Prompts para domínios finitos.

PRINCÍPIO: todos os valores já foram calculados em finite_domains.py.
A IA recebe os valores como DADOS — só escreve a narrativa moçambicana.
NÃO calcula, NÃO escolhe, NÃO inventa valores.
"""

# ─── TEMPLATE UNIVERSAL ──────────────────────────────────────────────────────
# Usado para todos os domínios finitos.
# A IA recebe: pergunta calculada + opções calculadas + resposta certa.
# Só precisa de adicionar contexto moçambicano se aplicável.

PROMPT_FINITE_DOMAIN = """
Você é um professor de Moçambique criando um quiz para alunos da {student_class}ª classe.

PERGUNTA JÁ CALCULADA (NÃO ALTERES):
"{question_template}"

OPÇÕES JÁ CALCULADAS (NÃO ALTERES):
{options_json}

RESPOSTA CORRECTA JÁ CALCULADA (NÃO ALTERES):
"{correct_answer}"

EXPLICAÇÃO A CRIAR:
Escreve UMA explicação curta e clara (1-2 frases) adequada a uma criança de 8-10 anos.
Usa contexto moçambicano se fizer sentido (ex: nomes locais, objectos do quotidiano).
NÃO inventes outra pergunta. NÃO mudas as opções. NÃO mudas a resposta.

LINGUAGEM: simples, directa, sem termos técnicos.
SEM MARKDOWN. Só JSON puro.

FORMATO OBRIGATÓRIO:
{{
  "topico": "{subtopic}",
  "question": "{question_template}",
  "options": {options_json},
  "correct_answer": "{correct_answer}",
  "explanation": "..."
}}

Gera agora o JSON:
"""

# ─── PROMPT COM NARRATIVA CONTEXTUAL ─────────────────────────────────────────
# Para perguntas onde faz sentido adicionar um contexto narrativo moçambicano
# antes da pergunta calculada (ex: Romanos, Ordinais, Fracções).

PROMPT_FINITE_WITH_NARRATIVE = """
Você é um professor de Moçambique criando um quiz para alunos da {student_class}ª classe.

DADOS JÁ CALCULADOS — NÃO ALTERES NENHUM VALOR:
{calculated_data}

TAREFA:
1. Cria UMA frase de contexto moçambicano curta (nomes: Ali, Fátima, Sónia, Hélio; lugares: Maputo, Beira, Nampula).
2. Usa essa frase como introdução à pergunta calculada acima.
3. Mantém a pergunta, opções e resposta EXACTAMENTE como estão nos dados.
4. Escreve a explicação em linguagem simples para crianças.
5. SEM MARKDOWN. Só JSON puro.

EXEMPLO de como adicionar contexto:
  - Dados: "Como se escreve 14 em numeração romana?"
  - Com contexto: "A professora Ana escreveu no quadro o número 14. Como se escreve este número em numeração romana?"

FORMATO OBRIGATÓRIO:
{{
  "topico": "{subtopic}",
  "question": "[frase de contexto] + [pergunta calculada]",
  "options": {options_json},
  "correct_answer": "{correct_answer}",
  "explanation": "..."
}}

Gera agora o JSON:
"""