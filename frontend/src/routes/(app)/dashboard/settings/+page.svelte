<svelte:head>
    <title>Definições da Conta | KMind</title>
</svelte:head>

<script lang="ts">
    import { auth } from '$lib/store/auth';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { User, Mail, Phone, Save, Loader, ShieldCheck, Lock, KeyRound, ChevronLeft } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { notifications } from '$lib/store/notifications';

    let isLoadingProfile = false;
    let isLoadingPassword = false;
    let isUserLoaded = false;
    
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
            notifications.send('Nome e Sobrenome são obrigatórios.', 'warning');
            return;
        }

        isLoadingProfile = true;
        try {
            const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                notifications.send('Perfil atualizado com sucesso.', 'success');
                await auth.refreshUser();
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error: any) {
            notifications.send(error.message || 'Erro ao atualizar perfil.', 'error');
        } finally {
            isLoadingProfile = false;
        }
    }

    async function changePassword() {
        if (passwordData.newPassword.length < 6) {
            notifications.send('A nova senha deve ter pelo menos 6 caracteres.', 'warning');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            notifications.send('A confirmação da senha não coincide.', 'warning');
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
                notifications.send('Senha alterada com sucesso.', 'success');
                passwordData = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error: any) {
            notifications.send(error.message || 'Falha na verificação da senha atual.', 'error');
        } finally {
            isLoadingPassword = false;
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