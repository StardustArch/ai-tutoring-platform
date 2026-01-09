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
  
  // Cache: { "matematica": [...], "portugues": [...] }
  let allTopicsData: Record<string, any[]> = {}; 
  
  // O que está visível no momento
  let visibleTopics: any[] = [];
  
  // Mapeamento: Nome Visual -> Chave da API
  const subjectMap: Record<string, string> = {
    'Matemática': 'matematica',
    'Português': 'portugues'
  };
  
  let availableSubjects = ['Matemática', 'Português'];
  
  let config = {
    mode: 'TUTOR' as 'TUTOR' | 'RUSH', 
    subject: 'Matemática', // Nome Visual (Default)
    turmaId: turmaId ? parseInt(turmaId) : null,
    selectedTopics: [] as number[]
  };

  onMount(async () => {
    await loadContext();
  });

  async function loadContext() {
    isLoading = true;
    try {
      // 1. Dados do Aluno (Necessário para saber a classe)
      const resAluno = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
      if (!resAluno.ok) throw new Error('Erro ao carregar aluno');
      const studentData = await resAluno.json();
      studentName = studentData.nome;
      studentClass = studentData.classe;

      // 2. Se temos Turma, precisamos saber a disciplina dela para bloquear a UI
      if (turmaId) {
        const resTurma = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${turmaId}`);
        if (resTurma.ok) {
           const data = await resTurma.json();
           const discNome = data.turma.disciplina.nome;
           config.subject = discNome;
        }
      }

      // 3. Fetch dos Tópicos
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

<div class="max-w-7xl mx-auto p-4 md:p-6 min-h-screen pb-28 md:pb-24 animate-fade-in relative">
  
  <!-- HEADER -->
  <div class="mb-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-4">
              <button on:click={() => history.back()} class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
            <ArrowLeft size={24} class="text-surface-600 dark:text-surface-300"/>
        </button>

        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-50">
            Configurar Sessão de Estudo
          </h1>
          <p class="text-surface-500 flex items-center gap-2">
            <span class="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold px-2 py-1 rounded-full">
              {studentName}
            </span>
            <span>• {studentClass}ª Classe</span>
          </p>
        </div>
      </div>
      
      {#if turmaId}
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2">
          <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Users size={16} />
            <span class="text-sm font-medium">Sessão de Turma</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- PROGRESS BAR -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-surface-600 dark:text-surface-400">Progresso da Configuração</span>
        <span class="text-sm font-bold text-primary-600">
          {Math.round((config.selectedTopics.length / Math.max(visibleTopics.length, 1)) * 100)}%
        </span>
      </div>
      <div class="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
          style="width: {Math.min(100, (config.selectedTopics.length / Math.max(visibleTopics.length, 1)) * 100)}%"
        ></div>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="h-[60vh] w-full flex flex-col items-center justify-center gap-4 animate-pulse">
      <div class="relative">
        <div class="w-20 h-20 border-4 border-primary-500/20 rounded-full"></div>
        <div class="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
      </div>
      <p class="text-surface-500 font-medium">A carregar conteúdos disponíveis...</p>
    </div>
  {:else}
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
      
      <!-- COLUNA ESQUERDA - CONFIGURAÇÕES -->
      <div class="space-y-6">
        
        <!-- CARTÃO: INFORMAÇÕES DA SESSÃO -->
        <div class="bg-gradient-to-br from-white to-surface-50 dark:from-surface-800 dark:to-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-lg">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Target size={20} class="text-primary-600 dark:text-primary-400" />
            </div>
            <h3 class="font-bold text-lg text-surface-900 dark:text-white">Detalhes da Missão</h3>
          </div>
          
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
              <span class="text-sm text-surface-600 dark:text-surface-400">Modo</span>
              <span class="font-bold {config.mode === 'TUTOR' ? 'text-blue-600' : 'text-amber-600'}">
                {config.mode === 'TUTOR' ? 'Tutor' : 'Rush'}
              </span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
              <span class="text-sm text-surface-600 dark:text-surface-400">Disciplina</span>
              <span class="font-bold text-surface-900 dark:text-white">{config.subject}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-lg">
              <span class="text-sm text-surface-600 dark:text-surface-400">Tópicos</span>
              <span class="font-bold text-primary-600">{config.selectedTopics.length} selecionados</span>
            </div>
          </div>
        </div>

        <!-- CARTÃO: ESCOLHER DISCIPLINA -->
        {#if !turmaId}
          <div class="bg-white dark:bg-surface-800 p-5 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-lg">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <BookOpen size={20} class="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 class="font-bold text-lg text-surface-900 dark:text-white">Escolher Disciplina</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              {#each availableSubjects as sub}
                <button 
                  class="group relative p-4 rounded-xl border-2 transition-all duration-300 overflow-hidden
                         {config.subject === sub 
                           ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg scale-[1.02]' 
                           : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 hover:border-primary-300 hover:bg-primary-50/50'}"
                  on:click={() => changeSubject(sub)}
                >
                  <div class="relative z-10">
                    <div class="font-bold text-surface-900 dark:text-white mb-1">{sub}</div>
                    <div class="text-xs text-surface-500">Conteúdos disponíveis</div>
                  </div>
                  {#if config.subject === sub}
                    <div class="absolute right-3 top-3 text-primary-500">
                      <CheckCircle2 size={20} />
                    </div>
                  {/if}
                  <div class="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-primary-500/0 group-hover:from-primary-500/5 group-hover:to-primary-500/10 transition-all"></div>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- CARTÃO: MODO DE ESTUDO -->
        <div class="bg-white dark:bg-surface-800 p-5 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-lg">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Layers size={20} class="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 class="font-bold text-lg text-surface-900 dark:text-white">Modo de Estudo</h3>
          </div>
          
          <div class="space-y-4">
            <!-- MODO TUTOR -->
            <button 
              class="group w-full p-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden
                     {config.mode === 'TUTOR' 
                       ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 shadow-lg' 
                       : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 hover:border-blue-300'}"
              on:click={() => config.mode = 'TUTOR'}
            >
              <div class="flex items-start gap-4">
                <div class="p-3 rounded-lg {config.mode === 'TUTOR' ? 'bg-blue-500 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-500 group-hover:bg-blue-100 group-hover:text-blue-600'} transition-colors">
                  <Brain size={24} />
                </div>
                <div class="flex-1">
                  <div class="font-bold text-lg text-surface-900 dark:text-white mb-1">Modo Tutor</div>
                  <div class="text-sm text-surface-600 dark:text-surface-400 mb-3">
                    Aprendizagem guiada com explicações passo a passo
                  </div>
                  <div class="flex items-center gap-4 text-xs">
                    <span class="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Clock size={12} /> 15-30 min
                    </span>
                    <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Sparkles size={12} /> +XP Detalhado
                    </span>
                  </div>
                </div>
              </div>
              {#if config.mode === 'TUTOR'}
                <div class="absolute right-4 top-4 text-blue-500">
                  <CheckCircle2 size={24} />
                </div>
              {/if}
            </button>

            <!-- MODO RUSH -->
            <button 
              class="group w-full p-4 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden
                     {config.mode === 'RUSH' 
                       ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 shadow-lg' 
                       : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 hover:border-amber-300'}"
              on:click={() => config.mode = 'RUSH'}
            >
              <div class="flex items-start gap-4">
                <div class="p-3 rounded-lg {config.mode === 'RUSH' ? 'bg-amber-500 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-500 group-hover:bg-amber-100 group-hover:text-amber-600'} transition-colors">
                  <Zap size={24} />
                </div>
                <div class="flex-1">
                  <div class="font-bold text-lg text-surface-900 dark:text-white mb-1">Modo Rush</div>
                  <div class="text-sm text-surface-600 dark:text-surface-400 mb-3">
                    Quiz rápido com temporizador e recompensas aceleradas
                  </div>
                  <div class="flex items-center gap-4 text-xs">
                    <span class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Clock size={12} /> 5-15 min
                    </span>
                    <span class="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <Trophy size={12} /> Bônus XP
                    </span>
                  </div>
                </div>
              </div>
              {#if config.mode === 'RUSH'}
                <div class="absolute right-4 top-4 text-amber-500">
                  <CheckCircle2 size={24} />
                </div>
              {/if}
            </button>
          </div>
        </div>
      </div>

      <!-- COLUNA DIREITA - TÓPICOS -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-lg overflow-hidden">
          
          <!-- HEADER DOS TÓPICOS -->
          <div class="p-5 border-b border-surface-100 dark:border-surface-700 bg-gradient-to-r from-surface-50 to-white dark:from-surface-900 dark:to-surface-800">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-xl text-surface-900 dark:text-white mb-1">
                  Selecionar Tópicos
                </h3>
                <p class="text-surface-600 dark:text-surface-400">
                  {#if visibleTopics.length > 0}
                    Escolha os conteúdos para esta sessão de estudo
                  {:else}
                    Nenhum tópico disponível para {config.subject}
                  {/if}
                </p>
              </div>
              
              <div class="flex items-center gap-3">
                <div class="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-bold px-3 py-1.5 rounded-full">
                  {config.selectedTopics.length}/{visibleTopics.length}
                </div>
                <button 
                  on:click={selectAll}
                  class="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors hover:underline"
                >
                  {config.selectedTopics.length === visibleTopics.length && visibleTopics.length > 0 ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>
            </div>
          </div>

          <!-- LISTA DE TÓPICOS -->
          <div class="p-4 md:p-5">
            {#if visibleTopics.length === 0}
              <div class="text-center py-12 px-4">
                <div class="w-16 h-16 mx-auto mb-4 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center">
                  <BookOpen size={32} class="text-surface-400 dark:text-surface-500"/>
                </div>
                <h4 class="text-lg font-bold text-surface-700 dark:text-surface-300 mb-2">
                  Nenhum tópico disponível
                </h4>
                <p class="text-surface-500 max-w-md mx-auto mb-6">
                  Não há conteúdos de {config.subject} disponíveis para a {studentClass}ª classe.
                  {#if !turmaId}
                    Tente selecionar outra disciplina.
                  {/if}
                </p>
                {#if !turmaId}
                  <div class="flex gap-3 justify-center">
                    {#each availableSubjects.filter(s => s !== config.subject) as sub}
                      <button 
                        on:click={() => changeSubject(sub)}
                        class="btn variant-soft-primary text-sm"
                      >
                        Ver {sub}
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
                    class="group relative p-4 rounded-xl border-2 transition-all duration-300 text-left
                          {config.selectedTopics.includes(topic.id) 
                            ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100/30 dark:from-primary-900/20 dark:to-primary-900/10 shadow-lg transform scale-[1.02]' 
                            : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/30 hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/10'}"
                  >
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0 mt-1">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center
                                  {config.selectedTopics.includes(topic.id) 
                                    ? 'bg-primary-500 text-white' 
                                    : 'bg-surface-200 dark:bg-surface-700 text-surface-500 group-hover:bg-primary-100 group-hover:text-primary-600'}">
                          {#if config.selectedTopics.includes(topic.id)}
                            <CheckCircle2 size={20} class="fill-current" />
                          {:else}
                            <Circle size={20} />
                          {/if}
                        </div>
                      </div>
                      
                      <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-surface-900 dark:text-white mb-1 line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                          {topic.nome}
                        </h4>
                        <div class="flex items-center gap-3 text-xs">
                          <span class="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 px-2 py-1 rounded-full">
                            Nível {topic.nivelClasse}
                          </span>
                          {#if topic.complexidade}
                            <span class="text-surface-500">
                              {topic.complexidade === 'alta' ? '🔴' : topic.complexidade === 'media' ? '🟡' : '🟢'} 
                              {topic.complexidade}
                            </span>
                          {/if}
                        </div>
                      </div>
                      
                      <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={16} class="text-surface-400 group-hover:text-primary-500" />
                      </div>
                    </div>
                    
                    <!-- BADGE DE DIFICULDADE -->
                    {#if topic.dificuldade}
                      <div class="absolute top-3 right-3">
                        {#if topic.dificuldade === 'alta'}
                          <span class="text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-2 py-1 rounded-full">Difícil</span>
                        {:else if topic.dificuldade === 'media'}
                          <span class="text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded-full">Médio</span>
                        {:else}
                          <span class="text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-full">Fácil</span>
                        {/if}
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- DICA DE SESSÃO -->
        {#if visibleTopics.length > 0}
          <div class="mt-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
            <div class="flex items-start gap-3">
              <Sparkles size={20} class="text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <p class="text-sm text-surface-700 dark:text-surface-300">
                  <strong class="text-primary-700 dark:text-primary-300">Dica:</strong> 
                  {config.mode === 'TUTOR' 
                    ? 'Para melhor aprendizagem, selecione 2-3 tópicos relacionados no modo Tutor.'
                    : 'No modo Rush, foque em 4-6 tópicos curtos para máxima eficiência.'}
                </p>
              </div>
            </div>
          </div>
        {/if}
      </div>

    </div>

  {/if}
</div>

<!-- BOTÃO FIXO DE INICIAR -->
<div class="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white via-white to-white/90 dark:from-surface-900 dark:via-surface-900 dark:to-surface-900/90 backdrop-blur-lg border-t border-surface-200 dark:border-surface-700 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)]">
  <div class="max-w-6xl mx-auto px-4 md:px-6 py-4">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="text-center sm:text-left">
        <div class="text-sm text-surface-600 dark:text-surface-400 mb-1">Pronto para começar?</div>
        <div class="font-bold text-lg text-surface-900 dark:text-white">
          {#if config.selectedTopics.length > 0}
            {config.selectedTopics.length} {config.selectedTopics.length === 1 ? 'tópico' : 'tópicos'} selecionados
          {:else}
            Selecione pelo menos 1 tópico
          {/if}
        </div>
      </div>
      
      <button 
        on:click={startSession}
        disabled={isSubmitting || config.selectedTopics.length === 0}
        class="relative group bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-full px-8 py-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-xl min-w-[200px] flex items-center justify-center gap-3"
      >
        {#if isSubmitting}
          <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>A preparar missão...</span>
        {:else}
          <div class="relative">
            <Play size={20} class="fill-current" />
            <div class="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
          </div>
          <span class="text-lg">
            {config.mode === 'RUSH' ? 'INICIAR RUSH' : 'INICIAR AULA'}
          </span>
        {/if}
        
        <!-- BADGE DE CONTAGEM -->
        {#if config.selectedTopics.length > 0 && !isSubmitting}
          <span class="absolute -top-2 -right-2 bg-white text-primary-700 text-xs font-bold px-2 py-1 rounded-full shadow-lg">
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
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>