<script lang="ts">
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { 
    ArrowLeft, AlertTriangle, TrendingUp, Clock, 
    Calendar, FileText, Loader, Award, ChevronDown, ChevronUp,
    Target, MessageSquare, Zap, BookOpen
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

  // --- REACTIVIDADE ---
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
      console.error(err);
      error = 'Não foi possível carregar os dados.';
    } finally {
      isLoading = false;
    }
  }

  // --- 🖨️ FUNÇÃO EXPORTAR PDF ---
  async function exportarPDF() {
    isExporting = true;

    try {
      const response = await apiFetch(
        `${PUBLIC_API_URL_HOST}/api/pdf/student/${studentId}/report/pdf?range=${timeRange}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_${report.aluno.nome}_${timeRange}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      error = 'Falha ao exportar o PDF.';
    } finally {
      isExporting = false;
    }
  }

  // --- HELPERS ---
  function getInitials(name: string, surname: string) {
    return (name?.[0] || '') + (surname?.[0] || '');
  }
  
  function formatDate(dateString: string | Date) {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }

  function formatTime(dateString: string | Date) {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Helper para determinar ícone baseado no tipo de atividade
  function getActivityIcon(tipo: string) {
    if (tipo.includes('Tirou dúvida')) return MessageSquare;
    if (tipo.includes('Resolveu Exercício')) return Target;
    if (tipo.includes('Desafio Rápido')) return Zap;
    if (tipo.includes('Solicitou explicação')) return BookOpen;
    return Clock;
  }

  // Helper para cor baseada no tipo de atividade
  function getActivityColor(tipo: string) {
    if (tipo.includes('Acertou')) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100';
    if (tipo.includes('Errou') || tipo.includes('Precisa revisar')) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100';
    if (tipo.includes('Desafio')) return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100';
    return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100';
  }

  // Cores para UI
  function getScoreColorUI(score: number) {
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
  }
  
  function getScoreBarColorUI(score: number) {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  // Formatar período selecionado
  function getTimeRangeLabel(range: string) {
    const labels = {
      'all': 'Todo o Período',
      '30d': 'Últimos 30 Dias',
      '7d': 'Últimos 7 Dias'
    };
    return labels[range] || range;
  }

  // Função para calcular estatísticas rápidas
  function getQuickStats(historico: any[]) {
    const acertos = historico.filter(a => a.tipo.includes('Acertou')).length;
    const revisao = historico.filter(a => a.tipo.includes('revisar') || a.tipo.includes('Errou')).length;
    const duvidas = historico.filter(a => a.tipo.includes('dúvida')).length;
    const exercicios = historico.filter(a => a.tipo.includes('Exercício')).length;
    
    return { acertos, revisao, duvidas, exercicios };
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

<div class="max-w-8xl mx-auto p-4 md:p-6 pb-20 space-y-8 animate-fade-in relative">

  <!-- CABEÇALHO COM CONTROLES -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <button on:click={() => history.back()} class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
            <ArrowLeft size={24} class="text-surface-600 dark:text-surface-300"/>
        </button>
      {#if report}
        <div class="hidden md:block w-px h-6 bg-surface-200 dark:bg-surface-700"></div>
        <div class="hidden md:flex items-center gap-2 text-sm text-surface-500">
          <Calendar size={14} />
          <span>Período: <span class="font-bold text-surface-700 dark:text-surface-300">{getTimeRangeLabel(timeRange)}</span></span>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 bg-white dark:bg-surface-800 p-1.5 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md transition-shadow">
        <div class="pl-2 text-surface-400"><Calendar size={16} /></div>
        <select bind:value={timeRange} class="bg-transparent border-none text-sm font-bold text-surface-700 dark:text-surface-200 focus:ring-0 cursor-pointer py-1 pr-8 appearance-none">
          <option value="all">Todo o Período</option>
          <option value="30d">Últimos 30 Dias</option>
          <option value="7d">Últimos 7 Dias</option>
        </select>
      </div>

      <button 
        class="btn variant-filled-primary rounded-xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
        on:click={exportarPDF} 
        disabled={isExporting || !report}
      >
        {#if isExporting} 
          <Loader size={18} class="animate-spin" /> 
          <span class="hidden md:inline">Gerando...</span>
        {:else} 
          <FileText size={18} /> 
          <span class="hidden md:inline">Exportar PDF</span>
          <span class="md:hidden">PDF</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- LOADING STATE -->
  {#if isLoading}
    <div class="space-y-6 animate-pulse">
      <div class="h-48 bg-surface-200 dark:bg-surface-800 rounded-3xl"></div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-3xl"></div>
          <div class="h-80 bg-surface-200 dark:bg-surface-800 rounded-3xl"></div>
        </div>
        <div class="h-80 bg-surface-200 dark:bg-surface-800 rounded-3xl"></div>
      </div>
    </div>
  
  <!-- ERROR STATE -->
  {:else if error}
    <div class="p-8 md:p-12 text-center border-2 border-red-100 dark:border-red-900/30 rounded-3xl bg-red-50 dark:bg-red-900/10">
      <AlertTriangle size={48} class="mx-auto text-red-500 dark:text-red-400 mb-4" />
      <h3 class="text-xl font-bold text-red-800 dark:text-red-200 mb-2">{error}</h3>
      <p class="text-red-600 dark:text-red-300 mb-6">Verifique sua conexão e tente novamente.</p>
      <button class="btn variant-outline-error font-medium" on:click={carregarRelatorio}>
        Tentar Novamente
      </button>
    </div>
  
  <!-- REPORT DATA -->
  {:else if report}
    
          <!-- CARD PRINCIPAL DO ALUNO -->
          <div class="bg-white dark:bg-surface-800 rounded-3xl p-6 md:p-8 shadow-lg border-2 border-surface-100 dark:border-surface-700 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div class="absolute bottom-0 left-0 w-48 h-48 bg-tertiary-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div class="flex items-start md:items-center gap-6">
<div class={`w-12 h-12 rounded-xl ${getAvatarColor(report.aluno.nome)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                            {report.aluno.nome.charAt(0)}
                                        </div>
                <div>
                  <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-white mb-2">
                    {report.aluno.nome} {report.aluno.sobrenome}
                  </h1>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 rounded-lg text-sm font-medium text-surface-700 dark:text-surface-300">
                      {report.aluno.classe}ª Classe
                    </span>
                    <span class="flex items-center gap-1.5 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      <Award size={14} /> {report.stats.xp} XP
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="flex gap-6 md:gap-10">
                <div class="text-center">
                  <div class="text-xs font-bold uppercase text-surface-400 tracking-wider mb-1">Proficiência</div>
                  <div class="text-3xl md:text-4xl font-black mt-1 flex items-center justify-center gap-1 {getScoreColorUI(report.stats.taxaGlobal)} px-4 py-2 rounded-2xl">
                    {report.stats.taxaGlobal}%
                  </div>
                </div>
                <div class="w-px bg-surface-200 dark:bg-surface-700 self-stretch"></div>
                <div class="text-center">
                  <div class="text-xs font-bold uppercase text-surface-400 tracking-wider mb-1">Atividades</div>
                  <div class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white mt-1">
                    {report.stats.totalInteracoes}
                  </div>
                  <div class="text-xs text-surface-500 mt-1">
                    {report.stats.rush.total} rush • {report.stats.tutor.total} tutor
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CONTEÚDO PRINCIPAL -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            
            <!-- COLUNA ESQUERDA (2/3) -->
            <div class="lg:col-span-2 space-y-6 md:space-y-8">
              
              <!-- TÓPICOS DE ATENÇÃO -->
              {#if report.atencaoNecessaria.length > 0}
                <div class="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border-2 border-red-100 dark:border-red-900/30 rounded-3xl p-6 md:p-8">
                  <div class="flex items-center gap-3 mb-6">
                    <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                      <AlertTriangle size={24} class="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 class="text-lg md:text-xl font-bold text-red-800 dark:text-red-300">Tópicos que Necessitam de Atenção</h3>
                      <p class="text-sm text-red-600 dark:text-red-400 mt-1">
                        Aluno com dificuldades nestes tópicos (taxa de acerto abaixo de 60%)
                      </p>
                    </div>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {#each report.atencaoNecessaria as item, i}
                      <div class="bg-white/80 dark:bg-surface-800/80 p-4 rounded-xl border border-red-200 dark:border-red-900/40 shadow-sm hover:shadow-md transition-shadow hover:scale-[1.02] active:scale-100 transition-transform">
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <div class="flex items-center gap-2 mb-1">
                              <div class="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <span class="text-xs font-bold text-red-700 dark:text-red-400">{i + 1}</span>
                              </div>
                              <span class="font-bold text-surface-800 dark:text-surface-200">{item.topico}</span>
                            </div>
                            <span class="text-xs uppercase text-surface-500 font-semibold tracking-wide bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded-md">
                              {item.disciplina}
                            </span>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- DESEMPENHO POR DISCIPLINA -->
              <div class="bg-white dark:bg-surface-800 rounded-3xl p-6 md:p-8 shadow-sm border-2 border-surface-100 dark:border-surface-700">
                <h3 class="text-xl font-bold flex items-center gap-3 mb-6">
                  <div class="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                    <TrendingUp size={20} class="text-primary-600 dark:text-primary-400" />
                  </div>
                  Desempenho por Disciplina
                </h3>
                
                <div class="space-y-6 md:space-y-8">
                  {#each report.disciplinas as disc}
                    <div class="group hover:bg-surface-50 dark:hover:bg-surface-900 p-3 rounded-xl transition-colors shadow-sm hover:shadow-md transition-shadow hover:scale-[1.02] active:scale-100 transition-transform">
                      <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center gap-3">
                          <span class="font-bold text-lg text-surface-800 dark:text-surface-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {disc.disciplina}
                          </span>
                          {#if disc.total > 0}
                            <span class="text-xs font-medium px-2 py-1 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
                              {disc.total} ativid.
                            </span>
                          {/if}
                        </div>
                        <span class="font-mono font-bold text-lg px-3 py-1.5 rounded-lg {getScoreColorUI(disc.taxa)}">
                          {disc.taxa}%
                        </span>
                      </div>
                      
                      <div class="space-y-2">
                        <div class="h-3 w-full bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div 
                            class="h-full {getScoreBarColorUI(disc.taxa)} transition-all duration-1000 ease-out group-hover:brightness-110" 
                            style="width: {disc.taxa}%"
                          ></div>
                        </div>
                        <div class="flex justify-between text-xs text-surface-500">
                          <span>0%</span>
                          <span class="font-medium">Taxa de Acerto</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>
                  {:else}
                    <div class="text-center py-8 text-surface-500">
                      <p class="font-medium">Nenhuma atividade registrada neste período</p>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

      <!-- COLUNA DIREITA (1/3) - ATIVIDADES RECENTES EXPANSÍVEL -->
      <div class="space-y-6 md:space-y-8">
            <div class="bg-white dark:bg-surface-800 rounded-3xl p-6 shadow-sm border-2 border-surface-100 dark:border-surface-700 h-full">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold flex items-center gap-3">
                  <div class="p-2 bg-tertiary-100 dark:bg-tertiary-900/20 rounded-lg">
                    <Clock size={20} class="text-tertiary-600 dark:text-tertiary-400" />
                  </div>
                  Atividades Recentes
                </h3>
                
                {#if report.historicoRecente.length > 3}
                  <button
                    on:click={() => expandedActivities = !expandedActivities}
                    class="flex items-center gap-1.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
                  >
                    {expandedActivities ? 'Ver menos' : `Ver mais ${report.historicoRecente.length - 3}`}
                    {#if expandedActivities}
                      <ChevronUp size={16} class="group-hover:-translate-y-0.5 transition-transform" />
                    {:else}
                      <ChevronDown size={16} class="group-hover:translate-y-0.5 transition-transform" />
                    {/if}
                  </button>
                {/if}
              </div>
              
              {#if report.historicoRecente.length === 0}
                <div class="text-center py-8 text-surface-500">
                  <Clock size={32} class="mx-auto mb-3 text-surface-300 dark:text-surface-600" />
                  <p class="font-medium">Nenhuma atividade recente</p>
                </div>
              {:else}
                <div class="space-y-6">
                  <!-- Mostrar sempre as 3 primeiras atividades -->
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                  {#each report.historicoRecente.slice(0, 3) as log, i}
                    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div 
                      class="relative pl-5 md:pl-6 group cursor-pointer"
                      on:click={() => showActivityDetails = showActivityDetails === i ? null : i}
                      on:keydown={(e) => e.key === 'Enter' && (showActivityDetails = showActivityDetails === i ? null : i)}
                      tabindex="0"
                    >
                      <!-- LINHA DO TEMPO -->
                      <div class="absolute left-0 top-3 w-3 h-3 rounded-full bg-tertiary-500 group-hover:scale-125 transition-transform z-10"></div>
                      <div class="absolute left-[5px] top-3 bottom-0 w-px bg-surface-200 dark:bg-surface-700 group-last:hidden"></div>
                      
                      <!-- CARD DA ATIVIDADE -->
                      <div class="bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-700 rounded-xl p-4 hover:border-tertiary-300 dark:hover:border-tertiary-700 transition-all hover:shadow-md">
                        <div class="flex justify-between items-start gap-3 mb-2">
                          <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                    {#if log.tipo.includes('Tirou dúvida')}
                                    <MessageSquare size={14} class="text-surface-400" />
                                  {:else if log.tipo.includes('Resolveu Exercício')}
                                    <Target size={14} class="text-surface-400" />
                                  {:else if log.tipo.includes('Desafio Rápido')}
                                    <Zap size={14} class="text-surface-400" />
                                  {:else if log.tipo.includes('Solicitou explicação')}
                                    <BookOpen size={14} class="text-surface-400" />
                                  {:else}
                                    <Clock size={14} class="text-surface-400" />
                                  {/if}
                              <span class="text-xs font-bold text-surface-500 uppercase tracking-wide">
                                {formatDate(log.data)}
                              </span>
                              <span class="text-xs text-surface-400">•</span>
                              <span class="text-xs text-surface-400">{formatTime(log.data)}</span>
                            </div>
                            <h4 class="font-bold text-surface-800 dark:text-surface-200 text-sm md:text-base line-clamp-1">
                              {log.topico}
                            </h4>
                          </div>
                          <div class="text-xs font-medium px-2 py-1 rounded-md {getActivityColor(log.tipo)}">
                            {log.tipo}
                          </div>
                        </div>
                        
                        <!-- DETALHES EXPANDIDOS -->
                        {#if showActivityDetails === i}
                          <div class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 animate-slideDown">
                            <div class="text-sm text-surface-600 dark:text-surface-400">
                              <div class="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span class="font-medium">Data completa:</span>
                                  <div>{new Date(log.data).toLocaleDateString('pt-PT', { 
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}</div>
                                </div>
                                <div>
                                  <span class="font-medium">Hora:</span>
                                  <div>{formatTime(log.data)}</div>
                                </div>
                              </div>
                              {#if log.tipo.includes('Acertou')}
                                <div class="mt-2 flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                  <Target size={12} />
                                  <span class="text-xs font-medium">Resposta correta</span>
                                </div>
                              {:else if log.tipo.includes('Errou') || log.tipo.includes('Precisa revisar')}
                                <div class="mt-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                  <AlertTriangle size={12} />
                                  <span class="text-xs font-medium">Precisa de revisão</span>
                                </div>
                              {/if}
                            </div>
                          </div>
                        {/if}
                        
                        <!-- INDICADOR DE MAIS INFORMAÇÕES -->
                        <div class="flex items-center justify-between mt-3">
                          <div class="text-xs text-surface-500">
                            Clique para {showActivityDetails === i ? 'recolher' : 'mais detalhes'}
                          </div>
                          {#if showActivityDetails !== i}
                            <ChevronDown size={14} class="text-surface-400 group-hover:text-tertiary-500 transition-colors" />
                          {:else}
                            <ChevronUp size={14} class="text-surface-400" />
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/each}

                  <!-- Atividades restantes (expansíveis) -->
                  {#if expandedActivities && report.historicoRecente.length > 3}
                    {#each report.historicoRecente.slice(3) as log, i}             
              <div 
                class="relative pl-5 md:pl-6 group cursor-pointer"
on:click={() => showActivityDetails = showActivityDetails === (i + 3) ? null : (i + 3)}               
 on:keydown={(e) => e.key === 'Enter' && (showActivityDetails = showActivityDetails === (i + 3) ? null : (i + 3))}
                tabindex="0"
              >
                        <!-- LINHA DO TEMPO -->
                        <div class="absolute left-0 top-3 w-3 h-3 rounded-full bg-tertiary-500 group-hover:scale-125 transition-transform z-10"></div>
                        <div class="absolute left-[5px] top-3 bottom-0 w-px bg-surface-200 dark:bg-surface-700 group-last:hidden"></div>
                        
                        <!-- CARD DA ATIVIDADE -->
                        <div class="bg-surface-50 dark:bg-surface-750 border border-surface-100 dark:border-surface-700 rounded-xl p-4 hover:border-tertiary-300 dark:hover:border-tertiary-700 transition-all hover:shadow-md">
                          <div class="flex justify-between items-start gap-3 mb-2">
                            <div class="flex-1">
                              <div class="flex items-center gap-2 mb-1">
                                    {#if log.tipo.includes('Tirou dúvida')}
                                    <MessageSquare size={14} class="text-surface-400" />
                                  {:else if log.tipo.includes('Resolveu Exercício')}
                                    <Target size={14} class="text-surface-400" />
                                  {:else if log.tipo.includes('Desafio Rápido')}
                                    <Zap size={14} class="text-surface-400" />
                                  {:else if log.tipo.includes('Solicitou explicação')}
                                    <BookOpen size={14} class="text-surface-400" />
                                  {:else}
                                    <Clock size={14} class="text-surface-400" />
                                  {/if}
                                <span class="text-xs font-bold text-surface-500 uppercase tracking-wide">
                                  {formatDate(log.data)}
                                </span>
                                <span class="text-xs text-surface-400">•</span>
                                <span class="text-xs text-surface-400">{formatTime(log.data)}</span>
                              </div>
                              <h4 class="font-bold text-surface-800 dark:text-surface-200 text-sm md:text-base line-clamp-1">
                                {log.topico}
                              </h4>
                            </div>
                            <div class="text-xs font-medium px-2 py-1 rounded-md {getActivityColor(log.tipo)}">
                              {log.tipo}
                            </div>
                          </div>
                          
                          <!-- DETALHES EXPANDIDOS -->
{#if showActivityDetails === (i + 3)}
                            <div class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 animate-slideDown">
                              <div class="text-sm text-surface-600 dark:text-surface-400">
                                <div class="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span class="font-medium">Data completa:</span>
                                    <div>{new Date(log.data).toLocaleDateString('pt-PT', { 
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}</div>
                                  </div>
                                  <div>
                                    <span class="font-medium">Hora:</span>
                                    <div>{formatTime(log.data)}</div>
                                  </div>
                                </div>
                                {#if log.tipo.includes('Acertou')}
                                  <div class="mt-2 flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                    <Target size={12} />
                                    <span class="text-xs font-medium">Resposta correta</span>
                                  </div>
                                {:else if log.tipo.includes('Errou') || log.tipo.includes('Precisa revisar')}
                                  <div class="mt-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                    <AlertTriangle size={12} />
                                    <span class="text-xs font-medium">Precisa de revisão</span>
                                  </div>
                                {/if}
                              </div>
                            </div>
                          {/if}
                          
                          <!-- INDICADOR DE MAIS INFORMAÇÕES -->
                          <div class="flex items-center justify-between mt-3">
                            <div class="text-xs text-surface-500">
                              Clique para {showActivityDetails === (i + 3) ? 'recolher' : 'mais detalhes'}
                            </div>
                            {#if showActivityDetails === (i + 3)}
                              <ChevronDown size={14} class="text-surface-400 group-hover:text-tertiary-500 transition-colors" />
                            {:else}
                              <ChevronUp size={14} class="text-surface-400" />
                            {/if}
                          </div>
                        </div>
                      </div>
                    {/each}
                  {/if}

                  <!-- Botão para expandir/recolher se houver mais de 3 atividades -->
          {#if report.historicoRecente.length > 3}
            <div class="pt-4 border-t border-surface-100 dark:border-surface-700">
              <button
                on:click={() => expandedActivities = !expandedActivities}
                class="w-full flex items-center justify-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group py-2 hover:bg-surface-50 dark:hover:bg-surface-750 rounded-lg"
              >
                {#if expandedActivities}
                  <span class="flex items-center gap-2">
                    <ChevronUp size={16} class="group-hover:-translate-y-0.5 transition-transform" />
                    Ver menos atividades
                    <ChevronUp size={16} class="group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                {:else}
                  <span class="flex items-center gap-2">
                    <ChevronDown size={16} class="group-hover:translate-y-0.5 transition-transform" />
                    Ver mais {report.historicoRecente.length - 3} atividades
                    <ChevronDown size={16} class="group-hover:translate-y-0.5 transition-transform" />
                  </span>
                {/if}
              </button>
            </div>
          {/if}
                </div>
              {/if}
              
              <!-- RESUMO DAS ATIVIDADES -->
              {#if report.historicoRecente.length > 0}
                <div class="mt-6 pt-6 border-t border-surface-100 dark:border-surface-700">
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div class="text-lg font-bold text-green-600 dark:text-green-400">
                        {getQuickStats(report.historicoRecente).acertos}
                      </div>
                      <div class="text-xs text-green-700 dark:text-green-300">Acertos</div>
                    </div>

                    <div class="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div class="text-lg font-bold text-red-600 dark:text-red-400">
                        {getQuickStats(report.historicoRecente).revisao}
                      </div>
                      <div class="text-xs text-red-700 dark:text-red-300">Revisão</div>
                    </div>

                    <div class="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {getQuickStats(report.historicoRecente).duvidas}
                      </div>
                      <div class="text-xs text-blue-700 dark:text-blue-300">Dúvidas</div>
                    </div>

                    <div class="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div class="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {getQuickStats(report.historicoRecente).exercicios}
                      </div>
                      <div class="text-xs text-purple-700 dark:text-purple-300">Exercícios</div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
            
      </div>
      
    </div>
{/if}
  </div>

<!-- STYLES ADICIONAIS -->
<style>
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-slideDown {
    animation: slideDown 0.2s ease-out;
  }
  
  .line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
  
  .hover-scale:hover {
    transform: scale(1.02);
  }
  
  .hover-scale:active {
    transform: scale(1);
  }
</style>