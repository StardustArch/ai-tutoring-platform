<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  import { 
    ArrowLeft, AlertTriangle, TrendingUp, Clock, 
    Calendar, FileText, Loader, Award, ChevronDown, ChevronUp,
    Target, MessageSquare, Zap, BookOpen, Download
  } from 'lucide-svelte';

  // --- ESTADO ---
  const studentId = $page.params.id;
  let report: any = null;
  let isLoading = true;
  let isExporting = false;
  let error: string | null = null;
  let timeRange = 'all';
  let expandedActivities = false;
  let showActivityDetails: number | null = null;

  // Estilos Padronizados
  const inputClass = "bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm font-bold text-surface-700 dark:text-surface-200 py-1.5 pl-3 pr-8 appearance-none cursor-pointer";

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
    return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  }
</script>

<div class="container mx-auto max-w-7xl p-4 md:p-8 pb-24 space-y-6 animate-fade-in">

  <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-surface-200 dark:border-surface-700 pb-6">
    <div class="flex items-center gap-3">
        <button on:click={() => history.back()} class="p-2 -ml-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-500">
            <ArrowLeft size={24} />
        </button>
        <h1 class="text-xl md:text-2xl font-bold text-surface-900 dark:text-surface-50">Relatório Detalhado</h1>
    </div>

    <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:flex-none">
            <select bind:value={timeRange} class={inputClass}>
                <option value="all">Todo o Período</option>
                <option value="30d">Últimos 30 Dias</option>
                <option value="7d">Últimos 7 Dias</option>
            </select>
            <Calendar size={14} class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400" />
        </div>

        <button 
            class="btn bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            on:click={exportarPDF}
            disabled={isExporting || !report}
        >
            {#if isExporting}
                <Loader size={16} class="animate-spin" />
                <span class="hidden sm:inline">A gerar...</span>
            {:else}
                <Download size={16} />
                <span class="hidden sm:inline">Exportar PDF</span>
            {/if}
        </button>
    </div>
  </div>

  {#if isLoading}
    <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-xl animate-pulse"></div>
  {:else if error}
    <div class="p-12 text-center bg-red-50 dark:bg-red-900/10 border border-red-200 rounded-xl">
        <AlertTriangle size={48} class="mx-auto text-red-500 mb-4" />
        <p class="text-red-700 dark:text-red-400 font-medium">{error}</p>
        <button class="mt-4 text-sm font-bold underline" on:click={carregarRelatorio}>Tentar novamente</button>
    </div>
  {:else if report}
    
    <div class="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
        <div class="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-8">
            <div class="flex gap-5">
                <div class={`w-16 h-16 rounded-xl ${getAvatarColor(report.aluno.nome)} flex items-center justify-center text-white font-bold text-2xl shadow-sm`}>
                    {report.aluno.nome.charAt(0)}
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-surface-900 dark:text-white">{report.aluno.nome} {report.aluno.sobrenome}</h2>
                    <div class="flex items-center gap-3 mt-1 text-sm text-surface-500">
                        <span class="font-medium">{report.aluno.classe}ª Classe</span>
                        <span class="w-1 h-1 bg-surface-300 rounded-full"></span>
                        <span class="flex items-center gap-1"><Award size={14} class="text-amber-500"/> {report.stats.xp} XP</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-8 md:border-l border-surface-100 dark:border-surface-700 md:pl-8">
                <div>
                    <span class="text-[10px] font-bold uppercase text-surface-400 tracking-widest">Proficiência</span>
                    <div class="text-3xl font-black {getScoreColor(report.stats.taxaGlobal)}">
                        {report.stats.taxaGlobal}%
                    </div>
                </div>
                <div>
                    <span class="text-[10px] font-bold uppercase text-surface-400 tracking-widest">Interações</span>
                    <div class="text-3xl font-black text-surface-900 dark:text-white">
                        {report.stats.totalInteracoes}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div class="lg:col-span-2 space-y-8">
            
            {#if report.atencaoNecessaria.length > 0}
                <section class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6">
                    <h3 class="text-red-800 dark:text-red-300 font-bold flex items-center gap-2 mb-4">
                        <AlertTriangle size={20} />
                        Tópicos Críticos (Abaixo de 50%)
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {#each report.atencaoNecessaria as item}
                            <div class="bg-white dark:bg-surface-800 p-3 rounded-lg border border-red-100 dark:border-red-900/40 shadow-sm flex items-center justify-between">
                                <span class="text-sm font-bold text-surface-700 dark:text-surface-200">{item.topico}</span>
                                <span class="text-xs font-black text-red-500">{item.taxa}%</span>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}

            <section class="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-6 shadow-sm">
                <h3 class="text-lg font-bold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp size={20} class="text-primary-500" />
                    Domínio por Disciplina
                </h3>
                <div class="space-y-6">
                    {#each report.disciplinas as disc}
                        <div>
                            <div class="flex justify-between text-sm font-bold mb-2">
                                <span class="text-surface-700 dark:text-surface-300">{disc.disciplina}</span>
                                <span class={getScoreColor(disc.taxa)}>{disc.taxa}%</span>
                            </div>
                            <div class="h-2 w-full bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div class="h-full bg-primary-500 transition-all duration-1000" style="width: {disc.taxa}%"></div>
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        </div>

        <aside class="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-6 shadow-sm h-fit">
            <h3 class="text-lg font-bold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
                <Clock size={20} class="text-primary-500" />
                Atividade Recente
            </h3>

            <div class="space-y-6 relative">
                <div class="absolute left-3 top-2 bottom-2 w-px bg-surface-200 dark:bg-surface-700"></div>

                {#each report.historicoRecente.slice(0, expandedActivities ? 10 : 5) as log}
                    <div class="relative pl-8 group">
                        <div class="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white dark:bg-surface-800 border-2 border-primary-500 flex items-center justify-center z-10">
                            <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                        </div>
                        
                        <div>
                            <p class="text-xs font-bold text-surface-400 uppercase">{formatDate(log.data)}</p>
                            <h4 class="text-sm font-bold text-surface-800 dark:text-surface-200 mt-0.5">{log.topico}</h4>
                            <p class="text-[11px] mt-1 inline-block px-2 py-0.5 rounded border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-surface-500">
                                {log.tipo}
                            </p>
                        </div>
                    </div>
                {/each}
            </div>

            {#if report.historicoRecente.length > 5}
                <button 
                    on:click={() => expandedActivities = !expandedActivities}
                    class="w-full mt-6 py-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors border border-primary-100 dark:border-primary-900/30"
                >
                    {expandedActivities ? 'Ver Menos' : 'Ver Histórico Completo'}
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