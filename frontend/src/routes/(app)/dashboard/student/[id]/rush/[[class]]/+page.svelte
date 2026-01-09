<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { apiFetch } from '$lib/utils/api';
    import { 
        ArrowLeft, Zap, Check, X, Heart, Lock,
        Hash, ListOrdered, Shapes, Calculator, Divide, Scale, Coins, LineChart,
        Triangle, Sigma, Ruler, PieChart, Equal,
        Activity, Tags, RefreshCcw, PenTool, MessageSquare, TrafficCone, 
        UserCheck, MapPin, GitBranch, Calendar, BookOpen, Mail, Box,
		CheckCircle2,
		Play
    } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import confetti from 'canvas-confetti';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';

    // --- PARÂMETROS DA ROTA ---
    let studentId = $page.params.id || '';
    
    // 🚨 NOVO: Captura o ID da Sessão da URL
    let turmaId = Number($page.params.class) || 0; 
    
    let sessionId = $page.url.searchParams.get('sessionId') ? parseInt($page.url.searchParams.get('sessionId')!) : null;

    console.log(studentId, sessionId, turmaId)
    // --- ESTADO ---
    let studentClass: any = 3; 
    let studentData: any = null;
    
    // Lista de IDs permitidos (Vem da Sessão)
    let allowedTopicIds: number[] = []; 

    type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'BLOCKED' | 'DIAGNOSTIC';
    let currentState: GameState = 'MENU';

    let selectedSubject = 'matematica';
    let selectedSubtopic = '';
    
    // ... (Variáveis de diagnóstico mantêm-se iguais) ...
    let needsDiagnostic = false;
    let diagnosticQuestions: any[] = [];
    let currentDiagnosticIndex = 0;
    let diagnosticAnswers: Array<{ topico: string; acertou: boolean }> = [];

    let loading = false;
    let questionData: any = null;
    let selectedOption: string | null = null;
    let isCorrect: boolean | null = null;
    let lives = 3;
    let score = 0;
    let blockTimeRemaining = '';
    let blockedUntil: Date | null = null;

    // Estatísticas da SESSÃO ATUAL (não globais)
    let stats = {
        xp: 0,
        totalExercicios: 0,
        acertos: 0,
        taxaAcerto: 0,
        erros: 0
    };
    let loadingStats = true;

    // Tópicos filtrados
    let availableTopics: { matematica: any[], portugues: any[] } = { matematica: [], portugues: [] };
    let loadingTopics = true;

    // --- ÍCONES (Mantém o teu mapa) ---
    const ICON_MAP: Record<string, any> = {
        Hash, ListOrdered, Shapes, Calculator, X, Divide, Scale, Coins, LineChart,
        Triangle, Sigma, Ruler, PieChart, Equal,
        Activity, Tags, RefreshCcw, PenTool, MessageSquare, TrafficCone, Heart,
        UserCheck, MapPin, GitBranch, Calendar, Zap, BookOpen, Mail, Box
    };
