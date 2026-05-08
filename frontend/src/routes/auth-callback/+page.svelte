<svelte:head>
    <title>A processar... | KMind</title>
</svelte:head>

<script lang="ts">
    import '../../app.css';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    // Removemos a dependência do $page aqui para evitar problemas de timing
    import { auth } from '$lib/store/auth'; // Confirma se o caminho é 'stores' (plural) ou 'store'
    import { Loader2 } from 'lucide-svelte';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';

    // --- LÓGICA DE REDIRECIONAMENTO ---
    function getDashboardRoute(user: any) {
        if (!user) return '/dashboard';
        
        const isEncarregado = !!user.perfilEncarregado;
        const isProfessor = !!user.perfilProfessor;
        const isProfessorAtivo = isProfessor && !!user.perfilProfessor?.escolaNome;
        const userHasBothProfiles = isEncarregado && isProfessorAtivo;

        if (userHasBothProfiles) return '/dashboard/unified/overview';
        if (isProfessorAtivo) return '/dashboard/teacher/overview';
        if (isEncarregado) return '/dashboard/foreman/overview';
        
        return '/dashboard';
    }

onMount(async () => {
    const params = new URLSearchParams(window.location.search);

    const code = params.get('code');
    const error = params.get('error');

    console.log('🔐 [Auth Callback]', {
        hasCode: !!code,
        error
    });

    if (error) {
        window.location.href = `/login?error=${error}`;
        return;
    }

    if (!code) {
        window.location.href = '/login?error=code_missing';
        return;
    }

    try {
        console.log('⏳ A trocar code por tokens...');

        const response = await fetch(
            `${PUBLIC_API_URL_HOST}/api/auth/exchange-code`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            }
        );

        if (!response.ok) {
            throw new Error('Falha ao trocar code');
        }

        const tokens = await response.json();

        console.log('✅ Tokens recebidos');

        const result = await auth.login({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });

        if (result.success && result.user) {
            const target = getDashboardRoute(result.user);

            console.log('🚀 Redirecionando para:', target);

            window.location.href = target;
        } else {
            throw new Error('Utilizador inválido');
        }

    } catch (err) {
        console.error('❌ [Auth Callback]', err);

        window.location.href =
            '/login?error=processing_failed';
    }
});
</script>

<div class="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-surface-950 p-4">
    <div class="text-center space-y-6 animate-fade-in">
        
        <div class="relative inline-flex items-center justify-center">
            <div class="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/10">
                <Loader2 size={32} class="animate-spin" />
            </div>
            <span class="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
            </span>
        </div>

        <div class="space-y-2">
            <h1 class="text-xl font-bold text-surface-900 dark:text-white tracking-tight">
                A validar credenciais...
            </h1>
            <p class="text-sm text-surface-500 dark:text-surface-400">
                A redirecionar para o KMind
            </p>
        </div>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>