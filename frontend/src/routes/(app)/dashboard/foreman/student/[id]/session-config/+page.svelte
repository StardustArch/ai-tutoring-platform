<svelte:head>
    <title>Configurar Sessão | KaniMente</title>
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

	Loader

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
  
  const subjectMap: Record<string, string> = {
    'Matemática': 'matematica',
    'Português': 'portugues'
  };
  
  let availableSubjects = ['Matemática', 'Português'];
  
  let config = {
    mode: 'TUTOR' as 'TUTOR' | 'RUSH', 
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
    visibleTopics = data || [];
  }

  function toggleTopic(id: number) {
    if (config.selectedTopics.includes(id)) {
      config.selectedTopics = config.selectedTopics.filter(t => t !== id);
    } else {
      config.selectedTopics = [...config.selectedTopics, id];
    }
  }

  function selectAll() {
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

  // Estilos Comuns
  const labelStyle = "text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-3 block";
</script>

<div class="container mx-auto max-w-7xl p-4 md:p-8 pb-32 animate-fade-in relative">
  
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

        <div class="bg-white dark:bg-surface-800 p-6 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
          <span class={labelStyle}>Modo de Aprendizagem</span>
          
          <div class="space-y-3">
            <button 
              class="w-full text-left rounded-lg border transition-all p-4 group
                     {config.mode === 'TUTOR' 
                       ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/10' 
                       : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}"
              on:click={() => config.mode = 'TUTOR'}
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

            <button 
              class="w-full text-left rounded-lg border transition-all p-4 group
                     {config.mode === 'RUSH' 
                       ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/30 dark:bg-amber-900/10' 
                       : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'}"
              on:click={() => config.mode = 'RUSH'}
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
          </div>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col h-full overflow-hidden">
          
          <div class="p-5 border-b border-surface-100 dark:border-surface-700 flex justify-between items-center bg-surface-50/50 dark:bg-surface-900/20">
            <div>
              <h3 class="font-bold text-sm text-surface-900 dark:text-white uppercase tracking-tight">Conteúdos Disponíveis</h3>
              <p class="text-[11px] text-surface-500 mt-0.5">
                {config.selectedTopics.length} selecionados de {visibleTopics.length}
              </p>
            </div>
            
            <button 
                on:click={selectAll}
                class="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
            >
                {config.selectedTopics.length === visibleTopics.length && visibleTopics.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
          </div>

          <div class="p-6">
            {#if visibleTopics.length === 0}
              <div class="py-20 text-center">
                <BookOpen size={32} class="mx-auto text-surface-200 mb-3"/>
                <p class="text-sm text-surface-500">Nenhum tópico disponível para esta classe.</p>
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each visibleTopics as topic (topic.id)}
                  <button 
                    on:click={() => toggleTopic(topic.id)}
                    class="p-3 rounded-md border transition-all text-left flex items-center gap-3
                          {config.selectedTopics.includes(topic.id) 
                            ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/10' 
                            : 'border-surface-200 dark:border-surface-700 hover:border-surface-400 bg-white dark:bg-surface-800'}"
                  >
                    <div class="shrink-0 text-primary-500">
                        {#if config.selectedTopics.includes(topic.id)}
                            <CheckCircle2 size={18} class="fill-primary-500 text-white" />
                        {:else}
                            <Circle size={18} class="text-surface-300" />
                        {/if}
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm text-surface-800 dark:text-white truncate">
                            {topic.nome}
                        </h4>
                        {#if topic.complexidade}
                            <span class="text-[9px] font-black uppercase text-surface-400 tracking-tighter">
                                Nível: {topic.complexidade}
                            </span>
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

<div class="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-t border-surface-200 dark:border-surface-700 pb-safe">
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
    
    <div class="hidden sm:block">
        <div class="flex items-center gap-4">
            <div>
                <span class="text-[10px] font-bold text-surface-400 uppercase block">Modo</span>
                <span class="text-xs font-bold text-surface-900 dark:text-white">{config.mode === 'TUTOR' ? 'Tutor Individual' : 'Revisão Rush'}</span>
            </div>
            <div class="w-px h-8 bg-surface-200 dark:border-surface-700"></div>
            <div>
                <span class="text-[10px] font-bold text-surface-400 uppercase block">Tópicos</span>
                <span class="text-xs font-bold text-surface-900 dark:text-white">{config.selectedTopics.length} selecionados</span>
            </div>
        </div>
    </div>
    
    <button 
        on:click={startSession}
        disabled={isSubmitting || config.selectedTopics.length === 0}
        class="w-full sm:w-auto min-w-[220px] btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-md shadow-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50"
    >
        {#if isSubmitting}
            <Loader size={18} class="animate-spin" />
            <span>A preparar...</span>
        {:else}
            <Play size={18} class="fill-current" />
            <span class="uppercase tracking-widest text-xs">Iniciar Sessão de Estudo</span>
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