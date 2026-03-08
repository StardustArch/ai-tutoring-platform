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
    // ══════════════════════════════════════════════════════════════

    {
      d: mat.id, c: 3,
      nome: 'Números até 10.000',
      meta: {
        icon: 'Hash', color: 'bg-blue-500', desc: 'Ler, escrever e ordenar números',
        ai_rules: `
PERMITIDO:
- Escrita por extenso de números entre 0 e 10.000 (ex: "Como se escreve 3.425 por extenso?")
- Valor posicional: dado um número, qual o valor de um dígito específico (ex: "Quanto vale o 4 em 3.421?")
- Identificar a casa de um dígito (ex: "O 3 em 3.421 está na casa dos...?")
- Ordenar 4 números do menor para o maior ou do maior para o menor
- Decomposição: dado um número, qual a decomposição correta (ex: 4.523 = 4.000 + 500 + 20 + 3)
- Comparação: dado dois números, qual é o maior/menor

PROIBIDO:
- QUALQUER operação aritmética (+, -, x, ÷)
- Frações ou decimais`,
        lesson_plan: [
          { slot: 1, structure: 'Escrita por extenso',         difficulty: 1 },
          { slot: 2, structure: 'Identificar a casa do dígito', difficulty: 1 },
          { slot: 3, structure: 'Valor posicional',             difficulty: 2 },
          { slot: 4, structure: 'Decomposição do número',       difficulty: 2 },
          { slot: 5, structure: 'Comparação e Ordenação',       difficulty: 3 },
          { slot: 6, structure: 'Valor posicional',             difficulty: 3 },
          { slot: 7, structure: 'Decomposição do número',       difficulty: 4 },
          { slot: 8, structure: 'Ordenar do menor para o maior',difficulty: 4 },
        ]
      }
    },

    {
      d: mat.id, c: 3,
      nome: 'Ordinais e Romanos',
      meta: {
        icon: 'ListOrdered', color: 'bg-indigo-500', desc: '1º, 2º, 3º... e I, V, X, L',
        ai_rules: `
PERMITIDO:
- Dado um número ordinal por extenso, identificar o equivalente (ex: "Décimo segundo" = 12º)
- Dado uma posição numa fila ou lista, identificar o ordinal correto
- Converter número decimal para romano usando apenas I, V, X, L (valores até 50)
- Converter número romano para decimal (apenas I, V, X, L)
- Identificar o sucessor ou antecessor ordinal (ex: "Depois do 5º vem o...")

PROIBIDO:
- Letras C, D ou M na numeração romana
- Operações matemáticas com numerais romanos`,
        lesson_plan: [
          { slot: 1, structure: 'Identificar o ordinal correto',          difficulty: 1 },
          { slot: 2, structure: 'Ordinal por extenso para número',         difficulty: 1 },
          { slot: 3, structure: 'Converter decimal para romano',           difficulty: 2 },
          { slot: 4, structure: 'Converter romano para decimal',           difficulty: 2 },
          { slot: 5, structure: 'Identificar o ordinal correto',          difficulty: 3 },
          { slot: 6, structure: 'Converter decimal para romano',           difficulty: 3 },
          { slot: 7, structure: 'Converter romano para decimal',           difficulty: 4 },
          { slot: 8, structure: 'Sucessor ou antecessor ordinal',          difficulty: 4 },
        ]
      }
    },

    {
      d: mat.id, c: 3,
      nome: 'Geometria: Figuras e Sólidos',
      meta: {
        icon: 'Shapes', color: 'bg-orange-500', desc: 'Triângulos, Retas e Formas',
        ai_rules: `
PERMITIDO:
- Identificar a figura geométrica pelo número de lados ou vértices (ex: "Qual figura tem 3 lados?")
- Classificar uma figura como triângulo, quadrado, retângulo ou círculo pela descrição
- Distinguir retas paralelas de perpendiculares pela descrição visual
- Identificar um sólido geométrico pela descrição (ex: "Tem 6 faces quadradas. Que sólido é?")
- Dado o número de faces/arestas/vértices, identificar o sólido (cubo, esfera, cilindro)

PROIBIDO:
- Cálculos de Área ou Perímetro
- Fórmulas matemáticas
- Ângulos em graus`,
        lesson_plan: [
          { slot: 1, structure: 'Identificar a figura pelo número de lados', difficulty: 1 },
          { slot: 2, structure: 'Classificar a figura pela descrição',        difficulty: 1 },
          { slot: 3, structure: 'Identificar sólido pela descrição',          difficulty: 2 },
          { slot: 4, structure: 'Distinguir retas paralelas e perpendiculares', difficulty: 2 },
          { slot: 5, structure: 'Identificar a figura pelo número de lados', difficulty: 3 },
          { slot: 6, structure: 'Identificar sólido pelo número de faces',    difficulty: 3 },
          { slot: 7, structure: 'Classificar a figura pela descrição',        difficulty: 4 },
          { slot: 8, structure: 'Identificar sólido pela descrição',          difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 3,
      nome: 'Adição e Subtração (3-4 dígitos)',
      meta: {
        icon: 'Calculator', color: 'bg-green-500', desc: 'Contas com transporte (vai um)',
        ai_rules: `
PERMITIDO:
- Calcular o resultado de uma adição com números de 3 ou 4 dígitos (ex: 345 + 678 = ?)
- Calcular o resultado de uma subtração com números de 3 ou 4 dígitos (ex: 4.000 - 1.523 = ?)
- Problema de história com adição: dado um contexto moçambicano, calcular uma soma
- Problema de história com subtração: dado um contexto moçambicano, calcular uma diferença
- O resultado NUNCA deve passar de 10.000

PROIBIDO:
- Multiplicação e Divisão
- Resultado acima de 10.000`,
        lesson_plan: [
          { slot: 1, structure: 'Calcular resultado de adição',             difficulty: 1 },
          { slot: 2, structure: 'Calcular resultado de subtração',          difficulty: 1 },
          { slot: 3, structure: 'Problema de história com adição',          difficulty: 2 },
          { slot: 4, structure: 'Problema de história com subtração',       difficulty: 2 },
          { slot: 5, structure: 'Calcular resultado de adição',             difficulty: 3 },
          { slot: 6, structure: 'Calcular resultado de subtração',          difficulty: 3 },
          { slot: 7, structure: 'Problema de história com adição',          difficulty: 4 },
          { slot: 8, structure: 'Problema de história com subtração',       difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 3,
      nome: 'Multiplicação Básica',
      meta: {
        icon: 'X', color: 'bg-purple-500', desc: 'Tabuadas e multiplicar por 10/100',
        ai_rules: `
PERMITIDO:
- Tabuada: dado dois números entre 1 e 10, qual o produto (ex: 7 x 8 = ?)
- Multiplicação por 10: dado um número, multiplicar por 10 (ex: 34 x 10 = ?)
- Multiplicação por 100: dado um número, multiplicar por 100 (ex: 15 x 100 = ?)
- Multiplicação de número de 2 ou 3 dígitos por 1 dígito (ex: 123 x 3 = ?)
- Problema de história com grupos iguais (ex: "4 caixas com 5 lápis cada. Quantos lápis no total?")

PROIBIDO:
- Multiplicadores com dois ou mais dígitos (ex: 12 x 15)
- Divisão`,
        lesson_plan: [
          { slot: 1, structure: 'Tabuada',                                   difficulty: 1 },
          { slot: 2, structure: 'Tabuada',                                   difficulty: 2 },
          { slot: 3, structure: 'Multiplicação por 10',                      difficulty: 2 },
          { slot: 4, structure: 'Multiplicação por 100',                     difficulty: 2 },
          { slot: 5, structure: 'Multiplicar número de 2 dígitos por 1 dígito', difficulty: 3 },
          { slot: 6, structure: 'Problema de história com grupos iguais',    difficulty: 3 },
          { slot: 7, structure: 'Multiplicar número de 3 dígitos por 1 dígito', difficulty: 4 },
          { slot: 8, structure: 'Problema de história com grupos iguais',    difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 3,
      nome: 'Divisão Simples',
      meta: {
        icon: 'Divide', color: 'bg-purple-600', desc: 'Divisão vertical e com resto',
        ai_rules: `
PERMITIDO:
- Divisão exata com divisor de 1 dígito (ex: 45 ÷ 5 = ?)
- Divisão com resto com divisor de 1 dígito (ex: 47 ÷ 5 = ? resto ?)
- Problema de distribuição equitativa (ex: "20 rebuçados para 4 crianças. Quantos cada?")
- Identificar se uma divisão é exata ou tem resto

PROIBIDO:
- Divisores com dois dígitos (ex: 100 ÷ 25)
- Frações ou decimais como resultado`,
        lesson_plan: [
          { slot: 1, structure: 'Divisão exata com divisor de 1 dígito',        difficulty: 1 },
          { slot: 2, structure: 'Divisão exata com divisor de 1 dígito',        difficulty: 2 },
          { slot: 3, structure: 'Problema de distribuição equitativa',          difficulty: 2 },
          { slot: 4, structure: 'Divisão com resto com divisor de 1 dígito',    difficulty: 3 },
          { slot: 5, structure: 'Identificar se a divisão é exata ou tem resto',difficulty: 3 },
          { slot: 6, structure: 'Problema de distribuição equitativa',          difficulty: 4 },
          { slot: 7, structure: 'Divisão com resto com divisor de 1 dígito',    difficulty: 4 },
          { slot: 8, structure: 'Problema de distribuição equitativa',          difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 3,
      nome: 'Grandezas e Medidas',
      meta: {
        icon: 'Scale', color: 'bg-teal-500', desc: 'Comprimento, Massa, Litros e Tempo',
        ai_rules: `
PERMITIDO:
- Escolher a unidade correta para medir algo (ex: "Para medir a distância entre cidades usa-se...?")
- Comparar duas medidas e dizer qual é maior (ex: "1 metro ou 50 centímetros?")
- Ler horas em relógio digital ou analógico (ex: "O relógio marca 14:30. Que horas são?")
- Identificar o instrumento de medição correto (régua, balança, copo medidor)

PROIBIDO:
- Conversões com casas decimais (ex: 1,5 kg para gramas)
- Cálculo de áreas ou volumes`,
        lesson_plan: [
          { slot: 1, structure: 'Escolher a unidade correta',                  difficulty: 1 },
          { slot: 2, structure: 'Identificar o instrumento de medição',        difficulty: 1 },
          { slot: 3, structure: 'Comparar duas medidas',                       difficulty: 2 },
          { slot: 4, structure: 'Ler horas em relógio digital',                difficulty: 2 },
          { slot: 5, structure: 'Ler horas em relógio analógico',              difficulty: 3 },
          { slot: 6, structure: 'Escolher a unidade correta',                  difficulty: 3 },
          { slot: 7, structure: 'Comparar duas medidas',                       difficulty: 4 },
          { slot: 8, structure: 'Ler horas em relógio analógico',              difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 3,
      nome: 'Dinheiro e Frações',
      meta: {
        icon: 'Coins', color: 'bg-yellow-500', desc: 'O Metical e noções de metade/terço',
        ai_rules: `
PERMITIDO:
- Calcular troco simples (ex: "Paguei 50 MT e a conta foi 32 MT. Qual é o troco?")
- Calcular o total de uma compra simples (ex: "2 pães a 5 MT cada. Quanto pago?")
- Identificar a fração correta para "metade", "um terço" ou "um quarto" de uma quantidade
- Calcular a metade de um número par até 20 (ex: "Metade de 16 maçãs = ?")

PROIBIDO:
- Operações entre frações (soma/subtração)
- Frações com denominadores maiores que 10`,
        lesson_plan: [
          { slot: 1, structure: 'Calcular o total de uma compra simples',      difficulty: 1 },
          { slot: 2, structure: 'Calcular troco simples',                      difficulty: 2 },
          { slot: 3, structure: 'Identificar a fração metade/terço/quarto',    difficulty: 2 },
          { slot: 4, structure: 'Calcular a metade de um número',              difficulty: 3 },
          { slot: 5, structure: 'Calcular troco simples',                      difficulty: 3 },
          { slot: 6, structure: 'Identificar a fração correta',                difficulty: 4 },
          { slot: 7, structure: 'Calcular o total de uma compra simples',      difficulty: 4 },
          { slot: 8, structure: 'Calcular troco simples',                      difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 3,
      nome: 'Gráficos e Tabelas',
      meta: {
        icon: 'LineChart', color: 'bg-pink-500', desc: 'Ler informações em gráficos',
        ai_rules: `
PERMITIDO:
- Dado dados numa tabela no texto, identificar qual categoria tem mais/menos
- Dado dados numa tabela no texto, calcular o total de duas categorias
- Dado dados numa tabela no texto, calcular a diferença entre duas categorias
- SEMPRE incluir os dados directamente na pergunta (ex: "Numa turma: 10 gostam de futebol, 6 de basquete, 4 de natação.")

PROIBIDO:
- Pedir para o aluno desenhar gráficos
- Cálculos estatísticos (Média, Moda, Mediana)`,
        lesson_plan: [
          { slot: 1, structure: 'Identificar qual categoria tem mais',         difficulty: 1 },
          { slot: 2, structure: 'Identificar qual categoria tem menos',        difficulty: 1 },
          { slot: 3, structure: 'Calcular o total de duas categorias',         difficulty: 2 },
          { slot: 4, structure: 'Calcular a diferença entre duas categorias',  difficulty: 3 },
          { slot: 5, structure: 'Identificar qual categoria tem mais',         difficulty: 3 },
          { slot: 6, structure: 'Calcular o total de duas categorias',         difficulty: 4 },
          { slot: 7, structure: 'Calcular a diferença entre duas categorias',  difficulty: 4 },
          { slot: 8, structure: 'Calcular o total de duas categorias',         difficulty: 5 },
        ]
      }
    },

    // ══════════════════════════════════════════════════════════════
    // 📙 MATEMÁTICA - 4ª CLASSE
    // ══════════════════════════════════════════════════════════════

    {
      d: mat.id, c: 4,
      nome: 'Números até 1 Milhão',
      meta: {
        icon: 'Hash', color: 'bg-blue-600', desc: 'Milhares e Milhões',
        ai_rules: `
PERMITIDO:
- Escrita por extenso de números entre 10.000 e 1.000.000 (ex: "Como se escreve 540.000 por extenso?")
- Valor posicional: dado um número, qual o valor de um dígito (ex: "Quanto vale o 5 em 540.000?")
- Identificar a casa de um dígito (ex: "O 5 em 540.000 está na casa das...?")
- Comparar dois números e dizer qual é maior ou menor
- Ordenar 4 números do menor para o maior ou vice-versa
- Decomposição: dado um número, qual a decomposição correta (ex: 345.678 = 300.000 + 40.000 + 5.000 + 600 + 70 + 8)

PROIBIDO:
- QUALQUER operação matemática (+, -, x, ÷)
- Multiplicações ou divisões`,
        lesson_plan: [
          { slot: 1, structure: 'Escrita por extenso',              difficulty: 2 },
          { slot: 2, structure: 'Valor posicional',                 difficulty: 2 },
          { slot: 3, structure: 'Identificar a casa do dígito',     difficulty: 3 },
          { slot: 4, structure: 'Decomposição do número em classes',difficulty: 3 },
          { slot: 5, structure: 'Comparação e Ordenação',           difficulty: 3 },
          { slot: 6, structure: 'Valor posicional',                 difficulty: 4 },
          { slot: 7, structure: 'Decomposição do número em classes',difficulty: 4 },
          { slot: 8, structure: 'Ordenar do menor para o maior',    difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 4,
      nome: 'Geometria: Ângulos e Formas',
      meta: {
        icon: 'Triangle', color: 'bg-orange-600', desc: 'Ângulos, Circunferência e Sólidos',
        ai_rules: `
PERMITIDO:
- Classificar um ângulo como Reto, Agudo, Obtuso ou Raso pela sua descrição ou tamanho relativo
- Identificar o Raio e o Diâmetro numa circunferência pela descrição
- Classificar Triângulos em Equilátero, Isósceles ou Escaleno pelo número de lados iguais
- Dado uma descrição de triângulo, identificar a classificação correta

PROIBIDO:
- Medições exatas de ângulos em graus com transferidor
- Cálculos de Área com Pi`,
        lesson_plan: [
          { slot: 1, structure: 'Classificar ângulo pela descrição',           difficulty: 1 },
          { slot: 2, structure: 'Classificar ângulo pela descrição',           difficulty: 2 },
          { slot: 3, structure: 'Classificar triângulo pelo número de lados iguais', difficulty: 2 },
          { slot: 4, structure: 'Identificar Raio e Diâmetro',                 difficulty: 3 },
          { slot: 5, structure: 'Classificar triângulo pelo número de lados iguais', difficulty: 3 },
          { slot: 6, structure: 'Classificar ângulo pela descrição',           difficulty: 4 },
          { slot: 7, structure: 'Classificar triângulo pela descrição',        difficulty: 4 },
          { slot: 8, structure: 'Identificar Raio e Diâmetro',                 difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 4,
      nome: 'Somas e Subtrações Grandes',
      meta: {
        icon: 'Calculator', color: 'bg-green-600', desc: 'Operações com 5 e 6 dígitos',
        ai_rules: `
PERMITIDO:
- Calcular o resultado de uma adição com números de 4, 5 ou 6 dígitos
- Calcular o resultado de uma subtração com números de 4, 5 ou 6 dígitos
- Problema de história com adição envolvendo grandes quantias em Meticais ou populações de cidades
- Problema de história com subtração envolvendo grandes quantias em Meticais ou populações de cidades
- Números máximos: 1.000.000

PROIBIDO:
- Multiplicação e Divisão
- Números acima de 1.000.000`,
        lesson_plan: [
          { slot: 1, structure: 'Calcular resultado de adição com 4 dígitos',  difficulty: 2 },
          { slot: 2, structure: 'Calcular resultado de subtração com 4 dígitos', difficulty: 2 },
          { slot: 3, structure: 'Problema de história com adição',              difficulty: 3 },
          { slot: 4, structure: 'Problema de história com subtração',           difficulty: 3 },
          { slot: 5, structure: 'Calcular resultado de adição com 5 dígitos',  difficulty: 3 },
          { slot: 6, structure: 'Calcular resultado de subtração com 5 dígitos', difficulty: 4 },
          { slot: 7, structure: 'Problema de história com adição',              difficulty: 4 },
          { slot: 8, structure: 'Problema de história com subtração',           difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 4,
      nome: 'Multiplicação Avançada',
      meta: {
        icon: 'X', color: 'bg-purple-600', desc: 'Multiplicar por 2 dígitos',
        ai_rules: `
PERMITIDO:
- Calcular o produto de um número de 3 dígitos por um multiplicador de 2 dígitos (ex: 345 x 24 = ?)
- Calcular o produto de um número de 4 dígitos por um multiplicador de 2 dígitos (ex: 1.234 x 15 = ?)
- Problema de história: compras em grandes quantidades ou produção diária (ex: "Uma fábrica produz 125 caixas por dia. Quantas caixas em 12 dias?")

PROIBIDO:
- Divisão
- Multiplicador com mais de 2 dígitos`,
        lesson_plan: [
          { slot: 1, structure: 'Calcular produto de 2 dígitos por 2 dígitos', difficulty: 2 },
          { slot: 2, structure: 'Calcular produto de 3 dígitos por 2 dígitos', difficulty: 3 },
          { slot: 3, structure: 'Problema de história com multiplicação',      difficulty: 3 },
          { slot: 4, structure: 'Calcular produto de 3 dígitos por 2 dígitos', difficulty: 3 },
          { slot: 5, structure: 'Calcular produto de 4 dígitos por 2 dígitos', difficulty: 4 },
          { slot: 6, structure: 'Problema de história com multiplicação',      difficulty: 4 },
          { slot: 7, structure: 'Calcular produto de 4 dígitos por 2 dígitos', difficulty: 4 },
          { slot: 8, structure: 'Problema de história com multiplicação',      difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 4,
      nome: 'Divisão e Expressões',
      meta: {
        icon: 'Sigma', color: 'bg-purple-700', desc: 'Divisão longa e parênteses ( )',
        ai_rules: `
PERMITIDO:
- Divisão de número de 3 dígitos por 1 dígito (ex: 456 ÷ 3 = ?)
- Divisão de número de 3 dígitos por 2 dígitos (ex: 456 ÷ 12 = ?)
- Divisão de número de 4 dígitos por 1 ou 2 dígitos
- Expressão com parênteses respeitando prioridade: primeiro resolve parênteses, depois x e ÷, depois + e - (ex: (12 + 8) x 3 = ?)
- Identificar qual operação deve ser feita primeiro numa expressão

PROIBIDO:
- Chavetas ou parênteses retos [ ]
- Decimais ou frações nas expressões`,
        lesson_plan: [
          { slot: 1, structure: 'Divisão de 3 dígitos por 1 dígito',           difficulty: 2 },
          { slot: 2, structure: 'Divisão de 3 dígitos por 1 dígito',           difficulty: 3 },
          { slot: 3, structure: 'Expressão com parênteses',                    difficulty: 3 },
          { slot: 4, structure: 'Divisão de 3 dígitos por 2 dígitos',          difficulty: 3 },
          { slot: 5, structure: 'Identificar qual operação fazer primeiro',    difficulty: 3 },
          { slot: 6, structure: 'Expressão com parênteses',                    difficulty: 4 },
          { slot: 7, structure: 'Divisão de 4 dígitos por 2 dígitos',          difficulty: 4 },
          { slot: 8, structure: 'Expressão com parênteses',                    difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 4,
      nome: 'Medidas de Área e Tempo',
      meta: {
        icon: 'Ruler', color: 'bg-teal-600', desc: 'Perímetros, Áreas e Calendário',
        ai_rules: `
PERMITIDO:
- Calcular o perímetro de um quadrado dado o lado (ex: "Lado = 5 cm. Qual o perímetro?")
- Calcular o perímetro de um retângulo dados comprimento e largura
- Calcular a área de um quadrado dado o lado (ex: "Lado = 4 cm. Qual a área?")
- Calcular a área de um retângulo dados comprimento e largura
- Converter horas para minutos (ex: "2 horas = ? minutos")
- Converter minutos para horas (ex: "120 minutos = ? horas")
- Calcular quantos dias há num número de semanas

PROIBIDO:
- Área de triângulos ou círculos
- Cálculos de volume`,
        lesson_plan: [
          { slot: 1, structure: 'Calcular o perímetro de um quadrado',         difficulty: 2 },
          { slot: 2, structure: 'Calcular o perímetro de um retângulo',        difficulty: 2 },
          { slot: 3, structure: 'Converter horas para minutos',                difficulty: 2 },
          { slot: 4, structure: 'Calcular a área de um quadrado',              difficulty: 3 },
          { slot: 5, structure: 'Calcular a área de um retângulo',             difficulty: 3 },
          { slot: 6, structure: 'Converter minutos para horas',                difficulty: 3 },
          { slot: 7, structure: 'Calcular a área de um retângulo',             difficulty: 4 },
          { slot: 8, structure: 'Calcular quantos dias há num número de semanas', difficulty: 4 },
        ]
      }
    },

    {
      d: mat.id, c: 4,
      nome: 'Frações e Decimais',
      meta: {
        icon: 'PieChart', color: 'bg-cyan-600', desc: 'Soma de frações e números com vírgula',
        ai_rules: `
PERMITIDO:
- Somar duas frações com o MESMO denominador (ex: 2/5 + 1/5 = ?)
- Subtrair duas frações com o MESMO denominador (ex: 3/5 - 1/5 = ?)
- Identificar a parte decimal de um número (ex: "Em 3,75, qual é a parte decimal?")
- Escrever um decimal por extenso (ex: "3,5 lê-se três vírgula cinco")
- Comparar dois decimais (ex: "Qual é maior: 2,5 ou 2,50?")

PROIBIDO:
- Multiplicação ou Divisão de frações
- Soma de frações com denominadores diferentes`,
        lesson_plan: [
          { slot: 1, structure: 'Somar frações com o mesmo denominador',       difficulty: 2 },
          { slot: 2, structure: 'Subtrair frações com o mesmo denominador',    difficulty: 2 },
          { slot: 3, structure: 'Identificar a parte decimal de um número',    difficulty: 2 },
          { slot: 4, structure: 'Escrever um decimal por extenso',             difficulty: 3 },
          { slot: 5, structure: 'Comparar dois decimais',                      difficulty: 3 },
          { slot: 6, structure: 'Somar frações com o mesmo denominador',       difficulty: 4 },
          { slot: 7, structure: 'Subtrair frações com o mesmo denominador',    difficulty: 4 },
          { slot: 8, structure: 'Comparar dois decimais',                      difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 4,
      nome: 'Literacia Financeira II',
      meta: {
        icon: 'Coins', color: 'bg-yellow-600', desc: 'Poupança e gestão do Metical',
        ai_rules: `
PERMITIDO:
- Calcular o lucro de uma venda (ex: "Comprou por 200 MT, vendeu por 280 MT. Qual o lucro?")
- Calcular o total poupado ao longo de N semanas (ex: "Poupa 50 MT por semana. Em 4 semanas, quanto poupou?")
- Calcular o troco numa compra com valores grandes em Meticais
- Dado um orçamento e despesas, calcular quanto sobra
- Problema com contexto de pequeno negócio moçambicano

PROIBIDO:
- Taxas de juro compostas
- Terminologia bancária complexa`,
        lesson_plan: [
          { slot: 1, structure: 'Calcular troco numa compra',                  difficulty: 2 },
          { slot: 2, structure: 'Calcular o total poupado em N semanas',       difficulty: 2 },
          { slot: 3, structure: 'Calcular o lucro de uma venda',               difficulty: 3 },
          { slot: 4, structure: 'Calcular quanto sobra de um orçamento',       difficulty: 3 },
          { slot: 5, structure: 'Calcular o total poupado em N semanas',       difficulty: 4 },
          { slot: 6, structure: 'Calcular o lucro de uma venda',               difficulty: 4 },
          { slot: 7, structure: 'Calcular quanto sobra de um orçamento',       difficulty: 4 },
          { slot: 8, structure: 'Problema com pequeno negócio moçambicano',    difficulty: 5 },
        ]
      }
    },

    {
      d: mat.id, c: 4,
      nome: 'Equações e Gráficos',
      meta: {
        icon: 'Equal', color: 'bg-slate-500', desc: 'Descobrir o número e ler dados',
        ai_rules: `
PERMITIDO:
- Encontrar X numa adição (ex: X + 15 = 40 → X = ?)
- Encontrar X numa subtração (ex: X - 8 = 12 → X = ?)
- Encontrar X numa multiplicação (ex: 5 x X = 30 → X = ?)
- Dado dados de um "gráfico" descritos no texto, identificar qual tem mais/menos ou calcular diferença

PROIBIDO:
- Sistemas de equações (duas incógnitas)
- Variáveis complexas`,
        lesson_plan: [
          { slot: 1, structure: 'Encontrar X numa adição',                     difficulty: 2 },
          { slot: 2, structure: 'Encontrar X numa subtração',                  difficulty: 2 },
          { slot: 3, structure: 'Identificar qual categoria tem mais nos dados', difficulty: 2 },
          { slot: 4, structure: 'Encontrar X numa multiplicação',               difficulty: 3 },
          { slot: 5, structure: 'Calcular a diferença entre categorias nos dados', difficulty: 3 },
          { slot: 6, structure: 'Encontrar X numa adição',                     difficulty: 4 },
          { slot: 7, structure: 'Encontrar X numa multiplicação',               difficulty: 4 },
          { slot: 8, structure: 'Encontrar X numa subtração',                  difficulty: 5 },
        ]
      }
    },

    // ══════════════════════════════════════════════════════════════
    // 📕 PORTUGUÊS - 3ª CLASSE
    // ══════════════════════════════════════════════════════════════

    {
      d: port.id, c: 3,
      nome: 'Verbos: Ser, Estar e Agir',
      meta: {
        icon: 'Activity', color: 'bg-red-500', desc: 'Ações do dia-a-dia',
        ai_rules: `
PERMITIDO:
- Conjugar o verbo no tempo correto: dado uma frase com lacuna e o verbo no infinitivo, escolher a forma correta (ex: "Ontem eu ___ (comer) arroz.")
- Identificar o verbo numa frase simples
- Dizer em que tempo está o verbo: Presente, Passado ou Futuro
- Transformar uma frase do Presente para o Passado (Pretérito Perfeito)
- Apenas verbos regulares e: Ser, Estar, Ter

PROIBIDO:
- Modos Subjuntivo, Condicional ou Imperativo
- Tempos compostos (ex: "tinha comido")`,
        lesson_plan: [
          { slot: 1, structure: 'Identificar o verbo numa frase',              difficulty: 1 },
          { slot: 2, structure: 'Dizer em que tempo está o verbo',             difficulty: 1 },
          { slot: 3, structure: 'Conjugar o verbo no Presente',                difficulty: 2 },
          { slot: 4, structure: 'Conjugar o verbo no Passado',                 difficulty: 2 },
          { slot: 5, structure: 'Conjugar o verbo no Futuro',                  difficulty: 3 },
          { slot: 6, structure: 'Transformar frase do Presente para o Passado',difficulty: 3 },
          { slot: 7, structure: 'Conjugar o verbo no tempo correto',           difficulty: 4 },
          { slot: 8, structure: 'Dizer em que tempo está o verbo',             difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 3,
      nome: 'Nomes e Adjetivos',
      meta: {
        icon: 'Tags', color: 'bg-blue-500', desc: 'Dar nomes e qualidades',
        ai_rules: `
PERMITIDO:
- Distinguir Nome Próprio de Nome Comum (ex: "Qual destas palavras é um nome próprio?")
- Escolher o adjetivo correto em género: masculino/feminino (ex: "O menino é ___. A menina é ___.")
- Escolher o adjetivo correto em número: singular/plural (ex: "O livro é novo. Os livros são ___.")
- Dado uma frase, identificar o adjetivo

PROIBIDO:
- Graus dos Adjetivos (Comparativo, Superlativo)
- Substantivos abstratos complexos`,
        lesson_plan: [
          { slot: 1, structure: 'Distinguir Nome Próprio de Nome Comum',       difficulty: 1 },
          { slot: 2, structure: 'Identificar o adjetivo numa frase',           difficulty: 1 },
          { slot: 3, structure: 'Concordância do adjetivo em género',          difficulty: 2 },
          { slot: 4, structure: 'Concordância do adjetivo em número',          difficulty: 2 },
          { slot: 5, structure: 'Distinguir Nome Próprio de Nome Comum',       difficulty: 3 },
          { slot: 6, structure: 'Concordância do adjetivo em género',          difficulty: 3 },
          { slot: 7, structure: 'Concordância do adjetivo em número',          difficulty: 4 },
          { slot: 8, structure: 'Identificar o adjetivo numa frase',           difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 3,
      nome: 'Sinónimos e Antónimos',
      meta: {
        icon: 'RefreshCcw', color: 'bg-green-500', desc: 'Palavras iguais e contrárias',
        ai_rules: `
PERMITIDO:
- Dado uma palavra sublinhada numa frase, escolher o sinónimo que pode substituí-la sem mudar o sentido
- Dado uma palavra, escolher o seu antónimo direto
- Dado uma frase, escolher a palavra antónima para substituir a sublinhada

PROIBIDO:
- Palavras raras, arcaicas ou jargão técnico
- Homónimos e Parónimos`,
        lesson_plan: [
          { slot: 1, structure: 'Encontrar o sinónimo de uma palavra simples', difficulty: 1 },
          { slot: 2, structure: 'Encontrar o antónimo de uma palavra simples', difficulty: 1 },
          { slot: 3, structure: 'Escolher sinónimo que mantém sentido da frase', difficulty: 2 },
          { slot: 4, structure: 'Encontrar o antónimo de um adjetivo',         difficulty: 2 },
          { slot: 5, structure: 'Escolher sinónimo que mantém sentido da frase', difficulty: 3 },
          { slot: 6, structure: 'Encontrar o antónimo de um verbo',            difficulty: 3 },
          { slot: 7, structure: 'Substituir palavra sublinhada pelo antónimo', difficulty: 4 },
          { slot: 8, structure: 'Escolher sinónimo que mantém sentido da frase', difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 3,
      nome: 'Ortografia e Pontuação',
      meta: {
        icon: 'PenTool', color: 'bg-yellow-600', desc: 'Sinais, M antes de P/B',
        ai_rules: `
PERMITIDO:
- Escolher a palavra correctamente escrita entre 4 opções (foco em M antes de P e B)
- Identificar o erro ortográfico numa frase
- Escolher o sinal de pontuação correto para completar uma frase (. ? ! ,)
- Identificar onde deve ir maiúscula: nome próprio ou início de frase

PROIBIDO:
- Regras de hifenização complexas
- Ponto e vírgula (;), Reticências (...)`,
        lesson_plan: [
          { slot: 1, structure: 'Escolher palavra correctamente escrita (M/N antes de P/B)', difficulty: 1 },
          { slot: 2, structure: 'Escolher o sinal de pontuação correto',       difficulty: 1 },
          { slot: 3, structure: 'Identificar onde deve ir maiúscula',          difficulty: 2 },
          { slot: 4, structure: 'Identificar o erro ortográfico numa frase',   difficulty: 2 },
          { slot: 5, structure: 'Escolher palavra correctamente escrita',      difficulty: 3 },
          { slot: 6, structure: 'Escolher o sinal de pontuação correto',       difficulty: 3 },
          { slot: 7, structure: 'Identificar o erro ortográfico numa frase',   difficulty: 4 },
          { slot: 8, structure: 'Escolher palavra correctamente escrita',      difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 3,
      nome: 'Tipos de Frase',
      meta: {
        icon: 'MessageSquare', color: 'bg-orange-500', desc: 'Perguntas e Negações',
        ai_rules: `
PERMITIDO:
- Identificar o tipo de frase: Afirmativa, Negativa, Interrogativa ou Exclamativa
- Transformar uma frase Afirmativa em Negativa (ex: "O João come. → O João não come.")
- Transformar uma frase Afirmativa em Interrogativa (ex: "O João come. → O João come?")
- Escolher a pontuação correcta para um determinado tipo de frase

PROIBIDO:
- Oração subordinada
- Voz passiva/ativa`,
        lesson_plan: [
          { slot: 1, structure: 'Identificar o tipo de frase',                 difficulty: 1 },
          { slot: 2, structure: 'Identificar o tipo de frase',                 difficulty: 2 },
          { slot: 3, structure: 'Transformar frase Afirmativa em Negativa',    difficulty: 2 },
          { slot: 4, structure: 'Transformar frase Afirmativa em Interrogativa', difficulty: 3 },
          { slot: 5, structure: 'Escolher pontuação correcta para o tipo de frase', difficulty: 3 },
          { slot: 6, structure: 'Transformar frase Afirmativa em Negativa',    difficulty: 4 },
          { slot: 7, structure: 'Transformar frase Afirmativa em Interrogativa', difficulty: 4 },
          { slot: 8, structure: 'Identificar o tipo de frase',                 difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 3,
      nome: 'Trânsito e Segurança',
      meta: {
        icon: 'TrafficCone', color: 'bg-slate-600', desc: 'Sinais e regras',
        ai_rules: `
PERMITIDO:
- Dado a descrição de um sinal de trânsito, identificar o que significa
- Dado uma situação na estrada, escolher o comportamento seguro
- Vocabulário: passadeira, semáforo, passeio, chapa, bicicleta, capacete
- Interpretação de uma regra de segurança rodoviária descrita em texto

PROIBIDO:
- Códigos de estrada avançados ou multas
- Cálculos de velocidade`,
        lesson_plan: [
          { slot: 1, structure: 'Identificar o significado de um sinal de trânsito', difficulty: 1 },
          { slot: 2, structure: 'Escolher o comportamento seguro numa situação', difficulty: 1 },
          { slot: 3, structure: 'Vocabulário de trânsito',                     difficulty: 2 },
          { slot: 4, structure: 'Interpretar uma regra de segurança rodoviária', difficulty: 2 },
          { slot: 5, structure: 'Identificar o significado de um sinal de trânsito', difficulty: 3 },
          { slot: 6, structure: 'Escolher o comportamento seguro numa situação', difficulty: 3 },
          { slot: 7, structure: 'Interpretar uma regra de segurança rodoviária', difficulty: 4 },
          { slot: 8, structure: 'Vocabulário de trânsito',                     difficulty: 4 },
        ]
      }
    },

    {
      d: port.id, c: 3,
      nome: 'Saúde e Comunidade',
      meta: {
        icon: 'Heart', color: 'bg-pink-500', desc: 'Textos sobre saúde e convívio',
        ai_rules: `
PERMITIDO:
- Vocabulário sobre prevenção de Malária: mosquiteiro, paludismo, febre, DEET
- Vocabulário sobre higiene: lavar mãos, sabão, diarreia, água limpa
- Dado uma situação, escolher o comportamento saudável correto
- Interpretação de uma regra de higiene ou saúde descrita em texto

PROIBIDO:
- Termos médicos científicos complexos
- Nomes de medicamentos específicos`,
        lesson_plan: [
          { slot: 1, structure: 'Vocabulário sobre higiene pessoal',           difficulty: 1 },
          { slot: 2, structure: 'Escolher comportamento saudável correto',     difficulty: 1 },
          { slot: 3, structure: 'Vocabulário sobre prevenção de Malária',      difficulty: 2 },
          { slot: 4, structure: 'Interpretar regra de higiene em texto',       difficulty: 2 },
          { slot: 5, structure: 'Escolher comportamento saudável correto',     difficulty: 3 },
          { slot: 6, structure: 'Vocabulário sobre prevenção de doenças',      difficulty: 3 },
          { slot: 7, structure: 'Interpretar regra de saúde em texto',         difficulty: 4 },
          { slot: 8, structure: 'Escolher comportamento saudável correto',     difficulty: 5 },
        ]
      }
    },

    // ══════════════════════════════════════════════════════════════
    // 📕 PORTUGUÊS - 4ª CLASSE
    // ══════════════════════════════════════════════════════════════

    {
      d: port.id, c: 4,
      nome: 'Família e Casa',
      meta: {
        icon: 'BookOpen', color: 'bg-blue-500', desc: 'Convivência, Casa e Carta Familiar',
        ai_rules: `
PERMITIDO:
- Vocabulário de materiais de construção: alvenaria, caniço, pau-a-pique, zinco
- Identificar os elementos de uma Carta Familiar: cabeçalho, saudação, corpo, despedida, assinatura
- Dado uma parte de carta, identificar que elemento é
- Distinguir Artigo Definido (o, a, os, as) de Artigo Indefinido (um, uma, uns, umas)

PROIBIDO:
- Textos argumentativos ou jornalísticos`,
        lesson_plan: [
          { slot: 1, structure: 'Vocabulário de materiais de construção',      difficulty: 2 },
          { slot: 2, structure: 'Distinguir Artigo Definido de Indefinido',    difficulty: 2 },
          { slot: 3, structure: 'Identificar elemento da Carta Familiar',      difficulty: 2 },
          { slot: 4, structure: 'Distinguir Artigo Definido de Indefinido',    difficulty: 3 },
          { slot: 5, structure: 'Identificar elemento da Carta Familiar',      difficulty: 3 },
          { slot: 6, structure: 'Vocabulário de materiais de construção',      difficulty: 3 },
          { slot: 7, structure: 'Identificar elemento da Carta Familiar',      difficulty: 4 },
          { slot: 8, structure: 'Distinguir Artigo Definido de Indefinido',    difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 4,
      nome: 'A Escola',
      meta: {
        icon: 'BookOpen', color: 'bg-yellow-500', desc: 'História da escola e Narrativa',
        ai_rules: `
PERMITIDO:
- Identificar se um texto usa Discurso Direto (travessão) ou Discurso Indireto
- Dado uma frase em Discurso Direto, identificar quem fala
- Identificar o Sujeito (grupo nominal) de uma frase simples
- Identificar o Predicado (grupo verbal) de uma frase simples
- Interpretação de texto narrativo curto: responder sobre quem, o quê, quando, onde

PROIBIDO:
- Análise de complementos diretos/indiretos`,
        lesson_plan: [
          { slot: 1, structure: 'Identificar Sujeito numa frase simples',      difficulty: 2 },
          { slot: 2, structure: 'Identificar Predicado numa frase simples',    difficulty: 2 },
          { slot: 3, structure: 'Identificar Discurso Direto ou Indireto',     difficulty: 3 },
          { slot: 4, structure: 'Interpretação de texto narrativo curto',      difficulty: 3 },
          { slot: 5, structure: 'Identificar quem fala no Discurso Direto',    difficulty: 3 },
          { slot: 6, structure: 'Identificar Sujeito numa frase simples',      difficulty: 4 },
          { slot: 7, structure: 'Identificar Discurso Direto ou Indireto',     difficulty: 4 },
          { slot: 8, structure: 'Interpretação de texto narrativo curto',      difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 4,
      nome: 'A Comunidade',
      meta: {
        icon: 'MapPin', color: 'bg-orange-500', desc: 'Profissões e Símbolos Nacionais',
        ai_rules: `
PERMITIDO:
- Vocabulário de profissões e instituições moçambicanas
- Identificar símbolos nacionais de Moçambique (Bandeira, Hino, Emblema)
- Dado uma instrução em Imperativo, identificar a que pessoa se dirige
- Escolher a preposição ou contração correta numa frase (de, em, por, no, na, pelo)

PROIBIDO:
- Orações condicionais`,
        lesson_plan: [
          { slot: 1, structure: 'Vocabulário de profissões',                   difficulty: 2 },
          { slot: 2, structure: 'Identificar símbolo nacional de Moçambique',  difficulty: 2 },
          { slot: 3, structure: 'Escolher preposição correta numa frase',      difficulty: 2 },
          { slot: 4, structure: 'Identificar uso do Modo Imperativo',          difficulty: 3 },
          { slot: 5, structure: 'Escolher contração correta (no, na, pelo)',   difficulty: 3 },
          { slot: 6, structure: 'Vocabulário de instituições moçambicanas',    difficulty: 3 },
          { slot: 7, structure: 'Escolher preposição correta numa frase',      difficulty: 4 },
          { slot: 8, structure: 'Identificar uso do Modo Imperativo',          difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 4,
      nome: 'O Ambiente',
      meta: {
        icon: 'MapPin', color: 'bg-green-600', desc: 'Natureza, Água e Poesia',
        ai_rules: `
PERMITIDO:
- Vocabulário de conservação ambiental e animais de Moçambique
- Dado um conjunto de palavras, identificar as que pertencem à mesma família (mesmo radical)
- Dado um nome coletivo, identificar o que representa (ex: "rebanho" = grupo de ?)
- Dado uma frase, identificar o Advérbio de Lugar (aqui, ali, longe, perto, lá)

PROIBIDO:
- Figuras de estilo literárias (Metáforas, Hipérboles)`,
        lesson_plan: [
          { slot: 1, structure: 'Vocabulário de animais de Moçambique',        difficulty: 2 },
          { slot: 2, structure: 'Identificar palavras da mesma família',       difficulty: 2 },
          { slot: 3, structure: 'Identificar o nome coletivo correto',         difficulty: 2 },
          { slot: 4, structure: 'Identificar Advérbio de Lugar numa frase',    difficulty: 3 },
          { slot: 5, structure: 'Identificar palavras da mesma família',       difficulty: 3 },
          { slot: 6, structure: 'Vocabulário de conservação ambiental',        difficulty: 3 },
          { slot: 7, structure: 'Identificar o nome coletivo correto',         difficulty: 4 },
          { slot: 8, structure: 'Identificar Advérbio de Lugar numa frase',    difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 4,
      nome: 'Corpo Humano',
      meta: {
        icon: 'UserCheck', color: 'bg-rose-400', desc: 'Vestuário e Tempos Verbais',
        ai_rules: `
PERMITIDO:
- Vocabulário de partes do corpo e peças de vestuário
- Dado uma frase com verbo sublinhado, dizer em que tempo está: Presente, Pretérito Perfeito ou Futuro
- Dado um verbo no infinitivo e um tempo verbal, conjugá-lo corretamente
- Transformar uma frase do Presente para o Pretérito Perfeito

PROIBIDO:
- Anatomia científica complexa`,
        lesson_plan: [
          { slot: 1, structure: 'Vocabulário de partes do corpo',              difficulty: 2 },
          { slot: 2, structure: 'Vocabulário de peças de vestuário',           difficulty: 2 },
          { slot: 3, structure: 'Dizer em que tempo está o verbo',             difficulty: 2 },
          { slot: 4, structure: 'Conjugar verbo no Presente',                  difficulty: 3 },
          { slot: 5, structure: 'Conjugar verbo no Pretérito Perfeito',        difficulty: 3 },
          { slot: 6, structure: 'Transformar frase do Presente para o Passado', difficulty: 4 },
          { slot: 7, structure: 'Conjugar verbo no Futuro',                    difficulty: 4 },
          { slot: 8, structure: 'Dizer em que tempo está o verbo',             difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 4,
      nome: 'Saúde e Higiene',
      meta: {
        icon: 'Heart', color: 'bg-red-500', desc: 'Cuidados e Cartazes',
        ai_rules: `
PERMITIDO:
- Interpretação de mensagem curta tipo Cartaz (ex: "Lava as mãos antes de comer!")
- Dado uma frase, identificar o Pronome Possessivo correto (meu, teu, seu, nosso)
- Dado um pronome possessivo, flexioná-lo em género e número (ex: meu → minha → meus → minhas)
- Escolher o pronome possessivo correto para completar uma frase

PROIBIDO:
- Pronomes Relativos ou Demonstrativos complexos`,
        lesson_plan: [
          { slot: 1, structure: 'Interpretar mensagem tipo Cartaz de saúde',   difficulty: 2 },
          { slot: 2, structure: 'Identificar Pronome Possessivo numa frase',   difficulty: 2 },
          { slot: 3, structure: 'Escolher pronome possessivo correto',         difficulty: 3 },
          { slot: 4, structure: 'Flexionar pronome possessivo em género',      difficulty: 3 },
          { slot: 5, structure: 'Flexionar pronome possessivo em número',      difficulty: 3 },
          { slot: 6, structure: 'Interpretar mensagem tipo Cartaz de saúde',   difficulty: 4 },
          { slot: 7, structure: 'Escolher pronome possessivo correto',         difficulty: 4 },
          { slot: 8, structure: 'Flexionar pronome possessivo em género e número', difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 4,
      nome: 'Meios de Transporte',
      meta: {
        icon: 'GitBranch', color: 'bg-slate-600', desc: 'Transportes e Trânsito',
        ai_rules: `
PERMITIDO:
- Vocabulário de meios de transporte: terrestre (chapa, autocarro, comboio), aéreo (avião), marítimo (barco, dhow)
- Classificar um meio de transporte como terrestre, aéreo ou marítimo
- Dado uma frase, identificar o Advérbio de Tempo (cedo, tarde, logo, hoje, amanhã, sempre, nunca, já)
- Escolher o Advérbio de Tempo correto para completar uma frase

PROIBIDO:
- Locuções adverbiais`,
        lesson_plan: [
          { slot: 1, structure: 'Vocabulário de meios de transporte',          difficulty: 2 },
          { slot: 2, structure: 'Classificar transporte como terrestre/aéreo/marítimo', difficulty: 2 },
          { slot: 3, structure: 'Identificar Advérbio de Tempo numa frase',    difficulty: 2 },
          { slot: 4, structure: 'Escolher Advérbio de Tempo correto',          difficulty: 3 },
          { slot: 5, structure: 'Classificar transporte como terrestre/aéreo/marítimo', difficulty: 3 },
          { slot: 6, structure: 'Identificar Advérbio de Tempo numa frase',    difficulty: 4 },
          { slot: 7, structure: 'Vocabulário de meios de transporte',          difficulty: 4 },
          { slot: 8, structure: 'Escolher Advérbio de Tempo correto',          difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 4,
      nome: 'Meios de Comunicação',
      meta: {
        icon: 'Mail', color: 'bg-purple-500', desc: 'Media, Cartas e Postais',
        ai_rules: `
PERMITIDO:
- Vocabulário de meios de comunicação: telefone, internet, rádio, televisão, jornal, postal
- Identificar os elementos de um Postal: remetente, destinatário, mensagem, endereço
- Dado uma frase, identificar o Advérbio de Modo (bem, mal, depressa, devagar, ou terminado em -mente)
- Escolher o Advérbio de Modo correto para completar uma frase

PROIBIDO:
- Textos jornalísticos longos`,
        lesson_plan: [
          { slot: 1, structure: 'Vocabulário de meios de comunicação',         difficulty: 2 },
          { slot: 2, structure: 'Identificar elemento de um Postal',           difficulty: 2 },
          { slot: 3, structure: 'Identificar Advérbio de Modo numa frase',     difficulty: 3 },
          { slot: 4, structure: 'Escolher Advérbio de Modo correto',           difficulty: 3 },
          { slot: 5, structure: 'Identificar elemento de um Postal',           difficulty: 3 },
          { slot: 6, structure: 'Vocabulário de meios de comunicação',         difficulty: 4 },
          { slot: 7, structure: 'Identificar Advérbio de Modo numa frase',     difficulty: 4 },
          { slot: 8, structure: 'Escolher Advérbio de Modo correto',           difficulty: 5 },
        ]
      }
    },

    {
      d: port.id, c: 4,
      nome: 'A Nossa Província',
      meta: {
        icon: 'MapPin', color: 'bg-teal-600', desc: 'Riquezas locais e Poesia',
        ai_rules: `
PERMITIDO:
- Conhecimentos sobre províncias de Moçambique: capital, produto agrícola principal, rio ou lago associado
- Dado um poema curto, identificar quantos Versos tem uma estrofe
- Dado um poema curto, identificar quantas Estrofes tem
- Identificar o Advérbio de Negação numa frase (não, nunca, jamais)
- Escolher o Advérbio de Negação correto para completar uma frase

PROIBIDO:
- História política complexa`,
        lesson_plan: [
          { slot: 1, structure: 'Conhecimentos sobre províncias de Moçambique', difficulty: 2 },
          { slot: 2, structure: 'Identificar Advérbio de Negação numa frase',  difficulty: 2 },
          { slot: 3, structure: 'Identificar número de Versos numa estrofe',   difficulty: 3 },
          { slot: 4, structure: 'Identificar número de Estrofes num poema',    difficulty: 3 },
          { slot: 5, structure: 'Conhecimentos sobre províncias de Moçambique', difficulty: 3 },
          { slot: 6, structure: 'Escolher Advérbio de Negação correto',        difficulty: 4 },
          { slot: 7, structure: 'Identificar número de Versos e Estrofes',     difficulty: 4 },
          { slot: 8, structure: 'Conhecimentos sobre províncias de Moçambique', difficulty: 5 },
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