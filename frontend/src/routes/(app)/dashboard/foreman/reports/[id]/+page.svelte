<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import '../../../../../../app.css'
    
    import { 
        ArrowLeft, Home, School, MessageSquare, Zap, 
        TrendingUp, BookOpen, AlertCircle
    } from 'lucide-svelte';

    let studentId = $page.params.id;
    let data: any = null;
    let loading = true;
    let error = false;

    onMount(async () => {
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/guardian/report/${studentId}`);
            if (res.ok) {
                data = await res.json();
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

    // Helper para percentagem
    function calcPercent(val1: number, val2: number) {
        const total = val1 + val2;
        if (total === 0) return 50;
        return (val1 / total) * 100;
    }

    // ✅ CORREÇÃO: Cálculos Reativos (Substitui o @const)
    // O Svelte recalcula isto automaticamente assim que 'data' deixar de ser null
    $: totalAtividade = data 
        ? (data.geral.casa.rush.total + data.geral.escola.rush.total + data.geral.casa.chat + data.geral.escola.chat)
        : 0;

    $: percCasa = data 
        ? calcPercent(
            data.geral.casa.rush.total + data.geral.casa.chat, 
            data.geral.escola.rush.total + data.geral.escola.chat
          ) 
        : 50;

      const ref = $page.url.searchParams.get('ref');

    function goBack() {
        if (ref === 'home') {
            goto('/dashboard/foreman/overview'); // Volta para a Visão Geral
        } else {
            // Default (ou se vier da lista)
            goto('/dashboard/foreman/student'); 
        }
    }
</script>

<div class="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in pb-20">
    
    <div class="flex items-center gap-4">
        <button on:click={() => goBack()} class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 transition-colors">
            <ArrowLeft size={24} />
        </button>
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Análise de Desempenho</h1>
            {#if data}
                <p class="text-surface-500 text-sm">Dados de <strong class="text-primary-500">{data.aluno.nome}</strong></p>
            {/if}
        </div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="h-64 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
            <div class="h-64 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
        </div>
    {:else if error}
        <div class="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800">
            <AlertCircle class="mx-auto text-red-500 mb-2" size={32} />
            <p class="text-red-700 dark:text-red-300">Erro ao carregar relatório.</p>
        </div>
    {:else if data}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="relative overflow-hidden bg-white dark:bg-surface-800 p-6 rounded-3xl border-2 border-green-100 dark:border-green-900/30 shadow-sm">
                <div class="absolute top-0 right-0 p-4 opacity-5">
                    <Home size={100} class="text-green-500"/>
                </div>
                
                <div class="flex items-center gap-3 mb-6 relative z-10">
                    <div class="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl">
                        <Home size={24} />
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white">Estudo em Casa</h2>
                        <p class="text-xs font-bold text-green-600 uppercase tracking-wider">Autónomo</p>
                    </div>
                </div>

                <div class="space-y-4 relative z-10">
                    <div class="flex justify-between items-center p-3 bg-surface-50 dark:bg-surface-900 rounded-xl">
                        <div class="flex items-center gap-2 text-surface-600 dark:text-surface-400 text-sm">
                            <MessageSquare size={16} /> Dúvidas Tiradas
                        </div>
                        <span class="font-bold text-lg">{data.geral.casa.chat}</span>
                    </div>

                    <div class="flex justify-between items-center p-3 bg-surface-50 dark:bg-surface-900 rounded-xl">
                        <div class="flex items-center gap-2 text-surface-600 dark:text-surface-400 text-sm">
                            <Zap size={16} /> Exercícios Rush
                        </div>
                        <div class="text-right">
                            <span class="font-bold text-lg block">{data.geral.casa.rush.total}</span>
                            <span class="text-xs font-bold {data.geral.casa.rush.taxaAcerto >= 70 ? 'text-green-500' : 'text-orange-500'}">
                                {data.geral.casa.rush.taxaAcerto}% Acerto
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="relative overflow-hidden bg-white dark:bg-surface-800 p-6 rounded-3xl border-2 border-blue-100 dark:border-blue-900/30 shadow-sm">
                <div class="absolute top-0 right-0 p-4 opacity-5">
                    <School size={100} class="text-blue-500"/>
                </div>

                <div class="flex items-center gap-3 mb-6 relative z-10">
                    <div class="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                        <School size={24} />
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-surface-900 dark:text-white">Estudo na Escola</h2>
                        <p class="text-xs font-bold text-blue-600 uppercase tracking-wider">Vinculado a Turmas</p>
                    </div>
                </div>

                <div class="space-y-4 relative z-10">
                    <div class="flex justify-between items-center p-3 bg-surface-50 dark:bg-surface-900 rounded-xl">
                        <div class="flex items-center gap-2 text-surface-600 dark:text-surface-400 text-sm">
                            <MessageSquare size={16} /> Dúvidas na Aula
                        </div>
                        <span class="font-bold text-lg">{data.geral.escola.chat}</span>
                    </div>

                    <div class="flex justify-between items-center p-3 bg-surface-50 dark:bg-surface-900 rounded-xl">
                        <div class="flex items-center gap-2 text-surface-600 dark:text-surface-400 text-sm">
                            <Zap size={16} /> TPC / Exercícios
                        </div>
                        <div class="text-right">
                            <span class="font-bold text-lg block">{data.geral.escola.rush.total}</span>
                            <span class="text-xs font-bold {data.geral.escola.rush.taxaAcerto >= 70 ? 'text-blue-500' : 'text-orange-500'}">
                                {data.geral.escola.rush.taxaAcerto}% Acerto
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-surface-800 p-6 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm">
            <h3 class="text-sm font-bold text-surface-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp size={16} /> Distribuição do Esforço
            </h3>
            
            <div class="h-4 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden flex">
                <div class="h-full bg-green-500 transition-all duration-1000" style="width: {percCasa}%"></div>
                <div class="h-full bg-blue-500 flex-1 transition-all duration-1000"></div>
            </div>
            
            <div class="flex justify-between mt-3 text-sm font-medium">
                <span class="text-green-600">{Math.round(percCasa)}% Casa</span>
                {#if totalAtividade === 0}
                    <span class="text-surface-400 text-xs">Sem atividade registada</span>
                {/if}
                <span class="text-blue-600">{Math.round(100 - percCasa)}% Escola</span>
            </div>
        </div>

        {#if data.turmas.length > 0}
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-surface-900 dark:text-white">Desempenho por Disciplina</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each data.turmas as turma}
                        <div class="p-5 bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 hover:border-blue-300 transition-colors">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h4 class="font-bold text-surface-900 dark:text-white">{turma.nome}</h4>
                                    <span class="text-xs bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 px-2 py-1 rounded mt-1 inline-block">
                                        {turma.disciplina}
                                    </span>
                                </div>
                                <BookOpen size={20} class="text-surface-400" />
                            </div>
                            
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-surface-500">Exercícios</span>
                                    <span class="font-bold">{turma.exerciciosFeitos}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-surface-500">Precisão</span>
                                    <span class="font-bold {turma.taxaAcerto >= 70 ? 'text-green-500' : 'text-orange-500'}">
                                        {turma.taxaAcerto}%
                                    </span>
                                </div>
                                <div class="w-full bg-surface-100 dark:bg-surface-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div class="h-full {turma.taxaAcerto >= 70 ? 'bg-green-500' : 'bg-orange-500'}" style="width: {turma.taxaAcerto}%"></div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

    {/if}
</div>