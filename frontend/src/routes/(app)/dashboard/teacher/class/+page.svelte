<script lang="ts">
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { notifications } from '$lib/store/notifications';
  
  import { 
    School, Plus, BookOpen, Settings, Copy, AlertCircle, Search,
    ChevronDown, Hash
  } from 'lucide-svelte';

  // --- ESTADO ---
  let turmas: any[] = [];
  let isLoading = true;
  let error: string | null = null;
  let searchTerm = '';

  // Estado do Dropdown (Armazena o ID da turma que está com o código aberto)
  let openCodeId: number | null = null;

  onMount(async () => {
    await carregarTurmas();
  });

  async function carregarTurmas() {
    isLoading = true;
    error = null;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes`);
      if (res.ok) {
        turmas = await res.json();
      } else {
        throw new Error('Falha ao carregar lista.');
      }
    } catch (err) {
      console.error('Erro:', err);
      error = 'Não foi possível carregar as suas turmas.';
      notifications.send(error, 'error');
    } finally {
      isLoading = false;
    }
  }

  // --- INTERAÇÕES ---
  
  function toggleCodeDropdown(id: number, e: Event) {
    e.stopPropagation();
    // Se clicar no mesmo que está aberto, fecha. Se não, abre o novo.
    openCodeId = openCodeId === id ? null : id;
  }

  function fecharDropdowns() {
    openCodeId = null;
  }

  function verDetalhesTurma(turmaId: number) {
    goto(`/dashboard/teacher/class/${turmaId}`);
  }

  function editarTurma(turmaId: number) {
    goto(`/dashboard/teacher/class/${turmaId}/edit`);
  }

  function copiarCodigo(codigo: string, e: Event) {
    e.stopPropagation();
    navigator.clipboard.writeText(codigo);
    notifications.send('Código copiado!', 'info');
    openCodeId = null; // Fecha após copiar
  }

  // --- FILTROS ---
  $: turmasFiltradas = turmas.filter((turma) => {
    const termo = searchTerm.toLowerCase();
    return !searchTerm ||
      turma.nome.toLowerCase().includes(termo) ||
      turma.disciplina.toLowerCase().includes(termo) ||
      turma.codigo.toLowerCase().includes(termo);
  });
</script>

<!-- Fecha dropdowns ao clicar fora -->
<svelte:window on:click={fecharDropdowns} />


<div class="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20 p-4">
  
  <!-- CABEÇALHO -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="space-y-1">
      <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3">
        <BookOpen class="text-primary-500" size={32} />
        Minhas Turmas
      </h1>
      <p class="text-surface-600 dark:text-surface-400 text-lg">
        Gerencie as suas salas de aula virtuais.
      </p>
    </div>

    <button 
      class="btn variant-filled-primary font-bold shadow-lg hover:scale-105 transition-transform"
      on:click={() => goto('/dashboard/teacher/class/create')}
    >
      <Plus size={20} class="mr-2" />
      Nova Turma
    </button>
  </div>

  <!-- BARRA DE BUSCA -->
  <div class="bg-white dark:bg-surface-800 p-4 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="relative w-full md:max-w-md">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
            <Search size={18} />
        </div>
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Pesquisar por nome, disciplina ou código..."
            class="w-full pl-10 pr-4 py-2 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
        />
    </div>
    <div class="text-sm font-medium text-surface-500 dark:text-surface-400">
        A mostrar {turmasFiltradas.length} turmas
    </div>
  </div>

  <!-- CONTEÚDO PRINCIPAL -->
  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each Array(3) as _}
            <div class="h-48 rounded-xl bg-surface-200 dark:bg-surface-800 animate-pulse"></div>
        {/each}
    </div>

  {:else if error}
    <div class="p-8 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-center space-y-4">
      <AlertCircle size={48} class="mx-auto text-red-500" />
      <h3 class="text-xl font-bold text-red-700 dark:text-red-400">Erro ao carregar</h3>
      <button class="btn variant-outline-error" on:click={carregarTurmas}>
        Tentar Novamente
      </button>
    </div>

  {:else if turmasFiltradas.length === 0}
    <div class="p-12 rounded-xl bg-surface-100 dark:bg-surface-800/50 border-2 border-dashed border-surface-300 dark:border-surface-700 text-center space-y-4">
      <div class="mx-auto w-16 h-16 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-500">
        <School size={32} />
      </div>
      <div>
        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-100">Nenhuma turma encontrada</h3>
        <p class="text-surface-600 dark:text-surface-400">
            {searchTerm ? 'Tente ajustar os termos da sua pesquisa.' : 'Comece por criar a sua primeira turma.'}
        </p>
      </div>
      {#if !searchTerm}
          <button class="btn variant-ghost-primary mt-4" on:click={() => goto('/dashboard/teacher/class/create')}>
            Criar Agora
          </button>
      {/if}
    </div>

  {:else}
    <!-- GRID DE TURMAS -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each turmasFiltradas as turma}
        <!-- CARD DA TURMA -->
        <!-- 
            NOTA: Removi overflow-hidden e adicionei rounded-* nas pontas 
            para permitir que o dropdown flutue para fora do card.
        -->
        <div 
            class="group bg-white dark:bg-surface-800 rounded-xl shadow-sm hover:shadow-md border border-surface-200 dark:border-surface-700 transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col relative"
            on:click={() => verDetalhesTurma(turma.id)}
            on:keydown={(e) => e.key === 'Enter' && verDetalhesTurma(turma.id)}
            role="button"
            tabindex="0"
        >
            <!-- Topo do Card -->
            <div class="h-2 w-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-t-xl"></div>
            
            <div class="p-6 flex-1 flex flex-col gap-4">
                
                <!-- Cabeçalho -->
                <div class="flex justify-between items-start">
                    <div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
                        <School size={24} />
                    </div>
                    <button class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 p-1" on:click|stopPropagation={() => editarTurma(turma.id)}>
                        <Settings size={18} />
                    </button>
                </div>

                <!-- Info Principal -->
                <div>
                    <h3 class="text-xl font-bold text-surface-900 dark:text-surface-50 line-clamp-1" title={turma.nome}>
                        {turma.nome}
                    </h3>
                    <p class="text-sm font-medium text-primary-600 dark:text-primary-400 mt-1 flex items-center gap-1">
                        <BookOpen size={14}/> {turma.disciplina}
                    </p>
                </div>

                <!-- Estatísticas -->
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <div class="p-2 rounded bg-surface-50 dark:bg-surface-700/50 flex flex-col items-center justify-center">
                        <span class="text-lg font-bold text-surface-900 dark:text-surface-100">{turma.totalAlunos || 0}</span>
                        <span class="text-[10px] uppercase font-bold text-surface-500">Alunos</span>
                    </div>
                    <div class="p-2 rounded bg-surface-50 dark:bg-surface-700/50 flex flex-col items-center justify-center">
                        <span class="text-lg font-bold text-surface-900 dark:text-surface-100">--</span>
                        <span class="text-[10px] uppercase font-bold text-surface-500">Atividade</span>
                    </div>
                </div>

            </div>

            <!-- Rodapé do Card (Dropdown do Código) -->
            <div class="px-6 py-4 bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between rounded-b-xl">
                <span class="text-xs font-bold uppercase text-surface-500">Acesso</span>
                
                <!-- Container do Dropdown -->
                <div class="relative">
                    <button 
                        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all
                               {openCodeId === turma.id 
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                                : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700'}"
                        on:click={(e) => toggleCodeDropdown(turma.id, e)}
                    >
                        {#if openCodeId === turma.id}
                            <span>Ocultar</span>
                        {:else}
                            <span>Ver Código</span>
                        {/if}
                        <ChevronDown size={14} class="transition-transform {openCodeId === turma.id ? 'rotate-180' : ''}"/>
                    </button>

                    <!-- O Menu Dropdown Flutuante -->
                    {#if openCodeId === turma.id}
                        <div 
                            class="absolute bottom-full right-0 mb-2 p-4 w-56 bg-white dark:bg-surface-800 shadow-xl border border-surface-200 dark:border-surface-600 rounded-xl z-50 animate-fade-in"
                            on:click|stopPropagation
                        >
                            <div class="text-center space-y-3">
                                <span class="text-xs font-bold uppercase text-surface-400 tracking-wider">Código da Turma</span>
                                
                                <div class="p-2 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700 flex items-center justify-between gap-2">
                                    <span class="font-mono font-black text-lg text-primary-600 dark:text-primary-400 tracking-wider select-all">
                                        {turma.codigo}
                                    </span>
                                </div>

                                <button 
                                    class="btn btn-sm variant-filled-primary w-full font-bold"
                                    on:click={(e) => copiarCodigo(turma.codigo, e)}
                                >
                                    <Copy size={14} class="mr-2"/> Copiar
                                </button>
                            </div>
                            
                            <!-- Seta decorativa do popover -->
                            <div class="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-surface-800 border-b border-r border-surface-200 dark:border-surface-600 transform rotate-45"></div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
      {/each}
    </div>
  {/if}
</div>