<script lang="ts">
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { 
    BarChart3, Search, TrendingUp, AlertTriangle, 
    ChevronRight, User, Users, GraduationCap, Activity
  } from 'lucide-svelte';

  // --- Tipos ---
  interface AlunoStat {
    id: number;
    nome: string;
    taxa: number;
    totalAtividades: number;
    status: 'danger' | 'warning' | 'good' | 'neutral';
    turmaId: number;
    turmaNome: string;
  }

  interface TurmaReport {
    id: number;
    nome: string;
    disciplina: string;
    totalAlunos: number;
    mediaTurma: number;
    alunos: AlunoStat[];
  }

  // --- Estado ---
  let turmasReports: TurmaReport[] = [];
  let isLoading = true;
  let selectedClassId: number | 'all' = 'all';
  let searchTerm = '';

  onMount(async () => {
    await carregarDados();
  });

  async function carregarDados() {
    isLoading = true;
    try {
      // Agora chamamos UM único endpoint rápido e consolidado
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/teacher/reports/overview`);
      if (res.ok) {
        turmasReports = await res.json();
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  // Flattened list para busca global
  $: todosAlunos = turmasReports.flatMap(t => t.alunos);

  // Lógica de Filtragem
  $: listaExibicao = (selectedClassId === 'all' ? todosAlunos : turmasReports.find(t => t.id === selectedClassId)?.alunos || [])
    .filter(a => searchTerm === '' || a.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  // Turma Selecionada (para mostrar o card de resumo)
  $: turmaAtiva = selectedClassId !== 'all' ? turmasReports.find(t => t.id === selectedClassId) : null;

  function verRelatorio(alunoId: number) {
    goto(`/dashboard/teacher/reports/${alunoId}`); 
  }

  function getInitials(name: string) {
      return name.split(' ').map((n:string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  function getStatusColor(status: string) {
    switch(status) {
        case 'danger': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'warning': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'good': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        default: return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300';
    }
  }

    function getAvatarColor(name: string) {
        const gradients = [
            'bg-gradient-to-br from-blue-500 to-cyan-500',
            'bg-gradient-to-br from-emerald-500 to-teal-500',
            'bg-gradient-to-br from-purple-500 to-pink-500',
            'bg-gradient-to-br from-amber-500 to-orange-500',
            'bg-gradient-to-br from-rose-500 to-red-500'
        ];
        return gradients[name.charCodeAt(0) % gradients.length];
    }
</script>

<div class="max-w-8xl mx-auto p-6 pb-20 space-y-8 animate-fade-in">

  <div class="flex flex-col md:flex-row justify-between md:items-end gap-4">
    <div>
      <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3">
        <BarChart3 class="text-warning-500" size={32} />
        Relatórios Académicos
      </h1>
      <p class="text-surface-600 dark:text-surface-400 mt-2">
        Análise de desempenho consolidada por turma.
      </p>
    </div>

    <div class="relative w-full md:max-w-sm">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
            <Search size={20} />
        </div>
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Procurar aluno..."
            class="w-full pl-10 pr-4 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl focus:ring-2 focus:ring-warning-500 outline-none shadow-sm transition-all"
        />
    </div>
  </div>

  {#if isLoading}
    <div class="space-y-4 animate-pulse">
        <div class="flex gap-4"><div class="h-12 w-32 bg-surface-200 rounded-xl"></div></div>
        <div class="h-64 bg-surface-200 rounded-3xl"></div>
    </div>
  {:else}

    <div class="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button 
            class="px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all border-2
            {selectedClassId === 'all' 
                ? 'bg-surface-900 text-white border-surface-900 dark:bg-white dark:text-surface-900' 
                : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-transparent hover:bg-surface-100 dark:hover:bg-surface-700'}"
            on:click={() => selectedClassId = 'all'}
        >
            Visão Geral
        </button>
        
        <div class="w-px h-6 bg-surface-300 dark:bg-surface-700 mx-1"></div>

        {#each turmasReports as turma}
            <button 
                class="px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all border-2 flex items-center gap-2
                {selectedClassId === turma.id 
                    ? 'border-warning-500 text-warning-700 bg-warning-50 dark:bg-warning-900/20 dark:text-warning-400' 
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-transparent hover:border-surface-200'}"
                on:click={() => selectedClassId = turma.id}
            >
                {turma.nome}
                <span class="text-xs px-1.5 py-0.5 rounded-md {turma.mediaTurma < 50 ? 'bg-red-100 text-red-600' : 'bg-surface-200 text-surface-600'}">
                    {turma.mediaTurma}%
                </span>
            </button>
        {/each}
    </div>

    {#if selectedClassId === 'all' && !searchTerm}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 rounded-3xl p-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-red-800 dark:text-red-200">Atenção Prioritária</h3>
                        <p class="text-xs text-red-600/80">Alunos com média inferior a 50%</p>
                    </div>
                </div>
                <div class="space-y-3">
                    {#each todosAlunos.filter(a => a.status === 'danger').slice(0, 3) as aluno}
                        <button 
                            class="w-full flex items-center justify-between p-3 bg-white dark:bg-surface-800 rounded-xl hover:shadow-md transition-all"
                            on:click={() => verRelatorio(aluno.id)}
                        >
                            <div>
                                <span class="block font-bold text-surface-700 dark:text-surface-200 text-left">{aluno.nome}</span>
                                <span class="text-xs text-surface-400">{aluno.turmaNome}</span>
                            </div>
                            <span class="text-sm font-black text-red-500">{aluno.taxa}%</span>
                        </button>
                    {/each}
                    {#if todosAlunos.filter(a => a.status === 'danger').length === 0}
                        <p class="text-sm text-surface-500">Nenhum aluno em risco crítico.</p>
                    {/if}
                </div>
            </div>

            <div class="bg-green-50 dark:bg-green-900/10 border-2 border-green-100 dark:border-green-900/30 rounded-3xl p-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-green-800 dark:text-green-200">Top Desempenho</h3>
                        <p class="text-xs text-green-600/80">Alunos com média superior a 70%</p>
                    </div>
                </div>
                <div class="space-y-3">
                    {#each todosAlunos.filter(a => a.status === 'good').sort((a,b) => b.taxa - a.taxa).slice(0, 3) as aluno}
                        <button 
                            class="w-full flex items-center justify-between p-3 bg-white dark:bg-surface-800 rounded-xl hover:shadow-md transition-all"
                            on:click={() => verRelatorio(aluno.id)}
                        >
                             <div>
                                <span class="block font-bold text-surface-700 dark:text-surface-200 text-left">{aluno.nome}</span>
                                <span class="text-xs text-surface-400">{aluno.turmaNome}</span>
                            </div>
                            <span class="text-sm font-black text-green-600">{aluno.taxa}%</span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    {#if turmaAtiva && !searchTerm}
        <div class="bg-white dark:bg-surface-800 rounded-3xl p-6 border-2 border-surface-100 dark:border-surface-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <GraduationCap size={32} />
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-surface-900 dark:text-white">{turmaAtiva.nome}</h2>
                    <p class="text-surface-500">{turmaAtiva.disciplina}</p>
                </div>
            </div>

            <div class="flex gap-8 text-center">
                <div>
                    <span class="text-xs font-bold uppercase text-surface-400">Média da Turma</span>
                    <div class="text-3xl font-black {turmaAtiva.mediaTurma < 50 ? 'text-red-500' : 'text-primary-500'}">
                        {turmaAtiva.mediaTurma}%
                    </div>
                </div>
                <div class="w-px bg-surface-200 dark:bg-surface-700"></div>
                <div>
                    <span class="text-xs font-bold uppercase text-surface-400">Alunos</span>
                    <div class="text-3xl font-black text-surface-900 dark:text-white">
                        {turmaAtiva.totalAlunos}
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <div class="bg-white dark:bg-surface-800 rounded-3xl border-2 border-surface-100 dark:border-surface-700 overflow-hidden shadow-sm">
        <div class="p-6 border-b border-surface-100 dark:border-surface-700 flex justify-between items-center">
            <h3 class="text-lg font-bold">
                Lista de Estudantes
                <span class="ml-2 text-sm font-normal text-surface-500">({listaExibicao.length})</span>
            </h3>
        </div>

        <div class="divide-y divide-surface-100 dark:divide-surface-700">
            {#each listaExibicao as aluno}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                    class="p-4 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-all cursor-pointer group flex items-center justify-between"
                    on:click={() => verRelatorio(aluno.id)}
                >
                    <div class="flex items-center gap-4">
   <div class={`w-12 h-12 rounded-xl ${getAvatarColor(aluno.nome)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                            {aluno.nome.charAt(0)}
                                        </div>
                        
                        <div>
                            <h4 class="font-bold text-surface-900 dark:text-white text-lg group-hover:text-primary-500 transition-colors">
                                {aluno.nome}
                            </h4>
                            <div class="flex items-center gap-3 text-sm text-surface-500">
                                <span class="px-2 py-0.5 rounded-md text-xs font-bold uppercase {getStatusColor(aluno.status)}">
                                    {#if aluno.status === 'danger'} Risco
                                    {:else if aluno.status === 'warning'} Atenção
                                    {:else if aluno.status === 'neutral'} Sem Dados
                                    {:else} Bom
                                    {/if}
                                </span>
                                
                                {#if selectedClassId === 'all'}
                                    <span class="text-surface-400">• {aluno.turmaNome}</span>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-6">
                        <div class="text-right hidden md:block">
                            <span class="block text-xs font-bold uppercase text-surface-400">Aproveitamento</span>
                            <span class="font-bold text-lg {aluno.taxa < 50 ? 'text-red-500' : 'text-surface-900 dark:text-white'}">
                                {aluno.taxa}%
                            </span>
                        </div>
                        <button class="btn btn-icon variant-soft-surface group-hover:variant-filled-primary transition-all rounded-xl">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            {/each}

            {#if listaExibicao.length === 0}
                <div class="p-12 text-center text-surface-500">
                    <User size={48} class="mx-auto mb-4 opacity-20" />
                    <p>Nenhum aluno encontrado.</p>
                </div>
            {/if}
        </div>
    </div>

  {/if}
</div>