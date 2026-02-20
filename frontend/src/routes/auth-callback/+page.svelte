<svelte:head>
    <title>A processar... | KaniMente</title>
</svelte:head>

<script lang="ts">
    import '../../app.css';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    // Removemos a dependência do $page aqui para evitar problemas de timing
    import { auth } from '$lib/store/auth'; // Confirma se o caminho é 'stores' (plural) ou 'store'
    import { Loader2 } from 'lucide-svelte';

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
        // 1. USAR WINDOW.LOCATION (Mais robusto para callbacks OAuth)
        // Isto lê diretamente a URL do navegador, ignorando o estado do router Svelte
        const params = new URLSearchParams(window.location.search);
        
        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken');
        const error = params.get('error');
        console.log('🔐 [Auth Callback] Params lidos:', { 
            hasAccess: !!accessToken, 
            hasRefresh: !!refreshToken, 
            error 
        });

        // 2. Validação de Erros
        if (error) {
            console.error('❌ Erro retornado pelo OAuth:', error);
            window.location.href = `/login?error=${error}`; // Hard redirect é mais seguro aqui
            return;
        }

        if (!accessToken) {
            console.error('❌ Token de acesso não encontrado na URL.');
            window.location.href = '/login?error=token_missing';
            return;
        }

        // 3. Processar Login
        try {
            console.log('⏳ A iniciar auth.login...');
            
            // Chama o login do store
            const result = await auth.login({ 
                accessToken, 
                refreshToken: refreshToken || undefined 
            });

            console.log('✅ Auth.login concluído:', result.success);

            if (result.success && result.user) {
                const target = getDashboardRoute(result.user);
                console.log('🚀 Redirecionando para:', target);
                
                // Usamos window.location.href para garantir um 'hard refresh'
                // Isso limpa qualquer estado "preso" do login anterior e garante que o dashboard carrega limpo
                window.location.href = target;
            } else {
                throw new Error('Login efetuado mas user inválido');
            }

        } catch (err) {
            console.error('❌ [Auth Callback] Falha crítica:', err);
            // Se falhar, manda para o login com hard refresh
            window.location.href = '/login?error=processing_failed';
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
                A redirecionar para o KaniMente
            </p>
        </div>
    </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>