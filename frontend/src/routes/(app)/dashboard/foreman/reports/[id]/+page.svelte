<svelte:head>
    <title>Diagnóstico de Performance | KaniMente</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import ApexChartWrapper from '$lib/components/ClientChart.svelte'; 
    
    import { 
        ArrowLeft, TrendingUp, BookOpen, AlertCircle, 
        Lightbulb, CheckCircle2, AlertTriangle, Info, Zap, Home, 
        Rocket, Shield, Target, Award, Brain, BarChart3, Activity
    } from 'lucide-svelte';

    let studentId = $page.params.id;
    let data: any = null;
    let loading = true;
    let error = false;

    // --- GRÁFICOS ---
    let donutOptions: any;
    let donutSeries: number[] = [];
    let barOptions: any;
    let barSeries: any[] = [];
    let insights: any[] = [];

    onMount(async () => {
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/guardian/report/${studentId}`);
            if (res.ok) {
                data = await res.json();
                prepareDashboard(data);
            } else {
                error = true;
            }
        } catch (e) {
            error = true;
        } finally {
            loading = false;
        }
    });

    function prepareDashboard(data: any) {
        const volCasa = (data.geral?.casa?.rushVolume || 0) + (data.geral?.casa?.chatVolume || 0);
        const volEscola = (data.geral?.escola?.rushVolume || 0) + (data.geral?.escola?.chatVolume || 0);
        
        donutSeries = [volCasa, volEscola];
        donutOptions = {
            chart: { type: 'donut', fontFamily: 'Inter, sans-serif' },
            labels: ['Ambiente Familiar', 'Ambiente Escolar'],
            colors: ['#10b981', '#3b82f6'],
            plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Atividade' } } } } },
            stroke: { width: 0 },
            dataLabels: { enabled: false },
            legend: { position: 'bottom', fontSize: '12px' }
        };

        const effRush = Math.round(((data.geral?.casa?.rushEfficiency || 0) + (data.geral?.escola?.rushEfficiency || 0)) / 2);
        const effTutor = Math.round(((data.geral?.casa?.tutorEfficiency || 0) + (data.geral?.escola?.tutorEfficiency || 0)) / 2);

        barSeries = [{ name: 'Nível de Absorção', data: [effRush, effTutor] }];
        barOptions = {
            chart: { type: 'bar', toolbar: { show: false } },
            plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '40%', distributed: true } },
            colors: ['#f59e0b', '#8b5cf6'],
            xaxis: { categories: ['Prática Cognitiva', 'Assimilação Teórica'], max: 100, labels: { show: false } },
            dataLabels: { enabled: true, formatter: (val: number) => `${val}%` },
            grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        };

        insights = analyzePerformance(data);
    }

    function analyzePerformance(data: any) {
        const list = [];
        const rushScore = ((data.geral?.casa?.rushEfficiency || 0) + (data.geral?.escola?.rushEfficiency || 0)) / 2;
        const tutorScore = ((data.geral?.casa?.tutorEfficiency || 0) + (data.geral?.escola?.tutorEfficiency || 0)) / 2;

        if (rushScore > 80 && tutorScore > 80) {
            list.push({ type: 'success', title: 'Alta Performance', message: 'O aluno apresenta um domínio sólido entre teoria e aplicação prática.', icon: CheckCircle2 });
        } else if (rushScore < 50 && tutorScore < 50) {
            list.push({ type: 'danger', title: 'Risco de Defasagem', message: 'Detectada instabilidade na retenção de conteúdos básicos.', icon: AlertTriangle });
        } else if (rushScore > tutorScore + 20) {
            list.push({ type: 'warning', title: 'Perfil Prático-Intuitivo', message: 'Excelente execução de tarefas, mas requer maior foco na fundamentação teórica.', icon: Lightbulb });
        }

        return list;
    }

    function goBack() {
        const ref = $page.url.searchParams.get('ref');
        goto(ref === 'home' ? '/dashboard/foreman/overview' : '/dashboard/foreman/reports');
    }

    const cardClass = "bg-white dark:bg-surface-800 rounded-md border border-surface-200 dark:border-surface-700 shadow-sm";
    const labelStyle = "text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1 block";
</script>

<div class="container mx-auto max-w-8xl p-4 md:p-8 space-y-6 animate-fade-in pb-24">
    
    <div class="flex items-center gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
        <button on:click={goBack} class="p-2 -ml-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors border border-transparent hover:border-surface-200">
            <ArrowLeft size={20} />
        </button>
        <div>
            <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Diagnóstico de Performance</h1>
            {#if data}
                <p class="text-xs text-surface-500 mt-1">
                    Análise técnica de <span class="font-bold text-surface-900 dark:text-surface-100">{data.aluno.nome} {data.aluno.sobrenome}</span>
                </p>
            {/if}
        </div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-md"></div>
            <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-md"></div>
        </div>
    {:else if error}
        <div class="p-12 text-center rounded-md border border-red-200 bg-red-50 dark:bg-red-900/10">
            <AlertCircle class="mx-auto text-red-500 mb-2" size={32} />
            <h3 class="font-bold text-red-800 dark:text-red-200">Falha no Processamento</h3>
            <p class="text-sm text-red-600 mt-1">Não foi possível consolidar os dados pedagógicos.</p>
        </div>
    {:else if data}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="{cardClass} p-6">
                <span class={labelStyle}>Distribuição de Atividade</span>
                <h2 class="text-sm font-bold text-surface-900 dark:text-white mb-4">Contextos de Aprendizagem</h2>
                {#if donutOptions}
                    <ApexChartWrapper options={donutOptions} series={donutSeries} type="donut" height={240} />
                {/if}
            </div>

            <div class="{cardClass} p-6">
                <span class={labelStyle}>Métricas de Absorção</span>
                <h2 class="text-sm font-bold text-surface-900 dark:text-white mb-4">Eficiência Pedagógica</h2>
                {#if barOptions}
                    <ApexChartWrapper options={barOptions} series={barSeries} type="bar" height={180} />
                {/if}
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div class="lg:col-span-2 space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="{cardClass} p-5 border-t-4 border-t-emerald-500">
                        <h3 class="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-tight">
                            <Award class="text-emerald-500" size={16} /> Pontos de Excelência
                        </h3>
                        <div class="space-y-2">
                            {#each data.pontosFortes || [] as topic}
                                <div class="flex items-center justify-between p-2.5 bg-surface-50 dark:bg-surface-900/40 rounded border border-surface-100 dark:border-surface-700">
                                    <span class="text-xs font-semibold text-surface-700 dark:text-surface-200">{topic.nome}</span>
                                    <span class="text-xs font-black text-emerald-600">{topic.taxa}%</span>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <div class="{cardClass} p-5 border-t-4 border-t-amber-500">
                        <h3 class="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-tight">
                            <AlertTriangle class="text-amber-500" size={16} /> Necessidades de Reforço
                        </h3>
                        <div class="space-y-2">
                            {#each data.pontosFracos || [] as topic}
                                <div class="flex items-center justify-between p-2.5 bg-surface-50 dark:bg-surface-900/40 rounded border border-surface-100 dark:border-surface-700">
                                    <span class="text-xs font-semibold text-surface-700 dark:text-surface-200">{topic.nome}</span>
                                    <span class="text-xs font-black text-amber-600">{topic.taxa}%</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <div class="{cardClass} overflow-hidden">
                    <div class="px-5 py-3 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/20">
                        <h3 class="text-xs font-bold uppercase tracking-widest text-surface-500 flex items-center gap-2">
                            <BarChart3 size={14} /> Desempenho Curricular Detalhado
                        </h3>
                    </div>
                    <div class="divide-y divide-surface-100 dark:divide-surface-700">
                        {#each data.turmas || [] as turma}
                            <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div class="flex-1">
                                    <h4 class="text-sm font-bold text-surface-900 dark:text-white">{turma.nome}</h4>
                                    <span class="text-[10px] font-bold text-surface-400 uppercase tracking-tighter">{turma.disciplina}</span>
                                </div>
                                
                                <div class="flex gap-6">
                                    <div class="w-24">
                                        <span class="text-[9px] font-bold text-surface-400 uppercase">Prática</span>
                                        <div class="flex items-center gap-2">
                                            <div class="flex-1 h-1 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                                                <div class="h-full bg-amber-500" style="width: {turma.desempenho.rush}%"></div>
                                            </div>
                                            <span class="text-[10px] font-black text-surface-700 dark:text-surface-300">{turma.desempenho.rush}%</span>
                                        </div>
                                    </div>
                                    <div class="w-24">
                                        <span class="text-[9px] font-bold text-surface-400 uppercase">Teoria</span>
                                        <div class="flex items-center gap-2">
                                            <div class="flex-1 h-1 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                                                <div class="h-full bg-violet-500" style="width: {turma.desempenho.tutor}%"></div>
                                            </div>
                                            <span class="text-[10px] font-black text-surface-700 dark:text-surface-300">{turma.desempenho.tutor}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <div class="{cardClass} p-6 h-fit bg-surface-50/30 dark:bg-surface-800">
                <h3 class="font-bold text-surface-900 dark:text-white mb-6 flex items-center gap-2 text-sm uppercase tracking-tight">
                    <Brain class="text-primary-500" size={18} /> Análise Cognitiva IA
                </h3>
                
                <div class="space-y-4">
                    {#each insights as insight}
                        <div class="p-4 rounded-md border-l-4 bg-white dark:bg-surface-900 shadow-sm
                            {insight.type === 'success' ? 'border-emerald-500' : ''}
                            {insight.type === 'warning' ? 'border-amber-500' : ''}
                            {insight.type === 'danger' ? 'border-red-500' : ''}">
                            
                            <div class="flex gap-3">
                                <svelte:component this={insight.icon} size={16} 
                                    class="shrink-0 mt-0.5
                                           {insight.type === 'success' ? 'text-emerald-600' : ''}
                                           {insight.type === 'warning' ? 'text-amber-600' : ''}
                                           {insight.type === 'danger' ? 'text-red-600' : ''}" 
                                />
                                <div>
                                    <h4 class="font-bold text-xs text-surface-900 dark:text-white">{insight.title}</h4>
                                    <p class="text-[11px] text-surface-600 dark:text-surface-400 leading-relaxed mt-1">{insight.message}</p>
                                </div>
                            </div>
                        </div>
                    {/each}
                    
                    {#if insights.length === 0}
                        <p class="text-xs text-surface-500 text-center py-8">Processando novos dados de interação...</p>
                    {/if}
                </div>

                <div class="mt-8 p-3 bg-primary-50 dark:bg-primary-900/10 rounded border border-primary-100 dark:border-primary-800">
                    <p class="text-[10px] text-primary-700 dark:text-primary-300 leading-tight">
                        <strong>Nota:</strong> Esta análise é baseada no histórico de interações com a IA e no desempenho em sessões cronometradas (Rush).
                    </p>
                </div>
            </div>
        </div>

    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>