<script lang="ts">
    import { onMount } from 'svelte';
    import { auth } from '$lib/store/auth';
    import { goto } from '$app/navigation';
    import { 
        Users, School, ChevronRight, BookOpen, GraduationCap, 
        LayoutDashboard, ArrowRight, Sparkles, Brain 
    } from 'lucide-svelte';
  import '../../../app.css'

    // Estado local
    let isRedirecting = true; // Começa true para não mostrar a UI enquanto verifica

    // Estado Reativo para UI (caso fique na página)
    $: user = $auth.user;

    function getFirstName() {
        if (!user?.nome) return 'Utilizador';
        return user.nome.split(' ')[0];
    }

    onMount(() => {
        const unsubscribe = auth.subscribe(async ($auth) => {
            // Se ainda está a carregar o user do backend, espera
            if ($auth.isLoading) return;

            const u = $auth.user;

            // Se não houver user (logout), deixa o layout tratar ou redireciona login
            if (!u) {
                isRedirecting = false;
                return;
            }

            const isProf = !!u.perfilProfessor;
            const isEnc = !!u.perfilEncarregado;

            // Lógica de Redirecionamento
            if (isProf && isEnc) {
                await goto('/dashboard/unified/overview', { replaceState: true });
            } else if (isProf) {
                await goto('/dashboard/teacher/overview', { replaceState: true });
            } else if (isEnc) {
                await goto('/dashboard/foreman/overview', { replaceState: true });
            } else {
                // Se não tiver nenhum perfil, para o loading e mostra a tela de escolha
                isRedirecting = false;
            }
        });

        return () => unsubscribe();
    });
</script>

<div class="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in min-h-[80vh] flex flex-col justify-center">

    {#if isRedirecting}
        <div class="flex flex-col items-center justify-center h-full space-y-4 opacity-70">
            <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-surface-500 font-medium animate-pulse">A carregar o seu espaço...</p>
        </div>
    {:else}
        <div class="space-y-4 mb-8 text-center md:text-left">
            <h1 class="text-3xl md:text-4xl font-bold text-surface-900 dark:text-surface-50">
                Olá, <span class="text-primary-600 dark:text-primary-400">{getFirstName()}</span>! 👋
            </h1>
            <p class="text-lg text-surface-600 dark:text-surface-400 max-w-2xl">
                Bem-vindo ao KaniMente. Para começarmos, diga-nos como pretende utilizar a plataforma hoje.
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
                on:click={() => goto('/dashboard/teacher/become-teacher')}
                class="group relative bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-lg p-8 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer text-left"
            >
                <div class="absolute top-0 left-0 w-1.5 h-full bg-primary-500 rounded-l-lg"></div>
                
                <div class="flex justify-between items-start mb-6">
                    <div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
                        <School size={32} />
                    </div>
                    <ArrowRight size={24} class="text-surface-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 class="text-2xl font-bold text-surface-900 dark:text-white mb-2 group-hover:text-primary-600 transition-colors">
                    Sou Professor
                </h3>
                <p class="text-surface-600 dark:text-surface-400 mb-6 leading-relaxed">
                    Ferramentas para criar turmas, monitorizar alunos e gerar atividades personalizadas com IA.
                </p>
                
                <span class="inline-flex items-center text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                    Ativar perfil docente <ChevronRight size={16} class="ml-1" />
                </span>
            </div>

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div 
                on:click={() => goto('/dashboard/foreman/become-foreman')}
                class="group relative bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-tertiary-500 dark:hover:border-tertiary-500 rounded-lg p-8 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer text-left"
            >
                <div class="absolute top-0 left-0 w-1.5 h-full bg-tertiary-500 rounded-l-lg"></div>
                
                <div class="flex justify-between items-start mb-6">
                    <div class="p-3 bg-tertiary-50 dark:bg-tertiary-900/20 rounded-lg text-tertiary-600 dark:text-tertiary-400">
                        <Users size={32} />
                    </div>
                    <ArrowRight size={24} class="text-surface-300 group-hover:text-tertiary-500 group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 class="text-2xl font-bold text-surface-900 dark:text-white mb-2 group-hover:text-tertiary-600 transition-colors">
                    Sou Encarregado
                </h3>
                <p class="text-surface-600 dark:text-surface-400 mb-6 leading-relaxed">
                    Acompanhe o desempenho escolar, consulte relatórios e ajude na evolução dos seus educandos.
                </p>
                
                <span class="inline-flex items-center text-sm font-bold text-tertiary-600 dark:text-tertiary-400 uppercase tracking-wide">
                    Ativar perfil familiar <ChevronRight size={16} class="ml-1" />
                </span>
            </div>
        </div>

        <div class="mt-8 flex items-center justify-center gap-2 text-sm text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-800/50 py-3 rounded-lg border border-surface-200 dark:border-surface-700">
            <Sparkles size={16} class="text-warning-500" />
            <span>Pode ativar o outro perfil mais tarde nas definições.</span>
        </div>
    {/if}

</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out;
  }

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
</style>