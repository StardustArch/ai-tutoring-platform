<svelte:head>
    <title>Relatórios de Desempenho | KMind</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { 
        BarChart3, ChevronRight, Users, Activity, 
        Trophy, TrendingUp, Sparkles, Target, BookOpen,
        ArrowUpRight
    } from 'lucide-svelte';

    let students: any[] = [];
    let overview: any = null;
    let loading = true;

    onMount(async () => {
        try {
            const [resStudents, resOverview] = await Promise.all([
                apiFetch(`${PUBLIC_API_URL_HOST}/api/students`),
                apiFetch(`${PUBLIC_API_URL_HOST}/api/students/guardian/overview`)
            ]);

            if (resStudents.ok) students = await resStudents.json();
            if (resOverview.ok) overview = await resOverview.json();

        } catch (e) { console.error(e); } 
        finally { loading = false; }
    });

    function getInitials(name: string) {
        return name ? name.substring(0, 2).toUpperCase() : '--';
    }

    // Estilos Enterprise
    const cardBase = "bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm";
    const labelStyle = "text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-1 block";
</script>

<div class="container mx-auto max-w-8xl p-4 md:p-8 space-y-8 animate-fade-in pb-24">
    
    <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                Análise de Desempenho
            </h1>
            <p class="text-surface-500 text-sm mt-1">
                Relatórios consolidados de progresso e atividade académica da família.
            </p>
        </div>
    </header>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {#each Array(3) as _}
                <div class="h-28 bg-surface-200 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"></div>
            {/each}
        </div>
    {:else}
    
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div class="{cardBase} p-5">
                <div class="flex justify-between items-start">
                    <div>
                        <span class={labelStyle}>Volume de Estudo</span>
                        <h3 class="text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
                            {overview?.totalAtividades || 0}
                        </h3>
                    </div>
                    <div class="p-2 bg-surface-50 dark:bg-surface-700 rounded-md text-surface-400 border border-surface-100 dark:border-surface-600">
                        <Activity size={18} />
                    </div>
                </div>
                <p class="text-[11px] text-surface-500 mt-3 flex items-center gap-1">
                    <TrendingUp size={12} class="text-emerald-500" />
                    Atividades concluídas no período
                </p>
            </div>

            <div class="{cardBase} p-5">
                <div class="flex justify-between items-start">
                    <div>
                        <span class={labelStyle}>Precisão Global</span>
                        <div class="flex items-baseline gap-1">
                            <h3 class="text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
                                {overview?.mediaAcerto || 0}%
                            </h3>
                        </div>
                    </div>
                    <div class="p-2 bg-surface-50 dark:bg-surface-700 rounded-md text-emerald-600 border border-surface-100 dark:border-surface-600">
                        <Target size={18} />
                    </div>
                </div>
                <div class="w-full h-1 bg-surface-100 dark:bg-surface-700 rounded-full mt-4 overflow-hidden">
                    <div 
                        class="h-full bg-emerald-500 transition-all duration-1000"
                        style={`width: ${overview?.mediaAcerto || 0}%`}
                    ></div>
                </div>
            </div>

            <div class="{cardBase} p-5">
                <div class="flex justify-between items-start">
                    <div>
                        <span class={labelStyle}>Abrangência</span>
                        <h3 class="text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
                            {overview?.topicosExplorados || 0}
                        </h3>
                    </div>
                    <div class="p-2 bg-surface-50 dark:bg-surface-700 rounded-md text-surface-400 border border-surface-100 dark:border-surface-600">
                        <BookOpen size={18} />
                    </div>
                </div>
                <p class="text-[11px] text-surface-500 mt-3">Tópicos curriculares abordados</p>
            </div>
        </div>

        <div class="space-y-4">
            <h2 class="text-sm font-bold text-surface-500 uppercase tracking-widest flex items-center gap-2">
                <Users size={16} />
                Relatórios por Educando
            </h2>
            
            {#if students.length === 0}
                <div class="bg-surface-50 dark:bg-surface-800/30 rounded-lg p-12 text-center border border-dashed border-surface-300 dark:border-surface-700">
                    <h4 class="font-bold text-surface-900 dark:text-white">Nenhum educando registado</h4>
                    <p class="text-sm text-surface-500 mt-1 mb-6">Registe um educando para gerar estatísticas de aprendizagem.</p>
                    <button 
                        on:click={() => goto('/dashboard/foreman/student/create')}
                        class="btn bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2 rounded-md text-sm transition-all"
                    >
                        Adicionar Educando
                    </button>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each students as student}
                        <button 
                            on:click={() => goto(`/dashboard/foreman/reports/${student.id}`)}
                            class="{cardBase} p-4 hover:border-emerald-500 hover:shadow-md transition-all text-left flex items-center justify-between group"
                        >
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                    {getInitials(student.nome)}
                                </div>
                                <div>
                                    <h3 class="font-bold text-surface-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                        {student.nome}
                                    </h3>
                                    <div class="flex items-center gap-2 mt-0.5">
                                        <span class="text-[10px] font-bold text-surface-400 uppercase tracking-tight">{student.classe}ª Classe</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="p-1.5 rounded-full bg-surface-50 dark:bg-surface-700 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 transition-colors">
                                <ArrowUpRight size={16} class="text-surface-300 group-hover:text-emerald-500" />
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

    {/if}
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>