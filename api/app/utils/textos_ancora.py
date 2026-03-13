# textos_ancora.py
#
# Banco de âncoras para perguntas de interpretação no KMind.
# Cada entrada tem:
#   - tipo: 'textual' ou 'visual'
#   - conteudo: o texto/descrição que a IA usa como base
#
# Convenção de chaves:
#   texto_   → âncora textual (narrativa, bilhete, carta, poema, convite...)
#   visual_  → âncora visual (cartaz, sinal, gráfico, figura geométrica...)
#
# No seed.ts, ancora pode ser:
#   - string  → "texto_bilhete_fatima"            (sempre a mesma)
#   - lista   → ["visual_grafico_barras_1", ...]  (escolhe aleatoriamente)
#
# get_ancora() trata os dois casos automaticamente.

import random
from typing import Union

ANCORAS: dict[str, dict] = {

    # ══════════════════════════════════════════════════════════════════════
    # 📘 PORTUGUÊS 3ª CLASSE
    # ══════════════════════════════════════════════════════════════════════

    "texto_familia_ana": {
        "tipo": "textual",
        "conteudo": (
            "A Ana tem nove anos e vive com a sua família em Maputo. "
            "O pai chama-se Augusto e trabalha como carpinteiro. "
            "A mãe chama-se Lurdes e vende peixe no mercado. "
            "A Ana tem um irmão mais novo que se chama Hélio. "
            "Ao fim do dia, a família janta junta e conta histórias."
        )
    },

    "texto_familia_retrato": {
        "tipo": "textual",
        "conteudo": (
            "A Josina é alta e magra. Tem o cabelo encaracolado e os olhos castanhos. "
            "É sempre alegre e gosta de ajudar os colegas na escola. "
            "A professora diz que ela é muito inteligente e trabalhadora."
        )
    },

    "texto_bilhete_fatima": {
        "tipo": "textual",
        "conteudo": (
            "Olá Sónia!\n"
            "Hoje não posso ir brincar à tua casa porque tenho de ajudar "
            "a minha mãe na machamba. Vemo-nos amanhã na escola.\n"
            "Beijos, Fátima.\n"
            "(12 de Março)"
        )
    },

    "texto_poema_comunidade": {
        "tipo": "textual",
        "conteudo": (
            "A nossa terra é bela,\n"
            "tem rio, campo e mar.\n"
            "Trabalhámos juntos, nela,\n"
            "para um futuro melhorar.\n\n"
            "O vizinho ajuda o vizinho,\n"
            "a criança vai à escola.\n"
            "Cada um faz o seu caminho,\n"
            "e a comunidade voa."
        )
    },

    "texto_convite_aniversario": {
        "tipo": "textual",
        "conteudo": (
            "CONVITE\n"
            "O Luís convida-te para o seu aniversário!\n"
            "Data: Sábado, 20 de Abril\n"
            "Hora: 15h00\n"
            "Local: Casa do Luís, Bairro Central, Beira\n"
            "Confirma a tua presença com a mãe do Luís.\n"
            "Até lá!"
        )
    },

    "texto_conversa_direta_animais": {
        "tipo": "textual",
        "conteudo": (
            "— Ali, já viste os animais da quinta do sr. Cossa? — perguntou a Sónia.\n"
            "— Vi sim! Ele tem galinhas, cabras e um burro muito grande — respondeu o Ali.\n"
            "— E os patos? — insistiu a Sónia.\n"
            "— Também! Andam sempre perto do rio — disse o Ali a sorrir."
        )
    },

    # ══════════════════════════════════════════════════════════════════════
    # 📗 PORTUGUÊS 4ª CLASSE
    # ══════════════════════════════════════════════════════════════════════

    "texto_carta_familiar": {
        "tipo": "textual",
        "conteudo": (
            "Maputo, 10 de Março de 2025\n\n"
            "Querido avô Augusto,\n\n"
            "Estou a escrever-te para contar que já comecei a 4ª classe. "
            "A professora chama-se Glória e é muito simpática. "
            "Tenho saudades tuas e da avó Conceição.\n\n"
            "Um abraço grande,\n"
            "Fátima"
        )
    },

    "texto_aviso_escola": {
        "tipo": "textual",
        "conteudo": (
            "AVISO\n\n"
            "A Direcção da Escola Primária do Bairro Central informa todos os "
            "encarregados de educação que na próxima sexta-feira, dia 18 de Abril, "
            "não haverá aulas devido à reunião de professores.\n\n"
            "As aulas recomeçam na segunda-feira, dia 21 de Abril.\n\n"
            "A Directora,\n"
            "Glória Machava"
        )
    },

    "texto_discurso_direto_indireto": {
        "tipo": "textual",
        "conteudo": (
            "O professor Armando disse aos alunos:\n"
            "— Amanhã vamos ter uma visita especial à escola!\n\n"
            "O Hélio perguntou:\n"
            "— Quem vai visitar-nos, professor?\n\n"
            "— É uma escritora moçambicana muito famosa — respondeu o professor, sorrindo."
        )
    },

    "texto_carta_postal": {
        "tipo": "textual",
        "conteudo": (
            "Inhambane, 5 de Julho\n\n"
            "Olá Sónia!\n\n"
            "Estou a passar as férias em Inhambane com a minha família. "
            "A praia é linda e a água do mar é muito quente. "
            "Ontem vimos tartarugas a pôr ovos na areia!\n\n"
            "Com saudades,\n"
            "Fátima"
        )
    },

    "texto_poema_bandeira": {
        "tipo": "textual",
        "conteudo": (
            "A nossa bandeira tem cores tão belas,\n"
            "verde, preto, amarelo e vermelho a brilhar.\n"
            "No centro, o livro e a enxada entre elas,\n"
            "e a estrela que nos guia a lutar.\n\n"
            "Moçambique livre e soberano,\n"
            "a paz é o nosso maior tesouro.\n"
            "Cada criança, cada cidadão,\n"
            "trabalha por um futuro de ouro."
        )
    },

    "texto_narrativo_historico": {
        "tipo": "textual",
        "conteudo": (
            "A avó Maria sentou-se na esteira e chamou os netos.\n"
            "— Quando eu era criança — começou ela —, vivíamos sob o domínio colonial. "
            "Não podíamos ir à escola livremente nem falar a nossa língua.\n"
            "O pequeno Saíde olhou para a avó com os olhos arregalados.\n"
            "— E agora, avó? — perguntou ele.\n"
            "— Agora somos livres! — disse ela com um sorriso enorme. "
            "— No dia 25 de Junho de 1975, Moçambique tornou-se independente. "
            "Isso é o maior presente que os nossos heróis nos deram."
        )
    },

    # ══════════════════════════════════════════════════════════════════════
    # 🚦 VISUAIS — Português: Cartazes e Sinais
    # ══════════════════════════════════════════════════════════════════════

    "visual_sinal_stop": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO SINAL DE TRÂNSITO:\n"
            "Sinal octogonal (oito lados) com fundo vermelho. "
            "No centro, letras brancas maiúsculas: STOP. "
            "Colocado numa esquina antes de uma intersecção."
        )
    },

    "visual_sinal_passadeira": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO SINAL DE TRÂNSITO:\n"
            "Sinal rectangular com fundo azul. "
            "No centro, imagem de uma pessoa a caminhar sobre listras brancas. "
            "Indica que os peões podem atravessar a estrada naquele local."
        )
    },

    "visual_sinal_proibido_entrada": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO SINAL DE TRÂNSITO:\n"
            "Sinal circular com fundo branco e borda vermelha. "
            "No centro, uma barra horizontal vermelha. "
            "Significa que é proibido entrar naquela rua ou caminho."
        )
    },

    "visual_cartaz_malaria": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO CARTAZ DE SAÚDE:\n"
            "Fundo verde. Título: 'PROTEGE A TUA FAMÍLIA!'\n"
            "Imagem de uma família a dormir debaixo de uma rede mosquiteira azul.\n"
            "Texto: 'Dorme sempre debaixo da rede mosquiteira para evitar a Malária. "
            "Água parada é perigo!'"
        )
    },

    "visual_cartaz_lavar_maos": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO CARTAZ DE SAÚDE:\n"
            "Fundo amarelo. Título: 'LAVA AS MÃOS E FICA SAUDÁVEL!'\n"
            "4 imagens numeradas: 1) mãos sob torneira, 2) mãos com sabão, "
            "3) mãos a ser esfregadas, 4) mãos limpas.\n"
            "Texto: 'Lava as mãos antes de comer e depois de usar a latrina. Evita a cólera!'"
        )
    },

    "visual_cartaz_higiene_alimentar": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO CARTAZ DE SAÚDE:\n"
            "Fundo azul claro. Título: 'CUIDA DOS ALIMENTOS!'\n"
            "Coluna VERDE (correcto): lavar alimentos, tapar comida, beber água tratada.\n"
            "Coluna VERMELHA (errado): comer fruta sem lavar, expor comida ao sol, "
            "beber água do rio sem tratar."
        )
    },

    "visual_cartaz_vacinas": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO CARTAZ DE SAÚDE:\n"
            "Fundo branco, borda azul. Título: 'VACINAS SALVAM VIDAS!'\n"
            "Imagem de uma criança a receber vacina no braço, a sorrir.\n"
            "Texto: 'Leva o teu filho ao centro de saúde nos primeiros meses de vida.'\n"
            "Em baixo: 'Centro de Saúde — Aberto de Segunda a Sábado, 7h00 às 16h00.'"
        )
    },

    # ══════════════════════════════════════════════════════════════════════
    # 📐 VISUAIS — Matemática 3ª Classe
    # ══════════════════════════════════════════════════════════════════════

    # ── Figuras Planas ────────────────────────────────────────────────────

    "visual_figuras_planas_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE FIGURAS GEOMÉTRICAS:\n"
            "Figura A: 3 lados todos diferentes entre si (triângulo escaleno).\n"
            "Figura B: 4 lados iguais e 4 ângulos rectos (quadrado).\n"
            "Figura C: linha curva fechada, sem cantos nem lados (círculo).\n"
            "Figura D: 4 lados, os opostos iguais, 4 ângulos rectos, "
            "mas os lados adjacentes não são iguais (rectângulo)."
        )
    },

    "visual_figuras_planas_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE FIGURAS GEOMÉTRICAS:\n"
            "Figura A: 3 lados, dois deles iguais (triângulo isósceles).\n"
            "Figura B: 4 lados iguais mas ângulos não rectos (losango).\n"
            "Figura C: 4 lados, apenas um par de lados paralelo (trapézio).\n"
            "Figura D: 3 lados todos iguais entre si (triângulo equilátero)."
        )
    },

    "visual_figuras_planas_3": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE FIGURAS GEOMÉTRICAS:\n"
            "Figura A: círculo com ponto O no centro e linha do centro ao bordo "
            "marcada como 'r = 5 cm' (raio).\n"
            "Figura B: mesmo círculo com linha a atravessar o centro de ponta a ponta "
            "marcada como 'd' (diâmetro).\n"
            "Se o raio mede 5 cm, qual é o diâmetro?"
        )
    },

    # ── Sólidos Geométricos ───────────────────────────────────────────────

    "visual_solidos_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE SÓLIDOS GEOMÉTRICOS:\n"
            "Sólido A: 6 faces quadradas iguais, 12 arestas iguais, 8 vértices (cubo).\n"
            "Sólido B: base circular, sobe a afinar, termina num pico (cone).\n"
            "Sólido C: duas faces circulares ligadas por superfície curva (cilindro).\n"
            "Sólido D: completamente redondo, sem faces planas nem arestas (esfera)."
        )
    },

    "visual_solidos_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE SÓLIDOS GEOMÉTRICOS:\n"
            "Sólido A: 6 faces rectangulares, nem todas iguais, 12 arestas, "
            "8 vértices (paralelepípedo — parece caixa de sapatos).\n"
            "Sólido B: base quadrada e 4 faces triangulares que terminam num pico (pirâmide).\n"
            "Sólido C: 6 faces quadradas todas iguais (cubo — parece dado de jogar).\n"
            "Sólido D: duas faces circulares paralelas ligadas por superfície curva (cilindro)."
        )
    },

    # ── Relógio ───────────────────────────────────────────────────────────

    "visual_relogio_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO RELÓGIO ANALÓGICO:\n"
            "Relógio redondo com números de 1 a 12.\n"
            "Ponteiro pequeno (horas): aponta para o 3.\n"
            "Ponteiro grande (minutos): aponta para o 12.\n"
            "Hora mostrada: 3:00 (três horas em ponto)."
        )
    },

    "visual_relogio_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO RELÓGIO ANALÓGICO:\n"
            "Relógio redondo com números de 1 a 12.\n"
            "Ponteiro pequeno (horas): entre o 7 e o 8.\n"
            "Ponteiro grande (minutos): aponta para o 6.\n"
            "Hora mostrada: 7:30 (sete horas e meia)."
        )
    },

    "visual_relogio_3": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO RELÓGIO ANALÓGICO:\n"
            "Relógio redondo com números de 1 a 12.\n"
            "Ponteiro pequeno (horas): entre o 10 e o 11.\n"
            "Ponteiro grande (minutos): aponta para o 3.\n"
            "Hora mostrada: 10:15 (dez horas e um quarto)."
        )
    },

    "visual_relogio_4": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO RELÓGIO ANALÓGICO:\n"
            "Relógio redondo com números de 1 a 12.\n"
            "Ponteiro pequeno (horas): aponta para o 6.\n"
            "Ponteiro grande (minutos): aponta para o 9.\n"
            "Hora mostrada: 6:45 (seis horas e quarenta e cinco minutos)."
        )
    },

    # ── Gráficos de Barras (3ª Classe) ───────────────────────────────────

    "visual_grafico_barras_fruta": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO GRÁFICO DE BARRAS:\n"
            "Título: 'Fruta preferida dos alunos da turma'\n"
            "Categorias: Manga, Papaia, Laranja, Banana\n"
            "Valores:\n"
            "  - Manga:   10 alunos\n"
            "  - Papaia:   6 alunos\n"
            "  - Laranja:  8 alunos\n"
            "  - Banana:   4 alunos\n"
            "Total: 28 alunos"
        )
    },

    "visual_grafico_barras_desporto": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO GRÁFICO DE BARRAS:\n"
            "Título: 'Desporto preferido dos alunos da 3ª classe'\n"
            "Categorias: Futebol, Corrida, Natação, Basquetebol\n"
            "Valores:\n"
            "  - Futebol:      14 alunos\n"
            "  - Corrida:       5 alunos\n"
            "  - Natação:       7 alunos\n"
            "  - Basquetebol:   4 alunos\n"
            "Total: 30 alunos"
        )
    },

    "visual_grafico_barras_animais": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO GRÁFICO DE BARRAS:\n"
            "Título: 'Animais na quinta do sr. Cossa'\n"
            "Categorias: Galinhas, Cabras, Patos, Coelhos\n"
            "Valores:\n"
            "  - Galinhas: 18\n"
            "  - Cabras:    9\n"
            "  - Patos:    12\n"
            "  - Coelhos:   5\n"
            "Total: 44 animais"
        )
    },

    # ── Tabela 3ª Classe ──────────────────────────────────────────────────

    "visual_tabela_alunos_3": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DA TABELA:\n"
            "Título: 'Alunos presentes por dia da semana'\n"
            "| Dia      | Presentes |\n"
            "| Segunda  |    28     |\n"
            "| Terça    |    25     |\n"
            "| Quarta   |    30     |\n"
            "| Quinta   |    27     |\n"
            "| Sexta    |    22     |"
        )
    },

    # ══════════════════════════════════════════════════════════════════════
    # 📐 VISUAIS — Matemática 4ª Classe
    # ══════════════════════════════════════════════════════════════════════

    # ── Ângulos ───────────────────────────────────────────────────────────

    "visual_angulos_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE ÂNGULOS:\n"
            "Ângulo A: exactamente como o canto de uma folha de papel — 90 graus (recto).\n"
            "Ângulo B: mais fechado que o canto de uma folha — menos de 90 graus (agudo).\n"
            "Ângulo C: mais aberto que 90 graus mas sem formar linha recta (obtuso).\n"
            "Ângulo D: os dois lados formam uma linha recta perfeita — 180 graus (raso)."
        )
    },

    "visual_angulos_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE ÂNGULOS NO QUOTIDIANO:\n"
            "Figura A: canto de uma janela rectangular — ângulo de 90 graus (recto).\n"
            "Figura B: ponta de uma fatia de pizza muito fina — ângulo pequeno (agudo).\n"
            "Figura C: leque meio aberto — mais que 90 graus (obtuso).\n"
            "Figura D: estrada recta vista de cima — linha perfeita (ângulo raso, 180°)."
        )
    },

    "visual_angulos_3": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE ÂNGULOS NUM TRIÂNGULO:\n"
            "Triângulo com três ângulos marcados:\n"
            "Ângulo A (vértice esquerdo): pequeno, menos de 90 graus (agudo).\n"
            "Ângulo B (vértice direito): também agudo.\n"
            "Ângulo C (vértice do topo): claramente maior que 90 graus (obtuso).\n"
            "Nota: a soma dos três ângulos é sempre 180 graus."
        )
    },

    # ── Círculo — Raio e Diâmetro ─────────────────────────────────────────

    "visual_circulo_raio_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO CÍRCULO:\n"
            "Círculo com centro O.\n"
            "Linha do centro ao bordo: raio = 4 cm.\n"
            "Linha que atravessa o centro de ponta a ponta: diâmetro (valor não indicado).\n"
            "Questão: qual é o comprimento do diâmetro?"
        )
    },

    "visual_circulo_raio_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO CÍRCULO:\n"
            "Círculo com centro O.\n"
            "Linha que atravessa o centro de ponta a ponta: diâmetro = 12 cm.\n"
            "Linha do centro ao bordo: raio (valor não indicado).\n"
            "Questão: qual é o comprimento do raio?"
        )
    },

    "visual_circulo_raio_3": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO CÍRCULO:\n"
            "Círculo com centro O e raio = 7 cm.\n"
            "Quatro pontos no bordo marcados A, B, C, D.\n"
            "Questão: qual é o diâmetro? Qual é a distância de A ao centro O?"
        )
    },

    # ── Triângulos — Classificação pelos Lados ────────────────────────────

    "visual_triangulos_lados_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE TRIÂNGULOS (pelos lados):\n"
            "Triângulo A: lados medem 5 cm, 5 cm e 5 cm (equilátero).\n"
            "Triângulo B: lados medem 4 cm, 4 cm e 6 cm (isósceles).\n"
            "Triângulo C: lados medem 3 cm, 5 cm e 7 cm (escaleno)."
        )
    },

    "visual_triangulos_lados_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE TRIÂNGULOS (pelos lados):\n"
            "Triângulo A: lados medem 6 cm, 8 cm e 10 cm — todos diferentes (escaleno).\n"
            "Triângulo B: lados medem 7 cm, 7 cm e 7 cm — todos iguais (equilátero).\n"
            "Triângulo C: lados medem 5 cm, 5 cm e 8 cm — dois iguais (isósceles)."
        )
    },

    # ── Triângulos — Classificação pelos Ângulos ──────────────────────────

    "visual_triangulos_angulos_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE TRIÂNGULOS (pelos ângulos):\n"
            "Triângulo A: tem um quadradinho num ângulo (90°) — rectângulo.\n"
            "Triângulo B: os três ângulos são todos menores que 90° — acutângulo.\n"
            "Triângulo C: tem um ângulo claramente maior que 90° — obtusângulo."
        )
    },

    "visual_triangulos_angulos_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE TRIÂNGULOS (pelos ângulos):\n"
            "Triângulo A: 'deitado', ângulo muito aberto num vértice (obtusângulo).\n"
            "Triângulo B: parece uma fatia de pizza — três ângulos pequenos (acutângulo).\n"
            "Triângulo C: tem um canto como o de uma folha de papel (rectângulo)."
        )
    },

    # ── Quadriláteros ─────────────────────────────────────────────────────

    "visual_quadrilateros_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE QUADRILÁTEROS:\n"
            "Figura A: 4 lados iguais, 4 ângulos rectos (quadrado).\n"
            "Figura B: 4 lados, opostos iguais, 4 ângulos rectos, mais comprido (rectângulo).\n"
            "Figura C: 4 lados iguais, ângulos não rectos, está 'inclinada' (losango).\n"
            "Figura D: 4 lados, opostos paralelos e iguais, sem ângulos rectos (paralelogramo).\n"
            "Figura E: 4 lados, só um par de lados paralelo (trapézio)."
        )
    },

    "visual_quadrilateros_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE QUADRILÁTEROS NO QUOTIDIANO:\n"
            "Figura A: porta da sala de aula — mais alta que larga, 4 ângulos rectos (rectângulo).\n"
            "Figura B: azulejo do chão — todos os lados iguais, 4 ângulos rectos (quadrado).\n"
            "Figura C: campo de futebol visto de cima — mais comprido, 4 ângulos rectos (rectângulo).\n"
            "Figura D: placa de rua inclinada — 4 lados iguais, sem ângulos rectos (losango)."
        )
    },

    # ── Área por Quadrículas ──────────────────────────────────────────────

    "visual_area_quadriculas_1": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE FIGURAS NUMA GRELHA (cada quadrícula = 1 cm²):\n"
            "Figura A: rectângulo de 4 quadrículas × 3 quadrículas.\n"
            "Figura B: quadrado de 3 quadrículas × 3 quadrículas.\n"
            "Questão: qual a área de cada figura em cm²?"
        )
    },

    "visual_area_quadriculas_2": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE FIGURAS NUMA GRELHA (cada quadrícula = 1 cm²):\n"
            "Figura A: forma irregular que ocupa exactamente 8 quadrículas completas.\n"
            "Figura B: rectângulo de 5 quadrículas × 2 quadrículas.\n"
            "Questão: qual figura tem maior área?"
        )
    },

    "visual_area_quadriculas_3": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DE FIGURAS NUMA GRELHA (cada quadrícula = 1 cm²):\n"
            "Figura A: rectângulo 6 cm × 2 cm.\n"
            "Figura B: quadrado 3 cm × 3 cm.\n"
            "Figura C: rectângulo 4 cm × 3 cm.\n"
            "Questão: qual tem maior área? Alguma tem a mesma área que outra?"
        )
    },

    # ── Tabelas e Gráficos de Linhas (4ª Classe) ─────────────────────────

    "visual_tabela_producao_4": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DA TABELA:\n"
            "Título: 'Produção de caju (sacos) por mês — Cooperativa de Sofala'\n"
            "| Mês       | Sacos |\n"
            "| Janeiro   |  45   |\n"
            "| Fevereiro |  60   |\n"
            "| Março     |  80   |\n"
            "| Abril     |  55   |\n"
            "| Maio      |  30   |"
        )
    },

    "visual_tabela_alunos_4": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DA TABELA:\n"
            "Título: 'Alunos presentes por semana — turma da prof. Glória'\n"
            "| Semana   | Alunos |\n"
            "| Semana 1 |   32   |\n"
            "| Semana 2 |   28   |\n"
            "| Semana 3 |   35   |\n"
            "| Semana 4 |   30   |"
        )
    },

    "visual_grafico_linhas_temperatura": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO GRÁFICO DE LINHAS:\n"
            "Título: 'Temperatura média em Maputo (Jan–Jun, em °C)'\n"
            "Valores:\n"
            "  - Janeiro:   32°C\n"
            "  - Fevereiro: 31°C\n"
            "  - Março:     29°C\n"
            "  - Abril:     26°C\n"
            "  - Maio:      22°C\n"
            "  - Junho:     18°C\n"
            "Tendência: a linha desce (temperatura cai do verão para o inverno)."
        )
    },

    "visual_grafico_linhas_caju": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO GRÁFICO DE LINHAS:\n"
            "Título: 'Produção de caju (sacos) por mês — Cooperativa de Sofala'\n"
            "Valores:\n"
            "  - Janeiro:   45 sacos\n"
            "  - Fevereiro: 60 sacos\n"
            "  - Março:     80 sacos\n"
            "  - Abril:     55 sacos\n"
            "  - Maio:      30 sacos\n"
            "Tendência: sobe até Março, depois desce."
        )
    },

    "visual_grafico_linhas_alunos": {
        "tipo": "visual",
        "conteudo": (
            "DESCRIÇÃO DO GRÁFICO DE LINHAS:\n"
            "Título: 'Alunos presentes por semana'\n"
            "Valores:\n"
            "  - Semana 1: 30\n"
            "  - Semana 2: 28\n"
            "  - Semana 3: 35\n"
            "  - Semana 4: 32\n"
            "  - Semana 5: 38\n"
            "Tendência: sobe e desce mas tendência geral é crescente."
        )
    },
}


# ─── FUNÇÕES DE ACESSO ────────────────────────────────────────────────────────

def get_ancora(chave: Union[str, list, None]) -> dict | None:
    """
    Devolve a âncora pela chave.

    Aceita:
      - string → devolve directamente
      - lista  → escolhe aleatoriamente (para slots com múltiplas âncoras)
      - None   → devolve None

    Retorna None se a chave não existir.
    """
    if chave is None:
        return None
    if isinstance(chave, list):
        if not chave:
            return None
        chave = random.choice(chave)
    return ANCORAS.get(chave)


def get_ancora_aleatoria_por_tipo(tipo: str) -> dict | None:
    """
    Fallback: devolve âncora aleatória do tipo pedido ('textual' ou 'visual').
    """
    candidatas = [v for v in ANCORAS.values() if v["tipo"] == tipo]
    return random.choice(candidatas) if candidatas else None