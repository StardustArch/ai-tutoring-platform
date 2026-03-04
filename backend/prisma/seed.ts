import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🇲🇿 A carregar o Currículo Nacional de Moçambique (KMind)...');

  // --- 1. GARANTIR DISCIPLINAS ---
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

  // --- 2. DEFINIÇÃO DOS TÓPICOS COM REGRAS DE IA RIGOROSAS ---
  const topicos = [
    // ============================================================
    // 📘 MATEMÁTICA - 3ª CLASSE
    // ============================================================
    {
      d: mat.id, c: 3,
      nome: 'Números até 10.000',
      meta: { 
        icon: 'Hash', color: 'bg-blue-500', desc: 'Ler, escrever e ordenar números',
        ai_rules: `
PERMITIDO:
- Leitura de números inteiros entre 0 e 10.000
- Escrita de números por extenso
- Identificação de valor posicional (unidades, dezenas, centenas, milhares)
- Ordenação crescente e decrescente
- Decomposição de números (ex: 4000 + 500 + 20)

PROIBIDO:
- QUALQUER operação aritmética (+, -, x, ÷)
- Problemas de história que exijam cálculos
- Frações ou decimais`
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Ordinais e Romanos',
      meta: { 
        icon: 'ListOrdered', color: 'bg-indigo-500', desc: '1º, 2º, 3º... e I, V, X, L',
        ai_rules: `
PERMITIDO:
- Números ordinais até ao 50º (quinquagésimo)
- Numeração Romana apenas com I, V, X e L (até 50)
- Conversão de numeração decimal para romana (e vice-versa)

PROIBIDO:
- Uso das letras C, D ou M
- Operações matemáticas (somas/subtrações) com numeração romana`
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Geometria: Figuras e Sólidos',
      meta: { 
        icon: 'Shapes', color: 'bg-orange-500', desc: 'Triângulos, Retas e Formas',
        ai_rules: `
PERMITIDO:
- Identificar Triângulos, Quadrados, Retângulos e Círculos pelas suas características (lados, vértices)
- Noção visual de retas paralelas e perpendiculares
- Sólidos geométricos simples (Cubo, Esfera, Cilindro)

PROIBIDO:
- Cálculos de Área ou Perímetro
- Fórmulas matemáticas
- Ângulos em graus`
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Adição e Subtração (3-4 dígitos)',
      meta: { 
        icon: 'Calculator', color: 'bg-green-500', desc: 'Contas com transporte (vai um)',
        ai_rules: `
PERMITIDO:
- Problemas de história reais com adição e subtração
- Operações com números de 3 ou 4 dígitos (ex: 345 + 120, 4000 - 1500)
- O resultado final NUNCA deve passar de 10.000
- Contas com transporte ("vai um") e empréstimo

PROIBIDO:
- Multiplicação e Divisão
- Expressões com mais de duas parcelas complexas`
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Multiplicação Básica',
      meta: { 
        icon: 'X', color: 'bg-purple-500', desc: 'Tabuadas e multiplicar por 10/100',
        ai_rules: `
PERMITIDO:
- Perguntas de Tabuada (do 1 ao 10)
- Multiplicação por 10 ou 100
- Multiplicação de número de 2 ou 3 dígitos por UM único dígito (ex: 123 x 3)
- Problemas de história envolvendo grupos iguais (ex: 4 caixas com 5 lápis)

PROIBIDO:
- Multiplicadores com dois ou mais dígitos (ex: 12 x 15)
- Divisão`
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Divisão Simples',
      meta: { 
        icon: 'Divide', color: 'bg-purple-600', desc: 'Divisão vertical e com resto',
        ai_rules: `
PERMITIDO:
- Divisões exatas e com resto simples
- O divisor TEM de ter apenas 1 dígito (ex: 45 ÷ 5)
- Problemas de distribuição equitativa (ex: dividir 20 rebuçados por 4 crianças)

PROIBIDO:
- Divisores com dois dígitos (ex: 100 ÷ 25)
- Frações ou decimais como resultado`
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Grandezas e Medidas',
      meta: { 
        icon: 'Scale', color: 'bg-teal-500', desc: 'Comprimento, Massa, Litros e Tempo',
        ai_rules: `
PERMITIDO:
- Identificação da unidade correta para medir coisas (Metro, Centímetro, Litro, Quilograma)
- Leitura de horas e minutos em relógios analógicos ou digitais
- Comparações simples (o que pesa mais?)

PROIBIDO:
- Conversões complexas com casas decimais (ex: 1.5 kg para gramas)
- Cálculo de áreas ou volumes`
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Dinheiro e Frações',
      meta: { 
        icon: 'Coins', color: 'bg-yellow-500', desc: 'O Metical e noções de metade/terço',
        ai_rules: `
PERMITIDO:
- Problemas de compras e trocos simples usando a moeda Metical (MT)
- Noção puramente visual/conceitual de Frações: Metade (1/2), Terço (1/3), Quarto (1/4)
- Exemplo: "Qual é a metade de 10 maçãs?"

PROIBIDO:
- Operações matemáticas (soma/subtração) entre frações
- Frações com denominadores maiores que 10`
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Gráficos e Tabelas',
      meta: { 
        icon: 'LineChart', color: 'bg-pink-500', desc: 'Ler informações em gráficos',
        ai_rules: `
PERMITIDO:
- Perguntas de interpretação de dados ("Quem tem mais?", "Qual é o total?", "Qual é a diferença?")
- Forneça os dados da tabela diretamente no texto da pergunta. Ex: "Numa turma, 10 gostam de maçã e 5 de banana."

PROIBIDO:
- Pedir para o aluno desenhar o gráfico
- Cálculos estatísticos (Média, Moda, Mediana)`
      }
    },

    // ============================================================
    // 📙 MATEMÁTICA - 4ª CLASSE
    // ============================================================
    {
      d: mat.id, c: 4,
      nome: 'Números até 1 Milhão',
      meta: { 
        icon: 'Hash', color: 'bg-blue-600', desc: 'Milhares e Milhões',
        ai_rules: `
PERMITIDO:
- Leitura e compreensão de números entre 10.000 e 1.000.000
- Escrita por extenso
- Identificação de classes e ordens (unidade de milhar, dezenas de milhar, centenas de milhar, milhões)
- Valor posicional (ex: "Qual é o valor do algarismo 5 em 540.000?")
- Comparação e Ordenação

PROIBIDO:
- QUALQUER operação matemática (+, -, x, ÷)
- Multiplicações (Não use problemas como "15 caixas com 8000 unidades")
- Divisões`
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Geometria: Ângulos e Formas',
      meta: { 
        icon: 'Triangle', color: 'bg-orange-600', desc: 'Ângulos, Circunferência e Sólidos',
        ai_rules: `
PERMITIDO:
- Classificação de Ângulos (Reto, Agudo, Obtuso, Raso)
- Identificação de Raio e Diâmetro numa circunferência
- Classificação de Triângulos (Equilátero, Isósceles, Escaleno)

PROIBIDO:
- Pedir medições exatas de ângulos em graus que exijam transferidor
- Cálculos complexos de Área (Pi)`
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Somas e Subtrações Grandes',
      meta: { 
        icon: 'Calculator', color: 'bg-green-600', desc: 'Operações com 5 e 6 dígitos',
        ai_rules: `
PERMITIDO:
- Operações de Adição e Subtração com números de 4, 5 ou 6 dígitos
- Problemas de história realistas envolvendo grandes quantias (ex: População de cidades, orçamentos grandes em Meticais)
- Foco em contas com empréstimos/transporte complexos

PROIBIDO:
- Multiplicação e Divisão
- Números acima de 1.000.000`
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Multiplicação Avançada',
      meta: { 
        icon: 'X', color: 'bg-purple-600', desc: 'Multiplicar por 2 dígitos',
        ai_rules: `
PERMITIDO:
- Multiplicando de 3 ou 4 dígitos e multiplicador obrigatoriamente de 2 dígitos (ex: 345 x 24)
- Problemas de história do tipo: compras em grandes quantidades, produção diária de uma fábrica.

PROIBIDO:
- Divisão
- Expressões matemáticas longas`
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Divisão e Expressões',
      meta: { 
        icon: 'Sigma', color: 'bg-purple-700', desc: 'Divisão longa e parênteses ( )',
        ai_rules: `
PERMITIDO:
- Divisão de números de 3 ou 4 dígitos por 1 ou 2 dígitos
- Resolução de expressões numéricas simples respeitando a prioridade das operações e uso de parênteses ( )

PROIBIDO:
- Expressões com chavetas ou parênteses retos [ ]
- Números decimais ou frações nas expressões`
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Medidas de Área e Tempo',
      meta: { 
        icon: 'Ruler', color: 'bg-teal-600', desc: 'Perímetros, Áreas e Calendário',
        ai_rules: `
PERMITIDO:
- Cálculo prático de Perímetro e Área de Quadrados e Retângulos
- Conversão de medidas de tempo (horas para minutos, dias, anos, séculos, milénios)

PROIBIDO:
- Fórmulas de área de triângulos ou círculos
- Cálculos de volume`
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Frações e Decimais',
      meta: { 
        icon: 'PieChart', color: 'bg-cyan-600', desc: 'Soma de frações e números com vírgula',
        ai_rules: `
PERMITIDO:
- Soma e subtração de frações APENAS com o mesmo denominador
- Leitura e identificação de números decimais simples (décimas e centésimas)
- Transformação de moedas (ex: 1,50 MT)

PROIBIDO:
- Multiplicação ou Divisão de frações
- Soma de frações com denominadores diferentes (exige MMC)`
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Literacia Financeira II',
      meta: { 
        icon: 'Coins', color: 'bg-yellow-600', desc: 'Poupança e gestão do Metical',
        ai_rules: `
PERMITIDO:
- Problemas que envolvam planear um orçamento, poupança ao longo do tempo ou lucro.
- Contexto: Metical (MT), pequenos negócios, mercados locais (ex: comprar produtos para revender).

PROIBIDO:
- Taxas de juro compostas
- Terminologia bancária complexa`
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Equações e Gráficos',
      meta: { 
        icon: 'Equal', color: 'bg-slate-500', desc: 'Descobrir o número e ler dados',
        ai_rules: `
PERMITIDO:
- Encontrar o termo desconhecido (X) em operações simples (ex: X + 15 = 40, ou 5 x X = 30)
- Interpretação de dados descritos num texto como se fossem um gráfico de linhas

PROIBIDO:
- Sistemas de equações
- Variáveis complexas`
      }
    },

    // ============================================================
    // 📕 PORTUGUÊS - 3ª CLASSE
    // ============================================================
    {
      d: port.id, c: 3,
      nome: 'Verbos: Ser, Estar e Agir',
      meta: { 
        icon: 'Activity', color: 'bg-red-500', desc: 'Ações do dia-a-dia',
        ai_rules: `
PERMITIDO:
- Identificação de verbos numa frase
- Conjugação dos verbos Ser, Estar, Ter e verbos de ação regulares (ex: comer, andar) no Presente, Passado (Pretérito Perfeito) e Futuro do Indicativo.

PROIBIDO:
- Modos Subjuntivo, Condicional ou Imperativo
- Tempos compostos`
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Nomes e Adjetivos',
      meta: { 
        icon: 'Tags', color: 'bg-blue-500', desc: 'Dar nomes e qualidades',
        ai_rules: `
PERMITIDO:
- Distinção entre Nomes Próprios (ex: Maputo, João) e Comuns (ex: cidade, menino)
- Concordância do Adjetivo com o Nome em Género (Masculino/Feminino) e Número (Singular/Plural)

PROIBIDO:
- Graus dos Adjetivos (Comparativo, Superlativo)
- Substantivos abstratos complexos`
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Sinónimos e Antónimos',
      meta: { 
        icon: 'RefreshCcw', color: 'bg-green-500', desc: 'Palavras iguais e contrárias',
        ai_rules: `
PERMITIDO:
- Substituir palavras por sinónimos adequados ao contexto
- Encontrar o antónimo direto de adjetivos e verbos simples (ex: grande/pequeno, subir/descer)

PROIBIDO:
- Palavras raras, arcaicas ou jargão técnico
- Homónimos e Parónimos`
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Ortografia e Pontuação',
      meta: { 
        icon: 'PenTool', color: 'bg-yellow-600', desc: 'Sinais, M antes de P/B',
        ai_rules: `
PERMITIDO:
- Identificação de erros ortográficos comuns (uso de M antes de P e B)
- Aplicação correta de Maiúsculas em nomes próprios e início de frase
- Sinais de pontuação básicos: Ponto final (.), Vírgula (,), Ponto de interrogação (?) e Ponto de exclamação (!)

PROIBIDO:
- Regras de hifenização complexas
- Ponto e vírgula (;), Reticências (...)`
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Tipos de Frase',
      meta: { 
        icon: 'MessageSquare', color: 'bg-orange-500', desc: 'Perguntas e Negações',
        ai_rules: `
PERMITIDO:
- Transformação de frases: de Afirmativa para Negativa, de Afirmativa para Interrogativa, ou Exclamativa.
- Identificação do tipo de frase pelo sentido e pontuação.

PROIBIDO:
- Oração subordinada
- Voz passiva/ativa`
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Trânsito e Segurança',
      meta: { 
        icon: 'TrafficCone', color: 'bg-slate-600', desc: 'Sinais e regras',
        ai_rules: `
PERMITIDO:
- Perguntas de interpretação e vocabulário sobre regras de segurança na estrada (passadeiras, semáforos)
- Contexto: Estradas, ruas e veículos comuns em Moçambique (Chapa, autocarro, bicicleta).

PROIBIDO:
- Códigos de estrada avançados ou multas`
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Saúde e Comunidade',
      meta: { 
        icon: 'Heart', color: 'bg-pink-500', desc: 'Textos sobre saúde e convívio',
        ai_rules: `
PERMITIDO:
- Vocabulário e interpretação sobre prevenção de doenças comuns (Malária, Diarreia, Cólera) e higiene pessoal.
- Valores de convivência em família e na escola.

PROIBIDO:
- Termos médicos científicos complexos`
      }
    },

    // ============================================================
    // 📕 PORTUGUÊS - 4ª CLASSE
    // ============================================================
    {
      d: port.id, c: 4,
      nome: 'Família e Casa',
      meta: { 
        icon: 'Home', color: 'bg-blue-500', desc: 'Convivência, Casa e Carta Familiar',
        ai_rules: `
PERMITIDO:
- Vocabulário sobre materiais de construção de casas (alvenaria, caniço, pau-a-pique) e membros da família.
- Estrutura da Carta Familiar (cabeçalho, corpo, despedida, assinatura).
- Identificação de Determinantes Artigos (Definidos e Indefinidos).

PROIBIDO:
- Tipos de texto argumentativos ou jornalísticos.`
      }
    },
    {
      d: port.id, c: 4,
      nome: 'A Escola',
      meta: { 
        icon: 'BookOpen', color: 'bg-yellow-500', desc: 'História da escola e Narrativa',
        ai_rules: `
PERMITIDO:
- Interpretação de pequenos textos narrativos (Fábulas, histórias escolares) e do texto "O Aviso".
- Identificação de Discurso Direto (uso de travessão) e Discurso Indireto.
- Divisão da frase simples (Grupo Nominal / Sujeito e Grupo Verbal / Predicado).

PROIBIDO:
- Análise sintática de complementos diretos/indiretos.`
      }
    },
    {
      d: port.id, c: 4,
      nome: 'A Comunidade',
      meta: { 
        icon: 'Users', color: 'bg-orange-500', desc: 'Profissões e Símbolos Nacionais',
        ai_rules: `
PERMITIDO:
- Vocabulário sobre Instituições, Profissões e Símbolos Nacionais (Bandeira, Hino, Emblema).
- Uso do Modo Imperativo para dar instruções.
- Uso de Preposições simples e contrações (de, em, por, no, na, pelo).

PROIBIDO:
- Orações condicionais.`
      }
    },
    {
      d: port.id, c: 4,
      nome: 'O Ambiente',
      meta: { 
        icon: 'TreePine', color: 'bg-green-600', desc: 'Natureza, Água e Poesia',
        ai_rules: `
PERMITIDO:
- Vocabulário sobre Conservação, Animais, Plantas.
- Família de Palavras (palavras derivadas com o mesmo radical).
- Identificação de Nomes Coletivos (ex: rebanho, manada, cardume).
- Advérbios de Lugar (aqui, ali, longe, perto).

PROIBIDO:
- Análise de figuras de estilo literárias complexas (Metáforas, Hipérboles).`
      }
    },
    {
      d: port.id, c: 4,
      nome: 'Corpo Humano',
      meta: { 
        icon: 'User', color: 'bg-rose-400', desc: 'Vestuário e Tempos Verbais',
        ai_rules: `
PERMITIDO:
- Vocabulário sobre partes do corpo e peças de vestuário.
- Conjugação e identificação de Tempos Verbais (Presente, Pretérito Perfeito e Futuro do Indicativo).

PROIBIDO:
- Anatomia científica complexa.`
      }
    },
    {
      d: port.id, c: 4,
      nome: 'Saúde e Higiene',
      meta: { 
        icon: 'Heart', color: 'bg-red-500', desc: 'Cuidados e Cartazes',
        ai_rules: `
PERMITIDO:
- Interpretação de mensagens curtas (tipo Cartaz) sobre saúde preventiva.
- Uso e flexão de Pronomes Possessivos (meu, teu, seu, nosso) em género e número.

PROIBIDO:
- Pronomes Relativos ou Demonstrativos complexos.`
      }
    },
    {
      d: port.id, c: 4,
      nome: 'Meios de Transporte',
      meta: { 
        icon: 'Truck', color: 'bg-slate-600', desc: 'Transportes e Trânsito',
        ai_rules: `
PERMITIDO:
- Vocabulário de transportes (terrestre, aéreo, marítimo) e segurança rodoviária.
- Identificação de Advérbios de Tempo (cedo, tarde, logo, hoje, amanhã, sempre).

PROIBIDO:
- Locuções adverbiais.`
      }
    },
    {
      d: port.id, c: 4,
      nome: 'Meios de Comunicação',
      meta: { 
        icon: 'Radio', color: 'bg-purple-500', desc: 'Media, Cartas e Postais',
        ai_rules: `
PERMITIDO:
- Vocabulário sobre meios de comunicação (telefone, internet, rádio, televisão, jornal).
- Estrutura de preenchimento de Postais (remetente, destinatário).
- Identificação de Advérbios de Modo (bem, mal, depressa, devagar, palavras terminadas em -mente).

PROIBIDO:
- Textos jornalísticos longos.`
      }
    },
    {
      d: port.id, c: 4,
      nome: 'A Nossa Província',
      meta: { 
        icon: 'MapPin', color: 'bg-teal-600', desc: 'Riquezas locais e Poesia',
        ai_rules: `
PERMITIDO:
- Conhecimentos gerais sobre províncias de Moçambique, agricultura local (machamba) e cultura.
- Estrutura básica de um poema (Verso, Estrofe).
- Identificação de Advérbios de Negação (não, nunca, jamais).

PROIBIDO:
- História política complexa.`
      }
    }
  ];

  // --- 3. INSERÇÃO NA BASE DE DADOS ---
  console.log(`📝 A processar ${topicos.length} tópicos do currículo...`);

  const contadoresOrdem: Record<string, number> = {};

  for (const t of topicos) {
    const chaveGrupo = `${t.d}-${t.c}`;
    
    if (!contadoresOrdem[chaveGrupo]) {
        contadoresOrdem[chaveGrupo] = 1;
    } else {
        contadoresOrdem[chaveGrupo]++;
    }
    
    const ordemAtual = contadoresOrdem[chaveGrupo];

    const existe = await prisma.topico.findFirst({
      where: {
        nome: t.nome,
        nivelClasse: t.c,
        disciplinaId: t.d
      }
    });

    if (!existe) {
      await prisma.topico.create({
        data: {
          nome: t.nome,
          nivelClasse: t.c,
          disciplinaId: t.d,
          ordem: ordemAtual,
          metadata: t.meta
        }
      });
      console.log(`➕ Criado: [${t.c}ª Classe] ${t.nome} (Ordem: ${ordemAtual})`);
    } else {
        await prisma.topico.update({
            where: { id: existe.id },
            data: { 
                metadata: t.meta,
                ordem: ordemAtual
            }
        });
        console.log(`🔄 Atualizado: ${t.nome} (Ordem: ${ordemAtual})`);
    }
  }

  console.log('✅ Seed completo com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });