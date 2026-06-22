<svelte:head>
    <title>Definições da Conta | KMind</title>
</svelte:head>

<script lang="ts">
    import { auth } from '$lib/store/auth';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { User, Mail, Phone, Save, Loader, ShieldCheck, Lock, KeyRound, ChevronLeft, Trash2, AlertTriangle, X } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { notify } from '$lib/store/toaster';

    let isLoadingProfile = false;
    let isLoadingPassword = false;
    let isUserLoaded = false;
    let isDeleting = false;
    let showDeleteModal = false;
    let deleteConfirmText = '';
    
    $: isOAuthUser = !!$auth.user?.oauthId;

    // Estilo Enterprise Standard
    const inputClass = "w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-surface-700 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 transition-all disabled:opacity-60 disabled:bg-surface-50 dark:disabled:bg-surface-800 shadow-sm";
    const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-surface-500 dark:text-surface-400 mb-1.5 ml-0.5";

    let formData = {
        nome: $auth.user?.nome || '',
        sobrenome: $auth.user?.sobrenome || '',
        email: $auth.user?.email || '',
        telefone: $auth.user?.telefone || ''
    };

    let passwordData = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    };

    async function updateProfile() {
        if (!formData.nome.trim() || !formData.sobrenome.trim()) {
            notify('Atenção','Nome e Sobrenome são obrigatórios.', 'warning');
            return;
        }

        isLoadingProfile = true;
        try {
            const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                notify('Salvo','Perfil atualizado com sucesso.', 'success');
                await auth.refreshUser();
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error: any) {
            notify('Erro',error.message || 'Erro ao atualizar perfil.', 'error');
        } finally {
            isLoadingProfile = false;
        }
    }

    async function changePassword() {
        if (passwordData.newPassword.length < 6) {
            notify('Atenção','A nova senha deve ter pelo menos 6 caracteres.', 'warning');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            notify('Atenção','A confirmação da senha não coincide.', 'warning');
            return;
        }

        isLoadingPassword = true;
        try {
            const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/auth/change-password`, {
                method: 'PATCH',
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            if (response.ok) {
                notify('Salvo','Senha alterada com sucesso.', 'success');
                passwordData = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error: any) {
            notify('Erro',error.message || 'Falha na verificação da senha atual.', 'error');
        } finally {
            isLoadingPassword = false;
        }
    }

    function openDeleteModal() {
        showDeleteModal = true;
        deleteConfirmText = '';
    }

    function closeDeleteModal() {
        showDeleteModal = false;
        deleteConfirmText = '';
    }

    async function deleteAccount() {
        if (deleteConfirmText !== 'ELIMINAR') {
            notify('Atenção', 'Digite "ELIMINAR" para confirmar a eliminação.', 'warning');
            return;
        }

        isDeleting = true;
        try {
            const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/auth/delete-account`, {
                method: 'DELETE'
            });

            if (response.ok) {
                notify('Conta Eliminada', 'A sua conta foi removida com sucesso.', 'success');
                // Limpar sessão e redirecionar
                await auth.logout();
                goto('/');
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error: any) {
            notify('Erro', error.message || 'Erro ao eliminar conta.', 'error');
        } finally {
            isDeleting = false;
            closeDeleteModal();
        }
    }

    onMount(() => {
        const unsubscribe = auth.subscribe(($auth) => {
            if ($auth.user && !isUserLoaded) {
                formData = {
                    nome: $auth.user.nome || '',
                    sobrenome: $auth.user.sobrenome || '',
                    email: $auth.user.email || '',
                    telefone: $auth.user.telefone || ''
                };
                isUserLoaded = true;
            }
        });
        return () => unsubscribe();
    });
</script>

<div class="max-w-4xl container mx-auto space-y-8 animate-fade-in pb-20 p-4 md:p-8">

    <header class="border-b border-surface-200 dark:border-surface-700 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Definições da Conta</h1>
            <p class="text-sm text-surface-500 mt-1">Gestão de identidade, contactos e parâmetros de segurança.</p>
        </div>
        <button 
            on:click={() => goto('/dashboard')}
            class="flex items-center gap-2 text-xs font-bold text-surface-500 hover:text-primary-600 transition-colors uppercase tracking-wider"
        >
            <ChevronLeft size={16} /> Voltar ao Painel
        </button>
    </header>

    <section class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/20">
            <h2 class="text-sm font-bold uppercase tracking-wide text-surface-700 dark:text-surface-200 flex items-center gap-2">
                <User size={16} /> Informação de Perfil
            </h2>
        </div>

        <form on:submit|preventDefault={updateProfile} class="p-6 md:p-8 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="nome" class={labelClass}>Nome próprio</label>
                    <input id="nome" type="text" class={inputClass} bind:value={formData.nome} required />
                </div>
                <div> 
                    <label for="sobrenome" class={labelClass}>Sobrenome</label>
                    <input id="sobrenome" type="text" class={inputClass} bind:value={formData.sobrenome} required />
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="email" class={labelClass}>Endereço de Email</label>
                    <div class="relative">
                        <input
                            id="email"
                            type="email"
                            class="{inputClass} pl-10"
                            bind:value={formData.email}
                            required
                            disabled={isOAuthUser} 
                        />
                        <Mail size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    </div>
                    {#if isOAuthUser}
                        <p class="text-[10px] text-primary-600 mt-2 flex items-center gap-1 font-medium">
                            <ShieldCheck size={12}/> Autenticação via provedor externo. O email é gerido externamente.
                        </p>
                    {/if}
                </div>

                <div>
                    <label for="telefone" class={labelClass}>Contacto Telefónico</label>
                    <div class="relative">
                        <input
                            id="telefone"
                            type="tel"
                            class="{inputClass} pl-10"
                            bind:value={formData.telefone}
                            placeholder="+258 -- --- ----"
                        />
                        <Phone size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    </div>
                </div>
            </div>

            <div class="pt-4 flex justify-end">
                <button
                    type="submit"
                    class="btn bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md py-2 px-6 flex items-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-70 text-sm"
                    disabled={isLoadingProfile}
                >
                    {#if isLoadingProfile}
                        <Loader size={16} class="animate-spin" />
                        <span>A Guardar...</span>
                    {:else}
                        <Save size={16} />
                        <span>Guardar Alterações</span>
                    {/if}
                </button>
            </div>
        </form>
    </section>

    {#if !isOAuthUser}
        <section class="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/20">
                <h2 class="text-sm font-bold uppercase tracking-wide text-surface-700 dark:text-surface-200 flex items-center gap-2">
                    <Lock size={16} /> Segurança da Conta
                </h2>
            </div>

            <form on:submit|preventDefault={changePassword} class="p-6 md:p-8 space-y-6">
                <div>
                    <label for="currentPassword" class={labelClass}>Senha Atual</label>
                    <div class="relative max-w-sm">
                        <input 
                            id="currentPassword"
                            type="password" 
                            class="{inputClass} pl-10" 
                            bind:value={passwordData.currentPassword} 
                            placeholder="••••••••" 
                            required 
                        />
                        <KeyRound size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"/>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="newPassword" class={labelClass}>Nova Senha</label>
                        <input 
                            id="newPassword"
                            type="password" 
                            class={inputClass}
                            bind:value={passwordData.newPassword} 
                            placeholder="Mínimo 6 caracteres" 
                            required 
                        />
                    </div>
                    <div>
                        <label for="confirmNewPassword" class={labelClass}>Confirmar Nova Senha</label>
                        <input 
                            id="confirmNewPassword"
                            type="password" 
                            class={inputClass}
                            bind:value={passwordData.confirmNewPassword} 
                            placeholder="Repita a nova senha" 
                            required 
                        />
                    </div>
                </div>

                <div class="pt-4 flex justify-end">
                    <button 
                        type="submit" 
                        class="btn bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 font-medium rounded-md py-2 px-6 flex items-center gap-2 shadow-sm transition-all hover:bg-surface-800 dark:hover:bg-white disabled:opacity-70 text-sm" 
                        disabled={isLoadingPassword}
                    >
                        {#if isLoadingPassword}
                            <Loader size={16} class="animate-spin" /> 
                            <span>A Atualizar...</span>
                        {:else}
                            <Lock size={16} /> 
                            <span>Atualizar Credenciais</span>
                        {/if}
                    </button>
                </div>
            </form>
        </section>
    {/if}

    <!-- Secção de Eliminação de Conta -->
    <section class="bg-white dark:bg-surface-800 rounded-lg border border-red-200 dark:border-red-800/30 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-900/10">
            <h2 class="text-sm font-bold uppercase tracking-wide text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={16} /> Zona de Risco - Eliminar Conta
            </h2>
        </div>

        <div class="p-6 md:p-8">
            <div class="max-w-2xl">
                <p class="text-sm text-surface-600 dark:text-surface-300 mb-4">
                    Ao eliminar a sua conta, todos os dados associados serão permanentemente removidos. 
                    Esta ação é <span class="font-bold text-red-600 dark:text-red-400">irreversível</span>.
                </p>
                
                <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-md p-4 mb-6">
                    <div class="flex items-start gap-3">
                        <AlertTriangle size={18} class="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div class="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                            <p><span class="font-semibold">Antes de eliminar, considere:</span></p>
                            <ul class="list-disc list-inside space-y-0.5 ml-1">
                                <li>Perderá acesso a todos os dados e conteúdos</li>
                                <li>Não poderá recuperar a conta após a eliminação</li>
                                <li>Alguns dados podem ser retidos por obrigações legais</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-4 flex-wrap">
                    <button
                        on:click={openDeleteModal}
                        class="btn bg-red-600 hover:bg-red-700 text-white font-medium rounded-md py-2 px-6 flex items-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-red-500 text-sm"
                        disabled={isDeleting}
                    >
                        {#if isDeleting}
                            <Loader size={16} class="animate-spin" />
                            <span>A Eliminar...</span>
                        {:else}
                            <Trash2 size={16} />
                            <span>Eliminar Conta</span>
                        {/if}
                    </button>
                    
                    <span class="text-xs text-surface-400">
                        Esta ação requer confirmação adicional
                    </span>
                </div>
            </div>
        </div>
    </section>

    <!-- Modal de Confirmação de Eliminação -->
    {#if showDeleteModal}
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div class="bg-white dark:bg-surface-800 rounded-lg shadow-xl max-w-md w-full border border-surface-200 dark:border-surface-700 overflow-hidden">
                <div class="p-6 border-b border-surface-200 dark:border-surface-700 bg-red-50/50 dark:bg-red-900/10 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <AlertTriangle size={20} class="text-red-600 dark:text-red-400" />
                        </div>
                        <h3 class="text-lg font-bold text-surface-900 dark:text-surface-50">Confirmar Eliminação</h3>
                    </div>
                    <button 
                        on:click={closeDeleteModal}
                        class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div class="p-6 space-y-4">
                    <p class="text-sm text-surface-600 dark:text-surface-300">
                        Tem a certeza que deseja eliminar permanentemente a sua conta?
                    </p>
                    
                    <div class="bg-surface-50 dark:bg-surface-700/50 rounded-md p-3">
                        <p class="text-xs text-surface-500 dark:text-surface-400">
                            <span class="font-semibold">Email:</span> {$auth.user?.email}
                        </p>
                        <p class="text-xs text-surface-500 dark:text-surface-400">
                            <span class="font-semibold">Nome:</span> {$auth.user?.nome} {$auth.user?.sobrenome}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <label for="deleteConfirm" class="text-xs font-medium text-surface-700 dark:text-surface-300">
                            Digite <span class="font-bold text-red-600 dark:text-red-400">ELIMINAR</span> para confirmar
                        </label>
                        <input 
                            id="deleteConfirm"
                            type="text" 
                            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white dark:bg-surface-700 text-sm text-surface-900 dark:text-surface-100"
                            bind:value={deleteConfirmText}
                            placeholder="ELIMINAR"
                            on:keydown={(e) => {
                                if (e.key === 'Enter' && deleteConfirmText === 'ELIMINAR') {
                                    deleteAccount();
                                }
                            }}
                        />
                    </div>
                </div>
                
                <div class="p-6 border-t border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/20 flex justify-end gap-3">
                    <button
                        on:click={closeDeleteModal}
                        class="px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-md transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        on:click={deleteAccount}
                        class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        disabled={deleteConfirmText !== 'ELIMINAR' || isDeleting}
                    >
                        {#if isDeleting}
                            <Loader size={16} class="animate-spin" />
                            A Eliminar...
                        {:else}
                            <Trash2 size={16} />
                            Eliminar Conta
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Estilização para preenchimento automático em Dark Mode */
    :global(.dark) input:-webkit-autofill {
        -webkit-text-fill-color: #f9fafb !important;
        -webkit-box-shadow: 0 0 0px 1000px #374151 inset !important;
    }
</style>