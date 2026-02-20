<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications'; 
  import Notification from '$lib/components/Notification.svelte';
  import { Lock, CheckCircle, AlertTriangle } from 'lucide-svelte';
    import '../../../app.css'

  let newPassword = '';
  let confirmPassword = '';
  let isLoading = false;
  let token = '';
  let success = false;

  onMount(() => {
    token = $page.url.searchParams.get('token') || '';
    if (!token) {
        notifications.send('Link inválido. Tente pedir novamente.', 'error');
        setTimeout(() => goto('/reset-password'), 2000);
    }
  });

  async function handleReset() {
    if (newPassword.length < 6) {
        notifications.send('A senha deve ter pelo menos 6 caracteres.', 'warning');
        return;
    }
    if (newPassword !== confirmPassword) {
        notifications.send('As senhas não coincidem.', 'warning');
        return;
    }

    isLoading = true;
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/auth/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });

        if (res.ok) {
            success = true;
            notifications.send('Senha alterada com sucesso!', 'success');
            setTimeout(() => goto('/login'), 3000);
        } else {
            const err = await res.json();
            throw new Error(err.message || 'Link expirado ou inválido.');
        }
    } catch (err: any) {
        notifications.send(err.message, 'error');
    } finally {
        isLoading = false;
    }
  }
</script>

<Notification />

<div class="h-full w-full flex flex-col items-center justify-center p-4">
  
        <div class="w-full max-w-md  rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 space-y-6">
    
    <div class="text-center space-y-2">
        <h1 class="h2 font-bold text-surface-900 dark:text-surface-50">Nova Senha</h1>
        <p>Defina uma nova palavra-passe para a sua conta.</p>
    </div>

    {#if success}
        <div class="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl text-center space-y-3 animate-fade-in">
            <CheckCircle size={48} class="mx-auto text-green-500" />
            <h3 class="font-bold text-green-800 dark:text-green-200">Sucesso!</h3>
            <p class="text-sm text-green-700 dark:text-green-300">
                A sua senha foi atualizada. A redirecionar para o login...
            </p>
        </div>
    {:else}
        <form on:submit|preventDefault={handleReset} class="space-y-4">
            
            <label class="label">
                <span class="font-medium text-sm ml-1">Nova Senha</span>
                <div class="input-group input-group-divider grid-cols-1">
                    <input 
                        type="password" 
                        bind:value={newPassword} 
                        placeholder="••••••••" 
 class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:focus:ring-secondary-400 dark:focus:border-secondary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"                        required
                    />
                </div>
            </label>

            <label class="label">
                <span class="font-medium text-sm ml-1">Confirmar Senha</span>
                <div class="input-group input-group-divider grid-cols-1">
                    <input 
                        type="password" 
                        bind:value={confirmPassword} 
                        placeholder="••••••••" 
 class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:focus:ring-secondary-400 dark:focus:border-secondary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"                          required
                    />
                </div>
            </label>

            <button type="submit"  class="w-full inline-flex items-center justify-center px-4 py-2 bg-secondary-600 hover:bg-secondary-700 focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                {#if isLoading}
                    <span class="loading loading-spinner loading-sm"></span>
                {:else}
                    Alterar Senha
                {/if}
            </button>
        </form>
    {/if}

  </div>
</div>



<!-- 
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
    </div> -->