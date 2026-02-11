<script lang="ts">
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { notifications } from '$lib/store/notifications';
  
  import { 
    School, Plus, BookOpen, Settings, Copy, AlertCircle, Search,
    ChevronDown, Users, Hash
  } from 'lucide-svelte';

  // --- ESTADO ---
  let turmas: any[] = [];
  let isLoading = true;
  let error: string | null = null;
  let searchTerm = '';
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
    openCodeId = openCodeId === id ? null : id;
  }

  function fecharDropdowns() {
    openCodeId = null;
  }

  function verDetalhesTurma(turmaId: number) {
    goto(`/dashboard/teacher/class/${turmaId}`);
  }

  function editarTurma(turmaId: number, e: Event) {
    e.stopPropagation(); 
    goto(`/dashboard/teacher/class/${turmaId}/edit?ref=home`);
  }

  function copiarCodigo(codigo: string, e: Event) {
    e.stopPropagation();
    navigator.clipboard.writeText(codigo);
    notifications.send('Código copiado!', 'info');
    openCodeId = null; 
  }

  $: turmasFiltradas = turmas.filter((turma) => {
    const termo = searchTerm.toLowerCase();
    return !searchTerm ||
      turma.nome.toLowerCase().includes(termo) ||
      turma.disciplina.toLowerCase().includes(termo) ||
      turma.codigo.toLowerCase().includes(termo);
  });
</script>

<svelte:window on:click={fecharDropdowns} />

<div class="max-w-8xl container mx-auto space-y-8 animate-fade-in p-6 pb-20">
  
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-200 dark:border-surface-700 pb-6">
    <div class="space-y-1">
      <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3">
        Minhas Turmas
      </h1>
      <p class="text-surface-600 dark:text-surface-400">
        Gerencie as suas salas de aula virtuais.
      </p>
    </div>

    <button 
        class="btn variant-filled-primary rounded-lg flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors shadow-sm"
        on:click={() => goto('/dashboard/teacher/class/create-class')}
    >
      <Plus size={18} />
      <span>Nova Turma</span>
    </button>
  </div>

  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="relative w-full md:max-w-md">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
            <Search size={18} />
        </div>
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Pesquisar por nome, disciplina ou código..."
            class="w-full pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 transition-colors"
        />
    </div>
    <div class="text-sm font-medium text-surface-500 hidden md:block">
        Mostrando <strong>{turmasFiltradas.length}</strong> {turmasFiltradas.length === 1 ? 'turma' : 'turmas'}
    </div>
  </div>

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each Array(3) as _}
            <div class="h-56 rounded-xl bg-surface-200 dark:bg-surface-800 animate-pulse border border-surface-300 dark:border-surface-700"></div>
        {/each}
    </div>

  {:else if error}
    <div class="p-8 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-center space-y-4">
      <AlertCircle size={48} class="mx-auto text-red-500" />
      <h3 class="text-xl font-bold text-red-700 dark:text-red-400">Erro ao carregar turmas</h3>
      <button class="btn variant-outline-error rounded-lg" on:click={carregarTurmas}>
        Tentar Novamente
      </button>
    </div>

  {:else if turmasFiltradas.length === 0}
    <div class="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 text-center min-h-[300px] bg-surface-50 dark:bg-surface-800/50">
      <div class="w-16 h-16 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-400 mb-4">
        <School size={32} />
      </div>
      <h3 class="text-lg font-bold text-surface-900 dark:text-surface-100">Nenhuma turma encontrada</h3>
      <p class="text-surface-500 max-w-sm mx-auto mt-2 text-sm">
          {searchTerm ? 'Não encontramos nenhuma turma com esse nome.' : 'Comece por criar a sua primeira sala de aula virtual.'}
      </p>
      {#if !searchTerm}
          <button class="mt-6 btn variant-filled-primary rounded-lg" on:click={() => goto('/dashboard/teacher/class/create-class')}>
            <Plus size={18} class="mr-2"/> Criar Primeira Turma
          </button>
      {/if}
    </div>

  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each turmasFiltradas as turma}
        <div 
            class="group bg-white dark:bg-surface-800 rounded-xl p-5 shadow-sm hover:shadow-md border border-surface-200 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-500 transition-all duration-200 relative flex flex-col h-full cursor-pointer"
            on:click={() => verDetalhesTurma(turma.id)}
            on:keydown={(e) => e.key === 'Enter' && verDetalhesTurma(turma.id)}
            role="button"
            tabindex="0"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                    <School size={24} />
                </div>
                
                <button 
                    class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-primary-600 transition-colors z-10"
                    on:click={e => editarTurma(turma.id, e)}
                    title="Configurações da Turma"
                >
                    <Settings size={20} />
                </button>
            </div>

            <div class="flex-1 mb-6">
                <h3 class="text-lg font-bold text-surface-900 dark:text-white line-clamp-1 group-hover:text-primary-600 transition-colors">
                    {turma.nome}
                </h3>
                <div class="flex items-center gap-2 text-surface-500 text-sm font-medium mt-1">
                    <BookOpen size={14} class="text-surface-400"/>
                    <span>{turma.disciplina}</span>
                </div>

                <div class="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-semibold">
                    <Users size={12} />
                    {turma.totalAlunos || 0} Alunos
                </div>
            </div>

            <div class="pt-4 border-t border-surface-100 dark:border-surface-700 flex items-center justify-between relative">
                <div class="flex items-center gap-1.5 text-xs font-medium text-surface-400 uppercase tracking-wide">
                    <Hash size={12} /> Código
                </div>
                
                <div class="relative">
                    <button 
                        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border
                               {openCodeId === turma.id 
                                ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300' 
                                : 'bg-transparent border-transparent text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'}"
                        on:click={(e) => toggleCodeDropdown(turma.id, e)}
                    >
                        {#if openCodeId === turma.id}
                            <span class="text-xs">Fechar</span>
                        {:else}
                            <span>Ver Código</span>
                        {/if}
                        <ChevronDown size={14} class="transition-transform {openCodeId === turma.id ? 'rotate-180' : ''}"/>
                    </button>

                    {#if openCodeId === turma.id}
                        <div 
                            class="absolute bottom-full right-0 mb-2 p-3 w-56 bg-white dark:bg-surface-800 shadow-xl border border-surface-200 dark:border-surface-600 rounded-xl z-50 animate-fade-in origin-bottom-right"
                            on:click|stopPropagation
                        >
                            <div class="text-center space-y-2">
                                <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider">Partilhar com alunos</span>
                                
                                <div class="py-2 px-3 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700 flex items-center justify-center">
                                    <span class="font-mono font-bold text-xl text-primary-600 dark:text-primary-400 tracking-wider select-all">
                                        {turma.codigo}
                                    </span>
                                </div>

                                <button 
                                    class="w-full btn btn-sm variant-filled-secondary rounded-lg font-semibold flex items-center justify-center gap-2"
                                    on:click={(e) => copiarCodigo(turma.codigo, e)}
                                >
                                    <Copy size={14}/> Copiar
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>