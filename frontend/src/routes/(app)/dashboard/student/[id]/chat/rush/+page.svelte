<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { apiFetch } from '$lib/utils/api';
    import { ArrowLeft, Zap, Check, X, Heart, Brain, BookOpen, Calculator, Shapes, Lock } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import confetti from 'canvas-confetti';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import '../../../../../../../app.css'

    let studentId = $page.params.id || '';
    let studentClass = 5; // TODO: Buscar do perfil do aluno
    
    type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'BLOCKED';
    let currentState: GameState = 'MENU';

    let selectedSubject = 'matematica';
    let selectedSubtopic = '';
    
    let loading = false;
    let questionData: any = null;
    let selectedOption: string | null = null;
    let isCorrect: boolean | null = null;
    let lives = 3;
    let score = 0;
    let blockTimeRemaining = '';
    let blockedUntil: Date | null = null;

    // Estatísticas do aluno
    let stats = {
        xp: 0,
        totalExercicios: 0,
        acertos: 0,
        taxaAcerto: 0,
        erros: 0
    };
    let loadingStats = true;

    // Buscar estatísticas ao carregar
    onMount(async () => {
        if (studentId) {
            try {
                const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/stats/${studentId}`);
                if (res.ok) {
                    stats = await res.json();
                }
            } catch (e) {
                console.error('Erro ao buscar stats:', e);
            } finally {
                loadingStats = false;
            }
        } else {
            loadingStats = false;
        }
    });

    const TOPICS = {
        matematica: [
            { id: 'Adição e Subtração', icon: Calculator, color: 'bg-blue-500' },
            { id: 'Multiplicação (Tabuada)', icon: X, color: 'bg-purple-500' },
            { id: 'Divisão', icon: Zap, color: 'bg-indigo-500' },
            { id: 'Frações', icon: BookOpen, color: 'bg-teal-500' },
            { id: 'Geometria', icon: Shapes, color: 'bg-orange-500' },
            { id: 'Problemas de Lógica', icon: Brain, color: 'bg-pink-500' }
        ],
        portugues: [
            { id: 'Sinónimos e Antónimos', icon: Zap, color: 'bg-green-500' },
            { id: 'Verbos', icon: Zap, color: 'bg-blue-500' },
            { id: 'Nomes e Adjetivos', icon: Zap, color: 'bg-yellow-500' },
            { id: 'Ortografia (S/Z/X/CH)', icon: Zap, color: 'bg-red-500' },
            { id: 'Interpretação', icon: BookOpen, color: 'bg-purple-500' }
        ]
    };

    // Atualiza o tempo restante de bloqueio
    function updateBlockTimer() {
        if (!blockedUntil) return;
        const remaining = blockedUntil.getTime() - Date.now();
        if (remaining <= 0) {
            currentState = 'MENU';
            blockedUntil = null;
            return;
        }
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        blockTimeRemaining = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Timer para atualizar countdown
    $: if (currentState === 'BLOCKED' && blockedUntil) {
        const interval = setInterval(updateBlockTimer, 1000);
        updateBlockTimer();
        () => clearInterval(interval);
    }

    function startGame(subject: string, subtopic: string) {
        selectedSubject = subject;
        selectedSubtopic = subtopic;
        currentState = 'PLAYING';
        lives = 3;
        score = 0;
        loadQuestion();
    }

    async function loadQuestion() {
        loading = true;
        selectedOption = null;
        isCorrect = null;
        
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId), // ✅ Agora enviamos o alunoId
                    classe: studentClass,
                    disciplina: selectedSubject,
                    subtopico: selectedSubtopic,
                    
                })
            });
            
            // ✅ Tratar bloqueio (403)
            if (res.status === 403) {
                const error = await res.json();
                blockedUntil = new Date(error.blockedUntil);
                currentState = 'BLOCKED';
                return;
            }
            
            if (!res.ok) throw new Error('Erro na API');
            
            questionData = await res.json();
        } catch (e) {
            console.error('Erro:', e);
            questionData = {
                exercicioId: null,
                question: 'Erro de conexão. Tente recarregar.',
                options: ['Recarregar'],
                correct_answer: 'Recarregar'
            };
        } finally {
            loading = false;
        }
    }

    async function handleAnswer(option: string) {
        if (selectedOption) return;
        selectedOption = option;
        
        // Validação otimista
        isCorrect = option === questionData.correct_answer;

        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId),
                    exercicioId: questionData.exercicioId,
                    respostaAluno: option,
                    classe: studentClass
                })
            });
            
            const result = await res.json();
            isCorrect = result.acertou;
            
            // ✅ Atualizar vidas do servidor
            if (result.livesRemaining !== undefined) {
                lives = result.livesRemaining;
            }
            
            if (isCorrect) {
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                score += 10;
                stats.xp += 10; // Atualiza XP localmente
                stats.acertos += 1;
            } else {
                lives--;
                stats.erros += 1;
            }
            
            // Recalcula taxa de acerto
            const total = stats.acertos + stats.erros;
            stats.taxaAcerto = total > 0 ? Math.round((stats.acertos / total) * 100) : 0;
            stats.totalExercicios = total;
            
            // ✅ Verificar bloqueio
            if (result.blocked) {
                blockedUntil = new Date(result.blockedUntil);
                setTimeout(() => { currentState = 'BLOCKED'; }, 1500);
                return;
            }
            
            if (lives <= 0) {
                setTimeout(() => { currentState = 'GAMEOVER'; }, 1500);
            }
        } catch (error) {
            console.error('Erro envio:', error);
            if (!isCorrect) lives--;
            if (lives <= 0) {
                setTimeout(() => { currentState = 'GAMEOVER'; }, 1500);
            }
        }
    }
</script>

<div class="flex flex-col h-screen bg-surface-50 dark:bg-surface-900 overflow-hidden font-sans">
    <!-- Header -->
    <div class="flex justify-between items-center p-6 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 z-10">
        <button on:click={() => currentState === 'MENU' ? goto(`/dashboard/student/${studentId}/chat/`) : currentState = 'MENU'} 
                class="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <ArrowLeft size={24} class="text-surface-600 dark:text-surface-300" />
        </button>
        
        {#if currentState === 'PLAYING'}
            <div class="flex gap-2 items-center flex-1 max-w-xs mx-4">
                <div class="h-3 w-full bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div class="h-full bg-yellow-400 transition-all duration-500" style="width: {(score % 100)}%"></div>
                </div>
            </div>
            <div class="flex items-center gap-1 text-red-500 font-bold animate-pulse">
                <Heart size={24} fill="currentColor" />
                <span class="text-xl">{lives}</span>
            </div>
        {:else}
            <h1 class="font-bold text-xl text-surface-800 dark:text-surface-100">Modo Rush ⚡</h1>
        {/if}
    </div>

    <!-- BLOCKED STATE -->
    {#if currentState === 'BLOCKED'}
        <div class="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div class="bg-red-100 p-6 rounded-full mb-4">
                <Lock size={48} class="text-red-500" />
            </div>
            <h2 class="text-2xl font-bold text-surface-900 dark:text-white">Tópico Bloqueado! 🛑</h2>
            <p class="text-surface-500 mt-2">Precisas de descansar a cabeça sobre este tema.</p>
            <p class="font-bold text-red-500 text-3xl mt-4">{blockTimeRemaining}</p>
            <button on:click={() => currentState = 'MENU'} class="mt-6 px-8 py-4 bg-primary-500 text-white rounded-2xl font-bold">
                Escolher Outro Tópico
            </button>
        </div>

    <!-- MENU STATE -->
    {:else if currentState === 'MENU'}
        <div class="flex-1 overflow-y-auto p-6">
            <div class="max-w-4xl mx-auto space-y-8">

                <!-- PAINEL DE ESTATÍSTICAS -->
                <div class="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-lg">
                    {#if loadingStats}
                        <div class="flex items-center justify-center py-4">
                            <div class="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        </div>
                    {:else}
                        <div class="flex items-center justify-between flex-wrap gap-4">
                            <!-- XP -->
                            <div class="flex items-center gap-3">
                                <div class="bg-white/20 p-3 rounded-2xl">
                                    <Zap size={32} fill="currentColor" />
                                </div>
                                <div>
                                    <p class="text-white/80 text-sm font-medium">XP Total</p>
                                    <p class="text-3xl font-black">{stats.xp}</p>
                                </div>
                            </div>

                            <!-- Exercícios -->
                            <div class="text-center">
                                <p class="text-white/80 text-sm font-medium">Exercícios</p>
                                <p class="text-2xl font-bold">{stats.totalExercicios}</p>
                            </div>

                            <!-- Acertos -->
                            <div class="text-center">
                                <p class="text-white/80 text-sm font-medium">Acertos</p>
                                <p class="text-2xl font-bold text-green-200">{stats.acertos}</p>
                            </div>

                            <!-- Taxa de Acerto -->
                            <div class="flex items-center gap-3">
                                <div class="relative w-16 h-16">
                                    <svg class="w-16 h-16 transform -rotate-90">
                                        <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.2)" stroke-width="6" fill="none" />
                                        <circle cx="32" cy="32" r="28" stroke="white" stroke-width="6" fill="none"
                                            stroke-dasharray="{stats.taxaAcerto * 1.76} 176"
                                            stroke-linecap="round" />
                                    </svg>
                                    <span class="absolute inset-0 flex items-center justify-center text-sm font-bold">{stats.taxaAcerto}%</span>
                                </div>
                                <div>
                                    <p class="text-white/80 text-sm font-medium">Taxa de</p>
                                    <p class="font-bold">Acerto</p>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>

                <section>
                    <h2 class="text-2xl font-bold mb-4 text-surface-900 dark:text-white flex items-center gap-2">
                        <Calculator class="text-blue-500" /> Matemática
                    </h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {#each TOPICS.matematica as topic}
                            <button on:click={() => startGame('matematica', topic.id)}
                                class="relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border-2 border-surface-200 dark:border-surface-700 hover:border-blue-500 hover:shadow-md transition-all text-left group">
                                <div class="relative z-10">
                                    <div class={`w-12 h-12 rounded-xl ${topic.color} text-white flex items-center justify-center mb-3 shadow-sm`}>
                                        <svelte:component this={topic.icon} size={24} />
                                    </div>
                                    <h3 class="font-bold text-lg text-surface-800 dark:text-surface-100">{topic.id}</h3>
                                    <p class="text-xs text-surface-500 mt-1 font-medium uppercase tracking-wider">Começar</p>
                                </div>
                            </button>
                        {/each}
                    </div>
                </section>

                <section>
                    <h2 class="text-2xl font-bold mb-4 text-surface-900 dark:text-white flex items-center gap-2">
                        <BookOpen class="text-green-500" /> Português
                    </h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {#each TOPICS.portugues as topic}
                            <button on:click={() => startGame('portugues', topic.id)}
                                class="relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border-2 border-surface-200 dark:border-surface-700 hover:border-green-500 hover:shadow-md transition-all text-left group">
                                <div class="relative z-10">
                                    <div class={`w-12 h-12 rounded-xl ${topic.color} text-white flex items-center justify-center mb-3 shadow-sm`}>
                                        <svelte:component this={topic.icon} size={24} />
                                    </div>
                                    <h3 class="font-bold text-lg text-surface-800 dark:text-surface-100">{topic.id}</h3>
                                    <p class="text-xs text-surface-500 mt-1 font-medium uppercase tracking-wider">Começar</p>
                                </div>
                            </button>
                        {/each}
                    </div>
                </section>
            </div>
        </div>

    <!-- PLAYING STATE -->
    {:else if currentState === 'PLAYING'}
        {#if loading}
            <div class="flex-1 flex flex-col items-center justify-center">
                <div class="w-20 h-20 border-4 border-surface-200 border-t-yellow-500 rounded-full animate-spin mb-6"></div>
                <p class="text-lg font-medium text-surface-600 dark:text-surface-300">Preparando {selectedSubtopic}...</p>
            </div>
        {:else if questionData}
            <div class="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full p-6">
                <div class="text-center mb-2">
                    <span class="bg-surface-100 dark:bg-surface-800 text-surface-500 text-xs font-bold px-3 py-1 rounded-full uppercase">{selectedSubtopic}</span>
                </div>
                
                <h1 class="text-3xl md:text-4xl font-bold text-center mb-12 text-surface-900 dark:text-white">{questionData.question}</h1>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each questionData.options as option}
                        <button 
                            class="relative p-6 rounded-2xl border-2 border-b-[6px] text-lg font-bold transition-all
                            {selectedOption === option 
                                ? (option === questionData.correct_answer
                                    ? 'bg-green-500 border-green-700 text-white' 
                                    : 'bg-red-500 border-red-700 text-white')
                                : selectedOption && option === questionData.correct_answer
                                    ? 'bg-green-500 border-green-700 text-white'
                                    : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:border-primary-400'}"
                            on:click={() => handleAnswer(option)}
                            disabled={!!selectedOption}>
                            {option}
                            {#if selectedOption === option}
                                <div class="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl">
                                    {#if option === questionData.correct_answer}
                                        <Check size={32} class="text-white" />
                                    {:else}
                                        <X size={32} class="text-white" />
                                    {/if}
                                </div>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
            
            {#if selectedOption}
                <div class="fixed bottom-0 inset-x-0 p-6 bg-white dark:bg-surface-800 border-t-2 shadow-2xl z-50">
                    <div class="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div class="flex-1">
                            {#if isCorrect}
                                <h3 class="text-2xl font-bold text-green-500 flex items-center gap-2">
                                    <Check class="bg-green-100 rounded-full p-1" /> Excelente!
                                </h3>
                                <p class="text-surface-600 dark:text-surface-300">{questionData.explanation}</p>
                            {:else}
                                <h3 class="text-2xl font-bold text-red-500 flex items-center gap-2">
                                    <X class="bg-red-100 rounded-full p-1" /> Não foi desta...
                                </h3>
                                <p class="text-surface-600 dark:text-surface-300">
                                    A resposta certa era <strong class="text-green-500">{questionData.correct_answer}</strong>
                                </p>
                            {/if}
                        </div>
                        <button on:click={loadQuestion} 
                                class={`px-10 py-4 rounded-2xl font-bold text-white shadow-lg ${isCorrect ? 'bg-green-500' : 'bg-primary-500'}`}>
                            CONTINUAR
                        </button>
                    </div>
                </div>
            {/if}
        {/if}

    <!-- GAMEOVER STATE -->
    {:else if currentState === 'GAMEOVER'}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div class="mb-6 text-6xl">💔</div>
            <h1 class="text-4xl font-black text-surface-900 dark:text-white mb-4">Sem vidas!</h1>
            <p class="text-xl text-surface-500 mb-8">Fizeste <strong class="text-yellow-500">{score}</strong> pontos em {selectedSubtopic}!</p>
            
            <div class="flex gap-4">
                <button on:click={() => { currentState = 'MENU'; }} 
                        class="px-8 py-4 bg-surface-200 dark:bg-surface-700 text-surface-800 dark:text-surface-100 rounded-2xl font-bold">
                    Voltar ao Menu
                </button>
                <button on:click={() => startGame(selectedSubject, selectedSubtopic)} 
                        class="px-8 py-4 bg-primary-500 text-white rounded-2xl font-bold shadow-lg">
                    Tentar de Novo
                </button>
            </div>
        </div>
    {/if}
</div>