<svelte:head>
    <title>Relatórios Académicos | KMind</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { 
    BarChart3, Search, TrendingUp, AlertTriangle, 
    ChevronRight, User, Users, GraduationCap, Activity,
    ArrowUpRight, FileBarChart
  } from 'lucide-svelte';

  // --- Tipos ---
  interface AlunoStat {
    id: number;
    nome: string;
    taxa: number; // 0 a 100
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

  // Computed
  $: todosAlunos = turmasReports.flatMap(t => t.alunos);

  $: listaExibicao = (selectedClassId === 'all' ? todosAlunos : turmasReports.find(t => t.id === selectedClassId)?.alunos || [])
    .filter(a => searchTerm === '' || a.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  $: turmaAtiva = selectedClassId !== 'all' ? turmasReports.find(t => t.id === selectedClassId) : null;

  // Helpers
  function verRelatorio(alunoId: number) {
    goto(`/dashboard/teacher/reports/${alunoId}`); 
  }

  function getStatusBadge(status: string) {
    switch(status) {
        case 'danger': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
        case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
        case 'good': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
        default: return 'bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-700 dark:text-surface-400 dark:border-surface-600';
    }
  }

  function getStatusLabel(status: string) {
      switch(status) {
          case 'danger': return 'Risco';
          case 'warning': return 'Atenção';
          case 'good': return 'Bom';
          default: return 'Sem Dados';
      }
  }

  function getInitials(name: string) {
      return name ? name.substring(0, 2).toUpperCase() : '--';
  }
</script>

<div class="container mx-auto max-w-7xl p-4 md:p-8 space-y-6 animate-fade-in pb-24">

  <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
    <div>
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2">
        Relatórios Académicos
      </h1>
      <p class="text-surface-500 text-sm mt-1">
        Acompanhe o desempenho das suas turmas e alunos em tempo real.
      </p>
    </div>

    <div class="relative w-full md:max-w-xs">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Filtrar por aluno..."
            class="w-full pl-9 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-surface-800 text-sm transition-all shadow-sm"
        />
    </div>
  </header>

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        <div class="h-10 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
        <div class="h-10 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
        <div class="h-10 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
    </div>
  {:else}

    <div class="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
        <button 
            class="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border
            {selectedClassId === 'all' 
                ? 'bg-surface-900 text-white border-surface-900 dark:bg-surface-100 dark:text-surface-900' 
                : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-surface-300'}"
            on:click={() => selectedClassId = 'all'}
        >
            Visão Geral
        </button>
        
        <div class="w-px h-5 bg-surface-300 dark:bg-surface-700 mx-1 shrink-0"></div>

        {#each turmasReports as turma}
            <button 
                class="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border flex items-center gap-2
                {selectedClassId === turma.id 
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm' 
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700'}"
                on:click={() => selectedClassId = turma.id}
            >
                {turma.nome}
                <span class="text-[10px] px-1.5 rounded-full bg-white/20 text-current opacity-90 font-bold">
                    {turma.mediaTurma}%
                </span>
            </button>
        {/each}
    </div>

    {#if selectedClassId === 'all' && !searchTerm}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-5 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <AlertTriangle size={18} class="text-red-500" />
                        <h3 class="font-bold text-surface-900 dark:text-surface-100 text-sm uppercase tracking-wide">Atenção Necessária</h3>
                    </div>
                </div>
                <div class="space-y-3">
                    {#each todosAlunos.filter(a => a.status === 'danger').slice(0, 3) as aluno}
                        <button 
                            class="w-full flex items-center justify-between p-3 rounded-md bg-surface-50 dark:bg-surface-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800 group"
                            on:click={() => verRelatorio(aluno.id)}
                        >
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold">
                                    {getInitials(aluno.nome)}
                                </div>
                                <div class="text-left">
                                    <span class="block text-sm font-bold text-surface-900 dark:text-surface-100 group-hover:text-red-700 transition-colors">{aluno.nome}</span>
                                    <span class="text-[10px] uppercase font-semibold text-surface-400">{aluno.turmaNome}</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="block text-sm font-black text-red-600">{aluno.taxa}%</span>
                                <span class="text-[10px] text-surface-400">Média</span>
                            </div>
                        </button>
                    {/each}
                    {#if todosAlunos.filter(a => a.status === 'danger').length === 0}
                        <div class="py-4 text-center text-sm text-surface-500 bg-surface-50 dark:bg-surface-900/30 rounded-md">
                            Excelente! Nenhum aluno em risco crítico.
                        </div>
                    {/if}
                </div>
            </div>

            <div class="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-5 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <TrendingUp size={18} class="text-emerald-500" />
                        <h3 class="font-bold text-surface-900 dark:text-surface-100 text-sm uppercase tracking-wide">Top Desempenho</h3>
                    </div>
                </div>
                <div class="space-y-3">
                    {#each todosAlunos.filter(a => a.status === 'good').sort((a,b) => b.taxa - a.taxa).slice(0, 3) as aluno}
                        <button 
                            class="w-full flex items-center justify-between p-3 rounded-md bg-surface-50 dark:bg-surface-900/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 group"
                            on:click={() => verRelatorio(aluno.id)}
                        >
                             <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                                    {getInitials(aluno.nome)}
                                </div>
                                <div class="text-left">
                                    <span class="block text-sm font-bold text-surface-900 dark:text-surface-100 group-hover:text-emerald-700 transition-colors">{aluno.nome}</span>
                                    <span class="text-[10px] uppercase font-semibold text-surface-400">{aluno.turmaNome}</span>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="block text-sm font-black text-emerald-600">{aluno.taxa}%</span>
                                <span class="text-[10px] text-surface-400">Média</span>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    {#if turmaAtiva && !searchTerm}
        <div class="bg-white dark:bg-surface-800 rounded-lg p-6 border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800">
                    <GraduationCap size={24} />
                </div>
                <div>
                    <h2 class="text-lg font-bold text-surface-900 dark:text-white leading-tight">{turmaAtiva.nome}</h2>
                    <p class="text-sm text-surface-500">{turmaAtiva.disciplina}</p>
                </div>
            </div>

            <div class="flex gap-8 text-center w-full md:w-auto border-t md:border-t-0 md:border-l border-surface-100 dark:border-surface-700 pt-4 md:pt-0 md:pl-8">
                <div>
                    <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider">Média da Turma</span>
                    <div class="text-2xl font-black {turmaAtiva.mediaTurma < 50 ? 'text-red-500' : 'text-surface-900 dark:text-white'}">
                        {turmaAtiva.mediaTurma}%
                    </div>
                </div>
                <div>
                    <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider">Total Alunos</span>
                    <div class="text-2xl font-black text-surface-900 dark:text-white">
                        {turmaAtiva.totalAlunos}
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <div class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-surface-100 dark:border-surface-700 flex justify-between items-center bg-surface-50/50 dark:bg-surface-800/50">
            <h3 class="text-xs font-bold uppercase tracking-wider text-surface-500 flex items-center gap-2">
                <Users size={14} />
                Lista de Estudantes
            </h3>
            <span class="text-xs font-medium text-surface-400">
                Mostrando {listaExibicao.length}
            </span>
        </div>

        {#if listaExibicao.length === 0}
            <div class="p-12 text-center text-surface-500">
                <p class="text-sm">Nenhum aluno encontrado.</p>
            </div>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-surface-500 uppercase bg-surface-50 dark:bg-surface-900/30 border-b border-surface-100 dark:border-surface-700">
                        <tr>
                            <th class="px-6 py-3 font-semibold w-1/3">Estudante</th>
                            {#if selectedClassId === 'all'}
                                <th class="px-6 py-3 font-semibold hidden sm:table-cell">Turma</th>
                            {/if}
                            <th class="px-6 py-3 font-semibold">Status</th>
                            <th class="px-6 py-3 font-semibold">Média</th>
                            <th class="px-6 py-3 font-semibold text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-100 dark:divide-surface-700">
                        {#each listaExibicao as aluno}
                            <tr 
                                class="bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors cursor-pointer group"
                                on:click={() => verRelatorio(aluno.id)}
                            >
                                <td class="px-6 py-3">
                                    <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/30">
                                                {getInitials(aluno.nome)}
                                            </div>
                                        <span class="font-medium text-surface-900 dark:text-white group-hover:text-primary-600 transition-colors">
                                            {aluno.nome}
                                        </span>
                                    </div>
                                </td>
                                {#if selectedClassId === 'all'}
                                    <td class="px-6 py-3 text-surface-500 hidden sm:table-cell">
                                        {aluno.turmaNome}
                                    </td>
                                {/if}
                                <td class="px-6 py-3">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border {getStatusBadge(aluno.status)}">
                                        {getStatusLabel(aluno.status)}
                                    </span>
                                </td>
                                <td class="px-6 py-3">
                                    <div class="flex items-center gap-3">
                                        <span class="font-bold text-surface-700 dark:text-surface-200 w-8">{aluno.taxa}%</span>
                                        <div class="w-24 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden hidden sm:block">
                                            <div 
                                                class="h-full rounded-full {aluno.taxa < 50 ? 'bg-red-500' : aluno.taxa < 70 ? 'bg-amber-500' : 'bg-emerald-500'}" 
                                                style="width: {aluno.taxa}%"
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-3 text-right">
                                    <button class="text-surface-400 hover:text-primary-600 transition-colors">
                                        <ArrowUpRight size={18} />
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>

  {/if}
</div>

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>