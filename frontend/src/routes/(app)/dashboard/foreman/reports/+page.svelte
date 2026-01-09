<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { 
        BarChart3, ChevronRight, Users, Activity, 
        Trophy, TrendingUp, Sparkles, Target, BookOpen
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

<div class="max-w-8xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
    
    <!-- HEADER -->
    <div class="space-y-2">
        <div class="flex items-center gap-3">
            <div class="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl shadow-lg">
                <BarChart3 size={24} class="text-white" />
            </div>
            <div>
                <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-50">
                    Relatórios de Progresso
                </h1>
                <p class="text-surface-600 dark:text-surface-400">
                    Visão geral da atividade familiar e análise detalhada por educando.
                </p>
            </div>
        </div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {#each Array(3) as _, i}
                <div class="h-32 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
            {/each}
        </div>
    {:else}
    
        <!-- STATS CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            
            <!-- ATIVIDADES -->
            <div class="group relative bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/5 rounded-full"></div>
                
                <div class="flex items-start justify-between relative z-10">
                    <div>
                        <p class="text-surface-500 text-sm font-medium mb-1 flex items-center gap-2">
                            <Activity size={16} class="text-blue-500" />
                            Total de Atividades
                        </p>
                        <h3 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white">
                            {overview?.totalAtividades || 0}
                        </h3>
                    </div>
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Activity size={28} />
                    </div>
                </div>
            </div>

            <!-- PRECISÃO -->
            <div class="group relative bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 rounded-full"></div>
                
                <div class="flex items-start justify-between relative z-10">
                    <div>
                        <p class="text-surface-500 text-sm font-medium mb-1 flex items-center gap-2">
                            <Target size={16} class="text-emerald-500" />
                            Precisão Familiar
                        </p>
                        <h3 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white">
                            {overview?.mediaAcerto || 0}%
                        </h3>
                    </div>
                    <div class="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <TrendingUp size={28} />
                    </div>
                </div>
                
                <!-- PROGRESS BAR -->
                <div class="mt-4">
                    <div class="w-full h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div 
                            class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-1000"
                            style={`width: ${Math.min(overview?.mediaAcerto || 0, 100)}%`}
                        ></div>
                    </div>
                </div>
            </div>

            <!-- TÓPICOS -->
            <div class="group relative bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/5 rounded-full"></div>
                
                <div class="flex items-start justify-between relative z-10">
                    <div>
                        <p class="text-surface-500 text-sm font-medium mb-1 flex items-center gap-2">
                            <BookOpen size={16} class="text-purple-500" />
                            Tópicos Explorados
                        </p>
                        <h3 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white">
                            {overview?.topicosExplorados || 0}
                        </h3>
                    </div>
                    <div class="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                        <Trophy size={28} />
                    </div>
                </div>
                

            </div>
        </div>

        <!-- LISTA DE EDUCANDOS -->
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                        <Users size={20} class="text-primary-500" />
                        Detalhes por Educando
                    </h2>
                    <p class="text-surface-500 text-sm mt-1">
                        Clique em um educando para ver análise detalhada
                    </p>
                </div>
                
                <div class="flex items-center gap-2">
                    <span class="text-sm text-surface-500">
                        {students.length} {students.length === 1 ? 'educando' : 'educandos'}
                    </span>
                </div>
            </div>
            
            {#if students.length === 0}
                <div class="bg-gradient-to-br from-surface-50 to-white dark:from-surface-900 dark:to-surface-800 rounded-2xl p-8 text-center border-2 border-dashed border-surface-300 dark:border-surface-700">
                    <div class="w-16 h-16 mx-auto mb-4 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center">
                        <Users size={32} class="text-surface-400 dark:text-surface-500"/>
                    </div>
                    <h4 class="text-lg font-bold text-surface-700 dark:text-surface-300 mb-2">
                        Nenhum educando registado
                    </h4>
                    <p class="text-surface-500 max-w-md mx-auto mb-6">
                        Adicione educandos para começar a acompanhar o progresso
                    </p>
                    <button 
                        on:click={() => goto('/dashboard/foreman/student/create')}
                    class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Adicionar Primeiro Educando
                    </button>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each students as student}
                        <button 
                            on:click={() => goto(`/dashboard/foreman/reports/${student.id}`)}
                            class="group relative bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-primary-500 transition-all duration-300 text-left overflow-hidden"
                        >
                            <!-- BACKGROUND EFFECT -->
                            <div class="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-primary-500/0 group-hover:from-primary-500/5 group-hover:to-primary-500/10 transition-all duration-300"></div>
                            
                            <!-- CONTENT -->
                            <div class="relative z-10">
                                <div class="flex items-center justify-between mb-4">
                                    <div class="flex items-center gap-4">
                                        <div class={`w-12 h-12 rounded-xl ${getAvatarColor(student.nome)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                            {student.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-bold text-surface-900 dark:text-white group-hover:text-primary-500 transition-colors">
                                                {student.nome}
                                            </h3>
                                            <p class="text-sm text-surface-500">{student.classe}ª Classe</p>
                                        </div>
                                    </div>
                                    
                                    <div class="text-surface-400 group-hover:text-primary-500 transition-colors">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                                

                            </div>
                        </button>
                    {/each}
                    
            
                </div>
            {/if}
        </div>

    {/if}
</div>

<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
    }
</style>