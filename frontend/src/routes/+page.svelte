<svelte:head>
    <title>KMind | O Futuro da Educação em Moçambique</title>
    <meta name="description" content="Plataforma de ensino inteligente para a 3ª e 4ª classe. Matemática e Português com IA." />
</svelte:head>

<script lang="ts">
  import '../app.css';
  import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
  import { 
    Sparkles, BookOpen, Brain, Zap, Users, TrendingUp, 
    MessageCircle, Award, Target, ChevronRight, Calculator, 
    CheckCircle2, Star, ArrowRight,

	Play,

	Battery
,

	Flame
,

	Home
,

	MessageSquare
,

	Signal
,

	User


  } from 'lucide-svelte';

  // Funcionalidades (Organizadas para Bento Grid)
  const features = [
    {
      icon: Brain,
      title: 'IA Adaptativa',
      description: 'O sistema aprende com os erros do aluno e adapta a dificuldade em tempo real.',
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/10',
      colSpan: 'md:col-span-2'
    },
    {
      icon: Zap,
      title: 'Modo Rush',
      description: 'Sessões cronometradas para treinar a agilidade mental e foco.',
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/10',
      colSpan: 'md:col-span-1'
    },
    {
      icon: Users,
      title: 'Portal Família',
      description: 'Encarregados acompanham a evolução detalhada dos educandos.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/10',
      colSpan: 'md:col-span-1'
    },
    {
      icon: TrendingUp,
      title: 'Analytics Avançado',
      description: 'Relatórios de desempenho comparativos e identificação de lacunas.',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      colSpan: 'md:col-span-2'
    }
  ];

  const subjects = [
    { 
      id: 'matematica',
      name: 'Matemática', 
      topics: ['Aritmética', 'Geometria', 'Lógica', 'Problemas'], 
      icon: Calculator,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    { 
      id: 'portugues',
      name: 'Português', 
      topics: ['Gramática', 'Leitura', 'Ortografia', 'Verbos'], 
      icon: BookOpen,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-900/20'
    }
  ];

  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'Encarregada de Educação',
      text: 'O meu filho via o estudo como uma obrigação chata. Com o KMind e o sistema de XP, ele agora pede para estudar.',
      rating: 5
    },
    {
      name: 'Prof. João Macamo',
      role: 'Escola Primária 3 de Fevereiro',
      text: 'Consigo ver exatamente onde cada aluno tem dificuldades antes mesmo da prova. Uma ferramenta indispensável.',
      rating: 5
    },
    {
      name: 'Ana Costa',
      role: 'Mãe de 2 alunos',
      text: 'A interface é muito limpa e segura. Gosto de saber que eles estão a aprender num ambiente controlado.',
      rating: 5
    }
  ];
</script>

<div class="min-h-screen w-full bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-50 font-sans selection:bg-primary-500/30">
  
  <nav class="fixed top-0 w-full z-50 border-b border-surface-200/50 dark:border-surface-800/50 bg-white/80 dark:bg-surface-950/80 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <a href="/" class="flex items-center gap-2 group">
          <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:bg-primary-700 transition-colors">
            K
          </div>
          <span class="text-lg font-bold tracking-tight text-surface-900 dark:text-white">
            K<span class="text-primary-600 dark:text-primary-400">Mind</span>
          </span>
        </a>

        <div class="flex items-center gap-3 md:gap-6">
          <div class="hidden md:flex items-center gap-6 text-sm font-medium text-surface-600 dark:text-surface-300">
            <a href="#funcionalidades" class="hover:text-primary-600 transition-colors">Funcionalidades</a>
            <a href="#disciplinas" class="hover:text-primary-600 transition-colors">Disciplinas</a>
            <!-- <a href="#depoimentos" class="hover:text-primary-600 transition-colors">Depoimentos</a> -->
          </div>
          
          <div class="w-px h-6 bg-surface-200 dark:bg-surface-800 hidden md:block"></div>
          
          <ThemeSwitch />
          
          <a href="/login" class="text-sm font-bold text-surface-700 dark:text-surface-200 hover:text-primary-600 px-3 py-2">
            Entrar
          </a>
          <a href="/register" class="hidden sm:flex btn bg-surface-900 dark:bg-surface-50 text-white dark:text-surface-900 hover:bg-surface-800 dark:hover:bg-surface-200 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
            Começar Agora
          </a>
        </div>
      </div>
    </div>
  </nav>

  <section class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div class="absolute top-20 left-10 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px] opacity-50 dark:opacity-20 animate-pulse-slow"></div>
        <div class="absolute bottom-0 right-10 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] opacity-50 dark:opacity-20"></div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
      
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in-up">
        <Sparkles size={14} class="text-primary-500" />
        Nova Geração de Ensino
      </div>

      <h1 class="text-5xl sm:text-6xl lg:text-7xl font-black text-surface-900 dark:text-white tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto animate-fade-in-up delay-100">
        Educação Inteligente para <br class="hidden md:block"/>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400">
          Mentes Brilhantes.
        </span>
      </h1>

      <p class="text-lg sm:text-xl text-surface-600 dark:text-surface-400 max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in-up delay-200">
        Apoio escolar personalizado para a 3ª e 4ª classe. Transformamos o estudo numa experiência motivadora com IA, gamificação e relatórios em tempo real.
      </p>

      <div class="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-300">
        <a
          href="/register"
          class="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary-500/25 transition-all hover:scale-105"
        >
          Criar Conta Grátis
          <ArrowRight size={20} />
        </a>
        <a
          href="#como-funciona"
          class="inline-flex items-center justify-center gap-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 text-surface-700 dark:text-surface-200 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105"
        >
          Como Funciona
        </a>
      </div>
<div class="relative w-full max-w-7xl mx-auto px-4 py-12 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
    
    <div class="w-full lg:flex-1 animate-fade-in-up delay-200">
        <div class="relative bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-2xl overflow-hidden aspect-[16/10] md:aspect-[21/9]">
            
            <div class="h-10 border-b border-surface-100 dark:border-surface-800 flex items-center px-4 justify-between bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-sm">
                <div class="flex gap-1.5">
                    <div class="w-3 h-3 rounded-full bg-red-400/80"></div>
                    <div class="w-3 h-3 rounded-full bg-amber-400/80"></div>
                    <div class="w-3 h-3 rounded-full bg-green-400/80"></div>
                </div>
                <div class="hidden sm:flex text-[10px] text-surface-400 font-mono bg-white dark:bg-surface-800 px-3 py-1 rounded-md border border-surface-200 dark:border-surface-700">
                    KMind.co.mz/aluno
                </div>
                <div class="w-10"></div> 
            </div>

            <div class="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 h-full bg-surface-50/30 dark:bg-surface-950">
                <div class="md:col-span-2 space-y-4 flex flex-col justify-center">
                    <div class="bg-white dark:bg-surface-800 rounded-xl p-5 border border-surface-200 dark:border-surface-700 shadow-sm flex items-center justify-between relative overflow-hidden group">
                        <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary-50 to-transparent dark:from-primary-900/20 opacity-50"></div>
                        <div class="relative z-10">
                            <h3 class="font-bold text-surface-900 dark:text-white text-lg">Olá, Campeão! 👋</h3>
                            <p class="text-sm text-surface-500 mb-3">Vamos continuar a missão?</p>
                            <div class="flex items-center gap-2 text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 px-3 py-1.5 rounded-lg w-fit">
                                <Zap size={14} class="fill-current" /> Modo Rush: Frações
                            </div>
                        </div>
                        <div class="relative z-10 hidden sm:flex items-center justify-center w-12 h-12 bg-primary-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform">
                            <Play size={20} class="ml-1" />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700 shadow-sm">
                            <div class="flex items-center gap-2 mb-2 text-surface-500 text-xs font-bold uppercase tracking-wider">
                                <Award size={14} class="text-amber-500" /> XP Total
                            </div>
                            <div class="text-2xl font-black text-surface-900 dark:text-white">1,250</div>
                        </div>
                        <div class="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700 shadow-sm">
                            <div class="flex items-center gap-2 mb-2 text-surface-500 text-xs font-bold uppercase tracking-wider">
                                <Target size={14} class="text-blue-500" /> Matemática
                            </div>
                            <div class="w-full bg-surface-100 dark:bg-surface-700 rounded-full h-2 mb-2">
                                <div class="bg-blue-500 h-2 rounded-full" style="width: 75%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="hidden md:flex md:col-span-1 h-full rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 p-5 flex-col gap-4">
                    <div class="flex items-center gap-3 pb-4 border-b border-surface-100 dark:border-surface-700">
                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">J</div>
                        <div>
                            <div class="text-sm font-bold text-surface-900 dark:text-white">João Silva</div>
                            <div class="text-xs text-surface-500">3ª Classe</div>
                        </div>
                    </div>
                    <div class="space-y-3">
                         <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><Zap size={14}/></div>
                            <div class="flex-1">
                                <div class="text-xs font-bold">Velocista</div>
                                <div class="w-full bg-surface-100 h-1 mt-1 rounded-full"><div class="bg-amber-500 w-4/5 h-1 rounded-full"></div></div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="relative flex-shrink-0 w-[280px] h-[580px] bg-surface-900 rounded-[3rem] border-[8px] border-surface-900 shadow-2xl animate-fade-in-up delay-500 transform lg:translate-y-12 ring-1 ring-white/10">
        
        <div class="absolute top-24 -right-3 w-1 h-16 bg-surface-800 rounded-r-md"></div>
        <div class="absolute top-24 -left-3 w-1 h-8 bg-surface-800 rounded-l-md"></div>
        <div class="absolute top-36 -left-3 w-1 h-16 bg-surface-800 rounded-l-md"></div>

        <div class="w-full h-full bg-surface-50 dark:bg-surface-950 rounded-[2.5rem] overflow-hidden flex flex-col relative">
            
            <div class="h-8 flex justify-between items-center px-6 text-[10px] font-bold text-surface-900 dark:text-white pt-2">
                <span>9:41</span>
                <div class="flex gap-1">
                    <div class="w-3 h-3"><Signal size={10} /></div>
                    <div class="w-3 h-3"><Battery size={10} /></div>
                </div>
            </div>

            <div class="flex items-center justify-between px-5 py-4">
                <div class="flex flex-col">
                    <span class="text-xs text-surface-500">Bom dia,</span>
                    <span class="text-lg font-bold text-surface-900 dark:text-white">João 👋</span>
                </div>
                <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-0.5 shadow-md">
                    <div class="w-full h-full rounded-full border-2 border-white dark:border-surface-900 flex items-center justify-center text-white font-bold text-sm">
                        J
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-5 pb-20 space-y-4 no-scrollbar">
                
                <div class="bg-primary-600 rounded-2xl p-5 text-white shadow-lg shadow-primary-500/30 relative overflow-hidden">
                    <div class="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-2 text-primary-100 text-xs font-bold uppercase tracking-wider mb-1">
                            <Zap size={12} class="fill-current" /> Modo Rush
                        </div>
                        <h3 class="text-xl font-bold mb-3">Frações</h3>
                        <button class="bg-white text-primary-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-2">
                            <Play size={12} class="fill-current" /> Jogar Agora
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-white dark:bg-surface-800 p-3 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col items-center justify-center text-center gap-1">
                        <div class="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full text-amber-500 mb-1">
                            <Award size={16} />
                        </div>
                        <span class="text-lg font-black text-surface-900 dark:text-white">1,250</span>
                        <span class="text-[10px] text-surface-400 font-bold uppercase">XP Total</span>
                    </div>
                    <div class="bg-white dark:bg-surface-800 p-3 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col items-center justify-center text-center gap-1">
                        <div class="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-500 mb-1">
                            <Flame size={16} />
                        </div>
                        <span class="text-lg font-black text-surface-900 dark:text-white">5</span>
                        <span class="text-[10px] text-surface-400 font-bold uppercase">Dias Seq.</span>
                    </div>
                </div>

                <div>
                    <h4 class="text-sm font-bold text-surface-900 dark:text-white mb-3">Continuar</h4>
                    <div class="bg-white dark:bg-surface-800 p-3 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Calculator size={18} />
                        </div>
                        <div class="flex-1">
                            <div class="text-xs font-bold text-surface-900 dark:text-white">Geometria</div>
                            <div class="w-full bg-surface-100 dark:bg-surface-700 h-1 mt-1 rounded-full">
                                <div class="bg-blue-500 w-1/2 h-1 rounded-full"></div>
                            </div>
                        </div>
                        <ChevronRight size={16} class="text-surface-400" />
                    </div>
                </div>
            </div>

            <div class="absolute bottom-0 w-full bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 px-6 py-4 flex justify-between items-center text-surface-400">
                <button class="flex flex-col items-center gap-1 text-primary-600 dark:text-primary-400">
                    <Home size={20} />
                    <span class="text-[10px] font-bold">Início</span>
                </button>
                <button class="flex flex-col items-center gap-1 hover:text-surface-600 dark:hover:text-surface-200 transition-colors">
                    <BookOpen size={20} />
                </button>
                <button class="flex flex-col items-center gap-1 hover:text-surface-600 dark:hover:text-surface-200 transition-colors">
                    <MessageSquare size={20} />
                </button>
                <button class="flex flex-col items-center gap-1 hover:text-surface-600 dark:hover:text-surface-200 transition-colors">
                    <User size={20} />
                </button>
            </div>

            <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-surface-900/20 dark:bg-white/20 rounded-full"></div>

        </div>
    </div>
</div>
    </div>
  </section>

  <section id="funcionalidades" class="py-24 px-4 bg-surface-50 dark:bg-surface-900/50 border-y border-surface-200 dark:border-surface-800">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16 max-w-2xl mx-auto">
        <h2 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white mb-4 tracking-tight">
          Tudo o que precisa para o sucesso escolar
        </h2>
        <p class="text-lg text-surface-600 dark:text-surface-400">
          Uma plataforma completa que conecta alunos, encarregados e professores.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        {#each features as feature}
          <div class="{feature.colSpan} bg-white dark:bg-surface-800 rounded-2xl p-8 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-lg transition-all group">
            <div class="w-12 h-12 rounded-xl {feature.bg} {feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svelte:component this={feature.icon} size={24} />
            </div>
            <h3 class="text-xl font-bold text-surface-900 dark:text-white mb-2">{feature.title}</h3>
            <p class="text-surface-600 dark:text-surface-400 leading-relaxed">{feature.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section id="disciplinas" class="py-24 px-4">
    <div class="max-w-5xl mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div>
            <h2 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white mb-2 tracking-tight">
              Currículo Nacional
            </h2>
            <p class="text-lg text-surface-600 dark:text-surface-400">
              Conteúdos alinhados com o programa da 3ª e 4ª classe.
            </p>
          </div>
          <a href="/register" class="text-primary-600 font-bold hover:underline flex items-center gap-1">
            Ver plano curricular <ChevronRight size={16} />
          </a>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        {#each subjects as subject}
          <div class="group bg-white dark:bg-surface-800 rounded-2xl p-8 border border-surface-200 dark:border-surface-700 hover:border-primary-500/30 hover:shadow-xl transition-all relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 {subject.bg} rounded-bl-full opacity-50 transition-transform group-hover:scale-110"></div>
            
            <div class="relative z-10">
                <div class="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-xl {subject.bg} {subject.color}">
                    <svelte:component this={subject.icon} size={28} />
                </div>
                <h3 class="text-2xl font-bold text-surface-900 dark:text-white mb-4">{subject.name}</h3>
                <div class="flex flex-wrap gap-2">
                {#each subject.topics as topic}
                    <span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-md text-sm font-medium border border-surface-200 dark:border-surface-600">
                    {topic}
                    </span>
                {/each}
                </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- <section id="depoimentos" class="py-24 px-4 bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-800">
    <div class="max-w-6xl mx-auto">
        <h2 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white mb-16 text-center tracking-tight">
            Aprovado por Famílias e Escolas
        </h2>

        <div class="grid md:grid-cols-3 gap-6">
            {#each testimonials as item}
                <div class="bg-white dark:bg-surface-800 p-8 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col h-full">
                    <div class="flex gap-1 mb-4">
                        {#each Array(item.rating) as _}
                            <Star size={16} class="fill-amber-400 text-amber-400" />
                        {/each}
                    </div>
                    <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-6 flex-1">
                        "{item.text}"
                    </p>
                    <div class="flex items-center gap-3 pt-6 border-t border-surface-100 dark:border-surface-700">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-surface-200 to-surface-300 dark:from-surface-700 dark:to-surface-600 flex items-center justify-center font-bold text-surface-600 dark:text-surface-300 text-sm">
                            {item.name.charAt(0)}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-surface-900 dark:text-white">{item.name}</p>
                            <p class="text-xs text-surface-500">{item.role}</p>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
  </section> -->

  <section class="py-24 px-4 relative overflow-hidden">
    <div class="absolute inset-0 bg-surface-900 dark:bg-surface-950"></div>
    <div class="absolute inset-0 opacity-20">
        <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-900 via-surface-900 to-surface-900"></div>
    </div>

    <div class="max-w-4xl mx-auto text-center relative z-10 space-y-8">
      <h2 class="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
        Comece hoje a transformação.
      </h2>
      <p class="text-xl text-surface-300 max-w-2xl mx-auto">
        Junte-se a professores e encarregados que estão a elevar o nível da educação em Moçambique.
      </p>
      
      <div class="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <a
          href="/register"
          class="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary-900/50 transition-all transform hover:-translate-y-1"
        >
          Criar Conta Gratuita
          <ChevronRight size={20} />
        </a>
      </div>
      
      <p class="text-sm text-surface-500 pt-6">
        Plataforma 100% segura • Suporte local
      </p>
    </div>
  </section>

  <footer class="bg-white dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800 pt-16 pb-8 px-4">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        <div class="col-span-2 md:col-span-1">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-6 h-6 rounded bg-primary-600 flex items-center justify-center text-white text-xs font-bold">K</div>
            <span class="font-bold text-surface-900 dark:text-white">KMind</span>
          </div>
          <p class="text-sm text-surface-500 leading-relaxed">
            Desenvolvendo o futuro através da educação e tecnologia.
          </p>
        </div>

        <div>
          <h4 class="font-bold text-surface-900 dark:text-white mb-4">Plataforma</h4>
          <ul class="space-y-2 text-sm text-surface-600 dark:text-surface-400">
            <li><a href="/login" class="hover:text-primary-600 transition-colors">Entrar</a></li>
            <li><a href="/register" class="hover:text-primary-600 transition-colors">Registar</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-bold text-surface-900 dark:text-white mb-4">Legal</h4>
          <ul class="space-y-2 text-sm text-surface-600 dark:text-surface-400">
            <li><a href="/privacy" class="hover:text-primary-600 transition-colors">Privacidade</a></li>
            <li><a href="/terms" class="hover:text-primary-600 transition-colors">Termos</a></li>
          </ul>
        </div>

        <div>
          <h4 class="font-bold text-surface-900 dark:text-white mb-4">Contacto</h4>
          <ul class="space-y-2 text-sm text-surface-600 dark:text-surface-400">
            <li>suporte@KMind.co.mz</li>
            <li>Maputo, Moçambique</li>
          </ul>
        </div>
      </div>

      <div class="border-t border-surface-200 dark:border-surface-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-surface-500">
        <p>&copy; {new Date().getFullYear()} KMind Inc.</p>
        <div class="flex gap-4">
            </div>
      </div>
    </div>
  </footer>
</div>

<style>
  .animate-fade-in-up {
    animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(20px);
  }

  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
  .delay-500 { animation-delay: 0.5s; }

  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-pulse-slow {
    animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.3; }
  }
</style>