<script lang="ts">
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { notifications } from '$lib/store/notifications';
  
  import { 
    School, Plus, BookOpen, Settings, Copy, AlertCircle, Search,
    ChevronDown, Users, Activity
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
    e.stopPropagation(); // Impede de abrir a turma ao clicar na engrenagem
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

<div class="max-w-8xl mx-auto space-y-8 animate-fade-in p-6 pb-20">
  
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="space-y-1">
      <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3">
        Minhas Turmas
      </h1>
      <p class="text-surface-600 dark:text-surface-400">
        Gerencie as suas salas de aula virtuais.
      </p>
    </div>

    <button 
                    class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
      on:click={() => goto('/dashboard/teacher/class/create-class')}
    >
      <Plus size={20} class="mr-2" />
      Nova Turma
    </button>
  </div>

  <div class="bg-white dark:bg-surface-800 p-2 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700 flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="relative w-full md:max-w-lg">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-surface-400">
            <Search size={20} />
        </div>
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Pesquisar turma..."
            class="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 outline-none text-lg placeholder-surface-400"
        />
    </div>
    <div class="pr-4 text-sm font-bold text-surface-400 hidden md:block">
        {turmasFiltradas.length} {turmasFiltradas.length === 1 ? 'Turma' : 'Turmas'}
    </div>
  </div>

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each Array(3) as _}
            <div class="h-64 rounded-3xl bg-surface-200 dark:bg-surface-800 animate-pulse"></div>
        {/each}
    </div>

  {:else if error}
    <div class="p-8 rounded-3xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-center space-y-4">
      <AlertCircle size={48} class="mx-auto text-red-500" />
      <h3 class="text-xl font-bold text-red-700 dark:text-red-400">Erro ao carregar</h3>
      <button class="btn variant-outline-error" on:click={carregarTurmas}>
        Tentar Novamente
      </button>
    </div>

  {:else if turmasFiltradas.length === 0}
    <div class="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed border-surface-300 dark:border-surface-700 text-center min-h-[300px]">
      <div class="w-20 h-20 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center text-surface-400 mb-4">
        <School size={40} />
      </div>
      <h3 class="text-xl font-bold text-surface-900 dark:text-surface-100">Nenhuma turma encontrada</h3>
      <p class="text-surface-500 max-w-sm mx-auto mt-2">
          {searchTerm ? 'Tente ajustar os termos da sua pesquisa.' : 'Comece por criar a sua primeira sala de aula virtual.'}
      </p>
      {#if !searchTerm}
          <button class="btn variant-filled-primary mt-6 rounded-xl font-bold" on:click={() => goto('/dashboard/teacher/class/create-class')}>
            <Plus size={18} class="mr-2"/> Criar Turma
          </button>
      {/if}
    </div>

  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each turmasFiltradas as turma}
        <div 
            class="group bg-white dark:bg-surface-800 rounded-3xl p-6 shadow-sm hover:shadow-xl border-2 border-surface-100 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-300 relative flex flex-col h-full cursor-pointer"
            on:click={() => verDetalhesTurma(turma.id)}
            on:keydown={(e) => e.key === 'Enter' && verDetalhesTurma(turma.id)}
            role="button"
            tabindex="0"
        >
            
            <div class="flex justify-between items-start mb-6">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
                    <School size={28} />
                </div>
                
                <button 
                    class="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-primary-500 transition-colors"
                    on:click={e => editarTurma(turma.id, e)}
                    title="Editar Turma"
                >
                    <Settings size={20} />
                </button>
            </div>

            <div class="flex-1">
                <h3 class="text-xl font-bold text-surface-900 dark:text-white line-clamp-1 mb-1">
                    {turma.nome}
                </h3>
                <div class="flex items-center gap-2 text-surface-500 text-sm font-medium">
                    <BookOpen size={16} class="text-primary-500"/>
                    <span>{turma.disciplina}</span>
                </div>

                <div class="flex items-center gap-4 mt-6">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-900/50 text-surface-600 dark:text-surface-300 text-xs font-bold uppercase tracking-wide">
                        <Users size={14} />
                        {turma.totalAlunos || 0} Alunos
                    </div>
                </div>
            </div>

            <div class="mt-6 pt-4 border-t border-surface-100 dark:border-surface-700 flex items-center justify-between">
                <span class="text-xs font-bold text-surface-400 uppercase tracking-wider">Código</span>
                
                <div class="relative">
                    <button 
                        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
                               {openCodeId === turma.id 
                                ? 'bg-primary-500 text-white shadow-md' 
                                : 'bg-surface-100 dark:bg-surface-900 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'}"
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
                            class="absolute bottom-full right-0 mb-3 p-4 w-60 bg-white dark:bg-surface-800 shadow-2xl border border-surface-200 dark:border-surface-600 rounded-2xl z-50 animate-fade-in origin-bottom-right"
                            on:click|stopPropagation
                        >
                            <div class="text-center space-y-3">
                                <span class="text-xs font-bold uppercase text-surface-400 tracking-wider">Partilhar com alunos</span>
                                
                                <div class="p-3 bg-surface-50 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-center">
                                    <span class="font-mono font-black text-2xl text-primary-600 dark:text-primary-400 tracking-widest select-all">
                                        {turma.codigo}
                                    </span>
                                </div>

                                <button 
                                    class="btn btn-sm variant-filled-secondary w-full font-bold rounded-lg"
                                    on:click={(e) => copiarCodigo(turma.codigo, e)}
                                >
                                    <Copy size={14} class="mr-2"/> Copiar
                                </button>
                            </div>
                            <div class="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-surface-800 border-b border-r border-surface-200 dark:border-surface-600 transform rotate-45"></div>
                        </div>
                    {/if}
                </div>
            </div>

        </div>
      {/each}
      
      <!-- <button 
        on:click={() => goto('/dashboard/teacher/class/create')}
        class="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-surface-300 dark:border-surface-700 
               text-surface-400 hover:text-primary-500 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-surface-800 transition-all min-h-[250px]"
      >
        <div class="p-3 bg-surface-100 dark:bg-surface-900 rounded-full mb-3">
          <Plus size={24} />
        </div>
        <span class="font-bold">Nova Turma</span>
      </button> -->

    </div>
  {/if}
</div>