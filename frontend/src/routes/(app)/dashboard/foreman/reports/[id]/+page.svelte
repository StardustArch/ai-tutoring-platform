<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import '../../../../../../app.css';
    
    // 👇 IMPORTA O TEU COMPONENTE AQUI (Ajusta o caminho se necessário)
    import ApexChartWrapper from '$lib/components/ClientChart.svelte'; 
    
    import { 
        ArrowLeft, TrendingUp, BookOpen, AlertCircle, 
        Lightbulb, CheckCircle2, AlertTriangle, Info, Zap, Home, School, BrainCircuit, MessageSquare,

		Rocket,

		Shield


    } from 'lucide-svelte';

    let studentId = $page.params.id;
    let data: any = null;
    let loading = true;
    let error = false;

    // --- VARIÁVEIS PARA GRÁFICOS ---
    let donutOptions: any;
    let donutSeries: number[] = [];
    
    let barOptions: any;
    let barSeries: any[] = [];

    // --- VARIÁVEL PARA INSIGHTS ---
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
            console.error(e);
            error = true;
        } finally {
            loading = false;
        }
    });

    function prepareDashboard(data: any) {
        // 1. DADOS DO DONUT
        const volCasa = data.geral.casa.rushVolume + data.geral.casa.chatVolume;
        const volEscola = data.geral.escola.rushVolume + data.geral.escola.chatVolume;
        
        donutSeries = [volCasa, volEscola];
        donutOptions = {
            chart: { type: 'donut', fontFamily: 'Inherit' },
            labels: ['Em Casa', 'Na Escola'],
            colors: ['#22c55e', '#3b82f6'],
            plotOptions: { pie: { donut: { size: '65%' } } },
            dataLabels: { enabled: false },
            legend: { position: 'bottom' },
            stroke: { show: false }
        };

        // 2. DADOS DE BARRAS
        const effRush = Math.round((data.geral.casa.rushEfficiency + data.geral.escola.rushEfficiency) / 2);
        const effTutor = Math.round((data.geral.casa.tutorEfficiency + data.geral.escola.tutorEfficiency) / 2);

        barSeries = [{
            name: 'Absorção',
            data: [effRush, effTutor]
        }];
        
        barOptions = {
            chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inherit' },
            plotOptions: {
                bar: { 
                    borderRadius: 6, 
                    horizontal: true, 
                    barHeight: '50%',
                    distributed: true 
                }
            },
            colors: ['#eab308', '#a855f7'],
            xaxis: { 
                categories: ['Prática (Rush)', 'Teoria (Tutor)'],
                max: 100,
                labels: { show: false }
            },
            dataLabels: {
                enabled: true,
                formatter: (val: number) => `${val}%`,
                style: { fontSize: '14px', fontWeight: 'bold' }
            },
            grid: { show: false },
            legend: { show: false }
        };

        // 3. GERAR INSIGHTS
        insights = analyzeStudentPerformance(data);
    }

    // --- MOTOR DE INSIGHTS (Reutilizável) ---
    function analyzeStudentPerformance(data: any) {
        const list = [];
        const totalVol = 
            data.geral.casa.rushVolume + data.geral.escola.rushVolume + 
            data.geral.casa.chatVolume + data.geral.escola.chatVolume;

        // Regra 1: Volume Baixo
        if (totalVol < 5) {
            list.push({
                type: 'neutral',
                title: 'Início da Jornada',
                message: 'Ainda temos poucos dados. Incentive o aluno a usar o KaniMente esta semana!',
                icon: Info
            });
            return list;
        }

        // Regra 2: Equilíbrio Prática vs Teoria
        const rushScore = (data.geral.casa.rushEfficiency + data.geral.escola.rushEfficiency) / 2;
        const tutorScore = (data.geral.casa.tutorEfficiency + data.geral.escola.tutorEfficiency) / 2;

        if (rushScore > 80 && tutorScore > 80) {
            list.push({
                type: 'success',
                title: 'Desempenho Excelente!',
                message: 'O aluno está a dominar tanto a teoria como a prática. Parabéns!',
                icon: CheckCircle2
            });
        } else if (rushScore < 50 && tutorScore < 50) {
            list.push({
                type: 'danger',
                title: 'Atenção Necessária',
                message: 'Nota-se dificuldade geral. Sugerimos rever matérias anteriores.',
                icon: AlertTriangle
            });
        } else if (rushScore > tutorScore + 20) {
            list.push({
                type: 'warning',
                title: 'Forte na Prática, Teoria Pendente',
                message: 'O aluno resolve bem exercícios, mas parece saltar as explicações teóricas.',
                icon: Lightbulb
            });
        } else if (tutorScore > rushScore + 20) {
            list.push({
                type: 'warning',
                title: 'Entende a Teoria, Falha na Prática',
                message: 'O aluno percebe as explicações, mas precisa de fazer mais exercícios Rush para fixar.',
                icon: Zap
            });
        }

        // Regra 3: Autonomia
        const volCasa = data.geral.casa.rushVolume + data.geral.casa.chatVolume;
        const percentCasa = totalVol > 0 ? (volCasa / totalVol) * 100 : 0;

        if (percentCasa > 60) {
            list.push({
                type: 'success',
                title: 'Grande Autonomia',
                message: 'A maior parte do estudo é feita em casa, por iniciativa própria.',
                icon: Home
            });
        }

        return list;
    }

    function goBack() {
        const ref = $page.url.searchParams.get('ref');
        goto(ref === 'home' ? '/dashboard/foreman/overview' : '/dashboard/foreman/reports');
    }
