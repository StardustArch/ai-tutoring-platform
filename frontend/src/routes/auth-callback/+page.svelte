<!-- src/routes/auth-callback/+page.svelte -->
<script lang="ts">
    import '../../app.css'
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
    import { auth } from '$lib/store/auth';

	onMount(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const accessToken = urlParams.get('accessToken');
		const refreshToken = urlParams.get('refreshToken') || '';
		const error = urlParams.get('error');

		console.log('🔐 Parâmetros do callback:', { 
			accessToken: !!accessToken, 
			refreshToken: !!refreshToken, 
			error 
		});

// Altere estas linhas no seu onMount:

if (error) {
    console.error('❌ Erro no OAuth:', error);
    // Adicione o replaceState aqui
    await goto(`/login?error=${error}`, { replaceState: true });
    return;
}

if (!accessToken) {
    console.error('❌ Token de acesso não encontrado');
    // E aqui também
    await goto('/login?error=token_missing', { replaceState: true });
    return;
}

		try {
			// Usar a store de auth para processar o login OAuth
			const result 	= await auth.login({ accessToken, refreshToken });
			console.log('✅ Login OAuth realizado com sucesso!');

			// Redirecionar para dashboard
    let user = result.user;
    let isEncarregado = !!user?.perfilEncarregado;
    let isProfessor = !!user?.perfilProfessor;
    let isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;
    const userHasBothProfiles = isEncarregado && isProfessorAtivo;

if (result.success) {
    // Opcional: Pequeno delay para garantir que a store foi atualizada
    if (userHasBothProfiles) {
        await goto('/dashboard/unified/overview', { replaceState: true });
    } else if (isProfessorAtivo) {
        await goto('/dashboard/teacher/overview', { replaceState: true });
    } else if (isEncarregado) {
        await goto('/dashboard/foreman/overview', { replaceState: true });
    } else {
        await goto('/dashboard', { replaceState: true });
    }
}
		} catch (err) {
			console.error('❌ Erro ao processar callback:', err);
			await goto('/login?error=processing_failed');
		}
	});
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
	<div class="text-center space-y-6">
		<!-- Loading spinner -->
		<div class="relative">
			<div class="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 rounded-full animate-spin"></div>
			<div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-4 border-primary-500 rounded-full animate-ping"></div>
		</div>

		<div class="space-y-2">
			<h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100">
				A processar login...
			</h1>
			<p class="text-surface-600 dark:text-surface-400">
				A redirecionar para a sua conta
			</p>
		</div>
	</div>
</div>