<svelte:head>
    <title>KaniMente</title>
</svelte:head>
<script lang="ts">
  import '../app.css'
  import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
  import { 
    Sparkles, BookOpen, Brain, Zap, Users, TrendingUp, 
    MessageCircle, Award, Target, ChevronRight, Check, Star, 
	Calculator

  } from 'lucide-svelte';

  // Dados das funcionalidades
  const features = [
    {
      icon: Brain,
      title: 'IA Personalizada',
      description: 'Cada aluno recebe um plano adaptado ao seu nível e ritmo de aprendizagem.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: MessageCircle,
      title: 'Tutor Virtual 24/7',
      description: 'Tire dúvidas a qualquer momento com respostas claras e pedagógicas.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Zap,
      title: 'Modo Rush',
      description: 'Exercícios rápidos e divertidos para treinar e ganhar pontos.',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: TrendingUp,
      title: 'Relatórios Detalhados',
      description: 'Acompanhe o progresso com gráficos e análises em tempo real.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Users,
      title: 'Portal Família',
      description: 'Encarregados podem acompanhar múltiplos educandos num só lugar.',
      color: 'from-pink-500 to-pink-600'
    },
    {
      icon: Award,
      title: 'Gamificação',
      description: 'Sistema de XP, níveis e conquistas que motivam o aprendizado.',
      color: 'from-indigo-500 to-indigo-600'
    }
  ];

  // Matérias disponíveis
const subjects = [
  { 
    id: 'matematica',
    name: 'Matemática', 
    description: 'Operações fundamentais e lógica',
    topics: ['Aritmética', 'Geometria', 'Frações', 'Problemas'], 
    icon: 'Calculator' // Referência ao componente Lucide
  },
  { 
    id: 'portugues',
    name: 'Português', 
    description: 'Língua e comunicação',
    topics: ['Gramática', 'Ortografia', 'Interpretação', 'Verbos'], 
    icon: 'BookOpen'   // Referência ao componente Lucide
  }
];
const iconMap: Record<string, any> = {
  'Calculator': Calculator,
  'BookOpen': BookOpen,
  // Fallback
  'default': Brain 
};

  // Testemunhos
  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'Encarregada de Educação',
      text: 'Os meus filhos adoram o Modo Rush! Agora estudam sem eu ter que insistir.',
      rating: 5
    },
    {
      name: 'João Macamo',
      role: 'Professor da 5ª Classe',
      text: 'Fantástico para acompanhar o progresso da turma. Os relatórios são muito úteis.',
      rating: 5
    },
    {
      name: 'Ana Costa',
      role: 'Mãe de 2 alunos',
      text: 'Finalmente uma ferramenta que ajuda de verdade. As notas melhoraram muito!',
      rating: 5
    }
  ];

  let currentTestimonial = 0;
  
  function nextTestimonial() {
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
  }
  
  function prevTestimonial() {
    currentTestimonial = currentTestimonial === 0 ? testimonials.length - 1 : currentTestimonial - 1;
  }
</script>

