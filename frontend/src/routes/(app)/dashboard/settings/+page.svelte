<!-- src/routes/dashboard/settings/+page.svelte -->
<script lang="ts">
    import { auth } from '$lib/store/auth';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { User, Mail, Phone, Save, Loader, ShieldCheck, Lock } from 'lucide-svelte';
    import '../../../../app.css'
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { notifications } from '$lib/store/notifications';

    let isLoading = false;
    let successMessage = '';
    let errorMessage = '';
        let isUserLoaded = false;
    let isLoadingProfile = false;
    let isLoadingPassword = false;
    let isOAuthUSer = false;

    $: if($auth.user?.oauthId !== null){
        isOAuthUSer = true;
    }else{
        isOAuthUSer = false;
    }
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

    // Reset messages quando os dados mudam
    $: if (formData.nome || formData.sobrenome || formData.email || formData.telefone) {
        successMessage = '';
        errorMessage = '';
    }

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
                // Limpar formulário de senha
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
        formData = {
            nome: $auth.user?.nome || '',
            sobrenome: $auth.user?.sobrenome || '',
            email: $auth.user?.email || '',
            telefone: $auth.user?.telefone || ''
        };
        successMessage = '';
        errorMessage = '';
        goto('/dashboard')
    }

        // Carregar dados do utilizador quando a store estiver pronta
    onMount(() => {
        // Usar uma reactive statement para atualizar quando o auth.user mudar
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


<div class="max-w-2xl mx-auto space-y-8 animate-fade-in">
    <!-- Cabeçalho -->
    <div class="space-y-2">
        <h1 class="text-3xl font-bold text-surface-900-50-token">Definições da Conta</h1>
        <p class="text-lg text-surface-600-300-token">
            Gerir as suas informações pessoais e preferências da conta.
        </p>
    </div>

    <!-- Formulário -->
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 space-y-6">


        <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-3 pb-4 border-b border-surface-100 dark:border-surface-700">
            <User size={24} class="text-primary-500" />
            Informações Pessoais
        </h2>

        <form on:submit|preventDefault={updateProfile} class="space-y-6">
            <!-- Nome e Sobrenome -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label for="nome" class="block text-sm font-medium text-surface-700 dark:text-surface-300">
                        Nome *
                    </label>
                    <input
                        id="nome"
                        type="text"
                        class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                        bind:value={formData.nome}
                        required
                        placeholder="Seu nome"
                    />
                </div>

                <div class="space-y-2"> 
                    <label for="sobrenome" class="block text-sm font-medium text-surface-700 dark:text-surface-300">
                        Sobrenome *
                    </label>
                    <input
                        id="sobrenome"
                        type="text"
                        class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                        bind:value={formData.sobrenome}
                        required
                        placeholder="Seu sobrenome"
                    />
                </div>
            </div>

            <!-- Email -->
            <div class="space-y-2">
                <label for="email" class="block text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-2">
                    <Mail size={16} class="text-surface-500" />
                    Email *
                </label>
                <input
                    id="email"
                    type="email"
                    class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                    bind:value={formData.email}
                    required
                    placeholder="seu@email.com"
                />
                <p class="text-xs text-surface-500 dark:text-surface-400">
                    O email é usado para iniciar sessão e receber notificações.
                </p>
            </div>

            <!-- Telefone -->
            <div class="space-y-2">
                <label for="telefone" class="block text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-2">
                    <Phone size={16} class="text-surface-500" />
                    Telefone
                </label>
                <input
                    id="telefone"
                    type="tel"
                    class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                    bind:value={formData.telefone}
                    placeholder="+258 8X XXX XXXX"
                />
                <p class="text-xs text-surface-500 dark:text-surface-400">
                    Opcional - usado para contactos importantes.
                </p>
            </div>

            <!-- Ações do Formulário -->
            <div class="flex flex-col sm:flex-row gap-3 pt-6 border-t border-surface-200 dark:border-surface-600">
                <button
                    type="submit"
                    class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <Loader size={16} class="animate-spin mr-2" />
                        <span>A Guardar...</span>
                    {:else}
                        <Save size={16} class="mr-2" />
                        <span>Guardar Alterações</span>
                    {/if}
                </button>

                <button
                    type="button"
                    class="inline-flex items-center justify-center px-4 py-2 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 focus:ring-2 focus:ring-surface-500 focus:ring-offset-2 text-surface-700 dark:text-surface-300 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={resetForm}
                    disabled={isLoading}
                >
                    Cancelar
                </button>
            </div>
        </form>
    </div>

        {#if !isOAuthUSer}
        <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 space-y-6">
        <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-3 pb-4 border-b border-surface-100 dark:border-surface-700">
            <ShieldCheck size={24} class="text-secondary-500" />
            Segurança
        </h2>

        <form on:submit|preventDefault={changePassword} class="space-y-6">
            <div class="space-y-4">
                <label class="label">
                    <span class="font-medium text-sm ml-1">Senha Atual</span>
                    <div class="input-group input-group-divider grid-cols-1">
                        <input type="password" bind:value={passwordData.currentPassword} placeholder="••••••••"                      class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"

 required />
                    </div>
                </label>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label class="label">
                        <span class="font-medium text-sm ml-1">Nova Senha</span>
                        <input type="password"                         class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
 bind:value={passwordData.newPassword} placeholder="Mínimo 6 caracteres" required />
                    </label>
                    <label class="label">
                        <span class="font-medium text-sm ml-1">Confirmar Nova Senha</span>
                        <input type="password"                         class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
 bind:value={passwordData.confirmNewPassword} placeholder="Repita a senha" required />
                    </label>
                </div>
            </div>

            <div class="flex justify-end pt-2">
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
        animation: fadeIn 0.3s ease-out forwards;
    }

    /* Melhorias para os inputs no dark mode */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
        -webkit-text-fill-color: #1f2937;
        -webkit-box-shadow: 0 0 0px 1000px white inset;
        transition: background-color 5000s ease-in-out 0s;
    }

    .dark input:-webkit-autofill,
    .dark input:-webkit-autofill:hover,
    .dark input:-webkit-autofill:focus {
        -webkit-text-fill-color: #f9fafb;
        -webkit-box-shadow: 0 0 0px 1000px #374151 inset;
    }
</style>