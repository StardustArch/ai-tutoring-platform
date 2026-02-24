<script lang="ts">
    import { auth } from '$lib/store/auth'; // Caminho 'store' confirmado
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
    import { 
        Users, School, ArrowRight, Loader2 
    } from 'lucide-svelte';
    import '../../../app.css';

    let showDashboardSelection = false;

    // LÓGICA REATIVA
    $: if (browser && !$auth.isLoading) {
        console.log('🔍 [Dashboard] Loading terminou. User:', $auth.user);
        checkAndRedirect($auth.user);
    }

    async function checkAndRedirect(user: any) {
        // CORREÇÃO 1: Tratar caso de user nulo
        if (!user) {
            console.warn('⚠️ [Dashboard] Sem utilizador autenticado. Redirecionando para login...');
            await goto('/login');
            return;
        }

        const isEncarregado = !!user.perfilEncarregado;
        const isProfessor = !!user.perfilProfessor;
        const isProfessorAtivo = isProfessor && !!user.perfilProfessor?.escolaNome;
        const userHasBothProfiles = isEncarregado && isProfessorAtivo;

        console.log('👤 [Dashboard] Perfis:', { isEncarregado, isProfessorAtivo, userHasBothProfiles });

        if (userHasBothProfiles) {
            await goto('/dashboard/unified/overview', { replaceState: true });
        } else if (isProfessorAtivo) {
            await goto('/dashboard/teacher/overview', { replaceState: true });
        } else if (isEncarregado) {
            await goto('/dashboard/foreman/overview', { replaceState: true });
        } else {
            // CORREÇÃO 2: Só mostramos a seleção se realmente for um user novo sem perfil
            console.log('✨ [Dashboard] Novo utilizador detetado. A mostrar seleção.');
            showDashboardSelection = true;
        }
    }

    function getFirstName() {
        if (!$auth.user?.nome) return 'Utilizador';
        return $auth.user.nome.split(' ')[0];
    }
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col justify-center items-center p-4">
    
    {#if !showDashboardSelection}
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
            <p class="text-sm text-surface-500 dark:text-surface-400">
                A carregar o seu espaço...
            </p>
        </div>
        </div>
        </div>
    
    {:else}
        <div class="max-w-4xl w-full animate-fade-in space-y-8 text-center">
            
            <div class="space-y-2">
                <h1 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white tracking-tight">
                    Olá, {getFirstName()}! 👋
                </h1>
                <p class="text-lg text-surface-600 dark:text-surface-400">
                    Como deseja utilizar o KaniMente hoje?
                </p>
            </div>

            <div class="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                
                <button 
                    on:click={() => goto('/dashboard/foreman/become-foreman')}
                    class="group relative bg-white dark:bg-surface-800 p-8 rounded-3xl border-2 border-surface-200 dark:border-surface-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all hover:shadow-xl hover:shadow-emerald-500/10 text-left"
                >
                    <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Users size={28} />
                    </div>
                    <h3 class="text-xl font-bold text-surface-900 dark:text-white mb-2">Sou Encarregado</h3>
                    <p class="text-sm text-surface-500 leading-relaxed mb-6">
                        Quero registar os meus educandos, acompanhar o progresso escolar e receber relatórios.
                    </p>
                    <div class="flex items-center text-emerald-600 font-bold text-sm">
                        Configurar Perfil <ArrowRight size={16} class="ml-2 group-hover:translate-x-1 transition-transform"/>
                    </div>
                </button>

                <button 
                    on:click={() => goto('/dashboard/teacher/become-teacher')}
                    class="group relative bg-white dark:bg-surface-800 p-8 rounded-3xl border-2 border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all hover:shadow-xl hover:shadow-primary-500/10 text-left"
                >
                    <div class="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <School size={28} />
                    </div>
                    <h3 class="text-xl font-bold text-surface-900 dark:text-white mb-2">Sou Professor</h3>
                    <p class="text-sm text-surface-500 leading-relaxed mb-6">
                        Quero gerir as minhas turmas, criar atividades e acompanhar o desempenho dos alunos.
                    </p>
                    <div class="flex items-center text-primary-600 font-bold text-sm">
                        Configurar Perfil <ArrowRight size={16} class="ml-2 group-hover:translate-x-1 transition-transform"/>
                    </div>
                </button>

            </div>
            
            <p class="text-sm text-surface-400">
                Pode ter ambos os perfis associados à mesma conta.
            </p>
        </div>
    {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>