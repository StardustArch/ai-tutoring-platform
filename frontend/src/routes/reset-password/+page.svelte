<script lang="ts">
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications'; // Caminho da sua store
  import Notification from '$lib/components/Notification.svelte';
  import { ArrowLeft, Mail, Send } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import '../../app.css'

  let email = '';
  let isLoading = false;
  let isSent = false;

  async function handleForgot() {
    if (!email) {
        notifications.send('Insira o seu email.', 'warning');
        return;
    }

    isLoading = true;
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/auth/forgot-password`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        // Independente do resultado (segurança), mostramos sucesso
        isSent = true;
        notifications.send('Se a conta existir, o email foi enviado.', 'success');
    } catch (err) {
        notifications.send('Erro de conexão.', 'error');
    } finally {
        isLoading = false;
    }
  }
</script>

<Notification />

<div class="min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-300">
  
  <div class="w-full max-w-md space-y-6">
    
    <!-- Botão Voltar -->
    <button on:click={() => goto('/login')} class="flex items-center gap-2 text-surface-600 dark:text-surface-400 hover:text-primary-500 transition-colors">
        <ArrowLeft size={20} /> Voltar ao Login
    </button>

        <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 space-y-6">
        
        <div class="text-center space-y-2">
            <h1 class="h2 font-bold text-surface-900 dark:text-surface-50">Recuperar Conta</h1>
            <p class="text-surface-500">Insira o seu email para receber um link de redefinição.</p>
        </div>

        {#if isSent}
            <div class="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center space-y-3 animate-fade-in">
                <div class="mx-auto w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center text-green-600 dark:text-green-300">
                    <Send size={24} />
                </div>
                <h3 class="font-bold text-green-800 dark:text-green-200">Verifique o seu Email</h3>
                <p class="text-sm text-green-700 dark:text-green-300">
                    Enviámos um link de recuperação para <strong>{email}</strong>.
                </p>
                <p class="text-xs opacity-70">(Nota: Como é um TCC, verifique a consola do Backend para ver o link simulado)</p>
            </div>
        {:else}
            <form on:submit|preventDefault={handleForgot} class="space-y-6">
                <label class="label">
                    <span class="font-medium text-sm ml-1">Email</span>
                    <div class="input-group input-group-divider grid-cols-1">
                        <!-- <div class="input-group-shim"></div> -->
                        <input 
                            type="email" 
                            bind:value={email} 
                            placeholder="seu@email.com" 
 class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 dark:focus:ring-secondary-400 dark:focus:border-secondary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </label>

                <button type="submit" class="inline-flex items-center justify-center w-full px-4 py-2 bg-secondary-600 hover:bg-secondary-700 focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                    {#if isLoading}
                        <span class="loading loading-spinner loading-sm"></span>
                    {:else}
                        Enviar Link
                    {/if}
                </button>
            </form>
        {/if}

    </div>
  </div>
</div>