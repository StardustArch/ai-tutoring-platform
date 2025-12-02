import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🇲🇿 A carregar o Currículo Nacional de Moçambique (KaniMente)...');

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

  // --- 2. DEFINIÇÃO DOS TÓPICOS COM REGRAS DE IA ---
  const topicos = [
    // ============================================================
    // 📘 MATEMÁTICA - 3ª CLASSE
    // (Limites: Números até 10.000, Multiplicação simples)
    // ============================================================
    {
      d: mat.id, c: 3,
      nome: 'Números até 10.000',
      meta: { 
        icon: 'Hash', color: 'bg-blue-500', desc: 'Ler, escrever e ordenar números',
        ai_rules: 'Gera apenas números inteiros entre 0 e 10.000. Exercícios de leitura, escrita por extenso, ordem crescente/decrescente e decomposição.'
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Ordinais e Romanos',
      meta: { 
        icon: 'ListOrdered', color: 'bg-indigo-500', desc: '1º, 2º, 3º... e I, V, X, L',
        ai_rules: 'Números ordinais até 50º (quinquagésimo). Numeração Romana apenas até 50 (L). Não use C, D ou M.'
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Geometria: Figuras e Sólidos',
      meta: { 
        icon: 'Shapes', color: 'bg-orange-500', desc: 'Triângulos, Retas e Formas',
        ai_rules: 'Identificação de Triângulos, Quadrados, Retângulos e Círculos. Noção de Retas Paralelas e Perpendiculares. Sólidos simples (Cubo, Esfera).'
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Adição e Subtração (3-4 dígitos)',
      meta: { 
        icon: 'Calculator', color: 'bg-green-500', desc: 'Contas com transporte (vai um)',
        ai_rules: 'Use números de 3 ou 4 dígitos (ex: 345 + 120). O resultado nunca deve passar de 10.000. Inclua contas com transporte.'
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Multiplicação Básica',
      meta: { 
        icon: 'X', color: 'bg-purple-500', desc: 'Tabuadas e multiplicar por 10/100',
        ai_rules: 'Multiplicação por 10, 100 ou por um único dígito (ex: 123 x 3). Não use dois dígitos no multiplicador.'
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Divisão Simples',
      meta: { 
        icon: 'Divide', color: 'bg-purple-600', desc: 'Divisão vertical e com resto',
        ai_rules: 'Divisões onde o divisor tem apenas 1 dígito (ex: 45 ÷ 5). Inclua divisões exatas e com resto.'
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Grandezas e Medidas',
      meta: { 
        icon: 'Scale', color: 'bg-teal-500', desc: 'Comprimento, Massa, Litros e Tempo',
        ai_rules: 'Unidades simples: Metro, Centímetro, Litro, Quilo. Leitura de horas e minutos no relógio.'
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Dinheiro e Frações',
      meta: { 
        icon: 'Coins', color: 'bg-yellow-500', desc: 'O Metical e noções de metade/terço',
        ai_rules: 'Contexto: Moeda de Moçambique (Metical). Problemas de trocos simples. Noção visual de Frações (1/2, 1/3, 1/4).'
      }
    },
    {
      d: mat.id, c: 3,
      nome: 'Gráficos e Tabelas',
      meta: { 
        icon: 'LineChart', color: 'bg-pink-500', desc: 'Ler informações em gráficos',
        ai_rules: 'Interpretação de tabelas simples e gráficos de barras. Perguntas como "Quem tem mais?" ou "Qual o total?".'
      }
    },

    // ============================================================
    // 📙 MATEMÁTICA - 4ª CLASSE
    // (Limites: Até 1 Milhão, Multiplicação por 2 dígitos)
    // ============================================================
    {
      d: mat.id, c: 4,
      nome: 'Números até 1 Milhão',
      meta: { 
        icon: 'Hash', color: 'bg-blue-600', desc: 'Milhares e Milhões',
        ai_rules: 'Gera números entre 10.000 e 1.000.000. Exercícios de classes e ordens (unidade de milhar, milhão).'
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Geometria: Ângulos e Formas',
      meta: { 
        icon: 'Triangle', color: 'bg-orange-600', desc: 'Ângulos, Circunferência e Sólidos',
        ai_rules: 'Classificação de Ângulos (Reto, Agudo, Obtuso). Raio e Diâmetro. Classificação de Triângulos.'
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Somas e Subtrações Grandes',
      meta: { 
        icon: 'Calculator', color: 'bg-green-600', desc: 'Operações com 5 e 6 dígitos',
        ai_rules: 'Use números de 4, 5 ou 6 dígitos (ex: 12.500 + 45.000). O foco é a complexidade do cálculo e o valor posicional.'
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Multiplicação Avançada',
      meta: { 
        icon: 'X', color: 'bg-purple-600', desc: 'Multiplicar por 2 dígitos',
        ai_rules: 'Multiplicação obrigatória: multiplicando de 3 dígitos e multiplicador de 2 dígitos (ex: 345 x 24).'
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Divisão e Expressões',
      meta: { 
        icon: 'Sigma', color: 'bg-purple-700', desc: 'Divisão longa e parênteses ( )',
        ai_rules: 'Divisão de número de 3 dígitos por 1 dígito. Expressões numéricas simples usando parênteses e as 4 operações.'
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Medidas de Área e Tempo',
      meta: { 
        icon: 'Ruler', color: 'bg-teal-600', desc: 'Perímetros, Áreas e Calendário',
        ai_rules: 'Cálculo de Perímetro e Área de quadrados e retângulos. Conversão de tempo (horas em minutos, séculos, milénios).'
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Frações e Decimais',
      meta: { 
        icon: 'PieChart', color: 'bg-cyan-600', desc: 'Soma de frações e números com vírgula',
        ai_rules: 'Soma e subtração de frações com o mesmo denominador. Introdução aos números decimais (décimas e centésimas).'
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Literacia Financeira II',
      meta: { 
        icon: 'Coins', color: 'bg-yellow-600', desc: 'Poupança e gestão do Metical',
        ai_rules: 'Problemas complexos envolvendo compra, venda, troco e poupança usando Meticais (MT).'
      }
    },
    {
      d: mat.id, c: 4,
      nome: 'Equações e Gráficos',
      meta: { 
        icon: 'Equal', color: 'bg-slate-500', desc: 'Descobrir o número e ler dados',
        ai_rules: 'Encontrar o termo desconhecido na multiplicação e divisão. Leitura de gráficos de linhas.'
      }
    },

    // ============================================================
    // 📕 PORTUGUÊS - 3ª CLASSE
    // (Foco: Família, Escola, Comunidade, Saúde e Trânsito)
    // ============================================================
    {
      d: port.id, c: 3,
      nome: 'Verbos: Ser, Estar e Agir',
      meta: { 
        icon: 'Activity', color: 'bg-red-500', desc: 'Ações do dia-a-dia',
        ai_rules: 'Foca nos verbos Ser e Estar. Conjugação no Presente, Passado e Futuro simples. Verbos de ação (comer, andar, estudar).'
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Nomes e Adjetivos',
      meta: { 
        icon: 'Tags', color: 'bg-blue-500', desc: 'Dar nomes e qualidades',
        ai_rules: 'Distinção entre Nomes Próprios e Comuns. Concordância de Adjetivos em Género (Masc/Fem) e Número (Sing/Plural).'
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Sinónimos e Antónimos',
      meta: { 
        icon: 'RefreshCcw', color: 'bg-green-500', desc: 'Palavras iguais e contrárias',
        ai_rules: 'Exercícios de correspondência de palavras com mesmo significado ou significado oposto.'
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Ortografia e Pontuação',
      meta: { 
        icon: 'PenTool', color: 'bg-yellow-600', desc: 'Sinais, M antes de P/B',
        ai_rules: 'Uso de M antes de P e B. Uso de Maiúsculas. Identificação de sinais de pontuação (. , ? !).'
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Tipos de Frase',
      meta: { 
        icon: 'MessageSquare', color: 'bg-orange-500', desc: 'Perguntas e Negações',
        ai_rules: 'Transformar frases afirmativas em negativas ou interrogativas.'
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Trânsito e Segurança',
      meta: { 
        icon: 'TrafficCone', color: 'bg-slate-600', desc: 'Sinais e regras',
        ai_rules: 'Contexto Moçambique: Sinais de trânsito, passadeiras, semáforos. Regras de segurança para peões.'
      }
    },
    {
      d: port.id, c: 3,
      nome: 'Saúde e Comunidade',
      meta: { 
        icon: 'Heart', color: 'bg-pink-500', desc: 'Textos sobre saúde e convívio',
        ai_rules: 'Perguntas sobre prevenção da Malária, Diarreia e Higiene Pessoal. Regras de convivência na escola e família.'
      }
    }
  ];

  // --- 3. INSERÇÃO NA BASE DE DADOS ---
  console.log(`📝 A processar ${topicos.length} tópicos do currículo...`);

const contadoresOrdem: Record<string, number> = {};

  for (const t of topicos) {
    // Chave única para o grupo (ex: matematica-3)
    const chaveGrupo = `${t.d}-${t.c}`;
    
    // Se não existe contador, inicia em 1. Se existe, incrementa.
    if (!contadoresOrdem[chaveGrupo]) {
        contadoresOrdem[chaveGrupo] = 1;
    } else {
        contadoresOrdem[chaveGrupo]++;
    }
    
    const ordemAtual = contadoresOrdem[chaveGrupo];

    // Verifica se já existe
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
          ordem: ordemAtual, // ✅ Define 1, 2, 3... automaticamente
          metadata: t.meta
        }
      });
      console.log(`➕ Criado: [${t.c}ª Classe] ${t.nome} (Ordem: ${ordemAtual})`);
    } else {
        // Atualiza metadata e ordem (caso tenhas mudado a posição no array)
        await prisma.topico.update({
            where: { id: existe.id },
            data: { 
                metadata: t.meta,
                ordem: ordemAtual // ✅ Atualiza a ordem se mudares o array
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