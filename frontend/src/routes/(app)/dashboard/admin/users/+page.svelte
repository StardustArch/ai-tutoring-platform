<svelte:head>
    <title>Utilizadores - Admin</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { confirm } from '$lib/store/confirm';
    import { 
        Search, Filter, MoreVertical, Shield, 
        GraduationCap, Briefcase, ChevronLeft, ChevronRight, UserX
    } from 'lucide-svelte';

    let users: any[] = [];
    let loading = true;
    let page = 1;
    let hasMore = true;

    async function loadUsers(p: number) {
        loading = true;
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/admin/users?page=${p}&limit=15`);
            if (res.ok) {
                const data = await res.json();
                users = data;
                hasMore = data.length === 15; // Se vierem menos de 15, acabou
                page = p;
            }
        } finally {
            loading = false;
        }
    }

    onMount(() => loadUsers(1));

    async function handleBlock(userId: number, name: string) {
        const ok = await confirm({
            title: 'Bloquear Utilizador',
            message: `Tem a certeza que deseja bloquear o acesso de ${name}?`,
            type: 'danger',
            confirmText: 'Bloquear',
        });

        if (ok) {
            // Lógica de bloqueio aqui (ainda não implementada no backend, mas o botão fica pronto)
            alert("Endpoint de bloqueio pendente.");
        }
    }
</script>

<div class="space-y-6 animate-fade-in">
    
    <div class="flex flex-col md:flex-row justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Utilizadores</h1>
            <p class="text-sm text-surface-500">Gerir acessos e permissões.</p>
        </div>
        
        <div class="flex gap-2">
            <div class="relative">
                <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    class="pl-10 pr-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full md:w-64"
                />
            </div>
            <button class="p-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-500 hover:text-surface-900">
                <Filter size={18} />
            </button>
        </div>
    </div>

    <div class="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-surface-50 dark:bg-surface-900/50 text-surface-500 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                        <th class="px-6 py-4">Utilizador</th>
                        <th class="px-6 py-4">Role</th>
                        <th class="px-6 py-4">Perfis</th>
                        <th class="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                    {#if loading}
                        {#each Array(5) as _}
                            <tr>
                                <td class="px-6 py-4"><div class="h-4 w-32 bg-surface-100 dark:bg-surface-700 rounded animate-pulse"></div></td>
                                <td class="px-6 py-4"><div class="h-4 w-16 bg-surface-100 dark:bg-surface-700 rounded animate-pulse"></div></td>
                                <td class="px-6 py-4"><div class="h-4 w-20 bg-surface-100 dark:bg-surface-700 rounded animate-pulse"></div></td>
                                <td class="px-6 py-4"></td>
                            </tr>
                        {/each}
                    {:else}
                        {#each users as u}
                            <tr class="hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors">
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-600 dark:text-surface-300">
                                            {u.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <p class="font-medium text-surface-900 dark:text-white">{u.nome}</p>
                                            <p class="text-xs text-surface-500">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    {#if u.role === 'ADMIN'}
                                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                                            <Shield size={10} /> ADMIN
                                        </span>
                                    {:else}
                                        <span class="px-2 py-1 rounded text-xs font-medium text-surface-500 bg-surface-100 border border-surface-200">
                                            User
                                        </span>
                                    {/if}
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex gap-1">
                                        {#if u.perfilProfessor}
                                            <span class="p-1 rounded bg-blue-50 text-blue-600 border border-blue-100" title="Professor">
                                                <Briefcase size={14} />
                                            </span>
                                        {/if}
                                        {#if u.perfilEncarregado}
                                            <span class="p-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100" title="Encarregado">
                                                <GraduationCap size={14} />
                                            </span>
                                        {/if}
                                        {#if !u.perfilProfessor && !u.perfilEncarregado}
                                            <span class="text-xs text-surface-400 italic">--</span>
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button 
                                        on:click={() => handleBlock(u.id, u.nome)}
                                        class="p-2 text-surface-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Bloquear"
                                    >
                                        <UserX size={16} />
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
        
        <div class="bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-700 px-6 py-3 flex justify-between items-center">
            <span class="text-xs text-surface-500">Página {page}</span>
            <div class="flex gap-2">
                <button 
                    disabled={page === 1 || loading}
                    on:click={() => loadUsers(page - 1)}
                    class="p-1.5 rounded-md border border-surface-300 dark:border-surface-600 hover:bg-white dark:hover:bg-surface-700 disabled:opacity-50"
                >
                    <ChevronLeft size={16} />
                </button>
                <button 
                    disabled={!hasMore || loading}
                    on:click={() => loadUsers(page + 1)}
                    class="p-1.5 rounded-md border border-surface-300 dark:border-surface-600 hover:bg-white dark:hover:bg-surface-700 disabled:opacity-50"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    </div>
</div>