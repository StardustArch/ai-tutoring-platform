import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🇲🇿 A carregar o Currículo Nacional de Moçambique (KMind)...');

  const mat = await prisma.disciplina.upsert({
    where: { nome: 'Matemática' },
    update: {},
    create: { nome: 'Matemática' },
  });

  const port = await prisma.disciplina.upsert({
    where: { nome: 'Português' },
    update: {},
    create: { nome: 'Português' },
  });

  console.log('✅ Disciplinas configuradas.');

  const topicos = [

// ══════════════════════════════════════════════════════════════
// 📘 MATEMÁTICA - 3ª CLASSE
// Baseado no índice real do Livro de Matemática 3ª Classe (INDE/Moçambique)
// Corrigido em relação ao seed anterior:
//   - Nomes das unidades corrigidos (livro usa "Fracção", "Tabelas e gráficos")
//   - Un.2: ordem dos conteúdos corrigida (Triângulos antes de Perpendiculares)
//   - Un.3: Propriedade de cálculo adicionada (estava omitida)
//   - Un.4: ×0, Propriedade de cálculo, Divisão via multiplicação,
//            Divisão na forma vertical — todos adicionados
//   - Un.6: reduzida a 5 slots (apenas 7 páginas no livro)
//   - Un.7: reduzida a 4 slots (apenas 5 páginas no livro)
//   - Un.8: reduzida a 6 slots (6 páginas)
//   - Un.9: "Gráfico de Linhas" corrigido para "Gráfico de Barras"
//   - difficulty:5 eliminado — máximo 4
// ══════════════════════════════════════════════════════════════

{
  d: mat.id, c: 3,
  nome: 'Unidade 1: Números Naturais e Operações (1)',
  meta: {
    icon: 'Hash', color: 'bg-blue-500',
    desc: 'Até 10.000, Recta Numérica, Ordinais e Romanos até L',
    ai_rules: `
TÓPICO: Unidade 1 — Números Naturais e Operações (1)
(Livro Matemática 3ª Classe, pp. 8–31)

SUBCAPÍTULOS:
  1.1 Revisão (p.8) — o aluno JÁ conhece números até 1000 da 2ª classe
  1.2 Leitura e escrita dos números naturais até 10.000 (p.13)
  1.3 Composição e decomposição até 10.000 (p.17)
  1.4 Recta numérica (p.20)
  1.5 Comparação dos números naturais até 10.000 (p.23)
  1.6 Números ordinais até quinquagésimo (50º) (p.26)
  1.7 Números romanos até cinquenta (L) (p.28)

CONTEÚDOS DETALHADOS:
Leitura/Escrita:
  - Ler e escrever números de 4 dígitos até 10.000.
  - Identificar valor posicional: unidades, dezenas, centenas, unidades de milhar.

Composição e Decomposição:
  - 5.432 = 5.000 + 400 + 30 + 2.
  - Identificar quantas dezenas, centenas, milhar tem um número.

Recta numérica:
  - Localizar o número que falta entre dois números dados.
  - Identificar números vizinhos (anterior e posterior).

Comparação e Ordenação:
  - Usar os sinais > < = .
  - Ordenar listas de números em ordem crescente e decrescente.

Ordinais (até 50º):
  - Primeiro (1º) até quinquagésimo (50º).
  - Associar ordinal a posição.

Numeração Romana (até L = 50):
  - Símbolos permitidos: I=1, V=5, X=10, L=50.
  - Regras de adição e subtracção (IV=4, IX=9, XL=40).
  - Converter Romano↔Árabe até L.

PROIBIDO:
  - Operações aritméticas (adição, subtracção, multiplicação, divisão).
  - Números acima de 10.000.
  - Romanos com C, D, M (são da 4ª classe).

CONTEXTO MOÇAMBICANO: Preços em meticais, número de alunos,
  população de aldeias. Nomes: Ali, Fátima, professor Mateus.`,
    lesson_plan: [
      { slot: 1, structure: 'Leitura e Escrita de números até 10.000',                difficulty: 1 },
      { slot: 2, structure: 'Composição e Decomposição (unidades/dezenas/centenas/milhar)', difficulty: 1 },
      { slot: 3, structure: 'Localizar número que falta na Recta Numérica',           difficulty: 2 },
      { slot: 4, structure: 'Comparação e Ordenação de números até 10.000',           difficulty: 2 },
      { slot: 5, structure: 'Identificar Número Ordinal até 50º',                     difficulty: 3 },
      { slot: 6, structure: 'Converter Número Romano até L',                          difficulty: 3 },
      { slot: 7, structure: 'Valor posicional: qual o valor do dígito X no número Y', difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 3,
  nome: 'Unidade 2: Espaço e Forma',
    ancoras: ['visual_figuras_planas_1', 'visual_figuras_planas_2', 'visual_figuras_planas_3', 'visual_solidos_1', 'visual_solidos_2'], 
  meta: {
    icon: 'Shapes', color: 'bg-orange-500',
    desc: 'Triângulos, Rectas, Rectângulo/Quadrado, Círculo e Sólidos',
    ai_rules: `
TÓPICO: Unidade 2 — Espaço e Forma
(Livro Matemática 3ª Classe, pp. 33–55)

SUBCAPÍTULOS (ordem do livro):
  2.1 Revisão (p.33)
  2.2 Triângulos (p.37)
  2.3 Rectas perpendiculares (p.38)
  2.4 Rectas paralelas (p.40)
  2.5 Rectângulo e quadrado (p.43)
  2.6 Circunferência e círculo (p.47)
  2.7 Sólidos geométricos (p.49)

CONTEÚDOS DETALHADOS:
Triângulos (2.2):
  - Identificar triângulo: 3 lados, 3 ângulos.
  - Distinguir de outras figuras (quadriláteros, círculo).

Rectas Perpendiculares (2.3):
  - Duas rectas que se cruzam formando ângulo recto (90°).
  - Identificar por descrição visual (ex: esquinas de uma sala).

Rectas Paralelas (2.4):
  - Duas rectas que nunca se encontram, sempre à mesma distância.
  - Exemplos: trilhos de comboio, linhas de caderno.

Rectângulo e Quadrado (2.5):
  - Rectângulo: 4 lados, 4 ângulos rectos, lados opostos iguais.
  - Quadrado: caso especial — 4 lados IGUAIS, 4 ângulos rectos.
  - Diferenciar: todo o quadrado é rectângulo mas não vice-versa.

Circunferência e Círculo (2.6):
  - Circunferência: linha curva fechada (o contorno).
  - Círculo: região interior + contorno.
  - Identificar centro do círculo.

Sólidos Geométricos (2.7):
  - Identificar: Cubo, Paralelepípedo, Esfera, Cilindro, Cone, Pirâmide.
  - Reconhecer faces planas e faces curvas.
  - Contar faces de sólidos simples (cubo=6, paralelepípedo=6).

PROIBIDO:
  - Ângulos (além de identificar "ângulo recto" nas perpendiculares).
  - Classificação de triângulos por lados ou ângulos (é da 4ª classe).
  - Fórmulas de área ou perímetro.
  - Coordenadas.

CONTEXTO: Objectos moçambicanos — lata de água (cilindro), bola
  (esfera), caixa de fósforos (paralelepípedo), pilão (cilindro+cone).`,
    lesson_plan: [
      { slot: 1, structure: 'Identificar Triângulo entre figuras planas',              difficulty: 1, ancora: ['visual_figuras_planas_1', 'visual_figuras_planas_2'] }, // 🆕
      { slot: 2, structure: 'Identificar Rectas Perpendiculares vs Paralelas',         difficulty: 1 },
      { slot: 3, structure: 'Diferenciar Rectângulo de Quadrado',                      difficulty: 2 },
      { slot: 4, structure: 'Identificar Centro e Circunferência do Círculo',          difficulty: 2, ancora: ['visual_figuras_planas_3'] }, // 🆕
      { slot: 5, structure: 'Identificar Sólido Geométrico pela descrição',            difficulty: 3, ancora: ['visual_solidos_1', 'visual_solidos_2'] }, // 🆕
      { slot: 6, structure: 'Contar Faces de um Sólido (cubo, paralelepípedo)',        difficulty: 3, ancora: ['visual_solidos_1', 'visual_solidos_2'] }, // 🆕
      { slot: 7, structure: 'Distinguir Figura Plana de Sólido Geométrico',            difficulty: 4, ancora: ['visual_figuras_planas_1', 'visual_solidos_1'] }, // 🆕
    ]
  }
},

{
  d: mat.id, c: 3,
  nome: 'Unidade 3: Números Naturais e Operações (2)',
  meta: {
    icon: 'PlusSquare', color: 'bg-green-500',
    desc: 'Adição e Subtracção com 3-4 dígitos e Propriedades',
    ai_rules: `
TÓPICO: Unidade 3 — Números Naturais e Operações (2)
(Livro Matemática 3ª Classe, pp. 57–87)

SUBCAPÍTULOS:
  3.1 Revisão: Adição (p.57) — revisão da 2ª classe
  3.2 Adição de 3 dígitos (p.61)
  3.3 Adição de 4 dígitos (p.70)
  3.4 Propriedade de cálculo (p.72) — comutativa e associativa
  3.5 Revisão: Subtracção (p.74)
  3.6 Subtracção de 3 dígitos (p.78)
  3.7 Subtracção de 4 dígitos (p.85)

CONTEÚDOS DETALHADOS:
Adição:
  - Com transporte em números de 3 e 4 dígitos.
  - O aluno JÁ conhece adição básica (revisão de 3.1).

Propriedade de cálculo (3.4):
  - Comutativa da adição: a + b = b + a (ex: 234 + 56 = 56 + 234).
  - Associativa da adição: (a + b) + c = a + (b + c).
  - Estas propriedades facilitam o cálculo mental.

Subtracção:
  - Com empréstimo em números de 3 e 4 dígitos.
  - A subtracção NÃO é comutativa: a − b ≠ b − a.

PROIBIDO:
  - Multiplicação e divisão.
  - Números acima de 4 dígitos.
  - Expressões com parênteses além de mostrar a associativa.

CONTEXTO: Produção de caju, número de alunos nas escolas,
  preços no mercado. Nomes: Fátima, sr. Cossa.`,
    lesson_plan: [
      { slot: 1, structure: 'Adição de 3 dígitos com transporte',                     difficulty: 1 },
      { slot: 2, structure: 'Subtracção de 3 dígitos com empréstimo',                 difficulty: 1 },
      { slot: 3, structure: 'Adição de 4 dígitos com transporte',                     difficulty: 2 },
      { slot: 4, structure: 'Subtracção de 4 dígitos com empréstimo',                 difficulty: 2 },
      { slot: 5, structure: 'Identificar Propriedade Comutativa ou Associativa',       difficulty: 3 },
      { slot: 6, structure: 'Problema de Adição ou Subtracção com contexto real',     difficulty: 3 },
      { slot: 7, structure: 'Problema misto de Adição e Subtracção',                  difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 3,
  nome: 'Unidade 4: Números Naturais e Operações (3)',
  meta: {
    icon: 'X', color: 'bg-purple-500',
    desc: 'Multiplicação, Divisão e relação entre as duas operações',
    ai_rules: `
TÓPICO: Unidade 4 — Números Naturais e Operações (3)
(Livro Matemática 3ª Classe, pp. 89–124)

SUBCAPÍTULOS (ordem do livro):
  4.1 Revisão: Multiplicação (p.89)
  4.2 Multiplicação por 0, 10 e 100 (p.93)
  4.3 Multiplicação de 2 dígitos por 1 dígito (p.97)
  4.4 Multiplicação de 3 dígitos por 1 dígito (p.103)
  4.5 Propriedade de cálculo (p.109) — comutativa da multiplicação
  4.6 Revisão: Divisão (p.111)
  4.7 Cálculo da divisão usando a multiplicação (p.113)
  4.8 Divisão com resto (p.117)
  4.9 Divisão na forma vertical (p.120)

CONTEÚDOS DETALHADOS:
Multiplicação:
  - Multiplicar por 0: n × 0 = 0 (resultado SEMPRE zero).
  - Multiplicar por 10: acrescentar um zero (45 × 10 = 450).
  - Multiplicar por 100: acrescentar dois zeros (45 × 100 = 4.500).
  - 2 dígitos × 1 dígito: ex. 34 × 6 = ?
  - 3 dígitos × 1 dígito: ex. 125 × 4 = ?
  - Propriedade comutativa: a × b = b × a (ex: 3 × 7 = 7 × 3).

Divisão:
  - Relação inversa com multiplicação:
    se 4 × 6 = 24 então 24 ÷ 4 = 6 e 24 ÷ 6 = 4.
    Usar a tabuada para calcular a divisão.
  - Divisão com resto: ex. 17 ÷ 3 = 5 resto 2.
    Verificar: (quotiente × divisor) + resto = dividendo.
  - Divisão na forma vertical: algoritmo com dividendo, divisor,
    quotiente e resto apresentados na disposição vertical.

PROIBIDO:
  - Multiplicadores ou divisores com 2 dígitos.
  - Expressões numéricas com parênteses (são da 4ª classe).
  - Divisão de 4 dígitos.

CONTEXTO: Distribuição equitativa (grupos de alunos, sacos de arroz),
  produção multiplicada por dias de trabalho. Nomes: professor Albino.`,
    lesson_plan: [
      { slot: 1, structure: 'Multiplicação por 0, 10 ou 100',                         difficulty: 1 },
      { slot: 2, structure: 'Multiplicação de 2 dígitos por 1 dígito',               difficulty: 2 },
      { slot: 3, structure: 'Multiplicação de 3 dígitos por 1 dígito',               difficulty: 2 },
      { slot: 4, structure: 'Divisão usando a Multiplicação (relação inversa)',       difficulty: 3 },
      { slot: 5, structure: 'Divisão com Resto',                                      difficulty: 3 },
      { slot: 6, structure: 'Divisão na Forma Vertical',                              difficulty: 3 },
      { slot: 7, structure: 'Problema de Multiplicação ou Divisão com contexto real', difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 3,
  nome: 'Unidade 5: Grandezas e Medidas',
    ancoras: ['visual_relogio_1', 'visual_relogio_2', 'visual_relogio_3', 'visual_relogio_4'], // 🆕

  meta: {
    icon: 'Scale', color: 'bg-teal-500',
    desc: 'Comprimento, Massa, Capacidade e Tempo',
    ai_rules: `
TÓPICO: Unidade 5 — Grandezas e Medidas
(Livro Matemática 3ª Classe, pp. 126–151)

SUBCAPÍTULOS:
  5.1 Comprimento (p.126)
  5.2 Massa (p.134)
  5.3 Capacidade (p.139)
  5.4 Tempo (p.144)

CONTEÚDOS DETALHADOS:
Comprimento (5.1):
  - Unidades: centímetro (cm) e metro (m). 1 m = 100 cm.
  - Medir comprimentos com régua (em cm).
  - Comparar: "o lápis tem 15 cm, o caderno tem 28 cm → o caderno é maior".
  - Conversão simples: 2 m = 200 cm ; 350 cm = 3 m e 50 cm.

Massa (5.2):
  - Unidades: grama (g) e quilograma (kg). 1 kg = 1000 g.
  - Comparar massas: mais pesado, mais leve.
  - Conversão simples: 2 kg = 2000 g.

Capacidade (5.3):
  - Unidade: litro (l).
  - Comparar capacidades: "um balde tem 10 l, um copo tem 0,25 l".
  - Problemas simples com litros (sem decimais complexos).
  - Metade de um litro = meio litro (não usar 0,5 l).

Tempo (5.4):
  - Unidades: segundos, minutos, horas, dias, semanas, meses, anos.
  - Leitura de relógio: horas certas, meia hora, quarto de hora.
  - Relógio digital e analógico.
  - Calendário: dias da semana (7), meses do ano (12).

PROIBIDO:
  - Decimais em conversões (ex: 1,5 kg — usar "1 kg e 500 g").
  - Quilómetro ou milímetro (não estão nesta unidade).
  - Área ou volume.

CONTEXTO: Medir terreno, pesar caju no mercado, litros de água
  no poço, horário escolar. Nomes: avó Lurdes, sr. Cossa.`,
    lesson_plan: [
      { slot: 1, structure: 'Escolher a unidade correcta (m/cm, kg/g, l)',            difficulty: 1 },
      { slot: 2, structure: 'Comparar medidas de comprimento ou massa',               difficulty: 1 },
      { slot: 3, structure: 'Leitura de horas no relógio (analógico e digital)',      difficulty: 2, ancora: ['visual_relogio_1', 'visual_relogio_2', 'visual_relogio_3', 'visual_relogio_4'] }, // 🆕
      { slot: 4, structure: 'Conversão simples de comprimento (m↔cm)',               difficulty: 2 },
      { slot: 5, structure: 'Problema com Capacidade (litros)',                       difficulty: 3 },
      { slot: 6, structure: 'Problema com Tempo (dias, semanas, meses)',              difficulty: 3 },
      { slot: 7, structure: 'Problema misto de Grandezas com contexto real',          difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 3,
  nome: 'Unidade 6: Fracção',
  meta: {
    icon: 'PieChart', color: 'bg-indigo-500',
    desc: 'Noção de Fracção: metade, terço e quarto',
    ai_rules: `
TÓPICO: Unidade 6 — Fracção
(Livro Matemática 3ª Classe, pp. 153–160)

NOTA: Unidade curta (~7 páginas). Trabalha apenas a noção básica.
  Subcapítulo único: 6.1 Noção de fracção.

CONTEÚDOS:
  - Metade (1/2): dividir em 2 partes iguais e tomar 1.
    Ex: metade de 12 = 6 ; metade de um quadrado = 2 rectângulos iguais.
  - Terço (1/3): dividir em 3 partes iguais e tomar 1.
    Ex: terço de 15 = 5.
  - Quarto (1/4): dividir em 4 partes iguais e tomar 1.
    Ex: quarto de 20 = 5.
  - Relacionar fracção com divisão equitativa:
    1/2 de 10 = 10 ÷ 2 = 5.
  - Identificar fracção representada numa figura dividida em partes iguais.

PROIBIDO:
  - Adição ou subtracção de fracções.
  - Fracções com numerador maior que 1 (ex: 3/4 — só trabalhar 1/2, 1/3, 1/4).
  - Fracções com denominador > 4.
  - Frações equivalentes (são da 4ª classe).

CONTEXTO: Dividir pão, laranja, campo de futebol em partes iguais.
  Nomes: Sónia, mãe de Ali.`,
    lesson_plan: [
      { slot: 1, structure: 'Identificar a noção de "metade" (1/2) numa figura',      difficulty: 1 },
      { slot: 2, structure: 'Identificar "terço" (1/3) ou "quarto" (1/4) numa figura',difficulty: 2 },
      { slot: 3, structure: 'Calcular a metade de um número par pequeno',             difficulty: 2 },
      { slot: 4, structure: 'Calcular o terço ou quarto de um número simples',        difficulty: 3 },
      { slot: 5, structure: 'Problema usando metade, terço ou quarto com contexto',   difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 3,
  nome: 'Unidade 7: Literacia Financeira',
  meta: {
    icon: 'Coins', color: 'bg-yellow-500',
    desc: 'Moedas/Notas do Metical e Problemas de Compra',
    ai_rules: `
TÓPICO: Unidade 7 — Literacia Financeira
(Livro Matemática 3ª Classe, pp. 162–167)

NOTA: Unidade curta (~5 páginas). Aplica adição e subtracção
  num contexto financeiro moçambicano.
  7.1 Revisão (p.162)
  7.2 Problemas com moedas e notas do dinheiro moçambicano (p.163)

CONTEÚDOS:
  - Notas e moedas do Metical moçambicano:
    Moedas: 1 MT, 2 MT, 5 MT, 10 MT, 20 MT, 50 MT.
    Notas: 50 MT, 100 MT, 200 MT, 500 MT.
  - Calcular o total de uma compra simples (somar 2-3 preços).
  - Calcular o troco: Troco = valor entregue − total.
  - Verificar se o dinheiro chega para comprar.

PROIBIDO:
  - Juros, câmbios, lucro, desconto.
  - Preços com centavos (usar valores inteiros em MT).
  - Multiplicação ou divisão de valores monetários.

CONTEXTO: Barraca da escola, mercado moçambicano, compra de
  cadernos e lápis. Nomes: vendedeira Lurdes, Sónia, mãe de Hélio.`,
    lesson_plan: [
      { slot: 1, structure: 'Identificar notas e moedas do Metical',                  difficulty: 1 },
      { slot: 2, structure: 'Calcular o total de uma compra (2-3 itens)',              difficulty: 2 },
      { slot: 3, structure: 'Calcular o troco',                                        difficulty: 3 },
      { slot: 4, structure: 'Problema: o dinheiro chega para comprar?',               difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 3,
  nome: 'Unidade 8: Equações',
  meta: {
    icon: 'Equal', color: 'bg-slate-500',
    desc: 'Descobrir o número desconhecido (?) em Adição e Subtracção',
    ai_rules: `
TÓPICO: Unidade 8 — Equações
(Livro Matemática 3ª Classe, pp. 169–175)

NOTA: Unidade focada em adição e subtracção com incógnita.
  (Diferente da 4ª classe que usa multiplicação e divisão.)

CONTEÚDO: 8.1 Equações

CONTEÚDOS DETALHADOS:
  - Representar o número desconhecido com ? ou □ (NÃO usar x ou letras).
  - Adição: 5 + ? = 12 → ? = 12 − 5 = 7.
  - Adição com incógnita no início: ? + 8 = 15 → ? = 15 − 8 = 7.
  - Subtracção: 15 − ? = 10 → ? = 15 − 10 = 5.
  - Subtracção com incógnita no início: ? − 6 = 9 → ? = 9 + 6 = 15.
  - Verificar a resposta substituindo ? pelo valor encontrado.
  - Números envolvidos: até 3 dígitos (máximo ~500).

PROIBIDO:
  - Letras como incógnitas (x, y, n) — usar apenas ? ou □.
  - Equações com multiplicação ou divisão (são da 4ª classe).
  - Equações com dois desconhecidos.

CONTEXTO: "A Fátima tinha ? reais e recebeu mais 8. Agora tem 23."
  "Numa turma havia 30 alunos. Faltaram ?. Estavam presentes 24."`,
    lesson_plan: [
      { slot: 1, structure: 'Encontrar ? em Adição simples (resultado < 30)',          difficulty: 1 },
      { slot: 2, structure: 'Encontrar ? em Subtracção simples (início < 30)',         difficulty: 2 },
      { slot: 3, structure: 'Encontrar ? em Adição com números até 100',              difficulty: 2 },
      { slot: 4, structure: 'Encontrar ? em Subtracção com números até 100',          difficulty: 3 },
      { slot: 5, structure: 'Encontrar ? quando é o primeiro número (? + b = c)',     difficulty: 3 },
      { slot: 6, structure: 'Equação com números de 3 dígitos e contexto real',       difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 3,
  nome: 'Unidade 9: Tabelas e Gráficos',
    ancoras: ['visual_grafico_barras_fruta', 'visual_grafico_barras_desporto', 'visual_grafico_barras_animais', 'visual_tabela_alunos_3'], // 🆕

  meta: {
    icon: 'BarChart', color: 'bg-pink-500',
    desc: 'Leitura de Tabelas e Gráfico de Barras',
    ai_rules: `
TÓPICO: Unidade 9 — Tabelas e Gráficos
(Livro Matemática 3ª Classe, pp. 177–185)

SUBCAPÍTULOS:
  9.1 Revisão: Tabelas (p.177) — revisão de tabelas simples
  9.2 Gráfico de barras (p.178) ← BARRAS (não de linhas)

CONTEÚDOS DETALHADOS:
Tabelas:
  - Ler dado específico numa tabela de uma entrada.
  - Identificar o valor máximo e mínimo.
  - Calcular total de uma coluna/linha.
  - Calcular diferença entre dois valores.

Gráfico de Barras (9.2):
  - Identificar os eixos (horizontal=categorias, vertical=valores).
  - Ler a altura de uma barra (valor de uma categoria).
  - Identificar a barra mais alta (maior) e mais baixa (menor).
  - Calcular a diferença entre duas barras.
  - Calcular o total de todas as barras.
  - Responder a perguntas: "Quantos alunos gostam de futebol?",
    "Qual o desporto mais popular?", "Qual a diferença entre X e Y?"

PROIBIDO:
  - Gráfico de linhas (é da 4ª classe — não confundir!).
  - Média, moda e mediana.
  - Construção de gráficos pelo aluno (apenas interpretar).

CONTEXTO: Número de alunos por turma, fruta preferida na escola,
  animais na quinta. Nomes: professora Ana, turma da Fátima.`,
    lesson_plan: [
      { slot: 1, structure: 'Ler valor específico numa Tabela',                       difficulty: 1, ancora: ['visual_tabela_alunos_3'] }, // 🆕
      { slot: 2, structure: 'Identificar valor Maior/Menor numa Tabela ou Gráfico',   difficulty: 1, ancora: ['visual_tabela_alunos_3'] }, // 🆕
      { slot: 3, structure: 'Calcular o total de duas ou mais categorias',            difficulty: 2, ancora: ['visual_tabela_alunos_3'] }, // 🆕
      { slot: 4, structure: 'Calcular diferença entre duas categorias',               difficulty: 2, ancora: ['visual_tabela_alunos_3'] }, // 🆕
      { slot: 5, structure: 'Interpretar Gráfico de Barras descrito (ler valor)',     difficulty: 3, ancora: ['visual_grafico_barras_fruta', 'visual_grafico_barras_desporto', 'visual_grafico_barras_animais'] }, // 🆕
      { slot: 6, structure: 'Problema completo com Gráfico de Barras',                difficulty: 4, ancora: ['visual_grafico_barras_fruta', 'visual_grafico_barras_desporto', 'visual_grafico_barras_animais'] }, // 🆕
    ]
  }
},

   // ══════════════════════════════════════════════════════════════
// 📙 MATEMÁTICA - 4ª CLASSE
// Baseado no índice real do Livro de Matemática 4ª Classe (INDE/Moçambique)
// Corrigido em relação ao seed anterior:
//   - Nomes das unidades corrigidos para os do livro
//   - difficulty máximo 4, escala consistente (1=fácil, 4=difícil)
//   - Slots duplicados eliminados
//   - Unidades 8 e 9 reduzidas a slots proporcionais (3-4 páginas de conteúdo)
//   - Un.4: adicionados passos intermédios 2×2 e 2÷1
//   - Un.2: triângulos por ângulos + quadriláteros completos
//   - Un.5: ordem corrigida (Comprimento→Área→Massa→Tempo) e cm²/m² explícitos
//   - Un.6: fracções equivalentes adicionadas
//   - Un.7: relação fracção↔decimal adicionada
//   - Un.9: APENAS mult/div com □ (adição/subtracção removidas — não estão no livro)
// ══════════════════════════════════════════════════════════════

{
  d: mat.id, c: 4,
  nome: 'Unidade 1: Números Naturais e Operações (1)',
  meta: {
    icon: 'Hash', color: 'bg-blue-600',
    desc: 'Leitura/Escrita até 1.000.000, Recta Numérica e Numeração Romana',
    ai_rules: `
TÓPICO: Unidade 1 — Números Naturais e Operações (1)
(Livro Matemática 4ª Classe, pp. 8–27)

SUBCAPÍTULOS:
  1.1 Leitura e escrita de números naturais até 1.000.000
  1.2 Composição e decomposição até 1.000.000
  1.3 Recta numérica
  1.4 Comparação e ordenação até 1.000.000
  1.5 Números ordinais até centésimo (100º)
  1.6 Números romanos até mil (M)

CONTEÚDOS DETALHADOS:
Leitura e Escrita:
  - Ler e escrever números até 1.000.000 por extenso e em algarismos.
  - Identificar o valor posicional de cada dígito:
    unidades | dezenas | centenas | unidades de milhar | dezenas de milhar | centenas de milhar | milhões
  - Decompor: 345.678 = 300.000 + 40.000 + 5.000 + 600 + 70 + 8

Recta Numérica:
  - Localizar números na recta numérica.
  - Identificar o número que falta entre dois números dados.

Comparação e Ordenação:
  - Comparar usando > < = .
  - Ordenar sequências de números (crescente e decrescente).

Ordinais:
  - Primeiro (1º) até centésimo (100º).
  - Associar ordinal a posição numa fila ou lista.

Numeração Romana:
  - Símbolos: I=1, V=5, X=10, L=50, C=100, D=500, M=1000.
  - Regras: adição (VI=6) e subtracção (IV=4, IX=9, XL=40, XC=90, CD=400, CM=900).
  - Converter Romano→Árabe e Árabe→Romano até M (1000).

PROIBIDO:
  - Operações aritméticas (adição, subtracção, multiplicação, divisão).
  - Números negativos ou fraccionários.
  - Numeração Romana acima de M.

CONTEXTO MOÇAMBICANO: Usar meticais, distâncias em km, população de cidades
  (Maputo ~1.000.000 hab). Nomes: Ali, Fátima, professor Mateus.`,
    lesson_plan: [
      { slot: 1, structure: 'Leitura e Escrita de números até 1.000.000',              difficulty: 1 },
      { slot: 2, structure: 'Composição e Decomposição em unidades/dezenas/centenas/milhar', difficulty: 2 },
      { slot: 3, structure: 'Localizar número que falta na Recta Numérica',            difficulty: 2 },
      { slot: 4, structure: 'Comparação e Ordenação de números grandes',               difficulty: 2 },
      { slot: 5, structure: 'Identificar Número Ordinal até 100º',                     difficulty: 3 },
      { slot: 6, structure: 'Converter Numeral Romano para Árabe (até M)',             difficulty: 3 },
      { slot: 7, structure: 'Converter Número Árabe para Romano (até M)',              difficulty: 3 },
      { slot: 8, structure: 'Valor posicional: qual o valor do dígito X no número Y', difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 2: Espaço e Forma',
    ancoras: [
    'visual_angulos_1', 'visual_angulos_2', 'visual_angulos_3',
    'visual_circulo_raio_1', 'visual_circulo_raio_2', 'visual_circulo_raio_3',
    'visual_triangulos_lados_1', 'visual_triangulos_lados_2',
    'visual_triangulos_angulos_1', 'visual_triangulos_angulos_2',
    'visual_quadrilateros_1', 'visual_quadrilateros_2',
    'visual_solidos_1', 'visual_solidos_2',
    'visual_figuras_planas_1',
  ], // 🆕
  meta: {
    icon: 'Shapes', color: 'bg-orange-600',
    desc: 'Ângulos, Circunferência, Triângulos, Quadriláteros e Sólidos',
    ai_rules: `
TÓPICO: Unidade 2 — Espaço e Forma
(Livro Matemática 4ª Classe, pp. 30–64)

SUBCAPÍTULOS:
  2.1 Ângulos (p.30)
  2.2 Circunferência e círculo (p.40)
  2.3 Triângulos (p.42)
  2.4 Quadriláteros (p.48)
  2.5 Sólido geométrico (p.61)

CONTEÚDOS DETALHADOS:
Ângulos:
  - Noção de ângulo (abertura entre dois lados).
  - Tipos: Recto (90°), Agudo (< 90°), Obtuso (> 90° e < 180°), Raso (180°).
  - Identificar o tipo de ângulo numa figura ou descrição.

Circunferência e Círculo:
  - Circunferência: linha curva fechada. Círculo: região interior.
  - Centro, raio (do centro à circunferência), diâmetro (atravessa o centro = 2×raio).
  - Diâmetro = 2 × raio. Raio = Diâmetro ÷ 2.

Triângulos — DUAS classificações:
  Pelos lados:
    - Equilátero: 3 lados iguais.
    - Isósceles: 2 lados iguais.
    - Escaleno: 3 lados diferentes.
  Pelos ângulos:
    - Rectângulo: tem um ângulo recto (90°).
    - Acutângulo: todos os ângulos agudos.
    - Obtusângulo: tem um ângulo obtuso.

Quadriláteros — 5 tipos:
  - Quadrado: 4 lados iguais, 4 ângulos rectos.
  - Rectângulo: lados opostos iguais, 4 ângulos rectos.
  - Paralelogramo: lados opostos paralelos e iguais.
  - Losango: 4 lados iguais, ângulos opostos iguais.
  - Trapézio: apenas um par de lados paralelos.

Sólidos Geométricos:
  - Identificar: Cubo, Paralelepípedo, Esfera, Cilindro, Cone, Pirâmide.
  - Faces, arestas e vértices (noção básica).

PROIBIDO:
  - Medir ângulos com transferidor (apenas identificar o tipo visualmente/por descrição).
  - Fórmulas de área ou perímetro.
  - Coordenadas.

CONTEXTO: Objectos do quotidiano moçambicano (pote de barro=esfera,
  caixas de cartão=paralelepípedo, lata de sardinha=cilindro).`,
    lesson_plan: [
      { slot: 1, structure: 'Identificar o tipo de Ângulo (recto/agudo/obtuso/raso)',  difficulty: 1, ancora: ['visual_angulos_1', 'visual_angulos_2', 'visual_angulos_3'] }, // 🆕
      { slot: 2, structure: 'Identificar Centro, Raio e Diâmetro no Círculo',          difficulty: 2, ancora: ['visual_circulo_raio_1', 'visual_circulo_raio_2', 'visual_circulo_raio_3'] }, // 🆕
      { slot: 3, structure: 'Calcular Raio dado o Diâmetro (ou vice-versa)',           difficulty: 2, ancora: ['visual_circulo_raio_1', 'visual_circulo_raio_2', 'visual_circulo_raio_3'] }, // 🆕
      { slot: 4, structure: 'Classificar Triângulo pelos lados',                       difficulty: 2, ancora: ['visual_triangulos_lados_1', 'visual_triangulos_lados_2'] }, // 🆕
      { slot: 5, structure: 'Classificar Triângulo pelos ângulos',                     difficulty: 3, ancora: ['visual_triangulos_angulos_1', 'visual_triangulos_angulos_2'] }, // 🆕
      { slot: 6, structure: 'Identificar o tipo de Quadrilátero',                      difficulty: 3, ancora: ['visual_quadrilateros_1', 'visual_quadrilateros_2'] }, // 🆕
      { slot: 7, structure: 'Identificar o Sólido Geométrico pela descrição',          difficulty: 3, ancora: ['visual_solidos_1', 'visual_solidos_2'] }, // 🆕
      { slot: 8, structure: 'Classificar figura com DUAS características (ex: triângulo isósceles rectângulo)', difficulty: 4, ancora: ['visual_triangulos_lados_1', 'visual_triangulos_angulos_1'] }, // 🆕
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 3: Números Naturais e Operações (2)',
  meta: {
    icon: 'PlusSquare', color: 'bg-green-600',
    desc: 'Adição e Subtracção com 4 a 6 dígitos',
    ai_rules: `
TÓPICO: Unidade 3 — Números Naturais e Operações (2)
(Livro Matemática 4ª Classe, pp. 66–82)

SUBCAPÍTULOS:
  3.1 Revisão: Adição (p.66) — o aluno JÁ sabe somar da 3ª classe
  3.2 Adição de números de 4 dígitos (p.67)
  3.3 Adição de números de 5 e 6 dígitos (p.70)
  3.4 Revisão: Subtracção (p.71) — o aluno JÁ sabe subtrair da 3ª classe
  3.5 Subtracção de números de 4 dígitos (p.73)
  3.6 Subtracção de números de 5 e 6 dígitos (p.76)
  3.7 Problemas de adição e subtracção (p.77)

CONTEÚDOS DETALHADOS:
  - Adição com transporte em números de 4, 5 e 6 dígitos.
  - Subtracção com empréstimo em números de 4, 5 e 6 dígitos.
  - Resolução de problemas contextualizados com adição e/ou subtracção.
  - O aluno já domina operações básicas — o desafio aqui é a extensão
    dos números (mais casas) e a aplicação em problemas.

PROIBIDO:
  - Multiplicação e divisão (são da Unidade 4).
  - Fraccções ou decimais.
  - Operações com mais de 6 dígitos.

CONTEXTO: Problemas moçambicanos: população de províncias, produção
  agrícola em quilos, distâncias em km, preços em meticais.
  Nomes: Ali, Fátima, Sr. Machava, machamba.`,
    lesson_plan: [
      { slot: 1, structure: 'Adição de números de 4 dígitos com transporte',           difficulty: 1 },
      { slot: 2, structure: 'Subtracção de números de 4 dígitos com empréstimo',       difficulty: 1 },
      { slot: 3, structure: 'Adição de números de 5 e 6 dígitos',                     difficulty: 2 },
      { slot: 4, structure: 'Subtracção de números de 5 e 6 dígitos',                 difficulty: 2 },
      { slot: 5, structure: 'Problema de Adição com contexto real',                    difficulty: 3 },
      { slot: 6, structure: 'Problema de Subtracção com contexto real',               difficulty: 3 },
      { slot: 7, structure: 'Problema misto de Adição e Subtracção',                  difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 4: Números Naturais e Operações (3)',
  meta: {
    icon: 'Calculator', color: 'bg-purple-600',
    desc: 'Multiplicação, Divisão e Expressões Numéricas',
    ai_rules: `
TÓPICO: Unidade 4 — Números Naturais e Operações (3)
(Livro Matemática 4ª Classe, pp. 84–111)

SUBCAPÍTULOS (em ordem de progressão no livro):
  4.1 Revisão: Multiplicação (p.84) — tabuadas e mult. simples já conhecidas
  4.2 Multiplicação de 2 dígitos por 2 dígitos (p.85)
  4.3 Multiplicação de 3 dígitos por 2 dígitos (p.89)
  4.4 Revisão: Divisão (p.92) — divisão simples já conhecida
  4.5 Divisão de 2 dígitos por 1 dígito (p.93)
  4.6 Divisão de 3 dígitos por 1 dígito (p.99)
  4.7 Expressões numéricas com as 4 operações e parênteses (p.106)

CONTEÚDOS DETALHADOS:
Multiplicação:
  - 2 dígitos × 2 dígitos: ex. 24 × 13 = ?
  - 3 dígitos × 2 dígitos: ex. 145 × 23 = ?
  - Algoritmo por extenso (parcelas).

Divisão:
  - 2 dígitos ÷ 1 dígito: ex. 48 ÷ 6 = ?
  - 3 dígitos ÷ 1 dígito: ex. 126 ÷ 3 = ?
  - Resultado pode ter resto: ex. 25 ÷ 4 = 6 resto 1.

Expressões Numéricas:
  - Sem parênteses: respeitar ordem (× e ÷ antes de + e −).
  - Com parênteses: calcular parênteses primeiro.
  - Envolver as 4 operações.

PROIBIDO:
  - Divisão por 2 dígitos.
  - Multiplicação de 4 ou mais dígitos.
  - Potências ou raízes.

CONTEXTO: Produção de caju por aldeias, número de alunos por turmas,
  distribuição de alimentos. Nomes: Sónia, professor Albino, cooperativa.`,
    lesson_plan: [
      { slot: 1, structure: 'Multiplicação de 2 dígitos por 2 dígitos',               difficulty: 1 },
      { slot: 2, structure: 'Multiplicação de 3 dígitos por 2 dígitos',               difficulty: 2 },
      { slot: 3, structure: 'Divisão de 2 dígitos por 1 dígito (com e sem resto)',    difficulty: 2 },
      { slot: 4, structure: 'Divisão de 3 dígitos por 1 dígito',                     difficulty: 2 },
      { slot: 5, structure: 'Problema de Multiplicação com contexto real',            difficulty: 3 },
      { slot: 6, structure: 'Problema de Divisão com contexto real',                 difficulty: 3 },
      { slot: 7, structure: 'Expressão numérica com parênteses (4 operações)',       difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 5: Grandezas e Medidas',
    ancoras: ['visual_area_quadriculas_1', 'visual_area_quadriculas_2', 'visual_area_quadriculas_3'], // 🆕

  meta: {
    icon: 'Ruler', color: 'bg-teal-600',
    desc: 'Comprimento, Área, Massa e Tempo',
    ai_rules: `
TÓPICO: Unidade 5 — Grandezas e Medidas
(Livro Matemática 4ª Classe, pp. 113–134)

SUBCAPÍTULOS (ordem do livro):
  5.1 Comprimento (p.113)
  5.2 Área (p.120)
  5.3 Massa (p.125)
  5.4 Tempo (p.126)

CONTEÚDOS DETALHADOS:
Comprimento (5.1):
  - Unidades: mm, cm, dm, m, km.
  - Conversões: 1 m = 10 dm = 100 cm = 1000 mm ; 1 km = 1000 m.
  - Medir e comparar comprimentos.
  - Problemas com conversão de unidades.

Área (5.2):
  - Noção de área: superfície ocupada por uma figura.
  - Medir área por contagem de quadrículas (quadrado de 1 cm de lado = 1 cm²).
  - Unidades: cm² e m².
  - Comparar áreas de figuras diferentes.
  - NÃO usar fórmulas (comprimento × largura) — apenas contagem.

Massa (5.3):
  - Unidades: g e kg. 1 kg = 1000 g.
  - Conversão simples entre g e kg.
  - Problemas com pesagem de objectos.

Tempo (5.4):
  - Unidades: segundos, minutos, horas, dias, semanas, meses, anos.
  - 1 min = 60 s ; 1 h = 60 min ; 1 dia = 24 h ; 1 semana = 7 dias.
  - Leitura de calendário: dias da semana, meses do ano.
  - Calcular duração entre dois momentos simples.

PROIBIDO:
  - Fórmulas de área (comprimento × largura) — usar apenas contagem de quadrículas.
  - Volume e capacidade (não estão nesta unidade).
  - Conversões entre g e toneladas ou entre km e milhas.

CONTEXTO: Medir terreno de machamba, pesar caju na balança do mercado,
  horário escolar moçambicano. Nomes: avó Conceição, Sr. Cossa.`,
    lesson_plan: [
      { slot: 1, structure: 'Converter unidades de Comprimento (m↔cm, km↔m)',         difficulty: 1 },
      { slot: 2, structure: 'Medir Área por contagem de quadrículas (em cm²)',        difficulty: 2, ancora: ['visual_area_quadriculas_1', 'visual_area_quadriculas_2', 'visual_area_quadriculas_3'] }, // 🆕
      { slot: 3, structure: 'Converter unidades de Massa (kg↔g)',                     difficulty: 2 },
      { slot: 4, structure: 'Calcular duração de Tempo entre dois momentos',          difficulty: 2 },
      { slot: 5, structure: 'Problema com Comprimento e conversão de unidades',       difficulty: 3 },
      { slot: 6, structure: 'Comparar áreas de duas figuras em cm²',                  difficulty: 3, ancora: ['visual_area_quadriculas_2', 'visual_area_quadriculas_3'] }, // 🆕
      { slot: 7, structure: 'Problema misto com Massa e Tempo',                       difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 6: Fracções',
  meta: {
    icon: 'PieChart', color: 'bg-indigo-500',
    desc: 'Tipos, Fracções Equivalentes, Adição e Subtracção',
    ai_rules: `
TÓPICO: Unidade 6 — Fracções
(Livro Matemática 4ª Classe, pp. 136–161)

SUBCAPÍTULOS:
  6.1 Tipos de fracções (p.136)
  6.2 Adição e subtracção de fracções (p.148)

CONTEÚDOS DETALHADOS:
Tipos de fracções (6.1):
  - Noção: fracção = parte de um inteiro. Numerador / Denominador.
  - Fracção Própria: numerador < denominador (ex: 3/4).
  - Fracção Imprópria: numerador ≥ denominador (ex: 5/3, 4/4).
  - Fracção de um inteiro: 1 = 4/4 = 6/6 = n/n.
  - Fracções Equivalentes: representam a mesma parte
    (ex: 1/2 = 2/4 = 3/6). Identificar e gerar fracções equivalentes simples.
  - Representar fracção em figura dividida em partes iguais.

Adição e Subtracção (6.2):
  - APENAS com o mesmo denominador.
  - Adição: 1/5 + 2/5 = 3/5.
  - Subtracção: 4/7 − 1/7 = 3/7.
  - O denominador não muda — somar/subtrair apenas os numeradores.
  - Problemas contextualizados.

PROIBIDO:
  - Fracções com denominadores diferentes.
  - Multiplicação ou divisão de fracções.
  - Número misto (ex: 2 e 1/3) como foco.

CONTEXTO: Dividir pão, laranja ou campo de futebol em partes iguais.
  Distribuição de refeição na escola. Nomes: Sónia, Hélio, professora Ana.`,
    lesson_plan: [
      { slot: 1, structure: 'Identificar Fracção Própria ou Imprópria',               difficulty: 1 },
      { slot: 2, structure: 'Identificar fracção representada numa figura',            difficulty: 1 },
      { slot: 3, structure: 'Reconhecer Fracções Equivalentes simples (ex: 1/2=2/4)', difficulty: 2 },
      { slot: 4, structure: 'Adição de Fracções com o mesmo denominador',             difficulty: 2 },
      { slot: 5, structure: 'Subtracção de Fracções com o mesmo denominador',         difficulty: 2 },
      { slot: 6, structure: 'Problema de Adição de Fracções com contexto real',       difficulty: 3 },
      { slot: 7, structure: 'Comparar duas fracções com mesmo denominador',           difficulty: 3 },
      { slot: 8, structure: 'Problema misto de Adição e Subtracção de Fracções',      difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 7: Números Decimais',
  meta: {
    icon: 'Percent', color: 'bg-cyan-600',
    desc: 'Décimas, Centésimas, Relação com Fracções e Operações',
    ai_rules: `
TÓPICO: Unidade 7 — Números Decimais
(Livro Matemática 4ª Classe, pp. 164–180)

SUBCAPÍTULOS:
  7.1 Noção de números decimais (p.164)
  7.2 Adição e subtracção de números decimais (p.172)

CONTEÚDOS DETALHADOS:
Noção de números decimais (7.1):
  - Relação com fracções: 1/10 = 0,1 (uma décima) ; 1/100 = 0,01 (uma centésima).
  - Leitura: 0,3 = "três décimas" ; 0,45 = "quarenta e cinco centésimas".
  - Escrita: "dois vírgula sete" = 2,7.
  - Valor posicional: unidades | , | décimas | centésimas.
  - Representar número decimal na recta numérica (entre 0 e 1, entre 1 e 2...).
  - Comparar decimais: 0,7 > 0,3 ; 1,2 < 1,9.

Adição e Subtracção (7.2):
  - Alinhar a vírgula na vertical antes de calcular.
  - Adição: 1,3 + 0,5 = 1,8 ; 2,45 + 1,32 = 3,77.
  - Subtracção: 3,7 − 1,2 = 2,5 ; 4,50 − 2,35 = 2,15.
  - Problemas com decimais em contexto (preços em meticais e centavos).

PROIBIDO:
  - Multiplicação e divisão de decimais.
  - Milésimas (0,001) e além.
  - Percentagem.

CONTEXTO: Preços no mercado (25,50 MT), pesagem com balança (2,3 kg),
  comprimento com fita métrica (1,75 m). Nomes: vendedeira Lurdes, Sr. Cossa.`,
    lesson_plan: [
      { slot: 1, structure: 'Converter fracção decimal em número decimal (1/10=0,1)', difficulty: 1 },
      { slot: 2, structure: 'Ler e escrever números decimais (décimas e centésimas)', difficulty: 1 },
      { slot: 3, structure: 'Comparar dois números decimais (usar > < =)',            difficulty: 2 },
      { slot: 4, structure: 'Adição de números decimais alinhando a vírgula',         difficulty: 2 },
      { slot: 5, structure: 'Subtracção de números decimais alinhando a vírgula',     difficulty: 3 },
      { slot: 6, structure: 'Problema com decimais: preços ou medidas',               difficulty: 3 },
      { slot: 7, structure: 'Localizar número decimal na Recta Numérica',             difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 8: Literacia Financeira',
  meta: {
    icon: 'Coins', color: 'bg-yellow-600',
    desc: 'O Metical, Compras e Trocos',
    ai_rules: `
TÓPICO: Unidade 8 — Literacia Financeira
(Livro Matemática 4ª Classe, pp. 183–186)

NOTA: Unidade curta (~3 páginas de conteúdo novo). Aplica os decimais
  e operações das unidades anteriores num contexto financeiro.

CONTEÚDOS:
  - Notas e moedas do Metical moçambicano:
    Moedas: 1 MT, 2 MT, 5 MT, 10 MT, 20 MT, 50 MT.
    Notas: 50 MT, 100 MT, 200 MT, 500 MT, 1000 MT.
  - Calcular o total de uma compra (somar preços).
  - Calcular o troco: Troco = Valor entregue − Total da compra.
  - Comparar preços para tomar decisões simples.

PROIBIDO:
  - Juros, câmbios ou percentagem.
  - Poupança a longo prazo, orçamentos familiares complexos.
  - Moedas estrangeiras.

CONTEXTO: Mercado moçambicano, barraca da escola, venda de caju.
  Nomes: vendedeira Lurdes, Sónia compra cadernos, mãe de Ali.`,
    lesson_plan: [
      { slot: 1, structure: 'Identificar notas e moedas do Metical',                  difficulty: 1 },
      { slot: 2, structure: 'Calcular o total de uma compra simples',                 difficulty: 2 },
      { slot: 3, structure: 'Calcular o troco numa compra',                           difficulty: 3 },
      { slot: 4, structure: 'Problema: comparar preços e escolher a opção mais barata', difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 9: Equações',
  meta: {
    icon: 'Equal', color: 'bg-slate-500',
    desc: 'Descobrir o Número Desconhecido (□) com Multiplicação e Divisão',
    ai_rules: `
TÓPICO: Unidade 9 — Equações
(Livro Matemática 4ª Classe, pp. 188–194)

NOTA: Unidade curta (~6 páginas). O livro trabalha APENAS multiplicação
  e divisão com □ — NÃO inclui adição/subtracção com incógnita.

CONTEÚDO:
  9.1 Multiplicação e divisão usando □ (incógnita)

CONTEÚDOS DETALHADOS:
  - Encontrar o número desconhecido (□) em expressões de multiplicação:
    □ × 5 = 20  → □ = 20 ÷ 5 = 4
    3 × □ = 24  → □ = 24 ÷ 3 = 8
  - Encontrar o número desconhecido em expressões de divisão:
    □ ÷ 4 = 6   → □ = 6 × 4 = 24
    12 ÷ □ = 3  → □ = 12 ÷ 3 = 4
  - Formato do exercício: usar □ ou ___ (NÃO usar variáveis literais como x ou n).
  - Problemas contextualizados: "Se 3 sacos pesam 12 kg, quanto pesa cada saco?"

PROIBIDO:
  - Adição ou subtracção com incógnita (não estão no livro desta unidade).
  - Variáveis literais (x, y, n).
  - Equações com duas operações (2 × □ + 3 = 11).

CONTEXTO: Distribuição de alimentos, sacos de arroz, grupos de alunos.
  Nomes: professor Albino, cooperativa da aldeia.`,
    lesson_plan: [
      { slot: 1, structure: '□ × n = resultado (descobrir o factor desconhecido)',    difficulty: 2 },
      { slot: 2, structure: 'n × □ = resultado (factor desconhecido no 2º lugar)',   difficulty: 2 },
      { slot: 3, structure: '□ ÷ n = resultado (descobrir o dividendo)',              difficulty: 3 },
      { slot: 4, structure: 'Problema: encontrar □ com multiplicação ou divisão',     difficulty: 4 },
    ]
  }
},

{
  d: mat.id, c: 4,
  nome: 'Unidade 10: Tabelas e Gráficos',
    ancoras: ['visual_tabela_producao_4', 'visual_tabela_alunos_4', 'visual_grafico_linhas_temperatura', 'visual_grafico_linhas_caju', 'visual_grafico_linhas_alunos'], // 🆕

  meta: {
    icon: 'BarChart', color: 'bg-indigo-600',
    desc: 'Leitura de Tabelas e Gráfico de Linhas',
    ai_rules: `
TÓPICO: Unidade 10 — Tabelas e Gráficos
(Livro Matemática 4ª Classe, pp. 196–203)

SUBCAPÍTULOS:
  10.1 Revisão: Tabelas (p.196) — revisão de tabelas simples já conhecidas
  10.2 Gráfico de linhas (p.198)

CONTEÚDOS DETALHADOS:
Tabelas (revisão):
  - Ler dado específico numa tabela de duas entradas.
  - Identificar valor máximo e mínimo.
  - Calcular total de uma linha ou coluna.
  - Calcular diferença entre dois valores.

Gráfico de Linhas (10.2):
  - Identificar os eixos (horizontal=tempo/categorias, vertical=valores).
  - Ler o valor de um ponto específico.
  - Comparar dois pontos (qual é maior, qual é menor).
  - Descrever a tendência: a linha sobe (aumenta) ou desce (diminui).
  - Responder a perguntas sobre o gráfico: "Em que mês foi maior?",
    "Qual a diferença entre Janeiro e Março?".

PROIBIDO:
  - Média, Moda e Mediana.
  - Gráficos de barras ou circulares (não estão nesta unidade).
  - Construir gráficos (apenas interpretar).

CONTEXTO: Produção de caju por mês, temperatura em Maputo ao longo
  do ano, número de alunos presentes por semana.`,
    lesson_plan: [
      { slot: 1, structure: 'Ler dado específico numa Tabela',                        difficulty: 1, ancora: ['visual_tabela_producao_4', 'visual_tabela_alunos_4'] }, // 🆕
      { slot: 2, structure: 'Identificar valor máximo e mínimo na Tabela',            difficulty: 1, ancora: ['visual_tabela_producao_4', 'visual_tabela_alunos_4'] }, // 🆕
      { slot: 3, structure: 'Calcular total ou diferença a partir da Tabela',         difficulty: 2, ancora: ['visual_tabela_producao_4', 'visual_tabela_alunos_4'] }, // 🆕
      { slot: 4, structure: 'Ler o valor de um ponto no Gráfico de Linhas',           difficulty: 2, ancora: ['visual_grafico_linhas_temperatura', 'visual_grafico_linhas_caju', 'visual_grafico_linhas_alunos'] }, // 🆕
      { slot: 5, structure: 'Comparar dois pontos no Gráfico de Linhas',              difficulty: 3, ancora: ['visual_grafico_linhas_temperatura', 'visual_grafico_linhas_caju', 'visual_grafico_linhas_alunos'] }, // 🆕
      { slot: 6, structure: 'Descrever tendência no Gráfico (sobe/desce/igual)',      difficulty: 3, ancora: ['visual_grafico_linhas_temperatura', 'visual_grafico_linhas_caju', 'visual_grafico_linhas_alunos'] }, // 🆕
      { slot: 7, structure: 'Problema misto: Tabela + Gráfico de Linhas',             difficulty: 4, ancora: ['visual_tabela_producao_4', 'visual_grafico_linhas_caju'] }, // 🆕
    ]
  }
},

   // ══════════════════════════════════════════════════════════════
// 📕 PORTUGUÊS - 3ª CLASSE
// Baseado no índice real do Livro de Português 3ª Classe (INDE/Moçambique)
// Corrigido em relação ao seed anterior:
//   - Conteúdos reposicionados para a unidade correcta
//   - Slots duplicados eliminados
//   - difficulty máximo 4 (escala consistente)
//   - Nº de slots proporcional ao tamanho da unidade
//   - Conteúdos em falta adicionados
// ══════════════════════════════════════════════════════════════

{
  d: port.id, c: 3,
  nome: 'Unidade 1: A Família',
  ancoras: ['texto_familia_ana', 'texto_familia_retrato'],
  meta: {
    icon: 'Users', color: 'bg-blue-500',
    desc: 'Verbos Ser/Estar, Retrato, Sinónimos e Sílaba',
    ai_rules: `
TÓPICO: Unidade 1 — A Família (Livro Português 3ª Classe, pp. 7–35)

CONTEÚDOS PERMITIDOS:
Textos base: "Ana", "A ratinha Lili" (retrato), "A sala" (texto descritivo),
  "Carpinteiro Joaquim", "A casa dos meus sonhos".
Gramática:
  - Verbos SER e ESTAR: conjugação no Presente, Passado e Futuro.
  - Variação verbal: Tempo (Presente/Passado/Futuro), Número (Singular/Plural), Pessoa (1ª/2ª/3ª).
  - Parágrafo: identificar e separar parágrafos num texto.
  - Sinónimos: palavras com significado semelhante (ex: feliz/contente, bonito/lindo).
  - Família de palavras com raiz "casa" (casa, casinha, casarão, caseiro).
  - Divisão silábica: separar palavras em sílabas.
Vocabulário:
  - Retrato e caracterização física (alto, baixo, gordo, magro, cabelo liso/encaracolado).
  - Expressões para pedir permissão ("Posso...?"), aceitar ("Claro!", "Pode ser.") e recusar ("Não posso porque...").

PROIBIDO:
  - Verbo TER como foco gramatical (é apenas vocabulário de contexto).
  - Modos Subjuntivo ou Condicional.
  - Tempos compostos (tenho feito, tinha ido...).
  - Antónimos (são conteúdo da Unidade 2).
  - Adjectivos como categoria gramatical (são da Unidade 5).

CONTEXTO MOÇAMBICANO: Usa nomes como Ana, Josina, Carlos, Fatima.
  Família típica moçambicana, machamba, casa de capim.`,
lesson_plan: [
  { slot: 1, structure: 'Interpretação de texto narrativo curto sobre família',   difficulty: 1, ancora: 'texto_familia_ana'      },
  { slot: 2, structure: 'Retrato: descrever características físicas de alguém',   difficulty: 1, ancora: 'texto_familia_retrato'  },
  { slot: 3, structure: 'Conjugar Ser ou Estar no Presente do Indicativo',        difficulty: 2 },
  { slot: 4, structure: 'Identificar o Tempo do verbo na frase (Pres/Pas/Fut)',   difficulty: 2 },
  { slot: 5, structure: 'Encontrar Sinónimos de palavras simples',                difficulty: 2 },
  { slot: 6, structure: 'Divisão silábica de palavras do quotidiano',             difficulty: 3 },
  { slot: 7, structure: 'Família de palavras com raiz "casa"',                    difficulty: 3 },
  { slot: 8, structure: 'Completar frase com Ser ou Estar no tempo correcto',     difficulty: 4 },
]
  }
},

{
  d: port.id, c: 3,
  nome: 'Unidade 2: A Escola',
   ancoras: ['texto_bilhete_fatima'],
  meta: {
    icon: 'School', color: 'bg-yellow-500',
    desc: 'Bilhete, Antonímia, Pontuação e Verbos ir/estudar',
    ai_rules: `
TÓPICO: Unidade 2 — A Escola (Livro Português 3ª Classe, pp. 39–64)

CONTEÚDOS PERMITIDOS:
Textos base: "O reencontro", "A galinha espertinha", "Água", "O bilhete",
  "Eu vou para a escola", "A idade dos porquês".
Tipos de texto:
  - Bilhete: identificar destinatário, mensagem, remetente e data.
  - Relato de acontecimentos: ordenar eventos no tempo.
Gramática:
  - Antonímia: palavras de sentido contrário (ex: grande/pequeno, entrar/sair).
  - Sinais de pontuação: ponto final (.), ponto de interrogação (?), 
    ponto de exclamação (!), vírgula (,). Uso e identificação.
  - Frase interrogativa e introdutores interrogativos: Quem, O quê, Onde, Quando, Como, Porquê.
  - Letra maiúscula: início de frase e nomes próprios.
  - Verbos ir, estudar, escrever: conjugação nos três tempos principais.
  - Preposições simples de lugar e movimento: em, de, para, com, por, a.

PROIBIDO:
  - Orações subordinadas.
  - Regras de vírgula avançadas (listas, apostos).
  - Verbos SER/ESTAR como foco (já foram na Unidade 1).

CONTEXTO: Escola moçambicana, sala de aula, recreio.
  Usa nomes: Saide, Fátima, Professor João, escola da Beira.`,
lesson_plan: [
  { slot: 1, structure: 'Identificar os elementos de um Bilhete',                     difficulty: 1, ancora: 'texto_bilhete_fatima'   },
  { slot: 2, structure: 'Encontrar o antónimo de palavras simples',                    difficulty: 1 },
  { slot: 3, structure: 'Escolher o sinal de pontuação correcto para a frase',         difficulty: 2 },
  { slot: 4, structure: 'Identificar introdutores interrogativos (Quem/Onde/Quando...)',difficulty: 2 },
  { slot: 5, structure: 'Aplicar a regra da Letra Maiúscula',                          difficulty: 3 },
  { slot: 6, structure: 'Conjugar o verbo Ir no Presente, Passado e Futuro',           difficulty: 3 },
  { slot: 7, structure: 'Substituir palavra na frase pelo seu antónimo',               difficulty: 4 },
  { slot: 8, structure: 'Pontuar um texto curto correctamente',                        difficulty: 4 },
]
  }
},

{
  d: port.id, c: 3,
  nome: 'Unidade 3: A Comunidade',
  ancoras: ['texto_poema_comunidade', 'texto_convite_aniversario'], 
  meta: {
    icon: 'MapPin', color: 'bg-orange-500',
    desc: 'Texto Poético, Família de Palavras, Verbo Vir e Ortografia',
    ai_rules: `
TÓPICO: Unidade 3 — A Comunidade (Livro Português 3ª Classe, pp. 69–83)

CONTEÚDOS PERMITIDOS:
Textos base: "Para contar estrelas" (texto poético), "Os serviços sociais" (texto didáctico),
  "O pequeno Saíde", "O aniversário do Luís".
Tipos de texto:
  - Texto poético: identificar versos, estrofes, rima. Interpretar sentimento expresso.
  - Convite: identificar destinatário, motivo, local, data e hora.
Gramática:
  - Família de palavras: identificar palavras com a mesma raiz
    (ex: trabalho/trabalhador/trabalhar/trabalhoso).
  - Verbo VIR: conjugação no Presente (venho, vens, vem, vimos, vêm).
  - Expressões temporais Antes/Agora/Depois para ordenar acções no tempo.
  - Ortografia: letra O com valor fonético de U (ex: bonito → [bunitu]);
    letra E com valor fonético de I (ex: beber → [bibér]).
  - Letra maiúscula: revisão + nomes de instituições e localidades.

PROIBIDO:
  - Derivação com prefixos e sufixos complexos.
  - Advérbios de lugar (são da Unidade 7).
  - Familia de palavras com raiz "casa" (já foi na Unidade 1).

CONTEXTO: Comunidade, serviços sociais moçambicanos (hospital, escola, mercado).
  Símbolos nacionais de Moçambique. Nomes: Luís, Saíde, avó Conceição.`,
lesson_plan: [
  { slot: 1, structure: 'Interpretação de um Texto Poético (versos e estrofes)',      difficulty: 1, ancora: 'texto_poema_comunidade'    },
  { slot: 2, structure: 'Identificar os elementos de um Convite',                     difficulty: 1, ancora: 'texto_convite_aniversario' },
  { slot: 3, structure: 'Encontrar palavras da mesma Família (mesma raiz)',            difficulty: 2 },
  { slot: 4, structure: 'Conjugar o verbo Vir no Presente do Indicativo',             difficulty: 2 },
  { slot: 5, structure: 'Ordenar acções usando Antes, Agora e Depois',                difficulty: 3 },
  { slot: 6, structure: 'Ortografia: identificar som U escrito com O (ex: bonito)',   difficulty: 3 },
  { slot: 7, structure: 'Completar frase com a forma correcta do verbo Vir',          difficulty: 4 },
  { slot: 8, structure: 'Interpretar versos de um Poema simples',                     difficulty: 4, ancora: 'texto_poema_comunidade' },
]
 
  }
},

{
  d: port.id, c: 3,
  nome: 'Unidade 4: O Ambiente',
   ancoras: ['texto_conversa_direta_animais'],
  meta: {
    icon: 'TreePine', color: 'bg-green-600',
    desc: 'Nomes, Formas de Frase, Verbos Dar/Fazer e Pronomes Indefinidos',
    ai_rules: `
TÓPICO: Unidade 4 — O Ambiente (Livro Português 3ª Classe, pp. 87–106)

CONTEÚDOS PERMITIDOS:
Textos base: "Casamento de bichos", "Os animais da quinta", "O meio ambiente em que vivemos",
  "Visita a Manjacaze", "Estado do tempo" (conversa directa),
  "A união faz a força" (banda desenhada), "A fábula da raposa e do galo".
Tipos de texto:
  - Banda desenhada: identificar personagens, balões de fala, acção.
  - Fábula: identificar moral/moraleja.
  - Conversa directa: identificar falas com travessão (—).
Gramática:
  - Nomes Próprios vs Nomes Comuns: distinguir e exemplificar.
  - Flexão dos Nomes em Género: masculino/feminino (regular: aluno/aluna, gato/gata).
  - Flexão dos Nomes em Número: singular/plural (regular: livro/livros, flor/flores).
  - Formas de frase Afirmativa e Negativa: transformar usando "não".
  - Verbos DAR e FAZER: conjugação no Presente do Indicativo.
  - Pronomes Indefinidos: tudo, nada, alguém, ninguém, algum/alguma, nenhum/nenhuma.
  - Verbo ESTAR: revisão e consolidação.

PROIBIDO:
  - Plurais irregulares complexos (ex: mão/mãos fica, mas não cão/cães como foco).
  - Ortografia O→U (já foi na Unidade 3).
  - Adjectivos como categoria (são da Unidade 5).
  - Preposições (já foram na Unidade 2).

CONTEXTO: Ambiente natural moçambicano, animais da savana e da quinta,
  Parque Nacional da Gorongosa, Manjacaze (Gaza). Nomes: Ali, Sónia, professor Mateus.`,
lesson_plan: [
  { slot: 1, structure: 'Distinguir Nome Próprio de Nome Comum na frase',             difficulty: 1 },
  { slot: 2, structure: 'Passar Nomes para o Feminino ou Masculino',                  difficulty: 1 },
  { slot: 3, structure: 'Passar Nomes para o Plural',                                 difficulty: 2 },
  { slot: 4, structure: 'Transformar frase Afirmativa em Negativa com "não"',         difficulty: 2 },
  { slot: 5, structure: 'Conjugar os verbos Dar e Fazer no Presente',                 difficulty: 3 },
  { slot: 6, structure: 'Identificar o Pronome Indefinido na frase',                  difficulty: 3 },
  { slot: 7, structure: 'Identificar fala de personagem em Conversa Directa',         difficulty: 3, ancora: 'texto_conversa_direta_animais' },
  { slot: 8, structure: 'Completar frase com o Pronome Indefinido correcto',          difficulty: 4 },
]
  }
},

{
  d: port.id, c: 3,
  nome: 'Unidade 5: O Corpo Humano',
  meta: {
    icon: 'User', color: 'bg-red-400',
    desc: 'Adjectivos e Verbos de Acção',
    ai_rules: `
TÓPICO: Unidade 5 — O Corpo Humano (Livro Português 3ª Classe, pp. 109–118)

NOTA: Unidade curta (~9 páginas). Foca dois conteúdos gramaticais principais.

CONTEÚDOS PERMITIDOS:
Textos base: "Uma menina solitária", "Jorge", "Pescador".
Tema transversal: Respeito e solidariedade com pessoas com necessidades especiais.
Gramática:
  - Adjectivos: noção de qualidade do nome (ex: casa grande, menino alegre).
    Identificar o adjectivo na frase. Associar adjectivo adequado ao nome.
  - Verbos COMER e FALAR: conjugação no Presente do Indicativo.
    Servem de modelo para verbos regulares em -ER e -AR.
Vocabulário:
  - Partes do corpo humano como contexto dos textos (não é conteúdo gramatical isolado).
  - Atitudes de inclusão e respeito (contexto dos textos).

PROIBIDO:
  - Graus dos adjectivos (Comparativo e Superlativo — são da 4ª classe).
  - Concordância adjectivo-nome em género/número (é consolidada na Unidade 6).
  - Anatomia médica.
  - Conteúdos das unidades anteriores como foco principal.

CONTEXTO: Escola moçambicana inclusiva. Criança com deficiência visual ou motora.
  Nomes: Jorge, Sónia, Professora Amélia.`,
    lesson_plan: [
      { slot: 1, structure: 'Identificar o Adjectivo na frase',                           difficulty: 1 },
      { slot: 2, structure: 'Escolher o Adjectivo adequado para descrever o nome',        difficulty: 2 },
      { slot: 3, structure: 'Conjugar o verbo Comer ou Falar no Presente',                difficulty: 2 },
      { slot: 4, structure: 'Interpretação: atitudes de respeito e inclusão no texto',    difficulty: 3 },
      { slot: 5, structure: 'Completar frase com o Adjectivo correcto',                   difficulty: 4 },
    ]
  }
},

{
  d: port.id, c: 3,
  nome: 'Unidade 6: Saúde e Higiene',
  meta: {
    icon: 'Heart', color: 'bg-rose-500',
    desc: 'Concordância do Adjectivo e Verbos Lavar/Limpar',
    ai_rules: `
TÓPICO: Unidade 6 — Saúde e Higiene (Livro Português 3ª Classe, pp. 121–130)

NOTA: Unidade curta (~9 páginas). Dois conteúdos gramaticais + revisão.

CONTEÚDOS PERMITIDOS:
Textos base: "A diarreia", "A malária", "A conjuntivite".
Tema transversal: Prevenção de doenças (malária, diarreia, conjuntivite) e higiene pessoal.
Gramática:
  - Concordância do Adjectivo com o Nome em Género
    (ex: menino doente / menina doente; rio limpo / água limpa).
  - Concordância do Adjectivo com o Nome em Número
    (ex: dente saudável / dentes saudáveis).
  - Verbos LAVAR e LIMPAR: conjugação no Presente. Modelo para verbos regulares em -AR.
  - REVISÃO: Formas de frase Afirmativa e Negativa (conteúdo da Unidade 4 — reforço).
    Usar apenas como exercício de consolidação, não como conteúdo novo.

PROIBIDO:
  - Medicamentos específicos ou jargão científico/médico.
  - Nomes de parasitas ou bactérias.
  - Conteúdo novo de frases negativas (é revisão — não apresentar como novo).

CONTEXTO: Hábitos de higiene moçambicanos. Centro de saúde rural.
  Prevenção da malária (rede mosquiteira), água potável (poço, torneira).
  Nomes: mãe da Fátima, enfermeiro Hélio.`,
    lesson_plan: [
      { slot: 1, structure: 'Concordância do Adjectivo com o Nome em Género',            difficulty: 1 },
      { slot: 2, structure: 'Concordância do Adjectivo com o Nome em Número',            difficulty: 2 },
      { slot: 3, structure: 'Conjugar o verbo Lavar ou Limpar no Presente',              difficulty: 2 },
      { slot: 4, structure: 'Transformar frase Afirmativa em Negativa (revisão)',         difficulty: 3 },
      { slot: 5, structure: 'Concordância Adjectivo-Nome em Género E Número combinados', difficulty: 4 },
    ]
  }
},

{
  d: port.id, c: 3,
  nome: 'Unidade 7: Meios de Transporte e Vias de Comunicação',
   ancoras: ['visual_sinal_stop', 'visual_sinal_passadeira', 'visual_sinal_proibido_entrada'],
  meta: {
    icon: 'Car', color: 'bg-slate-600',
    desc: 'Advérbios de Lugar, Verbo Andar e Segurança Rodoviária',
    ai_rules: `
TÓPICO: Unidade 7 — Meios de Transporte e Vias de Comunicação
(Livro Português 3ª Classe, pp. 133–143)

CONTEÚDOS PERMITIDOS:
Textos base: "Os meios de transporte", "Carlos vai à aventura", "Carlos visita o museu",
  "Sinais de trânsito", "Regras de trânsito".
Gramática:
  - Advérbios de Lugar: aqui, ali, lá.
    (ATENÇÃO: o livro trabalha APENAS estes três — não incluir acolá, perto, longe).
  - Verbo ANDAR: conjugação no Presente do Indicativo.
  - Sinais de trânsito: interpretar (sinal de STOP, passadeira, proibido...).
  - Regras básicas de segurança rodoviária para peões e ciclistas.

PROIBIDO:
  - Advérbios de modo (rapidamente, devagar...).
  - Advérbios de tempo (já foram na Unidade 3).
  - Código da estrada avançado (prioridades, licenças).
  - Perto/longe/acolá como advérbios de lugar (não estão no livro desta unidade).

CONTEXTO: Transporte público em Moçambique (chapa 100, machimbombo).
  Bicicleta, motorizada. Estrada de Maputo para Matola.
  Nomes: Carlos, professora Ana.`,
lesson_plan: [
  { slot: 1, structure: 'Vocabulário: Meios de Transporte em Moçambique',            difficulty: 1 },
  { slot: 2, structure: 'Identificar Advérbio de Lugar (aqui/ali/lá) na frase',      difficulty: 1 },
  { slot: 3, structure: 'Conjugar o verbo Andar no Presente do Indicativo',          difficulty: 2 },
  { slot: 4, structure: 'Completar frase com o Advérbio de Lugar correcto',          difficulty: 2 },
  { slot: 5, structure: 'Interpretar um Sinal de Trânsito',                          difficulty: 3, ancora: 'visual_sinal_stop'       },
  { slot: 6, structure: 'Regras de Segurança Rodoviária para peões',                 difficulty: 3, ancora: 'visual_sinal_passadeira' },
  { slot: 7, structure: 'Distinguir Advérbio de Lugar de Advérbio de Tempo na frase',difficulty: 4 },
]
  }
},

// ══════════════════════════════════════════════════════════════
// 📕 PORTUGUÊS - 4ª CLASSE
// Baseado na Dosificação Anual Oficial 2025 (Português 4ª Classe)
// 9 Unidades Temáticas: I Família → II Escola → III Comunidade →
//   IV Ambiente → V Corpo Humano → VI Saúde e Higiene →
//   VII Meios de Transporte e Comunicação → VIII Comunicação →
//   IX A Nossa Província
//
// Corrigido em relação ao seed anterior:
//   - Pronomes Demonstrativos: movidos da Un.6 → Un.3 (dosificação)
//   - Tempos verbais Pres/Perf/Fut: movidos da Un.5 → Un.4
//   - Pretérito Imperfeito: REMOVIDO (não está na dosificação)
//   - Verbos Reflexos: REMOVIDOS (não estão na dosificação)
//   - Graus do Adjectivo: REMOVIDOS (não estão na dosificação)
//   - Prefixos/Sufixos: REMOVIDOS como conteúdo central
//   - Un.8 criada como unidade separada (Comunicação)
//   - Sinonímia/Antonímia: conteúdo recorrente marcado em todas as unidades
//   - Elementos da narrativa: progressão crescente Un.1→Un.9
//   - difficulty máximo 4
// ══════════════════════════════════════════════════════════════

{
  d: port.id, c: 4,
  nome: 'Unidade 1: A Família e a Casa',
   ancoras: ['texto_carta_familiar'],
  meta: {
    icon: 'Home', color: 'bg-blue-500',
    desc: 'Vocabulário da Casa, Artigos, Nomes e Carta Familiar',
    ai_rules: `
TÓPICO: Unidade 1 — A Família e a Casa (Dosificação Português 4ª Classe, 1º Trimestre)

CONTEÚDOS (conforme dosificação oficial):
Vocabulário:
  - Tipos de casa moçambicana: alvenaria, pau-a-pique, madeira, zinco, caniço.
  - Materiais de construção e divisões da casa (sala, quarto, cozinha, quintal).
  - Formas de tratamento: Tu / Você / O senhor / A senhora.
  - Expressões de frequência: sempre, às vezes, todos os dias/diariamente, todas as semanas.

Tipos de texto:
  - Elementos da narrativa: Autor, Personagens (principais e secundárias),
    Espaço, Tempo, Moral da história.
  - Mensagens curtas (formais e informais): bilhete postal, recados, SMS.
  - Carta familiar: cabeçalho, corpo da carta, desfecho.

Gramática:
  - Nomes comuns + Flexão dos nomes comuns em Género (masculino/feminino).
  - Nomes próprios.
  - Flexão em género dos nomes terminados em -ão:
    (ex: irmão/irmã, cidadão/cidadã, leão/leoa, capitão/capitã).
  - Nomes abstractos (ex: amizade, felicidade, liberdade).
  - Adjectivos qualificativos: identificar e usar na frase.
  - Artigos Definidos: o, a, os, as — concordância com o nome.
  - Artigos Indefinidos: um, uma, uns, umas.
  - Pronomes pessoais (formas de sujeito): eu, tu, ele/ela, nós, vós, eles/elas.
  - O Verbo — Modo Indicativo: identificar o verbo na frase.
  - Sinonímia e Antonímia: encontrar sinónimos e antónimos em contexto.

PROIBIDO:
  - Pretérito Imperfeito (não está nesta unidade).
  - Pronomes demonstrativos ou possessivos (são de unidades posteriores).
  - Preposições e contracções (são da Unidade 3).
  - Verbos reflexos (não estão na dosificação desta classe).

CONTEXTO: Família moçambicana típica, casa de alvenaria e caniço,
  machamba, bairro de Maputo ou Beira. Nomes: Fátima, avô Augusto, mãe Lurdes.`,
lesson_plan: [
  { slot: 1, structure: 'Vocabulário: tipos de casa e materiais de construção',   difficulty: 1 },
  { slot: 2, structure: 'Distinguir Artigo Definido de Indefinido',               difficulty: 1 },
  { slot: 3, structure: 'Identificar Nomes Comuns e flexão em Género',            difficulty: 2 },
  { slot: 4, structure: 'Flexão de Nomes terminados em -ão (ex: irmão/irmã)',     difficulty: 2 },
  { slot: 5, structure: 'Identificar os elementos de uma Carta Familiar',         difficulty: 2, ancora: 'texto_carta_familiar' },
  { slot: 6, structure: 'Distinguir Sinónimo de Antónimo na frase',               difficulty: 3 },
  { slot: 7, structure: 'Identificar Pronome Pessoal (sujeito) na frase',         difficulty: 3 },
  { slot: 8, structure: 'Identificar elementos da Narrativa (personagem/espaço/tempo)', difficulty: 4 },
]
  }
},

{
  d: port.id, c: 4,
  nome: 'Unidade 2: A Escola',
  ancoras: ['texto_discurso_direto_indireto', 'texto_aviso_escola'],
  meta: {
    icon: 'BookOpen', color: 'bg-yellow-500',
    desc: 'Entrevista, Aviso, Sujeito/Predicado e Adjectivos',
    ai_rules: `
TÓPICO: Unidade 2 — A Escola (Dosificação Português 4ª Classe, 1º/2º Trimestre)

CONTEÚDOS (conforme dosificação oficial):
Tipos de texto:
  - Entrevista: estrutura (título, tópicos, introdução, apresentação do entrevistado,
    perguntas do entrevistador, respostas do entrevistado, conclusão).
  - Aviso: identificar e redigir a estrutura de um aviso escolar.
  - Frase interrogativa: construir e identificar.
  - Discurso Directo (com travessão —) e Discurso Indirecto.

Gramática:
  - Frase simples: Grupo Nominal (GN) e Grupo Verbal (GV).
  - Sujeito e Predicado: função sintáctica dos elementos essenciais da frase.
  - Adjectivos: flexão em género (ex: bonito/bonita) e número (ex: bonito/bonitos).
  - Sinonímia e Antonímia (revisão).
  - Narrador participante (fala na 1ª pessoa) vs Narrador não participante
    (conta na 3ª pessoa — novo nesta unidade).

PROIBIDO:
  - Pretérito Imperfeito (não está na dosificação desta classe).
  - Complementos directos ou indirectos.
  - Tempos compostos.

CONTEXTO: Escola moçambicana, sala de aula, director, professora.
  Nomes: professor Armando, directora Glória, aluno Hélio.`,
lesson_plan: [
  { slot: 1, structure: 'Identificar Sujeito e Predicado numa frase simples',     difficulty: 1 },
  { slot: 2, structure: 'Identificar Grupo Nominal e Grupo Verbal',               difficulty: 2 },
  { slot: 3, structure: 'Distinguir Discurso Directo de Indirecto',               difficulty: 2, ancora: 'texto_discurso_direto_indireto' },
  { slot: 4, structure: 'Identificar os elementos de um Aviso',                   difficulty: 2, ancora: 'texto_aviso_escola'            },
  { slot: 5, structure: 'Flexão de Adjectivos em Género e Número',               difficulty: 3 },
  { slot: 6, structure: 'Estrutura de uma Entrevista (identificar cada parte)',   difficulty: 3 },
  { slot: 7, structure: 'Frase interrogativa: construir com introdutor correcto', difficulty: 3 },
  { slot: 8, structure: 'Narrador: identificar se é participante ou não participante', difficulty: 4 },
]
  }
},

{
  d: port.id, c: 4,
  nome: 'Unidade 3: A Comunidade',
  meta: {
    icon: 'MapPin', color: 'bg-orange-500',
    desc: 'Imperativo, Preposições, Pronomes Demonstrativos e Verbos Irregulares',
    ai_rules: `
TÓPICO: Unidade 3 — A Comunidade (Dosificação Português 4ª Classe, 2º Trimestre)

CONTEÚDOS (conforme dosificação oficial):
Vocabulário:
  - Instituições públicas da comunidade: hospital, esquadra de polícia,
    escola, câmara municipal, correios.
  - Profissões associadas: enfermeiro, médico, polícia, professor,
    carpinteiro, pescador.
  - Datas festivas e comemorativas moçambicanas.

Gramática:
  - Modo Imperativo: dar ordens, conselhos, instruções (ex: "Vai!", "Lê!", "Não faças!").
  - Preposições (grupo 1): a, até, com, em, entre, de, desde, para.
  - Preposições (grupo 2): durante, por, perante, sob, sobre, trás.
  - Contracções de preposições: no, na, nos, nas, pelo, pela, pelos, pelas.
  - Pronomes Demonstrativos:
    Perto de quem fala: este, esta, estes, estas, isto.
    Perto de quem ouve: esse, essa, esses, essas, isso.
    Longe de ambos: aquele, aquela, aqueles, aquelas, aquilo.
  - Verbos irregulares: ser, estar, dar, ter, ler
    (conjugação no Presente do Indicativo).
  - Sinonímia e Antonímia (revisão em contexto comunitário).

PROIBIDO:
  - Pronomes possessivos (são da Unidade 6).
  - Orações condicionais.
  - Graus do adjectivo (não estão na dosificação desta classe).

CONTEXTO: Comunidade moçambicana, serviços públicos, datas como
  7 de Abril, 25 de Junho, 25 de Setembro. Nomes: enfermeiro Hélio,
  polícia Armindo, professora Glória.`,
    lesson_plan: [
      { slot: 1, structure: 'Vocabulário: profissões e instituições da comunidade',   difficulty: 1 },
      { slot: 2, structure: 'Identificar e usar o Modo Imperativo',                   difficulty: 2 },
      { slot: 3, structure: 'Escolher a Preposição correcta na frase',               difficulty: 2 },
      { slot: 4, structure: 'Aplicar a Contracção correcta (no/na/pelo/pela...)',     difficulty: 3 },
      { slot: 5, structure: 'Identificar o Pronome Demonstrativo pela distância',    difficulty: 3 },
      { slot: 6, structure: 'Conjugar Verbo Irregular (ser/estar/dar/ter/ler) no Presente', difficulty: 3 },
      { slot: 7, structure: 'Transformar frase para o Modo Imperativo',              difficulty: 4 },
    ]
  }
},

{
  d: port.id, c: 4,
  nome: 'Unidade 4: O Ambiente',
  meta: {
    icon: 'TreePine', color: 'bg-green-600',
    desc: 'Onomatopeias, Nomes Colectivos, Advérbios de Lugar e Tempos Verbais',
    ai_rules: `
TÓPICO: Unidade 4 — O Ambiente (Dosificação Português 4ª Classe, 2º Trimestre)

CONTEÚDOS (conforme dosificação oficial):
Vocabulário:
  - Animais domésticos e selvagens moçambicanos.
  - Onomatopeias das vozes dos animais (ex: cão→au au, gato→miau, vaca→mu).
  - Nomes Colectivos (ex: rebanho=ovelhas, manada=elefantes/búfalos,
    alcateia=lobos, matilha=cães, bando=pássaros, cardume=peixes).
  - Família de palavras (mesma raiz, ex: água/aguaceiro/aguardar/aguado).
  - Conservação do ambiente, plantas e água.

Tipos de texto:
  - Texto poético: identificar Versos, Estrofes e Rima.

Gramática:
  - Advérbios de Lugar: perto, longe, onde, aonde.
    (Expansão do Grupo Verbal com advérbios de lugar.)
  - Sinonímia e Antonímia (revisão em contexto ambiental).
  - Tempos verbais no Modo Indicativo (conteúdo principal desta unidade):
    Presente do Indicativo (ex: come, faz, vai).
    Pretérito Perfeito (ex: comeu, fez, foi).
    Futuro do Indicativo (ex: comerá, fará, irá).
    Identificar o tempo do verbo na frase e conjugar correctamente.

PROIBIDO:
  - Pretérito Imperfeito (não está na dosificação desta classe).
  - Pretérito Mais-que-perfeito.
  - Prefixos e sufixos como conteúdo gramatical isolado.
  - Advérbios "aqui, ali, lá" (são da 3ª classe — 4ª classe usa "perto, longe, onde, aonde").

CONTEXTO: Parque Nacional da Gorongosa, rio Zambeze, animais da savana.
  Conservação florestal, água potável. Nomes: guarda-florestal Mateus.`,
    lesson_plan: [
      { slot: 1, structure: 'Associar Onomatopeia ao animal correcto',                difficulty: 1 },
      { slot: 2, structure: 'Identificar o Nome Colectivo correcto',                  difficulty: 2 },
      { slot: 3, structure: 'Identificar Advérbio de Lugar (perto/longe/onde/aonde)', difficulty: 2 },
      { slot: 4, structure: 'Encontrar palavras da mesma Família de Palavras',        difficulty: 2 },
      { slot: 5, structure: 'Identificar o Tempo Verbal na frase (Pres/Perf/Fut)',    difficulty: 3 },
      { slot: 6, structure: 'Conjugar verbo no Pretérito Perfeito',                  difficulty: 3 },
      { slot: 7, structure: 'Identificar Verso, Estrofe e Rima num Poema',           difficulty: 3 },
      { slot: 8, structure: 'Completar frase com o Tempo Verbal correcto',           difficulty: 4 },
    ]
  }
},

{
  d: port.id, c: 4,
  nome: 'Unidade 5: O Corpo Humano',
   ancoras: ['visual_cartaz_higiene_alimentar', 'visual_cartaz_vacinas'],
  meta: {
    icon: 'UserCheck', color: 'bg-rose-400',
    desc: 'Vestuário, Cartazes e Tempos Verbais (revisão)',
    ai_rules: `
TÓPICO: Unidade 5 — O Corpo Humano (Dosificação Português 4ª Classe, final 2º Trimestre)

NOTA: Unidade curta (final do trimestre). Foca revisão e consolidação.

CONTEÚDOS (conforme dosificação oficial):
Vocabulário:
  - Vestuário: peças de roupa moçambicanas (capulana, chitenge, blusa, calças...).
  - Higiene e conservação do vestuário.

Tipos de texto:
  - Cartaz: ler e interpretar mensagens de cartazes (saúde, higiene, campanhas).
  - Frase simples: Grupo Nominal e Grupo Verbal (revisão/consolidação).

Gramática:
  - Tempos verbais: Presente, Pretérito Perfeito, Futuro do Indicativo
    (revisão do que foi introduzido na Unidade 4).

PROIBIDO:
  - Verbos reflexos (não estão na dosificação desta classe).
  - Anatomia científica.
  - Conteúdos novos de gramática — esta unidade é de consolidação.

CONTEXTO: Mercado de roupa em Maputo, lavagem de roupa no rio,
  campanha de saúde escolar. Nomes: mãe de Sónia, professora Amélia.`,
lesson_plan: [
  { slot: 1, structure: 'Vocabulário: peças de vestuário moçambicanas',           difficulty: 1 },
  { slot: 2, structure: 'Interpretar mensagem de um Cartaz',                      difficulty: 2, ancora: 'visual_cartaz_higiene_alimentar' },
  { slot: 3, structure: 'Identificar Grupo Nominal e Grupo Verbal (revisão)',     difficulty: 2 },
  { slot: 4, structure: 'Identificar o Tempo Verbal (Pres/Perf/Fut) — revisão',  difficulty: 3 },
  { slot: 5, structure: 'Completar frase com o verbo no tempo correcto',          difficulty: 4 },
]
  }
},

{
  d: port.id, c: 4,
  nome: 'Unidade 6: Saúde e Higiene',
   ancoras: ['visual_cartaz_malaria', 'visual_cartaz_lavar_maos', 'visual_cartaz_vacinas'], 
  meta: {
    icon: 'Heart', color: 'bg-red-500',
    desc: 'Cartazes, Família de Palavras e Pronomes Possessivos',
    ai_rules: `
TÓPICO: Unidade 6 — Saúde e Higiene (Dosificação Português 4ª Classe, 3º Trimestre)

CONTEÚDOS (conforme dosificação oficial):
Vocabulário:
  - Cuidados a ter com os alimentos (tema transversal).
  - Família de palavras relacionadas com saúde e higiene
    (ex: saúde/saudável/saudar/saudação).

Tipos de texto:
  - Cartaz: interpretar conteúdo de cartazes de saúde pública.
  - Textos narrativos: elementos — o autor, o narrador (participante/não participante),
    personagens (principais e secundárias), espaço, tempo, acções.

Gramática:
  - Pronomes Possessivos:
    1ª pessoa: meu, minha, meus, minhas / (de mim).
    2ª pessoa: teu, tua, teus, tuas / vosso, vossa, vossos, vossas.
    3ª pessoa: seu, sua, seus, suas / dele, dela, deles, delas.
    nosso, nossa, nossos, nossas.
  - Flexão dos Pronomes Possessivos em Género e Número.

PROIBIDO:
  - Pronomes Demonstrativos (são da Unidade 3 — não repetir aqui).
  - Pronomes Relativos (que, o qual).
  - Medicamentos ou jargão médico.

CONTEXTO: Centro de saúde rural, campanha contra a malária,
  higiene alimentar. Nomes: enfermeiro Hélio, mãe de Fátima.`,
lesson_plan: [
  { slot: 1, structure: 'Interpretar mensagem de Cartaz de saúde',               difficulty: 1, ancora: 'visual_cartaz_malaria'          },
  { slot: 2, structure: 'Organizar Família de Palavras (saúde/higiene)',          difficulty: 2 },
  { slot: 3, structure: 'Identificar Pronome Possessivo na frase',               difficulty: 2 },
  { slot: 4, structure: 'Escolher o Pronome Possessivo correcto',                difficulty: 3 },
  { slot: 5, structure: 'Flexionar Pronome Possessivo em Género e Número',       difficulty: 3 },
  { slot: 6, structure: 'Identificar narrador participante/não participante',    difficulty: 4 },
]
  }
},

{
  d: port.id, c: 4,
  nome: 'Unidade 7: Meios de Transporte e Comunicação',
   ancoras: ['visual_sinal_stop', 'visual_sinal_passadeira', 'visual_sinal_proibido_entrada'],  
  meta: {
    icon: 'Car', color: 'bg-slate-600',
    desc: 'Transportes, Onomatopeias, Advérbios de Tempo e Meios de Comunicação',
    ai_rules: `
TÓPICO: Unidade 7 — Meios de Transporte e Comunicação
(Dosificação Português 4ª Classe, 3º Trimestre)

NOTA: Esta unidade junta transportes E meios de comunicação num só bloco.

CONTEÚDOS (conforme dosificação oficial):
Vocabulário:
  - Tipos de transporte: terrestre (chapa 100, machimbombo, comboio, bicicleta),
    marítimo (barco, dhow), aéreo (avião, helicóptero).
  - Onomatopeias dos transportes (ex: comboio→chu-chu, carro→brum-brum).
  - Família de palavras relacionadas com transporte.
  - Meios de comunicação: carta, postal, telefone (fixo e móvel),
    rádio, jornal, televisão, internet.
  - Regras e sinais de trânsito.

Gramática:
  - Advérbios de Tempo: cedo, tarde, logo, sempre, quando.
    (Expansão de frases com advérbios de tempo.)
  - Sinonímia e Antonímia (revisão em contexto de transportes).

PROIBIDO:
  - Advérbios de negação (são da Unidade 9).
  - Advérbios de modo (são da Unidade 8).
  - "Hoje, amanhã, nunca, já" como lista dos advérbios de tempo desta unidade
    (dosificação especifica: cedo, tarde, logo, sempre, quando).

CONTEXTO: Estrada de Maputo para a Matola, barco em Inhambane,
  chapa 100 em Nampula. Nomes: motorista Estevão, professora Amélia.`,
lesson_plan: [
  { slot: 1, structure: 'Classificar transporte (terrestre/marítimo/aéreo)',      difficulty: 1 },
  { slot: 2, structure: 'Associar Onomatopeia ao transporte correcto',            difficulty: 1 },
  { slot: 3, structure: 'Identificar Advérbio de Tempo na frase',                difficulty: 2 },
  { slot: 4, structure: 'Escolher o Advérbio de Tempo correcto',                 difficulty: 2 },
  { slot: 5, structure: 'Identificar Meio de Comunicação e a sua função',        difficulty: 3 },
  { slot: 6, structure: 'Interpretar Regra ou Sinal de Trânsito',                difficulty: 3, ancora: 'visual_sinal_proibido_entrada' },
  { slot: 7, structure: 'Expandir frase com Advérbio de Tempo',                  difficulty: 4 },
]
  }
},

{
  d: port.id, c: 4,
  nome: 'Unidade 8: Comunicação',
  ancoras: ['texto_carta_postal', 'texto_poema_bandeira'],
  meta: {
    icon: 'Radio', color: 'bg-purple-500',
    desc: 'Carta/Postal, Advérbios de Modo e Poema com Rima',
    ai_rules: `
TÓPICO: Unidade 8 — Comunicação
(Dosificação Português 4ª Classe, 3º Trimestre)

CONTEÚDOS (conforme dosificação oficial):
Tipos de texto:
  - Carta e Postal: identificar emissor, receptor e assunto.
  - Poema: estrutura — Verso, Estrofe, Rima.
    Identificar a rima entre versos (rima emparelhada, cruzada — apenas identificar).
  - Localização da Província no mapa de Moçambique.

Gramática:
  - Advérbios de Modo: bem, mal, depressa, devagar, e advérbios em -mente
    (ex: rapidamente, lentamente, alegremente).
  - Expansão de frases com Advérbios de Modo.

PROIBIDO:
  - Graus do Adjectivo (não estão na dosificação desta classe).
  - Superlativo (não está na dosificação).
  - Advérbios de tempo (são da Unidade 7) ou de negação (são da Unidade 9).

CONTEXTO: Carta de um aluno para o avô, postal de férias de Inhambane,
  poema sobre a bandeira de Moçambique. Localização no mapa.`,
lesson_plan: [
  { slot: 1, structure: 'Identificar emissor, receptor e assunto de uma Carta',  difficulty: 1, ancora: 'texto_carta_postal'   },
  { slot: 2, structure: 'Identificar Advérbio de Modo na frase',                 difficulty: 2 },
  { slot: 3, structure: 'Identificar Verso, Estrofe e Rima num Poema',          difficulty: 2, ancora: 'texto_poema_bandeira' },
  { slot: 4, structure: 'Escolher Advérbio de Modo correcto',                   difficulty: 3 },
  { slot: 5, structure: 'Expandir frase com Advérbio de Modo (-mente)',          difficulty: 3 },
  { slot: 6, structure: 'Identificar a Rima entre dois versos',                  difficulty: 4, ancora: 'texto_poema_bandeira' },
]
  }
},

{
  d: port.id, c: 4,
  nome: 'Unidade 9: A Nossa Província',
   ancoras: ['texto_narrativo_historico'], 
  meta: {
    icon: 'Map', color: 'bg-teal-600',
    desc: 'Poesia, Advérbios de Negação e A Nossa Província',
    ai_rules: `
TÓPICO: Unidade 9 — A Nossa Província
(Dosificação Português 4ª Classe, 3º Trimestre)

CONTEÚDOS (conforme dosificação oficial):
Vocabulário e Cultura:
  - A própria província do aluno: localização no mapa, riquezas naturais,
    aspectos culturais.
  - Tema transversal: A vida no tempo colonial (contraste com o presente).
  - Textos narrativos e poéticos com temática histórica moçambicana.

Tipos de texto:
  - Texto poético: Verso, Estrofe, Rima (consolidação final).
  - Texto narrativo: elementos completos (autor, narrador, personagens,
    espaço, tempo, acções, moral).

Gramática:
  - Advérbios de Negação: não, nunca, jamais.
    Construir frases negativas. Dupla negação: "Nunca vi nada."
  - Sinonímia e Antonímia (revisão final).

PROIBIDO:
  - Conhecimento enciclopédico de TODAS as 11 províncias, capitais e rios
    (dosificação foca a PRÓPRIA província do aluno, não decorar o país inteiro).
  - Métrica dos versos (metrificação/escansão).

CONTEXTO: A província onde o aluno vive. Vida colonial vs independência.
  25 de Junho = Dia da Independência. Heróis moçambicanos (Samora Machel).
  Nomes: avó que viveu no tempo colonial, professor de história Carlos.`,
lesson_plan: [
  { slot: 1, structure: 'Vocabulário: riquezas e aspectos da Própria Província', difficulty: 1 },
  { slot: 2, structure: 'Identificar Advérbio de Negação na frase',              difficulty: 1 },
  { slot: 3, structure: 'Construir frase negativa com "não", "nunca" ou "jamais"',difficulty: 2 },
  { slot: 4, structure: 'Identificar Verso, Estrofe e Rima (consolidação final)',difficulty: 2 },
  { slot: 5, structure: 'Dupla negação: identificar e construir correctamente',  difficulty: 3 },
  { slot: 6, structure: 'Identificar elementos completos da Narrativa',          difficulty: 3 },
  { slot: 7, structure: 'Interpretar texto poético ou narrativo com tema histórico', difficulty: 4, ancora: 'texto_narrativo_historico' },
]
  }
},
  ];

  // --- INSERÇÃO NA BASE DE DADOS ---
  console.log(`📝 A processar ${topicos.length} tópicos do currículo...`);

  const contadoresOrdem: Record<string, number> = {};

  for (const t of topicos) {
    const chaveGrupo = `${t.d}-${t.c}`;
    contadoresOrdem[chaveGrupo] = (contadoresOrdem[chaveGrupo] || 0) + 1;
    const ordemAtual = contadoresOrdem[chaveGrupo];

    const existe = await prisma.topico.findFirst({
      where: { nome: t.nome, nivelClasse: t.c, disciplinaId: t.d }
    });

    if (!existe) {
      await prisma.topico.create({
        data: { nome: t.nome, nivelClasse: t.c, disciplinaId: t.d, ordem: ordemAtual, metadata: t.meta }
      });
      console.log(`➕ Criado: [${t.c}ª Classe] ${t.nome}`);
    } else {
      await prisma.topico.update({
        where: { id: existe.id },
        data: { metadata: t.meta, ordem: ordemAtual }
      });
      console.log(`🔄 Atualizado: ${t.nome}`);
    }
  }

  console.log('✅ Seed completo com sucesso!');
}

main()
  .catch((e) => { console.error('❌ Erro no Seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });