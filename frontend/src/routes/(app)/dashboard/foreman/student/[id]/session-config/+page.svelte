<svelte:head>
    <title>Configurar Sessão | KMind</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  import { 
    Brain, Zap, ArrowLeft, CheckCircle2, Circle, 
    BookOpen, Layers, Play, Target, Sparkles, 
    Clock, Users, Check, ChevronRight,
    Loader, GraduationCap, Star, RotateCcw
  } from 'lucide-svelte';

  // --- PARÂMETROS ---
  let studentId = $page.params.id || '';
  let turmaId = $page.url.searchParams.get('turmaId');

  // --- ESTADO ---
  let isLoading = true;
  let isSubmitting = false;
  let studentName = '';
  let studentClass = '';
  
  let allTopicsData: Record<string, any[]> = {}; 
  let visibleTopics: any[] = [];

  // histórico de lições: topicoId → { tentativas, melhorPontuacao, totalSlots, temActiva }
  let licaoHistorico: Record<number, { tentativas: number; melhorPontuacao: number | null; totalSlots: number | null; temActiva: boolean }> = {};
  
  const subjectMap: Record<string, string> = {
    'Matemática': 'matematica',
    'Português': 'portugues'
  };
  
  let availableSubjects = ['Matemática', 'Português'];
  
  let config = {
    mode: 'TUTOR' as 'TUTOR' | 'RUSH' | 'LESSON',
    subject: 'Matemática',
    turmaId: turmaId ? parseInt(turmaId) : null,
    selectedTopics: [] as number[]
  };

  onMount(async () => {
    await loadContext();
  });

  async function loadContext() {
    isLoading = true;
    try {
      const resAluno = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
      if (!resAluno.ok) throw new Error('Erro ao carregar aluno');
      const studentData = await resAluno.json();
      studentName = studentData.nome;
      studentClass = studentData.classe;

      if (turmaId) {
        const resTurma = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${turmaId}`);
        if (resTurma.ok) {
           const data = await resTurma.json();
           config.subject = data.disciplina?.nome || data.disciplina || 'Matemática';
        }
      }

      const url = `${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${studentData.classe}&studentId=${studentId}&classId=${turmaId || ''}`;
      const resTopics = await apiFetch(url);
      if (resTopics.ok) {
        allTopicsData = await resTopics.json(); 
        updateVisibleTopics();
      }

    } catch (err) {
      notifications.send('Erro ao carregar contexto de estudo.', 'error');
    } finally {
      isLoading = false;
    }
  }

  function changeSubject(sub: string) {
    if (turmaId) return;
    config.subject = sub;
    config.selectedTopics = []; 
    updateVisibleTopics();
  }

  function updateVisibleTopics() {
    const apiKey = subjectMap[config.subject] || Object.keys(allTopicsData).find(k => k.toLowerCase() === config.subject.toLowerCase());
    const data = apiKey ? allTopicsData[apiKey] : (Object.values(allTopicsData)[0] || []);
    // No modo LESSON só mostra tópicos que têm lesson_plan configurado
    if (config.mode === 'LESSON') {
      visibleTopics = (data || []).filter((t: any) => t.metadata?.lesson_plan?.length > 0);
    } else {
      visibleTopics = data || [];
    }
  }

  function setMode(mode: 'TUTOR' | 'RUSH' | 'LESSON') {
    config.mode = mode;
    config.selectedTopics = [];
    updateVisibleTopics();
    if (mode === 'LESSON') loadHistorico();
  }

  async function loadHistorico() {
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/lesson/historico/${studentId}`);
      if (res.ok) licaoHistorico = await res.json();
      console.log(licaoHistorico)
    } catch (_) {}
  }

  // helpers de display
  function estrelas(melhor: number | null, total: number | null): number {
    if (melhor === null || total === null || total === 0) return 0;
    return Math.round((melhor / total) * 5);
  }

  function notaLabel(melhor: number | null, total: number | null): string {
    if (melhor === null || total === null) return '';
    return `${melhor}/${total}`;
  }

  function toggleTopic(id: number) {
    // No modo LESSON só permite 1 tópico de cada vez (cada lição é por tópico)
    if (config.mode === 'LESSON') {
      config.selectedTopics = config.selectedTopics.includes(id) ? [] : [id];
      return;
    }
    if (config.selectedTopics.includes(id)) {
      config.selectedTopics = config.selectedTopics.filter(t => t !== id);
    } else {
      config.selectedTopics = [...config.selectedTopics, id];
    }
  }

  function selectAll() {
    if (config.mode === 'LESSON') return; // no modo lição só 1 tópico
    if (config.selectedTopics.length === visibleTopics.length) {
      config.selectedTopics = [];
    } else {
      config.selectedTopics = visibleTopics.map(t => t.id);
    }
  }

  async function startSession() {
    if (config.selectedTopics.length === 0) {
      notifications.send('Selecione pelo menos um tópico para começar.', 'warning');
      return;
    }

    isSubmitting = true;
    try {
      // Modo LESSON tem rota própria — não cria SessaoEstudo aqui, o LicaoService cria internamente
      if (config.mode === 'LESSON') {
        const topicoId = config.selectedTopics[0];
        const topico = visibleTopics.find(t => t.id === topicoId);
        const topicoNome = encodeURIComponent(topico?.nome || '');
        const turmaParam = turmaId ? `&turmaId=${turmaId}` : '';
        goto(`/dashboard/student/${studentId}/rush/${turmaId || 'autonomous'}/lesson?topicoId=${topicoId}&topico=${topicoNome}${turmaParam}`);
        return;
      }

      // Modos TUTOR e RUSH criam sessão normalmente
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/start`, {
        method: 'POST',
        body: JSON.stringify({
          alunoId: parseInt(studentId),
          turmaId: config.turmaId,
          modo: config.mode,
          topicosIds: config.selectedTopics,
          disciplina: config.subject
        })
      });

      if (res.ok) {
        const session = await res.json();
        const route = config.mode === 'TUTOR' ? 'chat' : 'rush';
        goto(`/dashboard/student/${studentId}/${route}/${turmaId || 'autonomous'}?sessionId=${session.id}`);
      } else {
        throw new Error();
      }
    } catch (err) {
      notifications.send('Erro ao iniciar a sessão.', 'error');
      isSubmitting = false;
    }
  }

  const labelStyle = "text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-3 block";

  // Etiqueta do botão de início consoante o modo
  $: startLabel = config.mode === 'TUTOR' ? 'Iniciar Tutor'
                : config.mode === 'RUSH'  ? 'Iniciar Rush'
                : 'Iniciar Lição';
</script>

<div class="container mx-auto max-w-7xl p-4 md:p-8 pb-64 md:pb-32 animate-fade-in relative">  
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-surface-200 dark:border-surface-700 pb-4">
    <div class="flex items-center gap-4">
      <button on:click={() => history.back()} class="p-2 -ml-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors shrink-0 border border-transparent hover:border-surface-200">
          <ArrowLeft size={20} class="text-surface-600 dark:text-surface-300"/>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
          Configurar Sessão
        </h1>
        <p class="text-sm text-surface-500 mt-1">
          Preparando estudo para <span class="font-bold text-surface-900 dark:text-surface-100">{studentName}</span> ({studentClass}ª Classe)
        </p>
      </div>
    </div>
    
    {#if turmaId}
      <div class="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded px-3 py-1.5 flex items-center gap-2">
        <Users size={14} class="text-primary-600 dark:text-primary-400" />
        <span class="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider">Vínculo Escolar Ativo</span>
      </div>
    {/if}
  </div>

  {#if isLoading}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
        <div class="lg:col-span-2 h-96 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
    </div>
  {:else}
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <div class="space-y-6">
        
        <!-- Disciplina -->
        <div class="bg-white dark:bg-surface-800 p-6 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
          <span class={labelStyle}>Disciplina</span>
          
          {#if !turmaId}
            <div class="flex flex-col gap-2">
              {#each availableSubjects as sub}
                <button 
                  class="w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all border flex items-center justify-between
                         {config.subject === sub 
                           ? 'bg-surface-900 text-white border-surface-900 dark:bg-surface-100 dark:text-surface-900' 
                           : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-surface-400'}"
                  on:click={() => changeSubject(sub)}
                >
                  {sub}
                  {#if config.subject === sub} <Check size={14} /> {/if}
                </button>
              {/each}
            </div>
          {:else}
            <div class="p-3 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-surface-700 rounded-md">
                <p class="text-sm font-bold text-surface-900 dark:text-white">{config.subject}</p>
                <p class="text-[10px] text-surface-500 uppercase mt-1">Definido pela turma</p>
            </div>
          {/if}
        </div>

        <!-- Modo de Aprendizagem -->
        <div class="bg-white dark:bg-surface-800 p-6 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
          <span class={labelStyle}>Modo de Aprendizagem</span>
          
          <div class="space-y-3">
            <!-- TUTOR -->
            <button 
              class="w-full text-left rounded-lg border transition-all p-4
                     {config.mode === 'TUTOR' 
                       ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/10' 
                       : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}"
              on:click={() => setMode('TUTOR')}
            >
              <div class="flex items-start gap-3">
                <div class="p-2 rounded {config.mode === 'TUTOR' ? 'bg-blue-500 text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'}">
                  <Brain size={20} />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-sm text-surface-900 dark:text-white">Modo Tutor</h4>
                  <p class="text-[11px] text-surface-500 mt-1 leading-tight">Guiado por IA. Ideal para novos temas.</p>
                </div>
              </div>
            </button>

            <!-- RUSH -->
            <button 
              class="w-full text-left rounded-lg border transition-all p-4
                     {config.mode === 'RUSH' 
                       ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/30 dark:bg-amber-900/10' 
                       : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}"
              on:click={() => setMode('RUSH')}
            >
              <div class="flex items-start gap-3">
                <div class="p-2 rounded {config.mode === 'RUSH' ? 'bg-amber-500 text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'}">
                  <Zap size={20} />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-sm text-surface-900 dark:text-white">Modo Rush</h4>
                  <p class="text-[11px] text-surface-500 mt-1 leading-tight">Revisão rápida. Ideal para ganhar XP.</p>
                </div>
              </div>
            </button>

            <!-- LESSON -->
            <button 
              class="w-full text-left rounded-lg border transition-all p-4
                     {config.mode === 'LESSON' 
                       ? 'border-sky-500 ring-1 ring-sky-500 bg-sky-50/30 dark:bg-sky-900/10' 
                       : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}"
              on:click={() => setMode('LESSON')}
            >
              <div class="flex items-start gap-3">
                <div class="p-2 rounded {config.mode === 'LESSON' ? 'bg-sky-500 text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'}">
                  <GraduationCap size={20} />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-sm text-surface-900 dark:text-white">Modo Lição</h4>
                  <p class="text-[11px] text-surface-500 mt-1 leading-tight">Sequência guiada. Erros revistos no fim.</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de tópicos -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col h-full overflow-hidden">
          
          <div class="p-5 border-b border-surface-100 dark:border-surface-700 flex justify-between items-center bg-surface-50/50 dark:bg-surface-900/20">
            <div>
              <h3 class="font-bold text-sm text-surface-900 dark:text-white uppercase tracking-tight">Conteúdos Disponíveis</h3>
              <p class="text-[11px] text-surface-500 mt-0.5">
                {#if config.mode === 'LESSON'}
                  Escolhe 1 tópico para a lição
                {:else}
                  {config.selectedTopics.length} selecionados de {visibleTopics.length}
                {/if}
              </p>
            </div>
            
            {#if config.mode !== 'LESSON'}
              <button 
                  on:click={selectAll}
                  class="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
              >
                  {config.selectedTopics.length === visibleTopics.length && visibleTopics.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            {/if}
          </div>

          <div class="p-6">
            {#if visibleTopics.length === 0}
              <div class="py-20 text-center">
                <BookOpen size={32} class="mx-auto text-surface-200 mb-3"/>
                {#if config.mode === 'LESSON'}
                  <p class="text-sm text-surface-500">Nenhum tópico tem plano de lição configurado ainda.</p>
                {:else}
                  <p class="text-sm text-surface-500">Nenhum tópico disponível para esta classe.</p>
                {/if}
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
{#each visibleTopics as topic (topic.id)}
                  {@const isLesson = config.mode === 'LESSON'}
                  {@const hist = isLesson ? licaoHistorico[topic.id] : null}
                  {@const feita = isLesson && hist && hist.tentativas > 0}
                  {@const activa = isLesson && hist?.temActiva}
                  {@const nEstrelas = isLesson ? estrelas(hist?.melhorPontuacao ?? null, hist?.totalSlots ?? null) : 0}
                  
                  <button 
                    on:click={() => toggleTopic(topic.id)}
                    class="p-3 rounded-md border transition-all text-left flex items-start gap-3
                          {config.selectedTopics.includes(topic.id) 
                            ? (isLesson ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-900/10' : 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/10')
                            : feita
                              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10 hover:border-emerald-400'
                              : 'border-surface-200 dark:border-surface-700 hover:border-surface-400 bg-white dark:bg-surface-800'}"
                  >
                    <div class="shrink-0 mt-0.5">
                      {#if config.selectedTopics.includes(topic.id)}
                        <CheckCircle2 size={18} class="{isLesson ? 'fill-sky-500' : 'fill-primary-500'} text-white" />
                      {:else if feita}
                        <CheckCircle2 size={18} class="fill-emerald-400 text-white" />
                      {:else}
                        <Circle size={18} class="text-surface-300" />
                      {/if}
                    </div>

                    <div class="flex-1 min-w-0">
                      <h4 class="font-bold text-sm text-surface-800 dark:text-white truncate">
                        {topic.nome}
                      </h4>

                      {#if isLesson}
                          {#if feita}
                            <div class="flex items-center gap-1.5 mt-1">
                              <div class="flex gap-0.5">
                                {#each Array(5) as _, i}
                                  <Star 
                                    size={11} 
                                    class="{i < nEstrelas ? 'fill-amber-400 text-amber-400' : 'text-surface-300 dark:text-surface-600'}"
                                  />
                                {/each}
                              </div>
                              <span class="text-[10px] font-bold text-surface-500">
                                {notaLabel(hist?.melhorPontuacao ?? null, hist?.totalSlots ?? null)}
                              </span>
                              {#if hist && hist.tentativas > 1}
                                <span class="text-[9px] text-surface-400 flex items-center gap-0.5">
                                  <RotateCcw size={9} />
                                  {hist.tentativas}×
                                </span>
                              {/if}
                            </div>
                          {:else if activa}
                            <span class="text-[9px] font-bold uppercase tracking-wider text-sky-500 mt-1 block">
                              Em curso…
                            </span>
                          {:else if topic.metadata?.lesson_plan}
                            <span class="text-[9px] font-bold uppercase tracking-wider text-surface-400 mt-0.5 block">
                              {topic.metadata.lesson_plan.length} slots
                            </span>
                          {/if}
                      {:else}
                          {#if topic.complexidade}
                            <span class="text-[9px] font-black uppercase text-surface-400 tracking-tighter block mt-0.5">
                              Nível: {topic.complexidade}
                            </span>
                          {/if}
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Barra de acção fixa -->
<div class="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-surface-900/90 backdrop-blur-md border-t border-surface-200 dark:border-surface-700 p-4 md:pb-safe transition-all">
  <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
    
    <div class="hidden sm:block">
        <div class="flex items-center gap-4">
            <div>
                <span class="text-[10px] font-bold text-surface-400 uppercase block">Modo</span>
                <span class="text-xs font-bold text-surface-900 dark:text-surface-100">
                  {config.mode === 'TUTOR' ? 'Tutor Individual' : config.mode === 'RUSH' ? 'Revisão Rush' : 'Lição Guiada'}
                </span>
            </div>
            <div class="w-px h-8 bg-surface-200 dark:bg-surface-700"></div>
            <div>
                <span class="text-[10px] font-bold text-surface-400 uppercase block">
                  {config.mode === 'LESSON' ? 'Tópico' : 'Tópicos'}
                </span>
                <span class="text-xs font-bold text-surface-900 dark:text-surface-100">
                  {config.selectedTopics.length} selecionado{config.selectedTopics.length !== 1 ? 's' : ''}
                </span>
            </div>
        </div>
    </div>
    
    <button 
        on:click={startSession}
        disabled={isSubmitting || config.selectedTopics.length === 0}
        class="w-full sm:w-auto min-w-[220px] btn font-bold py-3.5 md:py-3 rounded-md shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:shadow-none active:scale-[0.98]
               {config.mode === 'TUTOR'  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/10'
              : config.mode === 'RUSH'   ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/10'
              : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-900/10'}"
    >
        {#if isSubmitting}
            <Loader size={18} class="animate-spin" />
            <span>A preparar...</span>
        {:else}
            {#if config.mode === 'LESSON'}
              <GraduationCap size={18} />
            {:else}
              <Play size={18} class="fill-current" />
            {/if}
            <span class="uppercase tracking-widest text-xs">{startLabel}</span>
        {/if}
    </button>
  </div>
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>