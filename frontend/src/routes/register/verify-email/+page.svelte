<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiFetch } from '$lib/utils/api';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import { CheckCircle, XCircle, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import '../../../app.css';

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

			// delay estético — o utilizador vê o spinner pelo menos 2s
			await new Promise((resolve) => setTimeout(resolve, 2000));

			if (res.ok) {
				status = 'success';
				message = 'Conta ativada com sucesso!';
				setTimeout(() => goto('/login'), 3000);
			} else {
				status = 'error';
				message = data.message || 'Erro na verificação.';
			}
		} catch (e) {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			status = 'error';
			message = 'Erro de conexão.';
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-surface-50 p-4 dark:bg-surface-950">
	<div
		class="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-xl dark:border-surface-800 dark:bg-surface-900"
	>
		{#if status === 'loading'}
			<Loader2 size={48} class="mx-auto mb-4 animate-spin text-primary-600" />
			<h1 class="text-xl font-bold text-surface-900 dark:text-white">A verificar...</h1>
		{:else if status === 'success'}
			<CheckCircle size={48} class="mx-auto mb-4 text-emerald-500" />
			<h1 class="mb-2 text-xl font-bold text-surface-900 dark:text-white">Sucesso!</h1>
			<p class="mb-4 text-sm text-surface-500">{message}</p>
			<p class="text-xs text-surface-400">A redirecionar...</p>
		{:else}
			<XCircle size={48} class="mx-auto mb-4 text-red-500" />
			<h1 class="mb-2 text-xl font-bold text-surface-900 dark:text-white">Erro</h1>
			<p class="mb-6 text-sm text-surface-500">{message}</p>
			<a href="/login" class="variant-filled-primary btn w-full">Voltar ao Login</a>
		{/if}
	</div>
</div>