onMount(async () => {
        loading = true;
        loadingStats = true;
        loadingTopics = true;

        try {
            // ---------------------------------------------------------
            // 1. BUSCAR SESSÃO (Prioridade Máxima)
            // ---------------------------------------------------------
            if (sessionId) {
                const resSession = await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}`); 
                if (resSession.ok) {
                    const sessionData = await resSession.json();
                    
                    // DEBUG: Ver o que vem exatamente da BD
                    console.log('📦 Payload da Sessão:', sessionData);

                    // TRATAMENTO ROBUSTO DE DADOS
                    let rawIds = sessionData.topicosAlvo;
                    
                    // Se vier como string JSON (acontece em alguns DBs), fazemos parse
                    if (typeof rawIds === 'string') {
                        try { rawIds = JSON.parse(rawIds); } catch(e) { console.error('Erro parse JSON', e); }
                    }

                    // Forçar tudo a ser Número para o filtro funcionar
                    if (Array.isArray(rawIds)) {
                        allowedTopicIds = rawIds.map((id: any) => Number(id));
                    }
                    
                    console.log('🎯 IDs Permitidos (Formatados):', allowedTopicIds);
                }
            }

            // ---------------------------------------------------------
            // 2. BUSCAR PERFIL DO ALUNO
            // ---------------------------------------------------------
            const resUser = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
            if (resUser.ok) {
                studentData = await resUser.json();
                if (studentData.classe) studentClass = studentData.classe;
            }

            // ---------------------------------------------------------
            // 3. BUSCAR E FILTRAR TÓPICOS
            // ---------------------------------------------------------
            const resTopics = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${studentClass}&studentId=${studentId}`);
            
            if (resTopics.ok) {
                const allTopics = await resTopics.json();
                
                if (sessionId) {
                    // MODO SESSÃO: Filtra usando os IDs
                    console.log('🔍 A filtrar tópicos para a sessão...', allowedTopicIds);

                    availableTopics.matematica = (allTopics.matematica || [])
                        .filter((t: any) => allowedTopicIds.includes(Number(t.id)));

                    availableTopics.portugues = (allTopics.portugues || [])
                        .filter((t: any) => allowedTopicIds.includes(Number(t.id)));
                    
                    // REATIVIDADE SVELTE: Forçar atualização da variável
                    availableTopics = { ...availableTopics }; 

                    console.log('✅ Resultado Final:', availableTopics);

                } else {
                    // MODO LIVRE: Mostra tudo
                    availableTopics = allTopics;
                }
            }

        } catch (e) {
            console.error('Erro crítico no onMount:', e);
        } finally {
            loading = false;
            loadingTopics = false;
            loadingStats = false;
        }
    });

    // ... (Funções de Diagnóstico e Timer mantêm-se iguais) ...

    function getIcon(iconName: string | undefined) {
        if (!iconName || !ICON_MAP[iconName]) return Calculator;
        return ICON_MAP[iconName];
    }

    function getColor(color: string | undefined, subject: string) {
        if (color && color.startsWith('bg-')) return color;
        return subject === 'matematica' ? 'bg-blue-500' : 'bg-green-500';
    }

    // --- LÓGICA DO JOGO ---

    async function checkAndStartGame(subject: string, subtopic: string) {
        // ... (igual ao teu código anterior)
        startGame(subject, subtopic);
    }

    function startGame(subject: string, subtopic: string) {
        selectedSubject = subject;
        selectedSubtopic = subtopic;
        currentState = 'PLAYING';
        // Não resetamos lives/score aqui se quisermos manter a pontuação da sessão global
        // Mas para "Rush" por tópico, faz sentido resetar vidas
        lives = 3; 
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
                    alunoId: parseInt(studentId),
                    classe: studentClass,
                    disciplina: selectedSubject,
                    subtopico: selectedSubtopic,
                    sessionId: sessionId || null // 👈 Enviar SessionID
                })
            });
            
            if (res.status === 403) {
                const error = await res.json();
                blockedUntil = new Date(error.blockedUntil);
                currentState = 'BLOCKED';
                return;
            }
            
            questionData = await res.json();
            
        } catch (e) {
            console.error('Erro:', e);
        } finally {
            loading = false;
        }
    }

    async function handleAnswer(option: string) {
        if (selectedOption) return;
        selectedOption = option;
        
        const correctAnswer = questionData.correct_answer; 
        const instantIsCorrect = option === correctAnswer;
        isCorrect = instantIsCorrect;

        if (isCorrect) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
            score += 10;
            stats.xp += 10;
            stats.acertos += 1;
        } else {
            stats.erros += 1;
            lives--;
        }

        const total = stats.acertos + stats.erros;
        stats.taxaAcerto = total > 0 ? Math.round((stats.acertos / total) * 100) : 0;
        stats.totalExercicios = total;

        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId),
                    exercicioId: questionData.exercicioId,
                    respostaAluno: option,
                    classe: studentClass,
                    turmaId: turmaId,
                    sessaoId: sessionId || null // 👈 IMPORTANTE: Ligar à sessão
                })
            });
            
            const result = await res.json();
            
            if (result.blocked && result.blockedUntil) {
                blockedUntil = new Date(result.blockedUntil);
                setTimeout(() => { currentState = 'BLOCKED'; }, 1500);
            }
            
        } catch (error) {
            console.error('Erro envio background:', error);
        }

        if (lives <= 0 && currentState !== 'BLOCKED') {
            setTimeout(() => { currentState = 'GAMEOVER'; }, 1500);
        }
    }
    
    // Sair da Sessão (Encerra no Backend)
    async function exitSession() {
        if (sessionId) {
            // Opcional: Avisar o backend que saiu
             await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}/end`, { method: 'PATCH' });
        }
        goto(`/dashboard/foreman/student/${studentId}/class`);
    }

</script>

<div class="flex flex-col h-screen bg-surface-50 dark:bg-surface-900 overflow-hidden font-sans">
    <div class="flex justify-between items-center p-6 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 z-10 shadow-sm">
        <button on:click={() => currentState === 'MENU' ? exitSession() : currentState = 'MENU'} 
                class="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <ArrowLeft size={24} class="text-surface-600 dark:text-surface-300" />
        </button>
        
        {#if currentState === 'PLAYING'}
            <div class="flex items-center gap-1 text-red-500 font-bold animate-pulse">
                <Heart size={24} fill="currentColor" />
                <span class="text-xl">{lives}</span>
            </div>
        {:else}
            <div class="flex flex-col items-center">
                <h1 class="font-bold text-xl text-surface-800 dark:text-surface-100 flex items-center gap-2">
                    <Zap class="text-yellow-500 fill-current" /> Modo Rush
                </h1>
                <span class="text-xs text-surface-400 font-medium">Missão Personalizada</span>
            </div>
        {/if}
        
        <div class="bg-surface-100 dark:bg-surface-800 px-3 py-1 rounded-full text-sm font-bold text-surface-600 dark:text-surface-300">
            {stats.xp} XP
        </div>
    </div>

    {#if currentState === 'BLOCKED'}
        <div class="flex-1 flex flex-col items-center justify-center text-center p-6 animate-in zoom-in duration-300">
            <div class="bg-red-100 p-6 rounded-full mb-4 animate-bounce">
                <Lock size={48} class="text-red-500" />
            </div>
            <h2 class="text-2xl font-bold text-surface-900 dark:text-white">Tópico Bloqueado! 🛑</h2>
            <p class="text-surface-500 mt-2">Precisas de descansar a cabeça sobre este tema.</p>
            <p class="font-bold text-red-500 text-3xl mt-4 font-mono">{blockTimeRemaining}</p>
            <button on:click={() => currentState = 'MENU'} class="mt-8 px-8 py-4 bg-surface-900 text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform">
                Escolher Outro Tópico
            </button>
        </div>

    {:else if currentState === 'MENU'}
        <div class="flex-1 overflow-y-auto p-6">
            <div class="max-w-4xl mx-auto space-y-8">

                <div class="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-10">
                        <Zap size={120} />
                    </div>
                    
                    <div class="flex items-center justify-between relative z-10">
                        <div>
                            <p class="text-white/80 text-sm font-medium mb-1">XP da Sessão</p>
                            <p class="text-4xl font-black tracking-tight">{stats.xp}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-white/80 text-sm font-medium mb-1">Acertos</p>
                            <p class="text-3xl font-bold text-green-300">{stats.acertos}</p>
                        </div>
                    </div>
                </div>

                {#if loadingTopics}
                     <div class="flex flex-col items-center justify-center py-20">
                        <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        <p class="mt-4 text-surface-500 font-medium">A carregar a tua missão...</p>
                     </div>
                {:else}
                    
                    {#if availableTopics.matematica.length > 0}
                    <section class="animate-fade-in-up">
                        <h2 class="text-xl font-bold mb-4 text-surface-900 dark:text-white flex items-center gap-2">
                            <Calculator class="text-blue-500" /> Matemática
                        </h2>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {#each availableTopics.matematica as topic}
                                <button 
                                    on:click={() => checkAndStartGame('matematica', topic.nome)}
                                    class="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border-2 border-surface-200 dark:border-surface-700 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all text-left group"
                                >
                                    <div class="flex items-start justify-between mb-4">
                                        <div class="w-12 h-12 rounded-xl {getColor(topic.metadata?.color, 'matematica')} text-white flex items-center justify-center shadow-md">
                                            <svelte:component this={getIcon(topic.metadata?.icon)} size={24} />
                                        </div>
                                        <div class="bg-surface-100 dark:bg-surface-700 p-1.5 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                            <Play size={16} class="text-surface-400 group-hover:text-blue-500 fill-current" />
                                        </div>
                                    </div>
                                    
                                    <h3 class="font-bold text-lg text-surface-800 dark:text-surface-100 leading-tight">
                                        {topic.nome}
                                    </h3>
                                </button>
                            {/each}
                        </div>
                    </section>
                    {/if}

                    {#if availableTopics.portugues.length > 0}
                    <section class="animate-fade-in-up" style="animation-delay: 100ms;">
                        <h2 class="text-xl font-bold mb-4 text-surface-900 dark:text-white flex items-center gap-2">
                            <BookOpen class="text-green-500" /> Português
                        </h2>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {#each availableTopics.portugues as topic}
                                <button on:click={() => checkAndStartGame('portugues', topic.nome)}
                                    class="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border-2 border-surface-200 dark:border-surface-700 hover:border-green-500 hover:shadow-lg hover:-translate-y-1 transition-all text-left group">
                                    
                                    <div class="flex items-start justify-between mb-4">
                                        <div class={`w-12 h-12 rounded-xl ${topic.metadata?.color || 'bg-green-500'} text-white flex items-center justify-center shadow-md`}>
                                            <svelte:component this={getIcon(topic.metadata?.icon)} size={24} />
                                        </div>
                                        <div class="bg-surface-100 dark:bg-surface-700 p-1.5 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                                            <Play size={16} class="text-surface-400 group-hover:text-green-500 fill-current" />
                                        </div>
                                    </div>

                                    <h3 class="font-bold text-lg text-surface-800 dark:text-surface-100 leading-tight">
                                        {topic.nome}
                                    </h3>
                                </button>
                            {/each}
                        </div>
                    </section>
                    {/if}

                    {#if availableTopics.matematica.length === 0 && availableTopics.portugues.length === 0}
                         <div class="text-center p-10 bg-red-50 rounded-2xl border border-red-100">
                             <p class="text-red-500 font-bold">Erro: Sessão sem tópicos definidos.</p>
                             <button on:click={() => goto(`/dashboard/student/${studentId}/`)} class="mt-4 text-sm underline">Voltar</button>
                         </div>
                    {/if}

                {/if}

            </div>
        </div>
    
    {:else if currentState === 'PLAYING'}
        {#if loading}
            <div class="flex-1 flex flex-col items-center justify-center">
                <div class="w-16 h-16 border-4 border-surface-200 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                <p class="font-bold text-surface-500 animate-pulse">A gerar desafio...</p>
            </div>
        {:else if questionData}
             <div class="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full p-6">
                <div class="text-center mb-4">
                    <span class="bg-surface-100 dark:bg-surface-800 text-surface-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{selectedSubtopic}</span>
                </div>
                
                <h1 class="text-2xl md:text-4xl font-black text-center mb-8 text-surface-900 dark:text-white leading-tight">{questionData.question}</h1>

                <div class="grid grid-cols-1 gap-3">
                    {#each questionData.options as option}
                        <button 
                            class="relative p-5 rounded-xl border-2 font-bold text-lg text-left transition-all
                            {selectedOption === option && isCorrect === null
                                ? 'bg-yellow-50 border-yellow-400'
                                : selectedOption === option && isCorrect 
                                    ? 'bg-green-500 border-green-600 text-white shadow-lg scale-[1.02]' 
                                    : selectedOption === option && !isCorrect
                                        ? 'bg-red-500 border-red-600 text-white shadow-lg'
                                        : selectedOption && option === questionData.correct_answer
                                            ? 'bg-green-500 border-green-600 text-white opacity-100' // Revela correta
                                            : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:border-primary-400 hover:bg-surface-50 dark:hover:bg-surface-700'}"
                            on:click={() => handleAnswer(option)}
                            disabled={!!selectedOption}
                            style={selectedOption && option !== selectedOption && option !== questionData.correct_answer ? 'opacity: 0.5' : ''}
                        >
                            {option}
                        </button>
                    {/each}
                </div>
            </div>
            
{#if selectedOption}
                <div class="fixed bottom-0 inset-x-0 p-6 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 animate-slide-up">
                    <div class="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                        
                        <div class="flex-1 w-full text-center sm:text-left">
                            {#if isCorrect}
                                <div class="text-green-600 font-black text-xl flex items-center justify-center sm:justify-start gap-2 mb-2">
                                    <CheckCircle2 class="fill-current" /> ACERTASTE!
                                </div>
                                <p class="text-surface-600 dark:text-surface-300 text-lg leading-relaxed">
                                    {questionData.explanation || "Muito bem! Resposta correta."}
                                </p>
                            {:else}
                                <div class="text-red-500 font-black text-xl flex items-center justify-center sm:justify-start gap-2 mb-2">
                                    <X class="fill-current" /> ERRADO
                                </div>
                                <div class="text-surface-600 dark:text-surface-300">
                                    <p class="text-lg mb-1">
                                        A resposta certa era <strong class="text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">{questionData.correct_answer}</strong>
                                    </p>
                                    {#if questionData.explanation}
                                        <p class="text-sm opacity-80 mt-1 border-l-2 border-surface-300 pl-3">
                                            {questionData.explanation}
                                        </p>
                                    {/if}
                                </div>
                            {/if}
                        </div>

                        <button on:click={loadQuestion} 
                                class={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 min-w-[160px]
                                ${isCorrect ? 'bg-green-600 hover:bg-green-700' : 'bg-surface-900 hover:bg-black'}`}>
                            {isCorrect ? 'CONTINUAR' : 'PRÓXIMA'}
                        </button>
                    </div>
                </div>
            {/if}

        {/if}

    {:else if currentState === 'GAMEOVER'}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div class="mb-6 text-6xl animate-bounce">💔</div>
            <h1 class="text-4xl font-black text-surface-900 dark:text-white mb-2">Acabaram as vidas!</h1>
            <p class="text-lg text-surface-500 mb-8">Conseguiste <strong class="text-yellow-500">{score}</strong> XP nesta ronda.</p>
            
            <button on:click={() => currentState = 'MENU'} class="px-10 py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl hover:bg-primary-700 transition-colors">
                Voltar ao Mapa
            </button>
        </div>
    {/if}
</div>

<style>
    /* Animação suave para a barra de resposta */
    @keyframes slide-up {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
    .animate-slide-up {
        animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
</style>