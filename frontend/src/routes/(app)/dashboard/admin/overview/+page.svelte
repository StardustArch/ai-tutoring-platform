<svelte:head>
    <title>Admin - KaniMente</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { 
        Users, GraduationCap, School, Activity, 
        Server, Database, AlertTriangle, CheckCircle2, Clock
    } from 'lucide-svelte';

    let stats: any = null;
    let loading = true;

    onMount(async () => {
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/admin/dashboard`);
            if (res.ok) stats = await res.json();
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    });

    // Helper para cor da latência
    function getLatencyColor(ms: string) {
        const val = parseInt(ms);
        if (val < 100) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (val < 300) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-rose-600 bg-rose-50 border-rose-200';
    }
</script>

<div class="space-y-6 animate-fade-in">

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Painel de Controlo</h1>
            <p class="text-sm text-surface-500">Monitorização em tempo real do ecossistema.</p>
        </div>
        <div class="flex items-center gap-2">
            <span class="flex h-3 w-3 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span class="text-xs font-medium text-surface-600 dark:text-surface-400">Sistema Operacional</span>
        </div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            {#each Array(4) as _}
                <div class="h-28 bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse"></div>
            {/each}
        </div>
        <div class="h-64 bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse"></div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div class="p-5 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-600 dark:text-blue-400">
                        <Users size={20} />
                    </div>
                    {#if stats?.users?.professores > 0}
                         <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Active</span>
                    {/if}
                </div>
                <p class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Total Utilizadores</p>
                <div class="flex items-baseline gap-2 mt-1">
                    <h3 class="text-2xl font-bold text-surface-900 dark:text-white">{stats?.users?.alunos + stats?.users?.professores || 0}</h3>
                    <span class="text-xs text-surface-500">({stats?.users?.professores} Profs)</span>
                </div>
            </div>

            <div class="p-5 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md text-indigo-600 dark:text-indigo-400">
                        <School size={20} />
                    </div>
                </div>
                <p class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Turmas Ativas</p>
                <h3 class="text-2xl font-bold text-surface-900 dark:text-white mt-1">{stats?.system?.turmasAtivas || 0}</h3>
            </div>

            <div class="p-5 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md text-amber-600 dark:text-amber-400">
                        <Clock size={20} />
                    </div>
                </div>
                <p class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Sessões Hoje</p>
                <h3 class="text-2xl font-bold text-surface-900 dark:text-white mt-1">{stats?.system?.sessoesHoje || 0}</h3>
            </div>

            <div class="p-5 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm relative overflow-hidden">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md text-purple-600 dark:text-purple-400">
                        <Activity size={20} />
                    </div>
                    {#if stats?.system?.aiService?.status === 'ONLINE'}
                        <span class="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                    {:else}
                         <span class="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                    {/if}
                </div>
                <p class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Serviço IA</p>
                
                {#if stats?.system?.aiService?.status === 'ONLINE'}
                    <div class="flex items-center gap-2 mt-1">
                        <h3 class="text-xl font-bold text-surface-900 dark:text-white">Online</h3>
                        <span class="text-xs px-2 py-0.5 rounded border {getLatencyColor(stats.system.aiService.latency)}">
                            {stats.system.aiService.latency}
                        </span>
                    </div>
                {:else}
                    <h3 class="text-xl font-bold text-rose-600 mt-1">Offline</h3>
                    <p class="text-xs text-surface-500 mt-1">Verifique o container Python.</p>
                {/if}
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-6">
                <h3 class="text-lg font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                    <Server size={18} class="text-surface-400" /> Infraestrutura
                </h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-md border border-surface-100 dark:border-surface-700">
                        <div class="flex items-center gap-3">
                            <Database size={16} class="text-surface-400" />
                            <span class="text-sm font-medium text-surface-700 dark:text-surface-200">Base de Dados (Postgres)</span>
                        </div>
                        <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Conectado</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900/50 rounded-md border border-surface-100 dark:border-surface-700">
                        <div class="flex items-center gap-3">
                            <Server size={16} class="text-surface-400" />
                            <span class="text-sm font-medium text-surface-700 dark:text-surface-200">API Backend (NestJS)</span>
                        </div>
                        <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">v1.0.4</span>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>