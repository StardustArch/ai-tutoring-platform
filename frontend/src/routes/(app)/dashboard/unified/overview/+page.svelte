<svelte:head>
    <title>Visão Geral - KMind</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import {
        School, BarChart3, Plus, Users, GraduationCap, 
        BookOpen, Target, Clock, ChevronRight, AlertCircle, 
        Briefcase, ArrowUpRight, CheckCircle2, LayoutGrid
    } from 'lucide-svelte';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { auth } from '$lib/store/auth';

    // --- ESTADO ---
    $: user = $auth.user;
    $: isEncarregado = !!user?.perfilEncarregado;
    $: isProfessor = !!user?.perfilProfessor;
    // Verifica se o professor já tem escola/perfil completo
    $: isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome; 

    let dashboardData: any = null;
    let loading = true;

    // --- CARREGAMENTO ---
    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        try {
            loading = true;
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/unified-dashboard`);
            if (res.ok) {
                dashboardData = await res.json();
            }
        } catch (e) {
            console.error('Erro:', e);
        } finally {
            loading = false;
        }
    }

    function getInitials(name: string) {
        return name ? name.substring(0, 2).toUpperCase() : '--';
    }

    // Estilos comuns para manter consistência
    const cardBase = "bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm";
    const labelStyle = "text-xs font-semibold text-surface-500 uppercase tracking-wider";
</script>

<div class="container mx-auto p-4 md:p-8 space-y-8 animate-fade-in max-w-8xl">
    
    <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-surface-200 dark:border-surface-700">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                Visão Geral
            </h1>
            <p class="text-surface-500 text-sm mt-1">
                Bem-vindo, <span class="font-semibold text-surface-900 dark:text-surface-100">{user?.nome?.split(' ')[0]}</span>.
            </p>
        </div>

        <div class="flex items-center gap-2">
            {#if isProfessor}
                <span class="px-2 py-1 rounded text-xs font-medium bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-600">
                    Docente
                </span>
            {/if}
            {#if isEncarregado}
                <span class="px-2 py-1 rounded text-xs font-medium bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-600">
                    Encarregado
                </span>
            {/if}
        </div>
    </header>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {#each Array(4) as _}
                <div class="h-24 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
            {/each}
        </div>
    {:else}

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {#if isProfessorAtivo}
                <div class="{cardBase} p-4 border-l-4 border-l-primary-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class={labelStyle}>Turmas Ativas</p>
                            <h3 class="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                                {dashboardData?.professor?.stats?.totalTurmas || 0}
                            </h3>
                        </div>
                        <School size={18} class="text-surface-400" />
                    </div>
                </div>

                <div class="{cardBase} p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class={labelStyle}>Total Alunos</p>
                            <h3 class="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                                {dashboardData?.professor?.stats?.totalAlunos || 0}
                            </h3>
                        </div>
                        <Users size={18} class="text-surface-400" />
                    </div>
                </div>
            {/if}

            {#if isEncarregado}
                <div class="{cardBase} p-4 border-l-4 border-l-emerald-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class={labelStyle}>Meus Educandos</p>
                            <h3 class="text-2xl font-bold text-surface-900 dark:text-white mt-1">
                                {dashboardData?.encarregado?.educandos?.length || 0}
                            </h3>
                        </div>
                        <GraduationCap size={18} class="text-surface-400" />
                    </div>
                </div>

                <div class="{cardBase} p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class={labelStyle}>Atividades Hoje</p>
                            <div class="flex items-end gap-2 mt-1">
                                <h3 class="text-2xl font-bold text-surface-900 dark:text-white">
                                    {dashboardData?.encarregado?.stats?.atividadesHoje || 0}
                                </h3>
                                {#if (dashboardData?.encarregado?.stats?.atividadesHoje || 0) > 0}
                                    <span class="text-xs text-emerald-600 font-medium mb-1 flex items-center">
                                        <ArrowUpRight size={12} /> Ativo
                                    </span>
                                {/if}
                            </div>
                        </div>
                        <Clock size={18} class="text-surface-400" />
                    </div>
                </div>
            {/if}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                        <Briefcase size={18} class="text-surface-400" />
                        Área Docente
                    </h2>
                    {#if isProfessorAtivo}
                        <button 
                            on:click={() => goto('/dashboard/teacher/class/create-class?ref=homef')}
                            class="btn btn-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:border-primary-500 transition-colors text-xs font-medium"
                        >
                            <Plus size={14} class="mr-1" /> Nova Turma
                        </button>
                    {/if}
                </div>

                {#if isProfessorAtivo}
                    <div class="{cardBase} overflow-hidden">
                        <div class="bg-surface-50 dark:bg-surface-900/40 px-4 py-3 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center">
                            <span class="text-xs font-semibold text-surface-500 uppercase">Turmas Recentes</span>
                            <button on:click={() => goto('/dashboard/teacher/class')} class="text-xs text-primary-600 hover:underline">Ver todas</button>
                        </div>

                        {#if dashboardData?.professor?.turmasRecentes?.length > 0}
                            <div class="divide-y divide-surface-200 dark:divide-surface-700">
                                {#each dashboardData.professor.turmasRecentes.slice(0, 5) as turma}
                                    <button 
                                        class="w-full text-left px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors flex items-center justify-between group"
                                        on:click={() => goto(`/dashboard/teacher/class/${turma.id}?ref=homef`)}
                                    >
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-600">
                                                {getInitials(turma.nome)}
                                            </div>
                                            <div>
                                                <p class="text-sm font-medium text-surface-900 dark:text-surface-100 group-hover:text-primary-600 transition-colors">{turma.nome}</p>
                                                <p class="text-[11px] text-surface-500">{turma.totalAlunos} Alunos</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} class="text-surface-300 group-hover:text-surface-500" />
                                    </button>
                                {/each}
                            </div>
                        {:else}
                            <div class="p-8 text-center">
                                <p class="text-sm text-surface-500">Sem turmas ativas.</p>
                            </div>
                        {/if}
                    </div>
                {:else if isProfessor}
                    <div class="{cardBase} p-8 text-center border-dashed">
                        <AlertCircle size={32} class="mx-auto text-surface-400 mb-3" />
                        <h3 class="font-medium text-surface-900 dark:text-white">Perfil Incompleto</h3>
                        <p class="text-sm text-surface-500 mt-1 mb-4">Finalize o cadastro para gerir turmas.</p>
                        <button on:click={() => goto('/dashboard/teacher/become-teacher')} class="btn btn-sm variant-filled-primary">Concluir</button>
                    </div>
                {:else}
                    <div class="{cardBase} p-6 bg-surface-50/50">
                        <h3 class="font-bold text-surface-900 dark:text-white">É professor?</h3>
                        <p class="text-sm text-surface-500 mt-1 mb-4">Crie turmas, atribua trabalhos e acompanhe a evolução.</p>
                        <button on:click={() => goto('/dashboard/teacher/become-teacher')} class="btn btn-sm variant-outline-surface border-surface-300">Ativar Perfil Docente</button>
                    </div>
                {/if}
            </section>

            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                        <GraduationCap size={18} class="text-surface-400" />
                        Área Familiar
                    </h2>
                    {#if isEncarregado}
                        <button 
                            on:click={() => goto('/dashboard/foreman/student/create?ref=homef')}
                            class="btn btn-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:border-emerald-500 transition-colors text-xs font-medium"
                        >
                            <Plus size={14} class="mr-1" /> Adicionar
                        </button>
                    {/if}
                </div>

                {#if isEncarregado}
                    <div class="{cardBase} overflow-hidden">
                        <div class="bg-surface-50 dark:bg-surface-900/40 px-4 py-3 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center">
                            <span class="text-xs font-semibold text-surface-500 uppercase">Meus Educandos</span>
                        </div>

                        {#if dashboardData?.encarregado?.educandos?.length > 0}
                            <div class="divide-y divide-surface-200 dark:divide-surface-700">
                                {#each dashboardData.encarregado.educandos as educando}
                                    <div class="w-full px-4 py-3 flex items-center justify-between group hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30">
                                                {getInitials(educando.nome)}
                                            </div>
                                            <div>
                                                <p class="text-sm font-medium text-surface-900 dark:text-surface-100">{educando.nome}</p>
                                                <div class="flex items-center gap-2 text-[10px] text-surface-500">
                                                    <span>{educando.classe}ª Classe</span>
                                                    {#if educando.atividadesHoje > 0}
                                                        <span class="text-emerald-600 font-bold">• Ativo hoje</span>
                                                    {/if}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="flex items-center gap-2">
                                            <button 
                                                class="px-3 py-1.5 text-xs font-medium border border-surface-200 dark:border-surface-600 rounded hover:bg-white dark:hover:bg-surface-600 transition-colors"
                                                on:click={() => goto(`/dashboard/foreman/reports/${educando.id}?ref=homef`)}
                                            >
                                                Relatório
                                            </button>
                                            <button 
                                                class="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-sm"
                                                on:click={() => goto(`/dashboard/foreman/student/${educando.id}/class?ref=homef`)}
                                            >
                                                Entrar
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="p-8 text-center">
                                <p class="text-sm text-surface-500">Nenhum educando registado.</p>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="{cardBase} p-6 bg-surface-50/50">
                        <h3 class="font-bold text-surface-900 dark:text-white">É Encarregado?</h3>
                        <p class="text-sm text-surface-500 mt-1 mb-4">Acompanhe a educação dos seus filhos em tempo real.</p>
                        <button on:click={() => goto('/dashboard/foreman/become-foreman?ref=homef')} class="btn btn-sm variant-outline-surface border-surface-300">Ativar Perfil Familiar</button>
                    </div>
                {/if}
            </section>

        </div>
    {/if}
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>