<div class="min-h-screen w-full bg-surface-50 dark:bg-surface-950 transition-colors duration-300 overflow-x-hidden">
  
  <!-- NAVBAR -->
  <nav class="fixed top-0 w-full bg-white/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-200 dark:border-surface-800 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold shadow-lg">
            K
          </div>
          <span class="text-xl font-black text-surface-900 dark:text-white">
            Kani<span class="text-primary-500">Mente</span>
          </span>
        </div>

        <!-- Links + Theme -->
        <div class="flex items-center gap-4">
          <ThemeSwitch />
          <a href="/login" class="hidden sm:block text-surface-600 dark:text-surface-300 hover:text-primary-500 font-medium transition-colors">
            Entrar
          </a>
          <a href="/register" class="btn bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">
            Começar Grátis
          </a>
        </div>
      </div>
    </div>
  </nav>

  <!-- HERO SECTION -->
  <section class="relative pt-32 pb-20 px-4 overflow-hidden">
    <!-- Background decorativo -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div class="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-blob"></div>
      <div class="absolute top-40 right-10 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      <div class="absolute bottom-20 left-1/3 w-80 h-80 bg-tertiary-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
    </div>

    <div class="relative max-w-6xl mx-auto text-center space-y-8">
      <!-- Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-600 dark:text-primary-400 font-medium text-sm">
        <Sparkles size={16} />
        <span>Educação com Inteligência Artificial</span>
      </div>

      <!-- Título Principal -->
      <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-surface-900 dark:text-white leading-tight">
        O tutor inteligente<br/>
        <span class="bg-gradient-to-r from-primary-500 via-secondary-500 to-tertiary-500 bg-clip-text text-transparent">
          que cresce com o aluno
        </span>
      </h1>

      <!-- Subtítulo -->
      <p class="text-lg sm:text-xl md:text-2xl text-surface-600 dark:text-surface-400 max-w-3xl mx-auto leading-relaxed">
        Apoio educacional personalizado para crianças da 3ª e 4ª classe em <strong>Português</strong> e <strong>Matemática</strong>.
        Disponível 24/7, adaptado ao ritmo de cada criança.
      </p>

      <!-- CTAs -->
      <div class="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <a
          href="/register"
          class="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all transform hover:-translate-y-1"
        >
          <span>Começar Agora</span>
          <ChevronRight size={20} class="group-hover:translate-x-1 transition-transform" />
        </a>

        <a
          href="/login"
          class="inline-flex items-center justify-center gap-2 bg-white dark:bg-surface-800 border-2 border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 text-surface-900 dark:text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1"
        >
          <span>Já tenho conta</span>
        </a>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
        <div>
          <div class="text-3xl sm:text-4xl font-black text-primary-500">24/7</div>
          <div class="text-sm text-surface-600 dark:text-surface-400 font-medium mt-1">Disponível</div>
        </div>
        <div>
          <div class="text-3xl sm:text-4xl font-black text-secondary-500">2</div>
          <div class="text-sm text-surface-600 dark:text-surface-400 font-medium mt-1">Disciplinas</div>
        </div>
        <div>
          <div class="text-3xl sm:text-4xl font-black text-tertiary-500">100%</div>
          <div class="text-sm text-surface-600 dark:text-surface-400 font-medium mt-1">Personalizado</div>
        </div>
      </div>
    </div>
  </section>

  <!-- MATÉRIAS -->
  <section class="py-20 px-4 bg-surface-100 dark:bg-surface-900">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-surface-900 dark:text-white mb-4">
          Disciplinas Disponíveis
        </h2>
        <p class="text-lg text-surface-600 dark:text-surface-400">
          Conteúdo completo alinhado com o currículo escolar
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-8">
        {#each subjects as subject}
          <div class="bg-white dark:bg-surface-800 rounded-3xl p-8 shadow-xl border border-surface-200 dark:border-surface-700 hover:shadow-2xl transition-all group">
         <div class="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
        <svelte:component 
            this={iconMap[subject.icon] || iconMap['default']} 
            size={32} 
            strokeWidth={2.5}
        />
    </div>
            <h3 class="text-2xl font-bold text-surface-900 dark:text-white mb-4">{subject.name}</h3>
            <div class="flex flex-wrap gap-2">
              {#each subject.topics as topic}
                <span class="px-3 py-1.5 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-lg text-sm font-medium">
                  {topic}
                </span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- FUNCIONALIDADES -->
  <section class="py-20 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-surface-900 dark:text-white mb-4">
          Funcionalidades que Fazem a Diferença
        </h2>
        <p class="text-lg text-surface-600 dark:text-surface-400">
          Tecnologia de ponta ao serviço da educação
        </p>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each features as feature}
          <div class="group bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-lg border border-surface-200 dark:border-surface-700 hover:shadow-2xl hover:border-primary-500/50 transition-all">
            <div class="w-14 h-14 rounded-xl bg-gradient-to-br {feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
              <svelte:component this={feature.icon} size={24} />
            </div>
            <h3 class="text-xl font-bold text-surface-900 dark:text-white mb-2">{feature.title}</h3>
            <p class="text-surface-600 dark:text-surface-400 leading-relaxed">{feature.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- COMO FUNCIONA -->
  <section class="py-20 px-4 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-surface-900 dark:to-surface-800">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-surface-900 dark:text-white mb-4">
          Como Funciona?
        </h2>
        <p class="text-lg text-surface-600 dark:text-surface-400">
          Simples, rápido e eficaz em 3 passos
        </p>
      </div>

      <div class="space-y-8">
        {#each [
          { number: '1', title: 'Crie a sua conta', description: 'Registo rápido para encarregados ou professores. Adicione os educandos.' },
          { number: '2', title: 'O aluno começa a aprender', description: 'Chat interativo, exercícios personalizados e modo Rush para praticar.' },
          { number: '3', title: 'Acompanhe o progresso', description: 'Relatórios detalhados mostram evolução, pontos fortes e áreas a melhorar.' }
        ] as step, i}
          <div class="flex gap-6 items-start">
            <div class="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-2xl font-black shadow-lg">
              {step.number}
            </div>
            <div class="flex-1 bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-lg border border-surface-200 dark:border-surface-700">
              <h3 class="text-xl font-bold text-surface-900 dark:text-white mb-2">{step.title}</h3>
              <p class="text-surface-600 dark:text-surface-400">{step.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- CTA FINAL -->
  <section class="py-20 px-4 bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500 text-white">
    <div class="max-w-4xl mx-auto text-center space-y-8">
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-black">
        Pronto para Transformar a Educação?
      </h2>
      <p class="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto">
        Junte-se a centenas de famílias que já estão a ver resultados incríveis com o KaniMente.
      </p>
      
      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <a
          href="/register"
          class="inline-flex items-center justify-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
        >
          <span>Criar Conta Grátis</span>
          <ChevronRight size={20} />
        </a>
      </div>

      <p class="text-sm opacity-75 pt-4">
        Sem cartão de crédito • Configuração em 2 minutos • Suporte dedicado
      </p>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="bg-surface-900 dark:bg-black text-surface-300 py-12 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="grid md:grid-cols-4 gap-8 mb-8">
        <!-- Logo e descrição -->
        <div class="md:col-span-2">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold">
              K
            </div>
            <span class="text-xl font-black text-white">
              Kani<span class="text-primary-400">Mente</span>
            </span>
          </div>
          <p class="text-sm leading-relaxed max-w-md">
            Plataforma de educação com inteligência artificial, dedicada a apoiar o desenvolvimento académico de crianças em Moçambique.
          </p>
        </div>

        <!-- Links -->
        <div>
          <h3 class="font-bold text-white mb-3">Produto</h3>
          <ul class="space-y-2 text-sm">
            <li><a href="/login" class="hover:text-primary-400 transition-colors">Entrar</a></li>
            <li><a href="/register" class="hover:text-primary-400 transition-colors">Registar</a></li>
          </ul>
        </div>

        <div>
          <h3 class="font-bold text-white mb-3">Suporte</h3>
          <ul class="space-y-2 text-sm">
            <li><a href="#" class="hover:text-primary-400 transition-colors">Ajuda</a></li>
            <li><a href="#" class="hover:text-primary-400 transition-colors">Contacto</a></li>
          </ul>
        </div>
      </div>

      <div class="border-t border-surface-800 pt-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} KaniMente. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
</div>

<style>
  @keyframes blob {
    0%, 100% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  
  .animation-delay-4000 {
    animation-delay: 4s;
  }
    :global(html), :global(body) {
    height: auto !important;
    overflow: visible !important;
  }
</style>