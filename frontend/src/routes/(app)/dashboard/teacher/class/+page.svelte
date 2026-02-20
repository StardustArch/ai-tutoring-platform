<svelte:head>
    <title>Minhas Turmas | KaniMente</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { notifications } from '$lib/store/notifications';
  
  import { 
    School, Plus, BookOpen, Settings, Copy, AlertCircle, Search,
    MoreHorizontal, Users, Hash, ChevronRight
  } from 'lucide-svelte';

  // --- ESTADO ---
  let turmas: any[] = [];
  let isLoading = true;
  let error: string | null = null;
  let searchTerm = '';
  
  // Estado para menu de ações rápido
  let activeMenuId: number | null = null;

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

  function toggleMenu(id: number, e: Event) {
    e.stopPropagation();
    activeMenuId = activeMenuId === id ? null : id;
  }

  function closeMenus() {
    activeMenuId = null;
  }

  function verDetalhes(id: number) {
    goto(`/dashboard/teacher/class/${id}`);
  }

  function editarTurma(id: number) {
    goto(`/dashboard/teacher/class/${id}/edit?ref=home`);
  }

  function copiarCodigo(codigo: string, e: Event) {
    e.stopPropagation();
    navigator.clipboard.writeText(codigo);
    notifications.send('Código copiado para a área de transferência.', 'success');
    activeMenuId = null; 
  }

  $: turmasFiltradas = turmas.filter((turma) => {
    const termo = searchTerm.toLowerCase();
    return !searchTerm ||
      turma.nome.toLowerCase().includes(termo) ||
      turma.disciplina.toLowerCase().includes(termo) ||
      turma.codigo.toLowerCase().includes(termo);
  });
</script>

<svelte:window on:click={closeMenus} />

<div class="container mx-auto max-w-8xl p-4 md:p-8 space-y-6 animate-fade-in pb-24">
  
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
    <div>
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
        Minhas Turmas
      </h1>
      <p class="text-sm text-surface-500 mt-1">
        Gerencie as suas salas de aula e códigos de acesso.
      </p>
    </div>

    <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:w-64">
            <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <input
                type="text"
                bind:value={searchTerm}
                placeholder="Filtrar turmas..."
                class="w-full pl-9 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-surface-800 text-sm transition-all"
            />
        </div>
        
        <button 
            class="btn bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md px-4 py-2 flex items-center gap-2 text-sm shadow-sm whitespace-nowrap"
            on:click={() => goto('/dashboard/teacher/class/create-class')}
        >
            <Plus size={16} />
            <span class="hidden sm:inline">Nova Turma</span>
        </button>
    </div>
  </div>

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {#each Array(6) as _}
            <div class="h-40 rounded-lg bg-surface-200 dark:bg-surface-800 border border-surface-200 dark:border-surface-700"></div>
        {/each}
    </div>

  {:else if error}
    <div class="p-12 text-center rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
      <AlertCircle size={32} class="mx-auto text-red-500 mb-3" />
      <h3 class="font-bold text-red-800 dark:text-red-200">Erro ao carregar dados</h3>
      <button class="mt-4 text-sm underline text-red-600 dark:text-red-400" on:click={carregarTurmas}>
        Tentar Novamente
      </button>
    </div>

  {:else if turmasFiltradas.length === 0}
    <div class="p-16 text-center rounded-lg border border-dashed border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/30">
      <div class="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-400 mx-auto mb-4 border border-surface-200 dark:border-surface-600">
        <School size={20} />
      </div>
      <h3 class="font-bold text-surface-900 dark:text-white">Nenhuma turma encontrada</h3>
      <p class="text-sm text-surface-500 mt-1 mb-6 max-w-xs mx-auto">
          {searchTerm ? 'Tente outros termos de pesquisa.' : 'Crie a sua primeira turma para começar a adicionar alunos.'}
      </p>
      {#if !searchTerm}
          <button class="btn bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:border-primary-500 text-surface-700 dark:text-surface-200 px-4 py-2 rounded-md text-sm font-medium transition-colors" on:click={() => goto('/dashboard/teacher/class/create-class')}>
            Criar Turma
          </button>
      {/if}
    </div>

  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each turmasFiltradas as turma}
        <div 
            class="group bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm hover:border-primary-500/50 hover:shadow-md transition-all duration-200 flex flex-col relative"
        >
            <div class="p-5 flex justify-between items-start cursor-pointer" on:click={() => verDetalhes(turma.id)}>
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800/30 font-bold text-sm">
                        {turma.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 class="font-bold text-surface-900 dark:text-white leading-tight group-hover:text-primary-600 transition-colors">
                            {turma.nome}
                        </h3>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-xs font-medium px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300">
                                {turma.disciplina}
                            </span>
                            <span class="text-xs text-surface-400 flex items-center gap-1">
                                <Users size={12} /> {turma.totalAlunos || 0}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="relative">
                    <button 
                        class="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                        on:click={(e) => toggleMenu(turma.id, e)}
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    {#if activeMenuId === turma.id}
                        <div class="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-surface-800 rounded-md shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-10 origin-top-right animate-fade-in-fast">
                            <button class="w-full text-left px-4 py-2 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2" on:click={() => editarTurma(turma.id)}>
                                <Settings size={14} /> Configurações
                            </button>
                            <button class="w-full text-left px-4 py-2 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2" on:click={(e) => copiarCodigo(turma.codigo, e)}>
                                <Copy size={14} /> Copiar Código
                            </button>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="mt-auto px-5 py-3 border-t border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 rounded-b-lg flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-mono text-surface-500 bg-white dark:bg-surface-700 px-2 py-1 rounded border border-surface-200 dark:border-surface-600 select-all cursor-text" title="Código da Turma">
                    <Hash size={12} class="text-surface-400"/>
                    {turma.codigo}
                </div>
                
                <button 
                    class="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
                    on:click={() => verDetalhes(turma.id)}
                >
                    Gerir <ChevronRight size={14} />
                </button>
            </div>

        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    .animate-fade-in-fast { animation: fadeIn 0.15s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>