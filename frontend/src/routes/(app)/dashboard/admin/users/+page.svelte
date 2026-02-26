<svelte:head>
    <title>Gestão de Utilizadores - KaniMente</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { confirm } from '$lib/store/confirm';
    import { fade, scale } from 'svelte/transition';
    import { 
        Search, Filter, Shield, GraduationCap, Briefcase, 
        ChevronLeft, ChevronRight, UserX, UserCheck, 
        KeyRound, Plus, Pencil, X, Loader2
    } from 'lucide-svelte';

    // --- ESTADO ---
    let users: any[] = [];
    let loading = true;
    let page = 1;
    let totalPages = 1;
    let searchQuery = '';
    let searchTimeout: any;

    // Estado do Modal
    let showModal = false;
    let modalMode: 'create' | 'edit' = 'create';
    let formData = {
        id: 0,
        nome: '',
        sobrenome: '',
        email: '',
        telefone: '',
        role: 'USER',
        password: '' // Apenas para criação
    };
    let modalLoading = false;

    // --- CARREGAMENTO ---
    async function loadUsers(p: number = 1) {
        loading = true;
        try {
            // Constrói a URL com pesquisa
            let url = `${PUBLIC_API_URL_HOST}/api/admin/users?page=${p}&limit=10`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

            const res = await apiFetch(url);
            if (res.ok) {
                const data = await res.json();
                users = data.data;
                const meta = data.meta;
                page = meta.page;
                totalPages = meta.lastPage;
            }
        } finally {
            loading = false;
        }
    }

    onMount(() => loadUsers(1));

    // Debounce na pesquisa para não "spammar" o servidor
    function handleSearchInput() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            page = 1;
            loadUsers(1);
        }, 500);
    }

    // --- AÇÕES DO UTILIZADOR ---

    // 1. Bloquear / Desbloquear
    async function handleBlock(u: any) {
        const action = u.ativo ? 'Bloquear' : 'Desbloquear';
        const type = u.ativo ? 'danger' : 'success';
        
        const ok = await confirm({
            title: `${action} Utilizador`,
            message: `Tem a certeza que deseja ${action.toLowerCase()} o acesso de ${u.nome}?`,
            type: type,
            confirmText: action,
        });

        if (ok) {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/admin/users/${u.id}/toggle-block`, {
                method: 'PATCH'
            });
            if (res.ok) loadUsers(page); // Recarrega a lista
        }
    }

    // 2. Reset de Senha
    async function handleResetPassword(u: any) {
        const ok = await confirm({
            title: 'Resetar Senha',
            message: `A senha de ${u.nome} será alterada para "Mudar123!". Continuar?`,
            type: 'warning',
            confirmText: 'Resetar',
        });

        if (ok) {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/admin/users/${u.id}/reset-password`, {
                method: 'PATCH'
            });
            if (res.ok) alert('Senha resetada com sucesso para: Mudar123!');
        }
    }

    // 3. Abrir Modal (Criar ou Editar)
    function openModal(mode: 'create' | 'edit', user?: any) {
        modalMode = mode;
        if (mode === 'edit' && user) {
            formData = { ...user, password: '' }; // Password vazia na edição
        } else {
            formData = { id: 0, nome: '', sobrenome: '', email: '', telefone: '', role: 'USER', password: '' };
        }
        showModal = true;
    }

    // 4. Submeter Formulário
    async function handleSubmit() {
        modalLoading = true;
        try {
            const url = modalMode === 'create' 
                ? `${PUBLIC_API_URL_HOST}/api/admin/users`
                : `${PUBLIC_API_URL_HOST}/api/admin/users/${formData.id}`;
            
            const method = modalMode === 'create' ? 'POST' : 'PATCH';
            
            // Remove password se for edição vazia (para não enviar string vazia)
            const payload = { ...formData };

            if (modalMode === 'edit') delete payload.password;

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showModal = false;
                loadUsers(page);
            } else {
                const err = await res.json();
                alert(`Erro: ${err.message || 'Falha ao salvar'}`);
            }
        } finally {
            modalLoading = false;
        }
    }
</script>

<div class="space-y-6 animate-fade-in relative z-0">
    
    <div class="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Utilizadores</h1>
            <p class="text-sm text-surface-500">Gestão completa de acessos.</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div class="relative flex-1 sm:flex-initial">
                <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input 
                    type="text" 
                    bind:value={searchQuery}
                    on:input={handleSearchInput}
                    placeholder="Nome ou Email..." 
                    class="pl-10 pr-4 py-2 w-full md:w-64 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
            </div>
            <button 
                on:click={() => openModal('create')}
                class="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                <Plus size={18} /> Novo Utilizador
            </button>
        </div>
    </div>

    <div class="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-surface-50 dark:bg-surface-900/50 text-surface-500 font-semibold uppercase tracking-wider text-xs border-b border-surface-200 dark:border-surface-700">
                    <tr>
                        <th class="px-6 py-4">Identidade</th>
                        <th class="px-6 py-4">Estado</th>
                        <th class="px-6 py-4">Role</th>
                        <th class="px-6 py-4">Perfis</th>
                        <th class="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                    {#if loading}
                        {#each Array(5) as _}
                            <tr>
                                <td class="px-6 py-4"><div class="h-10 w-48 bg-surface-100 dark:bg-surface-700 rounded animate-pulse"></div></td>
                                <td class="px-6 py-4"><div class="h-6 w-16 bg-surface-100 dark:bg-surface-700 rounded animate-pulse"></div></td>
                                <td class="px-6 py-4"><div class="h-6 w-16 bg-surface-100 dark:bg-surface-700 rounded animate-pulse"></div></td>
                                <td class="px-6 py-4"><div class="h-6 w-20 bg-surface-100 dark:bg-surface-700 rounded animate-pulse"></div></td>
                                <td class="px-6 py-4"></td>
                            </tr>
                        {/each}
                    {:else if users.length === 0}
                        <tr>
                            <td colspan="5" class="px-6 py-8 text-center text-surface-500">
                                Nenhum utilizador encontrado.
                            </td>
                        </tr>
                    {:else}
                        {#each users as u}
                            <tr class="hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors group">
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-sm font-bold text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-600">
                                            {u.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <p class="font-medium text-surface-900 dark:text-white leading-tight">{u.nome} {u.sobrenome}</p>
                                            <p class="text-xs text-surface-500">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    {#if u.ativo}
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ativo
                                        </span>
                                    {:else}
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                            <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Bloqueado
                                        </span>
                                    {/if}
                                </td>
                                <td class="px-6 py-4">
                                    {#if u.role === 'ADMIN'}
                                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wide">
                                            <Shield size={10} /> Admin
                                        </span>
                                    {:else}
                                        <span class="px-2 py-1 rounded text-[10px] font-medium text-surface-600 bg-surface-100 border border-surface-200 dark:bg-surface-700 dark:border-surface-600 dark:text-surface-300">
                                            USER
                                        </span>
                                    {/if}
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex gap-1">
                                        {#if u.perfilProfessor}
                                            <div class="p-1.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800 tooltip" title="Professor">
                                                <Briefcase size={14} />
                                            </div>
                                        {/if}
                                        {#if u.perfilEncarregado}
                                            <div class="p-1.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 tooltip" title="Encarregado">
                                                <GraduationCap size={14} />
                                            </div>
                                        {/if}
                                        {#if !u.perfilProfessor && !u.perfilEncarregado}
                                            <span class="text-xs text-surface-400 italic px-2">--</span>
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <div class="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button on:click={() => openModal('edit', u)} class="p-1.5 text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-md transition-colors" title="Editar">
                                            <Pencil size={16} />
                                        </button>
                                        <button on:click={() => handleResetPassword(u)} class="p-1.5 text-surface-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors" title="Reset Senha">
                                            <KeyRound size={16} />
                                        </button>
                                        <button on:click={() => handleBlock(u)} class="p-1.5 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-md transition-colors {u.ativo ? 'hover:text-rose-600' : 'hover:text-emerald-600'}" title={u.ativo ? 'Bloquear' : 'Desbloquear'}>
                                            {#if u.ativo}
                                                <UserX size={16} />
                                            {:else}
                                                <UserCheck size={16} />
                                            {/if}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
        
        <div class="bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-700 px-6 py-3 flex justify-between items-center">
            <span class="text-xs text-surface-500">Página {page} de {totalPages}</span>
            <div class="flex gap-2">
                <button 
                    disabled={page === 1 || loading}
                    on:click={() => loadUsers(page - 1)}
                    class="p-1.5 rounded-md border border-surface-300 dark:border-surface-600 hover:bg-white dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <button 
                    disabled={page >= totalPages || loading}
                    on:click={() => loadUsers(page + 1)}
                    class="p-1.5 rounded-md border border-surface-300 dark:border-surface-600 hover:bg-white dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    </div>
</div>

{#if showModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" transition:fade={{duration: 150}}>
        <div class="bg-white dark:bg-surface-900 w-full max-w-lg rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden flex flex-col max-h-[90vh]" transition:scale={{start: 0.95, duration: 150}}>
            
            <div class="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-800">
                <h3 class="font-bold text-lg text-surface-900 dark:text-white">
                    {modalMode === 'create' ? 'Novo Utilizador' : 'Editar Utilizador'}
                </h3>
                <button on:click={() => showModal = false} class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
                    <X size={20} />
                </button>
            </div>

            <div class="p-6 overflow-y-auto custom-scrollbar">
                <form on:submit|preventDefault={handleSubmit} class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <label class="label">
                            <span class="text-xs font-semibold text-surface-500 uppercase">Nome</span>
                            <input type="text" bind:value={formData.nome} class="input p-2 rounded-lg border border-surface-300 w-full dark:bg-surface-800 dark:border-surface-600" required />
                        </label>
                        <label class="label">
                            <span class="text-xs font-semibold text-surface-500 uppercase">Sobrenome</span>
                            <input type="text" bind:value={formData.sobrenome} class="input p-2 rounded-lg border border-surface-300 w-full dark:bg-surface-800 dark:border-surface-600" required />
                        </label>
                    </div>

                    <label class="label">
                        <span class="text-xs font-semibold text-surface-500 uppercase">Email</span>
                        <input type="email" bind:value={formData.email} class="input p-2 rounded-lg border border-surface-300 w-full dark:bg-surface-800 dark:border-surface-600" required />
                    </label>

                    <div class="grid grid-cols-2 gap-4">
                        <label class="label">
                            <span class="text-xs font-semibold text-surface-500 uppercase">Telefone</span>
                            <input type="text" bind:value={formData.telefone} class="input p-2 rounded-lg border border-surface-300 w-full dark:bg-surface-800 dark:border-surface-600" required />
                        </label>
                        <label class="label">
                            <span class="text-xs font-semibold text-surface-500 uppercase">Role</span>
                            <select bind:value={formData.role} class="select p-2 rounded-lg border border-surface-300 w-full dark:bg-surface-800 dark:border-surface-600">
                                <option value="USER">User (Padrão)</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </label>
                    </div>

                    {#if modalMode === 'create'}
                        <label class="label">
                            <span class="text-xs font-semibold text-surface-500 uppercase">Senha Inicial</span>
                            <input type="password" bind:value={formData.password} class="input p-2 rounded-lg border border-surface-300 w-full dark:bg-surface-800 dark:border-surface-600" required minlength="6" />
                        </label>
                    {/if}

                    <div class="pt-4 flex justify-end gap-3">
                        <button type="button" on:click={() => showModal = false} class="px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" disabled={modalLoading} class="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2">
                            {#if modalLoading} <Loader2 size={16} class="animate-spin"/> {/if}
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
</style>