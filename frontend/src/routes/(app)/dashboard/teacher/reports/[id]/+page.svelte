<svelte:head>
    <title>Relatório do Aluno | KaniMente</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  import { 
    ArrowLeft, AlertTriangle, TrendingUp, Clock, 
    Calendar, FileText, Loader, Award, ChevronDown, ChevronUp,
    Target, MessageSquare, Zap, BookOpen, Download,
    CheckCircle2, XCircle, HelpCircle
  } from 'lucide-svelte';

  // --- ESTADO ---
  const studentId = $page.params.id;
  let report: any = null;
  let isLoading = true;
  let isExporting = false;
  let error: string | null = null;
  let timeRange = 'all';
  let expandedActivities = false;

  // Estilos Padronizados
  const selectClass = "bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium text-surface-700 dark:text-surface-200 py-1.5 pl-3 pr-8 appearance-none cursor-pointer shadow-sm transition-all hover:border-surface-400";

  $: timeRange, carregarRelatorio();

  async function carregarRelatorio() {
    isLoading = true;
    error = null;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/teacher/report/${studentId}?range=${timeRange}`);
      if (res.ok) {
        report = await res.json();
      } else {
        throw new Error('Falha ao carregar relatório');
      }
    } catch (err) {
      error = 'Não foi possível carregar os dados do aluno.';
    } finally {
      isLoading = false;
    }
  }

  async function exportarPDF() {
    isExporting = true;
    try {
      const response = await apiFetch(
        `${PUBLIC_API_URL_HOST}/api/pdf/student/${studentId}/report/pdf?range=${timeRange}`,
        { method: 'GET', headers: { 'Accept': 'application/pdf' } }
      );
      if (!response.ok) throw new Error('Erro ao gerar PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_${report.aluno.nome}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notifications.send('PDF gerado com sucesso!', 'success');
    } catch (e) {
      notifications.send('Falha ao exportar o PDF.', 'error');
    } finally {
      isExporting = false;
    }
  }

  // Helpers de Cores
  function getScoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getAvatarColor(name: string) {
    if (!name) return 'bg-surface-500';
    const gradients = [
        'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
        'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'
    ];
    return gradients[name.charCodeAt(0) % gradients.length];
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function getActivityIcon(type: string) {
      switch(type) {
          case 'RUSH': return Zap;
          case 'TUTOR': return MessageSquare;
          default: return FileText;
      }
  }
</script>

<div class="container mx-auto max-w-7xl p-4 md:p-8 pb-24 space-y-6 animate-fade-in">

  <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
    <div class="flex items-center gap-3">
        <button on:click={() => history.back()} class="p-2 -ml-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-500 hover:text-primary-600">
            <ArrowLeft size={20} />
        </button>
        <div>
            <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Relatório Individual</h1>
        </div>
    </div>

    <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:flex-none">
            <select bind:value={timeRange} class={selectClass}>
                <option value="all">Todo o Período</option>
                <option value="30d">Últimos 30 Dias</option>
                <option value="7d">Últimos 7 Dias</option>
            </select>
            <Calendar size={14} class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400" />
        </div>

        <button 
            class="btn bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            on:click={exportarPDF}
            disabled={isExporting || !report}
        >
            {#if isExporting}
                <Loader size={14} class="animate-spin" />
                <span class="hidden sm:inline">A gerar...</span>
            {:else}
                <Download size={14} />
                <span class="hidden sm:inline">Exportar PDF</span>
            {/if}
        </button>
    </div>
  </div>

  {#if isLoading}
    <div class="space-y-6 animate-pulse">
        <div class="h-40 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 h-64 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
            <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
        </div>
    </div>
  {:else if error}
    <div class="p-12 text-center rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
        <AlertTriangle size={32} class="mx-auto text-red-500 mb-3" />
        <h3 class="font-bold text-red-800 dark:text-red-200">Erro ao carregar dados</h3>
        <p class="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
        <button class="mt-4 text-sm font-medium underline text-red-700 hover:text-red-800" on:click={carregarRelatorio}>Tentar novamente</button>
    </div>
  {:else if report}
    
    <div class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
        <div class="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 md:gap-8">
            <div class="flex gap-5">
                <div class={`w-16 h-16 rounded-lg ${getAvatarColor(report.aluno.nome)} flex items-center justify-center text-white font-bold text-2xl shadow-sm ring-4 ring-surface-50 dark:ring-surface-800`}>
                    {report.aluno.nome.charAt(0)}
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-surface-900 dark:text-white leading-tight">{report.aluno.nome} {report.aluno.sobrenome}</h2>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-surface-500">
                        <span class="font-medium flex items-center gap-1.5"><Target size={14}/> {report.aluno.classe}ª Classe</span>
                        <span class="hidden sm:inline w-1 h-1 bg-surface-300 rounded-full"></span>
                        <span class="flex items-center gap-1.5"><Award size={14} class="text-amber-500"/> {report.stats.xp} XP</span>
                    </div>
                </div>
            </div>

            <div class="flex gap-8 md:border-l border-surface-100 dark:border-surface-700 md:pl-8 pt-4 md:pt-0 border-t md:border-t-0">
                <div>
                    <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider">Média Global</span>
                    <div class="text-3xl font-black {getScoreColor(report.stats.taxaGlobal)}">
                        {report.stats.taxaGlobal}%
                    </div>
                </div>
                <div>
                    <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider">Interações</span>
                    <div class="text-3xl font-black text-surface-900 dark:text-white">
                        {report.stats.totalInteracoes}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div class="lg:col-span-2 space-y-6">
            
            {#if report.atencaoNecessaria.length > 0}
                <section class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-5">
                    <h3 class="text-red-800 dark:text-red-300 text-sm font-bold uppercase tracking-wide flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} />
                        Tópicos Críticos
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {#each report.atencaoNecessaria as item}
                            <div class="bg-white dark:bg-surface-800 px-4 py-3 rounded-md border border-red-100 dark:border-red-900/40 shadow-sm flex items-center justify-between">
                                <span class="text-sm font-semibold text-surface-700 dark:text-surface-200 truncate pr-2">{item.topico}</span>
                                <span class="text-xs font-black text-white bg-red-500 px-1.5 py-0.5 rounded">{item.taxa}%</span>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            <section class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-6 shadow-sm">
                <h3 class="text-base font-bold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp size={18} class="text-surface-400" />
                    Domínio por Disciplina
                </h3>
                <div class="space-y-6">
                    {#each report.disciplinas as disc}
                        <div>
                            <div class="flex justify-between text-sm font-bold mb-1.5">
                                <span class="text-surface-700 dark:text-surface-300">{disc.disciplina}</span>
                                <span class={getScoreColor(disc.taxa)}>{disc.taxa}%</span>
                            </div>
                            <div class="h-2 w-full bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div 
                                    class="h-full rounded-full transition-all duration-1000 {disc.taxa < 50 ? 'bg-red-500' : disc.taxa < 70 ? 'bg-amber-500' : 'bg-emerald-500'}" 
                                    style="width: {disc.taxa}%"
                                ></div>
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        </div>

        <aside class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-6 shadow-sm h-fit">
            <h3 class="text-base font-bold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
                <Clock size={18} class="text-surface-400" />
                Atividade Recente
            </h3>

            <div class="relative pl-4 border-l border-surface-200 dark:border-surface-700 space-y-6">
                {#each report.historicoRecente.slice(0, expandedActivities ? 10 : 5) as log}
                    <div class="relative pl-6 group">
                        <div class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-surface-800 {log.sucesso ? 'bg-emerald-500' : 'bg-surface-400'} ring-1 ring-surface-200 dark:ring-surface-600"></div>
                        
                        <div>
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="text-[10px] font-bold text-surface-400 uppercase tracking-wide">{formatDate(log.data)}</span>
                                <span class="text-[10px] px-1.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 uppercase font-bold border border-surface-200 dark:border-surface-600">
                                    {log.tipo}
                                </span>
                            </div>
                            <h4 class="text-sm font-bold text-surface-800 dark:text-surface-200 leading-snug group-hover:text-primary-600 transition-colors">
                                {log.topico}
                            </h4>
                            {#if log.detalhes}
                                <p class="text-xs text-surface-500 mt-1 line-clamp-2">{log.detalhes}</p>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            {#if report.historicoRecente.length > 5}
                <button 
                    on:click={() => expandedActivities = !expandedActivities}
                    class="w-full mt-6 py-2 text-xs font-bold text-surface-500 hover:text-surface-900 hover:bg-surface-50 dark:hover:bg-surface-700/50 rounded transition-colors flex items-center justify-center gap-1"
                >
                    {expandedActivities ? 'Ver Menos' : 'Ver Mais Histórico'}
                    {#if expandedActivities} <ChevronUp size={14} /> {:else} <ChevronDown size={14} /> {/if}
                </button>
            {/if}
        </aside>
    </div>
  {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>