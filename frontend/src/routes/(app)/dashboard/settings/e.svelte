    
    <script lang="ts">
    import { auth } from '$lib/store/auth';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { User, Mail, Phone, Save, Loader, Lock, ShieldCheck } from 'lucide-svelte';
    import '../../../../app.css'
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { notifications } from '$lib/store/notifications';
    import Notification from '$lib/components/Notification.svelte'; // Não esquecer o componente

    let isLoadingProfile = false;
    let isLoadingPassword = false;
    let isUserLoaded = false;

    // Dados do Perfil
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

    function resetProfileForm() {
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
    <!-- 2. CARD: SEGURANÇA (CHANGE PASSWORD) -->
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 space-y-6">
        <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-3 pb-4 border-b border-surface-100 dark:border-surface-700">
            <ShieldCheck size={24} class="text-secondary-500" />
            Segurança
        </h2>

        <form on:submit|preventDefault={changePassword} class="space-y-6">
            <div class="space-y-4">
                <label class="label">
                    <span class="font-medium text-sm ml-1">Senha Atual</span>
                    <div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
                        <div class="input-group-shim"><Lock size={16}/></div>
                        <input type="password" bind:value={passwordData.currentPassword} placeholder="••••••••" class="bg-transparent border-none focus:ring-0" required />
                    </div>
                </label>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label class="label">
                        <span class="font-medium text-sm ml-1">Nova Senha</span>
                        <input type="password" class="input p-3" bind:value={passwordData.newPassword} placeholder="Mínimo 6 caracteres" required />
                    </label>
                    <label class="label">
                        <span class="font-medium text-sm ml-1">Confirmar Nova Senha</span>
                        <input type="password" class="input p-3" bind:value={passwordData.confirmNewPassword} placeholder="Repita a senha" required />
                    </label>
                </div>
            </div>

            <div class="flex justify-end pt-2">
                <button type="submit" class="btn variant-filled-secondary font-bold" disabled={isLoadingPassword}>
                    {#if isLoadingPassword}
                        <Loader size={16} class="animate-spin mr-2" /> A Alterar...
                    {:else}
                        <Lock size={16} class="mr-2" /> Atualizar Senha
                    {/if}
                </button>
            </div>
        </form>
    </div>