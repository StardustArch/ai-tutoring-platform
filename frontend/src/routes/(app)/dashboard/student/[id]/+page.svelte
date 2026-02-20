<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { Brain, Zap, ArrowLeft, GraduationCap } from 'lucide-svelte';
    import '../../../../../app.css'

    let studentId = $page.params.id;

    // ✅ CAPTURAR O TURMA ID (Se existir)
    // Se o encarregado clicou no cartão "Turma de Matemática", o link trouxe ?turmaId=10
    $: turmaId = $page.url.searchParams.get('turmaId');

    function selectMode(mode: 'tutor' | 'rush') {
        // Constrói a Query String (só adiciona se existir turmaId)
        const queryParams = turmaId ? `?turmaId=${turmaId}` : '';
        console.log(turmaId)
        // Navega mantendo o contexto!
        if(mode === 'tutor'){
            goto(`/dashboard/student/${studentId}/chat/${turmaId}`);
        } else if(mode === 'rush'){
            goto(`/dashboard/student/${studentId}/rush/${turmaId}`);
        }
    }
    
    // Função de Voltar Inteligente
    function goBack() {
        // Se é um encarregado (normalmente sim), volta ao perfil do aluno
        // Ajusta o caminho conforme a tua estrutura de pastas do foreman
        goto(`/dashboard/foreman/student/${studentId}`);
    }
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
    
    <button on:click={() => goto(`/dashboard/foreman/student/${studentId}/class`)} class="absolute top-6 left-6 p-3 rounded-full bg-white shadow-sm hover:bg-surface-100 text-surface-500 transition-colors">
        <ArrowLeft size={24} />
    </button>

    <div class="text-center mb-12 space-y-2">
        <div class="inline-flex p-3 rounded-2xl bg-primary-100 text-primary-600 mb-4 shadow-sm">
            <GraduationCap size={40} />
        </div>
        <h1 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-surface-50 tracking-tight">
            Como queres aprender hoje?
        </h1>
        <p class="text-lg text-surface-500 max-w-md mx-auto">
            Escolhe o teu ritmo. O KaniMente adapta-se a ti.
        </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        <button 
            class="group relative overflow-hidden bg-white dark:bg-surface-800 p-8 rounded-3xl border-2 border-surface-200 dark:border-surface-700 hover:border-primary-500 hover:shadow-xl transition-all duration-300 text-left hover:-translate-y-1"
            on:click={() => selectMode('tutor')}
        >
            <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform text-primary-500">
                <Brain size={120} />
            </div>
            
            <div class="relative z-10">
                <div class="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Brain size={32} />
                </div>
                <h3 class="text-2xl font-bold text-surface-900 dark:text-white mb-2">Modo Tutor</h3>
                <p class="text-surface-500 dark:text-surface-400 font-medium leading-relaxed">
                    Aprende com calma. O Kani explica passo-a-passo, dá exemplos e ensina a teoria.
                </p>
                <div class="mt-6 inline-flex items-center text-blue-600 font-bold text-sm">
                    COMEÇAR AULA <span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </div>
        </button>

        <button 
            class="group relative overflow-hidden bg-white dark:bg-surface-800 p-8 rounded-3xl border-2 border-surface-200 dark:border-surface-700 hover:border-yellow-500 hover:shadow-xl transition-all duration-300 text-left hover:-translate-y-1"
            on:click={() => selectMode('rush')}
        >
            <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform text-yellow-500">
                <Zap size={120} />
            </div>

            <div class="relative z-10">
                <div class="w-14 h-14 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center mb-6 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                    <Zap size={32} />
                </div>
                <h3 class="text-2xl font-bold text-surface-900 dark:text-white mb-2">Modo Rush</h3>
                <p class="text-surface-500 dark:text-surface-400 font-medium leading-relaxed">
                    Quiz rápido! Sem conversas longas. Só perguntas, respostas e pontos. Desafia-te!
                </p>
                <div class="mt-6 inline-flex items-center text-yellow-600 font-bold text-sm">
                    JOGAR AGORA <span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </div>
        </button>

    </div>
</div>

<style>
    .bg-pattern {
        background-color: #f8fafc;
        background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
        background-size: 32px 32px;
    }
    :global(.dark) .bg-pattern {
        background-color: #0f172a;
        background-image: radial-gradient(#1e293b 1px, transparent 1px);
    }
</style>