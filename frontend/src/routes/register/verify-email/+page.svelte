<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { CheckCircle, XCircle, Loader2 } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import '../../../app.css'

    let status: 'loading' | 'success' | 'error' = 'loading';
    let message = 'A verificar o seu token...';

    onMount(async () => {
        const token = $page.url.searchParams.get('token');
        
        if (!token) {
            status = 'error';
            message = 'Token não fornecido.';
            return;
        }

        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/auth/confirm-email`, {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            const data = await res.json();

            if (res.ok) {
                status = 'success';
                message = 'Conta ativada com sucesso!';
                // Redireciona após 3 segundos
                setTimeout(() => goto('/login'), 3000);
            } else {
                status = 'error';
                message = data.message || 'Erro na verificação.';
            }
        } catch (e) {
            status = 'error';
            message = 'Erro de conexão.';
        }
    });
</script>

<div class="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
    <div class="bg-white dark:bg-surface-900 p-8 rounded-2xl shadow-xl text-center max-w-sm w-full border border-surface-200 dark:border-surface-800">
        
        {#if status === 'loading'}
            <Loader2 size={48} class="animate-spin text-primary-600 mx-auto mb-4" />
            <h1 class="text-xl font-bold text-surface-900 dark:text-white">A verificar...</h1>
        
        {:else if status === 'success'}
            <CheckCircle size={48} class="text-emerald-500 mx-auto mb-4" />
            <h1 class="text-xl font-bold text-surface-900 dark:text-white mb-2">Sucesso!</h1>
            <p class="text-surface-500 text-sm mb-4">{message}</p>
            <p class="text-xs text-surface-400">A redirecionar...</p>
            
        {:else}
            <XCircle size={48} class="text-red-500 mx-auto mb-4" />
            <h1 class="text-xl font-bold text-surface-900 dark:text-white mb-2">Erro</h1>
            <p class="text-surface-500 text-sm mb-6">{message}</p>
            <a href="/login" class="btn variant-filled-primary w-full">Voltar ao Login</a>
        {/if}
    </div>
</div>