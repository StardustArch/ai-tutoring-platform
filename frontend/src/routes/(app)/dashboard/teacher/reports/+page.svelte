<script lang="ts">
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import { 
    BarChart3, Search, TrendingUp, AlertTriangle, 
    ChevronRight, User, Users, GraduationCap, Activity,
    Filter
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

  // Estilo Padronizado
  const inputClass = "w-full pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 transition-colors";

  $: todosAlunos = turmasReports.flatMap(t => t.alunos);

  $: listaExibicao = (selectedClassId === 'all' ? todosAlunos : turmasReports.find(t => t.id === selectedClassId)?.alunos || [])
    .filter(a => searchTerm === '' || a.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  $: turmaAtiva = selectedClassId !== 'all' ? turmasReports.find(t => t.id === selectedClassId) : null;

  function verRelatorio(alunoId: number) {
    goto(`/dashboard/teacher/reports/${alunoId}`); 
  }

  function getStatusBadge(status: string) {
    switch(status) {
        case 'danger': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
        case 'warning': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
        case 'good': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        default: return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300 border-surface-200';
    }
  }

  function getAvatarColor(name: string) {
    if (!name) return 'bg-surface-500';
    const gradients = [
        'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
        'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'
    ];
    return gradients[name.charCodeAt(0) % gradients.length];
  }
</script>

<div class="container mx-auto max-w-8xl p-4 md:p-8 pb-24 space-y-8 animate-fade-in">

  <header class="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-surface-200 dark:border-surface-700 pb-6">
    <div>
      <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
        <BarChart3 class="text-primary-600" size={28} />
        Relatórios Académicos
      </h1>
      <p class="text-surface-500 mt-1">Análise de desempenho consolidada por turma e aluno.</p>
    </div>

    <div class="relative w-full md:max-w-xs">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
            <Search size={18} />
        </div>
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Procurar aluno..."
            class={inputClass}
        />
    </div>
  </header>

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        <div class="h-10 bg-surface-200 rounded-lg"></div>
        <div class="h-10 bg-surface-200 rounded-lg"></div>
        <div class="h-10 bg-surface-200 rounded-lg"></div>
    </div>
  {:else}

    <div class="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button 
            class="px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all border text-sm
            {selectedClassId === 'all' 
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm' 
                : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-surface-200 dark:border-surface-700 hover:bg-surface-50'}"
            on:click={() => selectedClassId = 'all'}
        >
            Visão Geral
        </button>
        
        <div class="w-px h-6 bg-surface-200 dark:bg-surface-700 mx-1 shrink-0"></div>

        {#each turmasReports as turma}
            <button 
                class="px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all border text-sm flex items-center gap-2
                {selectedClassId === turma.id 
                    ? 'border-primary-500 text-primary-700 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400' 
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-surface-200 dark:border-surface-700 hover:border-primary-300'}"
                on:click={() => selectedClassId = turma.id}
            >
                {turma.nome}
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-600">
                    {turma.mediaTurma}%
                </span>
            </button>
        {/each}
    </div>

    {#if selectedClassId === 'all' && !searchTerm}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-5 border-l-4 border-l-red-500 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <div class="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                        <AlertTriangle size={20} />
                    </div>
                    <h3 class="font-bold text-surface-900 dark:text-surface-100">Atenção Prioritária</h3>
                </div>
                <div class="space-y-2">
                    {#each todosAlunos.filter(a => a.status === 'danger').slice(0, 3) as aluno}
                        <button 
                            class="w-full flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                            on:click={() => verRelatorio(aluno.id)}
                        >
                            <div class="text-left">
                                <span class="block text-sm font-bold text-surface-900 dark:text-surface-100">{aluno.nome}</span>
                                <span class="text-[10px] uppercase font-bold text-surface-400">{aluno.turmaNome}</span>
                            </div>
                            <span class="text-sm font-black text-red-600">{aluno.taxa}%</span>
                        </button>
                    {/each}
                    {#if todosAlunos.filter(a => a.status === 'danger').length === 0}
                        <p class="text-xs text-surface-500 py-2">Excelente! Nenhum aluno abaixo da média.</p>
                    {/if}
                </div>
            </div>

            <div class="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-5 border-l-4 border-l-emerald-500 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <div class="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                        <TrendingUp size={20} />
                    </div>
                    <h3 class="font-bold text-surface-900 dark:text-surface-100">Top Desempenho</h3>
                </div>
                <div class="space-y-2">
                    {#each todosAlunos.filter(a => a.status === 'good').sort((a,b) => b.taxa - a.taxa).slice(0, 3) as aluno}
                        <button 
                            class="w-full flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30"
                            on:click={() => verRelatorio(aluno.id)}
                        >
                             <div class="text-left">
                                <span class="block text-sm font-bold text-surface-900 dark:text-surface-100">{aluno.nome}</span>
                                <span class="text-[10px] uppercase font-bold text-surface-400">{aluno.turmaNome}</span>
                            </div>
                            <span class="text-sm font-black text-emerald-600">{aluno.taxa}%</span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    {#if turmaAtiva && !searchTerm}
        <div class="bg-white dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 border border-primary-200 dark:border-primary-800">
                    <GraduationCap size={28} />
                </div>
                <div>
                    <h2 class="text-xl font-bold text-surface-900 dark:text-white leading-tight">{turmaAtiva.nome}</h2>
                    <p class="text-sm text-surface-500">{turmaAtiva.disciplina}</p>
                </div>
            </div>

            <div class="flex gap-8 text-center w-full md:w-auto border-t md:border-t-0 md:border-l border-surface-100 dark:border-surface-700 pt-4 md:pt-0 md:pl-8">
                <div>
                    <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider">Média</span>
                    <div class="text-2xl font-black {turmaAtiva.mediaTurma < 50 ? 'text-red-500' : 'text-primary-600'}">
                        {turmaAtiva.mediaTurma}%
                    </div>
                </div>
                <div>
                    <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider">Alunos</span>
                    <div class="text-2xl font-black text-surface-900 dark:text-white">
                        {turmaAtiva.totalAlunos}
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <div class="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden shadow-sm">
        <div class="p-4 bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700 flex justify-between items-center">
            <h3 class="text-sm font-bold uppercase tracking-wider text-surface-500">
                Estudantes ({listaExibicao.length})
            </h3>
        </div>

        <div class="divide-y divide-surface-100 dark:divide-surface-700">
            {#each listaExibicao as aluno}
                <div 
                    class="p-4 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-all cursor-pointer group flex items-center justify-between"
                    on:click={() => verRelatorio(aluno.id)}
                >
                    <div class="flex items-center gap-4">
                        <div class={`w-10 h-10 rounded-full ${getAvatarColor(aluno.nome)} flex items-center justify-center text-white font-bold text-sm ring-2 ring-white dark:ring-surface-800`}>
                            {aluno.nome.charAt(0)}
                        </div>
                        
                        <div>
                            <h4 class="font-bold text-surface-900 dark:text-white text-sm group-hover:text-primary-600 transition-colors">
                                {aluno.nome}
                            </h4>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase {getStatusBadge(aluno.status)}">
                                    {#if aluno.status === 'danger'} Risco
                                    {:else if aluno.status === 'warning'} Atenção
                                    {:else if aluno.status === 'neutral'} S/ Dados
                                    {:else} Bom
                                    {/if}
                                </span>
                                {#if selectedClassId === 'all'}
                                    <span class="text-[10px] font-bold text-surface-400 uppercase tracking-tight">/ {aluno.turmaNome}</span>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-6">
                        <div class="text-right hidden sm:block">
                            <span class="block text-[10px] font-bold uppercase text-surface-400">Nota</span>
                            <span class="font-bold text-base {aluno.taxa < 50 ? 'text-red-500' : 'text-surface-900 dark:text-white'}">
                                {aluno.taxa}%
                            </span>
                        </div>
                        <ChevronRight size={18} class="text-surface-300 group-hover:text-primary-500 transition-all" />
                    </div>
                </div>
            {/each}

            {#if listaExibicao.length === 0}
                <div class="p-12 text-center text-surface-500">
                    <User size={40} class="mx-auto mb-2 opacity-20" />
                    <p class="text-sm">Nenhum aluno encontrado.</p>
                </div>
            {/if}
        </div>
    </div>

  {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { height: 4px; }
    .animate-fade-in {
        animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>