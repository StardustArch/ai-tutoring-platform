<svelte:head>
    <title>Sistema - Admin KaniMente</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { 
        Server, Activity, Database, Cpu, Clock, 
        Terminal, Zap, AlertTriangle, RefreshCw
    } from 'lucide-svelte';

    let sys: any = null;
    let loading = true;
    let refreshing = false;

    async function loadData() {
        refreshing = true;
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/admin/system`);
            if (res.ok) sys = await res.json();
        } finally {
            loading = false;
            refreshing = false;
        }
    }

    onMount(loadData);

    function formatUptime(seconds: number) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }

    function getStatusColor(latency: number) {
        if (latency < 100) return 'text-emerald-500';
        if (latency < 500) return 'text-amber-500';
        return 'text-rose-500';
    }
</script>

<div class="space-y-6 animate-fade-in">
    
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Estado do Sistema</h1>
            <p class="text-sm text-surface-500">Métricas de infraestrutura e serviços.</p>
        </div>
        <button 
            on:click={loadData}
            disabled={refreshing}
            class="p-2 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
            <RefreshCw size={18} class={refreshing ? 'animate-spin' : ''} />
        </button>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div class="h-32 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
            <div class="h-32 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
            <div class="h-32 bg-surface-200 dark:bg-surface-800 rounded-lg"></div>
        </div>
    {:else}
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white dark:bg-surface-800 p-6 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10">
                    <Server size={64} />
                </div>
                <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4">Servidor (Host)</h3>
                
                <div class="space-y-4">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-surface-600 dark:text-surface-300 flex items-center gap-2">
                            <Clock size={16} /> Uptime
                        </span>
                        <span class="font-mono font-bold text-surface-900 dark:text-white">
                            {formatUptime(sys.server.uptime)}
                        </span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-surface-600 dark:text-surface-300 flex items-center gap-2">
                            <Cpu size={16} /> Memória (Heap)
                        </span>
                        <span class="font-mono font-bold text-surface-900 dark:text-white">
                            {sys.server.memory.heapUsed} MB
                        </span>
                    </div>
                    <div class="w-full bg-surface-100 dark:bg-surface-700 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                            class="bg-primary-500 h-full rounded-full" 
                            style="width: {(sys.server.memory.heapUsed / sys.server.memory.total) * 100}%"
                        ></div>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-surface-800 p-6 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
                <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Database size={16} /> Base de Dados
                </h3>
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <p class="text-2xl font-bold text-surface-900 dark:text-white">Online</p>
                        <p class="text-xs text-surface-500">PostgreSQL (Local)</p>
                    </div>
                    <div class="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                        <Activity size={20} />
                    </div>
                </div>
                <div class="flex items-center gap-2 text-sm bg-surface-50 dark:bg-surface-900/50 p-2 rounded border border-surface-100 dark:border-surface-700">
                    <Zap size={14} class={getStatusColor(sys.services.database.latency)} />
                    <span>Latência:</span>
                    <span class="font-mono font-bold">{sys.services.database.latency}ms</span>
                </div>
            </div>

            <div class="bg-white dark:bg-surface-800 p-6 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
                <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Cpu size={16} /> KaniMente AI
                </h3>
                
                {#if sys.services.ai.status === 'ONLINE'}
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <p class="text-2xl font-bold text-surface-900 dark:text-white">Online</p>
                            <p class="text-xs text-surface-500">FastAPI / Python Service</p>
                        </div>
                        <div class="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div class="flex items-center gap-2 text-sm bg-surface-50 dark:bg-surface-900/50 p-2 rounded border border-surface-100 dark:border-surface-700">
                        <Zap size={14} class={getStatusColor(parseInt(sys.services.ai.latency))} />
                        <span>Latência:</span>
                        <span class="font-mono font-bold">{sys.services.ai.latency}</span>
                    </div>
                {:else}
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <p class="text-2xl font-bold text-rose-600">Offline</p>
                            <p class="text-xs text-surface-500">Verificar Container</p>
                        </div>
                        <div class="h-10 w-10 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <div class="p-2 rounded bg-rose-50 border border-rose-100 text-xs text-rose-700">
                        Erro de conexão. O serviço Python pode estar desligado.
                    </div>
                {/if}
            </div>
        </div>

        <div class="bg-surface-900 text-surface-300 rounded-lg shadow-lg overflow-hidden font-mono text-sm border border-surface-700">
            <div class="bg-surface-950 px-4 py-2 border-b border-surface-800 flex items-center gap-2">
                <Terminal size={14} />
                <span class="text-xs font-bold uppercase">Configuração de Ambiente</span>
            </div>
            <div class="p-6 space-y-2">
                <div class="flex gap-4">
                    <span class="text-primary-400 w-32 shrink-0">OS Platform:</span>
                    <span class="text-surface-100">{sys.server.platform}</span>
                </div>
                <div class="flex gap-4">
                    <span class="text-primary-400 w-32 shrink-0">Node Version:</span>
                    <span class="text-surface-100">{sys.server.nodeVersion}</span>
                </div>
                <div class="flex gap-4">
                    <span class="text-primary-400 w-32 shrink-0">Environment:</span>
                    <span class="text-warning-400">{sys.env.envMode}</span>
                </div>
                <div class="h-px bg-surface-800 my-2"></div>
                <div class="flex gap-4">
                    <span class="text-emerald-400 w-32 shrink-0">API Host:</span>
                    <span class="text-surface-100 break-all">{sys.env.apiUrl}</span>
                </div>
                <div class="flex gap-4">
                    <span class="text-emerald-400 w-32 shrink-0">AI Service:</span>
                    <span class="text-surface-100 break-all">{sys.env.aiUrl}</span>
                </div>
        <div class="h-px bg-surface-800 my-2"></div>
        
        <div class="flex gap-4">
            <span class="text-purple-400 w-32 shrink-0">Server Time:</span>
            <span class="text-surface-100">{sys.env.serverTime}</span>
        </div>
        <div class="flex gap-4">
            <span class="text-purple-400 w-32 shrink-0">Timezone:</span>
            <span class="text-surface-100">{sys.env.timezone}</span>
        </div>

        <div class="mt-4 pt-4 border-t border-surface-800 text-xs text-surface-500">
            > System check completed at {sys.env.serverTime} <br>
            > All systems operational.
        </div>
            </div>
        </div>

    {/if}
</div>