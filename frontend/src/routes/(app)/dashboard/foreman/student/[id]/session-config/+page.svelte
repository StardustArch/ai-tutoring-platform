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
    Trophy, Clock, Users, ChevronRight
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
           const discNome = data.turma.disciplina.nome;
           config.subject = discNome;
        }
      }

      const url = `${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${studentData.classe}&studentId=${studentId}`;
      const resTopics = await apiFetch(url);
      
      if (resTopics.ok) {
        allTopicsData = await resTopics.json(); 
        updateVisibleTopics();
      }

    } catch (err) {
      console.error(err);
      notifications.send('Erro ao carregar dados.', 'error');
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
    const apiKeys = subjectMap[config.subject];
    let data = allTopicsData[apiKeys];
    
    if (!data) {
        const keyMatch = Object.keys(allTopicsData).find(k => k.toLowerCase() === config.subject.toLowerCase());
        if (keyMatch) data = allTopicsData[keyMatch];
    }

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
      notifications.send('Seleciona pelo menos um tópico!', 'warning');
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
        goto(`/dashboard/student/${studentId}/${route}/${turmaId}?sessionId=${session.id}`);
      } else {
        throw new Error('Falha ao criar sessão');
      }
    } catch (err) {
      notifications.send('Erro ao iniciar sessão.', 'error');
      isSubmitting = false;
    }
  }
</script>

