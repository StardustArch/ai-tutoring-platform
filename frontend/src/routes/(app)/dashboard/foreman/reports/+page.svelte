<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { 
        BarChart3, ChevronRight, Users, Activity, 
        Trophy, TrendingUp 
    } from 'lucide-svelte';

    let students: any[] = [];
    let overview: any = null; // Dados gerais
    let loading = true;

    onMount(async () => {
        try {
            // Executamos os dois pedidos em paralelo para ser mais rápido
            const [resStudents, resOverview] = await Promise.all([
                apiFetch(`${PUBLIC_API_URL_HOST}/api/students`),
                apiFetch(`${PUBLIC_API_URL_HOST}/api/students/guardian/overview`)
            ]);

            if (resStudents.ok) students = await resStudents.json();
            if (resOverview.ok) overview = await resOverview.json();

        } catch (e) { console.error(e); } 
        finally { loading = false; }
    });

    function getAvatarColor(name: string) {
        const colors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600'];
        return colors[name.charCodeAt(0) % colors.length];
    }
</script>

<div class="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in">
    
    <div class="border-b border-surface-200 dark:border-surface-700 pb-6">
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3">
            <BarChart3 class="text-primary-500" /> Relatórios de Progresso
        </h1>
        <p class="text-surface-600 dark:text-surface-400 mt-1">
            Visão geral da atividade familiar e análise detalhada por educando.
        </p>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="h-32 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
            <div class="h-32 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
            <div class="h-32 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
        </div>
    {:else}
    
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div class="bg-white dark:bg-surface-800 p-6 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm flex items-center gap-4">
                <div class="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                    <Activity size={32} />
                </div>
                <div>
                    <p class="text-surface-500 text-sm font-medium">Total de Atividades</p>
                    <h3 class="text-3xl font-black text-surface-900 dark:text-white">
                        {overview?.totalAtividades || 0}
                    </h3>
                </div>
            </div>

            <div class="bg-white dark:bg-surface-800 p-6 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm flex items-center gap-4">
                <div class="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl">
                    <TrendingUp size={32} />
                </div>
                <div>
                    <p class="text-surface-500 text-sm font-medium">Precisão Familiar</p>
                    <h3 class="text-3xl font-black text-surface-900 dark:text-white">
                        {overview?.mediaAcerto || 0}%
                    </h3>
                </div>
            </div>

<div class="bg-white dark:bg-surface-800 p-6 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm flex items-center gap-4">
                <div class="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                    <Trophy size={32} /> 
                </div>
                <div>
                    <p class="text-surface-500 text-sm font-medium">Tópicos Explorados</p>
                    <h3 class="text-3xl font-black text-surface-900 dark:text-white">
                        {overview?.topicosExplorados || 0}
                    </h3>
                </div>
            </div>
        </div>

        <div class="space-y-4 pt-4">
            <h2 class="text-xl font-bold text-surface-900 dark:text-white">Detalhes por Educando</h2>
            
            {#if students.length === 0}
                <div class="p-12 text-center border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-2xl">
                    <p class="text-surface-500">Sem educandos registados.</p>
                    <button class="text-primary-500 font-bold hover:underline mt-2" on:click={() => goto('/dashboard/foreman/students/new')}>
                        Adicionar Educando
                    </button>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each students as student}
                        <button 
                            on:click={() => goto(`/dashboard/foreman/reports/${student.id}`)}
                            class="flex items-center justify-between p-6 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-sm hover:shadow-md hover:border-primary-500 transition-all group text-left"
                        >
                            <div class="flex items-center gap-4">
                                <div class={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${getAvatarColor(student.nome)}`}>
                                    {student.nome.charAt(0)}
                                </div>
                                <div>
                                    <h3 class="text-lg font-bold text-surface-900 dark:text-white group-hover:text-primary-500 transition-colors">
                                        {student.nome}
                                    </h3>
                                    <p class="text-sm text-surface-500">{student.classe}ª Classe</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center text-surface-400 group-hover:text-primary-500 transition-colors text-sm font-bold">
                                Ver Análise <ChevronRight size={20} class="ml-1" />
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

    {/if}
</div>