</script>

<div class="max-w mx-auto p-6 space-y-8 animate-fade-in pb-20">
    
    <div class="flex items-center gap-4">
        <button on:click={goBack} class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 transition-colors">
            <ArrowLeft size={24} />
        </button>
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Relatório do Encarregado</h1>
            {#if data}
                <p class="text-surface-500 text-sm">Análise de <strong class="text-primary-500">{data.aluno.nome}</strong></p>
            {/if}
        </div>
    </div>

    {#if loading}
        <div class="h-64 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
    {:else if error}
        <div class="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800">
            <AlertCircle class="mx-auto text-red-500 mb-2" size={32} />
            <p class="text-red-700 dark:text-red-300">Não foi possível gerar o diagnóstico.</p>
        </div>
    {:else if data}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="bg-white dark:bg-surface-800 p-6 rounded-3xl border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col justify-between">
                <div>
                    <h2 class="text-lg font-bold text-surface-900 dark:text-white mb-1">Onde estuda mais?</h2>
                    <p class="text-sm text-surface-500 mb-4">Volume de atividade Casa vs Escola</p>
                </div>
                {#if donutOptions}
                    <div class="-ml-4">
                        <ApexChartWrapper 
                            options={donutOptions} 
                            series={donutSeries} 
                            type="donut" 
                            height={250} 
                        />
                    </div>
                {/if}
            </div>

            <div class="bg-white dark:bg-surface-800 p-6 rounded-3xl border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col justify-between">
                <div>
                    <h2 class="text-lg font-bold text-surface-900 dark:text-white mb-1">Qualidade da Aprendizagem</h2>
                    <p class="text-sm text-surface-500 mb-4">Comparação entre Prática e Teoria</p>
                </div>
                {#if barOptions}
                    <div>
                        <ApexChartWrapper 
                            options={barOptions} 
                            series={barSeries} 
                            type="bar" 
                            height={200} 
                        />
                    </div>
                {/if}
            </div>
        </div>
{#if (data.pontosFortes && data.pontosFortes.length > 0) || (data.pontosFracos && data.pontosFracos.length > 0)}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div class="bg-white dark:bg-surface-800 p-6 rounded-3xl border border-surface-200 dark:border-surface-700 shadow-sm">
                    <h3 class="text-lg font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp class="text-green-500" /> Super Poderes <Rocket class="text-green-500" size={20} />
                    </h3>
                    
                    {#if data.pontosFortes.length > 0}
                        <div class="space-y-3">
                            {#each data.pontosFortes as topic}
                                <div class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                                    <div>
                                        <p class="font-bold text-surface-900 dark:text-surface-100">{topic.nome}</p>
                                        <p class="text-xs text-green-700 dark:text-green-400 font-medium uppercase">{topic.disciplina}</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-lg font-black text-green-600">{topic.taxa}%</span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                         <p class="text-sm text-surface-500">Ainda a identificar pontos fortes...</p>
                    {/if}
                </div>

                <div class="bg-white dark:bg-surface-800 p-6 rounded-3xl border border-surface-200 dark:border-surface-700 shadow-sm">
                    <h3 class="text-lg font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                        <AlertCircle class="text-orange-500" /> Precisa de Atenção <Shield class="text-orange-500" size={20} />
                    </h3>
                    
                    {#if data.pontosFracos.length > 0}
                        <div class="space-y-3">
                            {#each data.pontosFracos as topic}
                                <div class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                                    <div>
                                        <p class="font-bold text-surface-900 dark:text-surface-100">{topic.nome}</p>
                                        <p class="text-xs text-orange-700 dark:text-orange-400 font-medium uppercase">{topic.disciplina}</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-lg font-black text-orange-600">{topic.taxa}%</span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                         <p class="text-sm text-surface-500">Sem pontos críticos detectados. Bom trabalho!</p>
                    {/if}
                </div>
            </div>
        {/if}
        <div class="space-y-4">
            <h3 class="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <Lightbulb class="text-yellow-500" fill="currentColor" size={20} />
                Diagnóstico Kani
            </h3>
            
            <div class="grid grid-cols-1 gap-4">
                {#each insights as insight}
                    <div class="p-5 rounded-2xl border-l-4 flex items-start gap-4 shadow-sm
                        {insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : ''}
                        {insight.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' : ''}
                        {insight.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : ''}
                        {insight.type === 'neutral' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : ''}">
                        
                        <div class="p-2 rounded-full bg-white dark:bg-surface-800 shadow-sm shrink-0">
                            <svelte:component this={insight.icon} size={24} 
                                class="{insight.type === 'success' ? 'text-green-600' : ''}
                                       {insight.type === 'warning' ? 'text-orange-600' : ''}
                                       {insight.type === 'danger' ? 'text-red-600' : ''}
                                       {insight.type === 'neutral' ? 'text-blue-600' : ''}" 
                            />
                        </div>
                        <div>
                            <h4 class="font-bold text-surface-900 dark:text-white mb-1">{insight.title}</h4>
                            <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">{insight.message}</p>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        {#if data.turmas.length > 0}
            <div class="pt-8 border-t border-surface-200 dark:border-surface-800">
                <h3 class="text-lg font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                    <BookOpen size={20} /> Detalhe por Disciplina
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each data.turmas as turma}
                        <div class="p-5 bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h4 class="font-bold text-surface-900 dark:text-white">{turma.nome}</h4>
                                    <span class="text-xs bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 px-2 py-1 rounded mt-1 inline-block">
                                        {turma.disciplina}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="space-y-3">
                                <div>
                                    <div class="flex justify-between text-xs mb-1">
                                        <span class="text-surface-500">Prática (Rush)</span>
                                        <span class="font-bold text-surface-900 dark:text-white">{turma.desempenho.rush}%</span>
                                    </div>
                                    <div class="w-full bg-surface-100 dark:bg-surface-700 h-1.5 rounded-full overflow-hidden">
                                        <div class="h-full bg-yellow-500" style="width: {turma.desempenho.rush}%"></div>
                                    </div>
                                </div>
                                <div>
                                    <div class="flex justify-between text-xs mb-1">
                                        <span class="text-surface-500">Teoria (Tutor)</span>
                                        <span class="font-bold text-surface-900 dark:text-white">{turma.desempenho.tutor}%</span>
                                    </div>
                                    <div class="w-full bg-surface-100 dark:bg-surface-700 h-1.5 rounded-full overflow-hidden">
                                        <div class="h-full bg-purple-500" style="width: {turma.desempenho.tutor}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

    {/if}
</div>