<div class="max-w-7xl mx-auto p-4 md:p-6 min-h-screen pb-32 md:pb-24 animate-fade-in relative">
  
  <div class="mb-6 md:mb-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div class="flex items-start md:items-center gap-3 md:gap-4">
        <button on:click={() => history.back()} class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors shrink-0">
            <ArrowLeft size={24} class="text-surface-600 dark:text-surface-300"/>
        </button>

        <div class="min-w-0">
          <h1 class="text-xl md:text-3xl font-bold text-surface-900 dark:text-surface-50 truncate">
            Configurar Sessão
          </h1>
          <p class="text-surface-500 flex flex-wrap items-center gap-2 mt-1">
            <span class="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold px-2 py-0.5 rounded-full truncate max-w-[150px]">
              {studentName}
            </span>
            <span class="text-sm">• {studentClass}ª Classe</span>
          </p>
        </div>
      </div>
      
      {#if turmaId}
        <div class="self-start sm:self-auto bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-1.5 md:px-4 md:py-2">
          <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Users size={16} />
            <span class="text-xs md:text-sm font-medium">Sessão de Turma</span>
          </div>
        </div>
      {/if}
    </div>

    <div class="mb-6 md:mb-8">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs md:text-sm font-medium text-surface-600 dark:text-surface-400">Progresso</span>
        <span class="text-xs md:text-sm font-bold text-primary-600">
          {Math.round((config.selectedTopics.length / Math.max(visibleTopics.length, 1)) * 100)}%
        </span>
      </div>
      <div class="h-1.5 md:h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
          style="width: {Math.min(100, (config.selectedTopics.length / Math.max(visibleTopics.length, 1)) * 100)}%"
        ></div>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="h-[50vh] w-full flex flex-col items-center justify-center gap-4 animate-pulse">
      <div class="relative">
        <div class="w-16 h-16 border-4 border-primary-500/20 rounded-full"></div>
        <div class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
      </div>
      <p class="text-surface-500 font-medium text-sm">A carregar conteúdos...</p>
    </div>
  {:else}
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8">
      
      <div class="space-y-5 md:space-y-6">
        
        <div class="bg-gradient-to-br from-white to-surface-50 dark:from-surface-800 dark:to-surface-900 p-4 md:p-5 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-lg">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Target size={18} class="text-primary-600 dark:text-primary-400" />
            </div>
            <h3 class="font-bold text-base md:text-lg text-surface-900 dark:text-white">Detalhes</h3>
          </div>
          
          <div class="space-y-2.5">
            <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
              <span class="text-xs md:text-sm text-surface-600 dark:text-surface-400">Modo</span>
              <span class="text-sm md:text-base font-bold {config.mode === 'TUTOR' ? 'text-blue-600' : 'text-amber-600'}">
                {config.mode === 'TUTOR' ? 'Tutor' : 'Rush'}
              </span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
              <span class="text-xs md:text-sm text-surface-600 dark:text-surface-400">Disciplina</span>
              <span class="text-sm md:text-base font-bold text-surface-900 dark:text-white truncate max-w-[150px]">{config.subject}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
              <span class="text-xs md:text-sm text-surface-600 dark:text-surface-400">Selecionados</span>
              <span class="text-sm md:text-base font-bold text-primary-600">{config.selectedTopics.length}</span>
            </div>
          </div>
        </div>

        {#if !turmaId}
          <div class="bg-white dark:bg-surface-800 p-4 md:p-5 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-lg">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <BookOpen size={18} class="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 class="font-bold text-base md:text-lg text-surface-900 dark:text-white">Disciplina</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              {#each availableSubjects as sub}
                <button 
                  class="group relative p-3 md:p-4 rounded-xl border-2 transition-all duration-300 overflow-hidden text-left
                         {config.subject === sub 
                           ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg scale-[1.02]' 
                           : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 hover:border-primary-300'}"
                  on:click={() => changeSubject(sub)}
                >
                  <div class="relative z-10">
                    <div class="font-bold text-sm md:text-base text-surface-900 dark:text-white mb-0.5">{sub}</div>
                  </div>
                  {#if config.subject === sub}
                    <div class="absolute right-2 top-2 md:right-3 md:top-3 text-primary-500">
                      <CheckCircle2 size={16} class="md:w-5 md:h-5" />
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="bg-white dark:bg-surface-800 p-4 md:p-5 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-lg">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Layers size={18} class="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 class="font-bold text-base md:text-lg text-surface-900 dark:text-white">Modo de Estudo</h3>
          </div>
          
          <div class="space-y-3 md:space-y-4">
            <button 
              class="group w-full p-3 md:p-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden
                     {config.mode === 'TUTOR' 
                       ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 shadow-lg' 
                       : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50'}"
              on:click={() => config.mode = 'TUTOR'}
            >
              <div class="flex items-start gap-3 md:gap-4">
                <div class="p-2 md:p-3 rounded-lg flex-shrink-0 {config.mode === 'TUTOR' ? 'bg-blue-500 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-500'}">
                  <Brain size={20} class="md:w-6 md:h-6" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-base md:text-lg text-surface-900 dark:text-white mb-0.5">Modo Tutor</div>
                  <div class="text-xs md:text-sm text-surface-600 dark:text-surface-400 mb-2 leading-tight">
                    Aprendizagem guiada com explicações.
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-xs">
                    <span class="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Clock size={12} /> 15m+
                    </span>
                    <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Sparkles size={12} /> Detalhado
                    </span>
                  </div>
                </div>
              </div>
              {#if config.mode === 'TUTOR'}
                <div class="absolute right-3 top-3 text-blue-500">
                  <CheckCircle2 size={20} />
                </div>
              {/if}
            </button>

            <button 
              class="group w-full p-3 md:p-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden
                     {config.mode === 'RUSH' 
                       ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 shadow-lg' 
                       : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50'}"
              on:click={() => config.mode = 'RUSH'}
            >
              <div class="flex items-start gap-3 md:gap-4">
                <div class="p-2 md:p-3 rounded-lg flex-shrink-0 {config.mode === 'RUSH' ? 'bg-amber-500 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-500'}">
                  <Zap size={20} class="md:w-6 md:h-6" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-base md:text-lg text-surface-900 dark:text-white mb-0.5">Modo Rush</div>
                  <div class="text-xs md:text-sm text-surface-600 dark:text-surface-400 mb-2 leading-tight">
                    Quiz rápido com tempo limitado.
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-xs">
                    <span class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Clock size={12} /> 5m+
                    </span>
                    <span class="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <Trophy size={12} /> XP Bônus
                    </span>
                  </div>
                </div>
              </div>
              {#if config.mode === 'RUSH'}
                <div class="absolute right-3 top-3 text-amber-500">
                  <CheckCircle2 size={20} />
                </div>
              {/if}
            </button>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-lg overflow-hidden flex flex-col h-full">
          
          <div class="p-4 md:p-5 border-b border-surface-100 dark:border-surface-700 bg-gradient-to-r from-surface-50 to-white dark:from-surface-900 dark:to-surface-800">
            <div class="flex flex-col gap-3">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-bold text-lg md:text-xl text-surface-900 dark:text-white mb-1">
                    Conteúdos
                  </h3>
                  <p class="text-xs md:text-sm text-surface-600 dark:text-surface-400">
                    {#if visibleTopics.length > 0}
                      Selecione para estudar
                    {:else}
                      Sem conteúdos
                    {/if}
                  </p>
                </div>
                
                <div class="flex items-center gap-2">
                  <button 
                    on:click={selectAll}
                    class="text-xs md:text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {config.selectedTopics.length === visibleTopics.length && visibleTopics.length > 0 ? 'Limpar' : 'Todos'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="p-3 md:p-5 flex-1">
            {#if visibleTopics.length === 0}
              <div class="text-center py-12 px-4">
                <div class="w-14 h-14 mx-auto mb-4 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center">
                  <BookOpen size={28} class="text-surface-400 dark:text-surface-500"/>
                </div>
                <h4 class="text-base font-bold text-surface-700 dark:text-surface-300 mb-2">
                  Sem tópicos disponíveis
                </h4>
                <p class="text-sm text-surface-500 max-w-xs mx-auto mb-4">
                  Não há conteúdos de {config.subject} para a {studentClass}ª classe.
                </p>
                {#if !turmaId}
                  <div class="flex gap-2 justify-center flex-wrap">
                    {#each availableSubjects.filter(s => s !== config.subject) as sub}
                      <button 
                        on:click={() => changeSubject(sub)}
                        class="text-xs bg-surface-100 hover:bg-surface-200 dark:bg-surface-700 px-3 py-2 rounded-lg transition-colors"
                      >
                        Mudar para {sub}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each visibleTopics as topic (topic.id)}
                  <button 
                    on:click={() => toggleTopic(topic.id)}
                    class="group relative p-3 md:p-4 rounded-xl border-2 transition-all duration-200 text-left w-full
                          {config.selectedTopics.includes(topic.id) 
                            ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100/30 dark:from-primary-900/20 dark:to-primary-900/10 shadow-md' 
                            : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/30 active:bg-surface-100'}"
                  >
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 mt-0.5">
                        <div class="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors
                                  {config.selectedTopics.includes(topic.id) 
                                    ? 'bg-primary-500 text-white' 
                                    : 'bg-surface-200 dark:bg-surface-700 text-surface-500 group-hover:bg-primary-100 group-hover:text-primary-600'}">
                          {#if config.selectedTopics.includes(topic.id)}
                            <CheckCircle2 size={18} class="fill-current md:w-5 md:h-5" />
                          {:else}
                            <Circle size={18} class="md:w-5 md:h-5" />
                          {/if}
                        </div>
                      </div>
                      
                      <div class="flex-1 min-w-0 pr-6">
                        <h4 class="font-bold text-sm md:text-base text-surface-900 dark:text-white mb-1 leading-snug break-words">
                          {topic.nome}
                        </h4>
                        <div class="flex flex-wrap items-center gap-2 text-[10px] md:text-xs">
                          <span class="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 px-1.5 py-0.5 rounded">
                            Nível {topic.nivelClasse}
                          </span>
                          {#if topic.complexidade}
                            <span class="text-surface-500 flex items-center gap-1">
                              <span class="w-1.5 h-1.5 rounded-full {topic.complexidade === 'alta' ? 'bg-rose-500' : topic.complexidade === 'media' ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
                              {topic.complexidade}
                            </span>
                          {/if}
                        </div>
                      </div>
                    </div>
                    
                    {#if topic.dificuldade}
                      <div class="absolute top-3 right-3">
                        {#if topic.dificuldade === 'alta'}
                          <span class="text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-1.5 py-0.5 rounded">Difícil</span>
                        {:else if topic.dificuldade === 'media'}
                          <span class="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded">Médio</span>
                        {:else}
                          <span class="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 rounded">Fácil</span>
                        {/if}
                      </div>
                    {/if}
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

<div class="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-surface-900/95 backdrop-blur-md border-t border-surface-200 dark:border-surface-700 pb-safe">
  <div class="max-w-6xl mx-auto px-4 py-3 md:py-4">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
      
      <div class="text-center sm:text-left hidden sm:block">
        <div class="text-xs text-surface-500 mb-0.5">Resumo</div>
        <div class="font-bold text-sm md:text-base text-surface-900 dark:text-white">
          {#if config.selectedTopics.length > 0}
            {config.selectedTopics.length} selecionados
          {:else}
            Selecione tópicos
          {/if}
        </div>
      </div>
      
      <button 
        on:click={startSession}
        disabled={isSubmitting || config.selectedTopics.length === 0}
        class="w-full sm:w-auto relative group bg-gradient-to-r from-primary-500 to-primary-600 active:from-primary-600 active:to-primary-700 text-white font-bold rounded-xl md:rounded-full px-6 py-3.5 md:py-4 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 md:gap-3"
      >
        {#if isSubmitting}
          <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="text-base">A preparar...</span>
        {:else}
          <Play size={20} class="fill-current" />
          <span class="text-base md:text-lg uppercase tracking-wide">
            {config.mode === 'RUSH' ? 'Iniciar Rush' : 'Iniciar Aula'}
          </span>
        {/if}
        
        {#if config.selectedTopics.length > 0 && !isSubmitting}
          <span class="ml-1 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {config.selectedTopics.length}
          </span>
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  /* Padding safe area para iPhone X+ */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 20px);
  }
</style>