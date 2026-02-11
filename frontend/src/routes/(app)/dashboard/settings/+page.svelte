<script lang="ts">
    import { auth } from '$lib/store/auth';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { User, Mail, Phone, Save, Loader, ShieldCheck, Lock, KeyRound } from 'lucide-svelte';
    import '../../../../app.css'
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { notifications } from '$lib/store/notifications';

    let isLoadingProfile = false;
    let isLoadingPassword = false;
    let isUserLoaded = false;
    
    // Simplificação da lógica reativa
    $: isOAuthUser = !!$auth.user?.oauthId;

    // Constante de estilo para inputs (para evitar repetição e manter consistência)
    const inputClass = "w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
    const labelClass = "block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5";

    // Dados do formulário
    let formData = {
        nome: $auth.user?.nome || '',
        sobrenome: $auth.user?.sobrenome || '',
        email: $auth.user?.email || '',
        telefone: $auth.user?.telefone || ''
    };

    // Dados da Senha
    let passwordData = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    };

    // --- ATUALIZAR PERFIL ---
    async function updateProfile() {
        isLoadingProfile = true;
        try {
            const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                notifications.send('Perfil atualizado com sucesso!', 'success');
                await auth.refreshUser();
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error: any) {
            notifications.send(error.message || 'Erro de conexão.', 'error');
        } finally {
            isLoadingProfile = false;
        }
    }

    // --- ALTERAR SENHA ---
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
                notifications.send('Senha alterada com sucesso!', 'success');
                passwordData = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error: any) {
            notifications.send(error.message || 'Erro ao alterar senha.', 'error');
        } finally {
            isLoadingPassword = false;
        }
    }

    function resetForm() {
        // Reseta para os valores originais do store
        formData = {
            nome: $auth.user?.nome || '',
            sobrenome: $auth.user?.sobrenome || '',
            email: $auth.user?.email || '',
            telefone: $auth.user?.telefone || ''
        };
        goto('/dashboard');
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

<div class="max-w-4xl container mx-auto space-y-8 animate-fade-in pb-10">

    <div class="border-b border-surface-200 dark:border-surface-700 pb-6">
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">Definições da Conta</h1>
        <p class="text-lg text-surface-500 mt-2">
            Gerencie suas informações pessoais, contatos e segurança.
        </p>
    </div>

    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        <div class="p-6 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
            <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <User size={20} class="text-primary-500" />
                Dados Pessoais
            </h2>
        </div>

        <form on:submit|preventDefault={updateProfile} class="p-6 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="nome" class={labelClass}>Nome *</label>
                    <input
                        id="nome"
                        type="text"
                        class={inputClass}
                        bind:value={formData.nome}
                        required
                        placeholder="Seu nome"
                    />
                </div>

                <div> 
                    <label for="sobrenome" class={labelClass}>Sobrenome *</label>
                    <input
                        id="sobrenome"
                        type="text"
                        class={inputClass}
                        bind:value={formData.sobrenome}
                        required
                        placeholder="Seu sobrenome"
                    />
                </div>
            </div>

            <div>
                <label for="email" class={labelClass}>
                    <span class="flex items-center gap-2"><Mail size={16} /> Email *</span>
                </label>
                <input
                    id="email"
                    type="email"
                    class={inputClass}
                    bind:value={formData.email}
                    required
                    disabled={isOAuthUser} 
                    title={isOAuthUser ? "Gerido pelo fornecedor de login externo" : ""}
                />
                <p class="text-xs text-surface-500 mt-1.5 flex items-center gap-1">
                    {#if isOAuthUser}
                        <ShieldCheck size={12} class="text-success-500"/> Conta vinculada a um provedor externo. O email não pode ser alterado aqui.
                    {:else}
                        Usado para login e notificações.
                    {/if}
                </p>
            </div>

            <div>
                <label for="telefone" class={labelClass}>
                    <span class="flex items-center gap-2"><Phone size={16} /> Telefone</span>
                </label>
                <input
                    id="telefone"
                    type="tel"
                    class={inputClass}
                    bind:value={formData.telefone}
                    placeholder="+258 8X XXX XXXX"
                />
            </div>

            <div class="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                    type="submit"
                    class="btn variant-filled-primary rounded-lg min-w-[140px] flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoadingProfile}
                >
                    {#if isLoadingProfile}
                        <Loader size={18} class="animate-spin" />
                        <span>A Guardar...</span>
                    {:else}
                        <Save size={18} />
                        <span>Guardar</span>
                    {/if}
                </button>
                <button
                    type="button"
                    class="btn variant-outline-surface border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={resetForm}
                    disabled={isLoadingProfile}
                >
                    Cancelar
                </button>
            </div>
        </form>
    </div>

    {#if !isOAuthUser}
        <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
            <div class="p-6 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                    <ShieldCheck size={20} class="text-secondary-500" />
                    Alterar Senha
                </h2>
            </div>

            <form on:submit|preventDefault={changePassword} class="p-6 space-y-6">
                <div>
                    <label for="currentPassword" class={labelClass}>Senha Atual</label>
                    <div class="relative">
                        <input 
                            id="currentPassword"
                            type="password" 
                            class={inputClass} 
                            bind:value={passwordData.currentPassword} 
                            placeholder="••••••••" 
                            required 
                        />
                        <KeyRound size={16} class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"/>
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
                            placeholder="Repita a senha" 
                            required 
                        />
                    </div>
                </div>

                <div class="flex justify-end pt-2">
                    <button 
                        type="submit" 
                        class="btn variant-filled-secondary rounded-lg flex items-center justify-center gap-2 min-w-[160px]" 
                        disabled={isLoadingPassword}
                    >
                        {#if isLoadingPassword}
                            <Loader size={18} class="animate-spin" /> 
                            <span>A Alterar...</span>
                        {:else}
                            <Lock size={18} /> 
                            <span>Atualizar Senha</span>
                        {/if}
                    </button>
                                <button type="submit"                     class="inline-flex items-center justify-center px-4 py-2 bg-secondary-600 hover:bg-secondary-700 focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoadingPassword}>
                    {#if isLoadingPassword}
                        <Loader size={16} class="animate-spin mr-2" /> A Alterar...
                    {:else}
                        <Lock size={16} class="mr-2" /> Atualizar Senha
                    {/if}
                </button>
                </div>

            </form>
        </div>
    {/if}
</div>

<style>
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fade-in {
        animation: fadeIn 0.4s ease-out forwards;
    }

    /* Autocomplete styles fix for dark mode */
    :global(.dark) input:-webkit-autofill,
    :global(.dark) input:-webkit-autofill:hover,
    :global(.dark) input:-webkit-autofill:focus {
        -webkit-text-fill-color: #f9fafb;
        -webkit-box-shadow: 0 0 0px 1000px #374151 inset;
        caret-color: white;
    }

    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
        -webkit-text-fill-color: #1f2937;
        -webkit-box-shadow: 0 0 0px 1000px white inset;
    }
</style>