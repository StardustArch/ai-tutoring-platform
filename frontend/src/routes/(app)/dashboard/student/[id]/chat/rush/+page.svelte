<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { apiFetch } from '$lib/utils/api';
    import { 
        ArrowLeft, Zap, Check, X, Heart, Lock,
        Hash, ListOrdered, Shapes, Calculator, Divide, Scale, Coins, LineChart,
        Triangle, Sigma, Ruler, PieChart, Equal,
        Activity, Tags, RefreshCcw, PenTool, MessageSquare, TrafficCone, 
        UserCheck, MapPin, GitBranch, Calendar, BookOpen, Mail, Box
    } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import confetti from 'canvas-confetti';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import '../../../../../../../app.css';
    let studentId = $page.params.id || '';
    let studentClass =  ''; // TODO: Buscar do perfil do aluno
    let studentData =  null;
    
    type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'BLOCKED' | 'DIAGNOSTIC';
    let currentState: GameState = 'MENU';

    let selectedSubject = 'matematica';
    let selectedSubtopic = '';
    
    // Estado do diagnóstico
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
        let studentDatax;
 try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            
            if (!res.ok) throw new Error('Erro na API, ao buscar dados do aluno');
            
            studentData = await res.json();
            studentDatax = studentData;
           return studentData;
        

        } catch (e) {
            console.error('Erro:', e);
 
        } finally {
            loading = false;
        }       
        
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


        try {
            // Podes buscar a classe do aluno via API user profile, ou usar a variável local
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/topics?classe=${studentDatax.classe}`);
            console.log(studentClass)
            if (res.ok) {
                availableTopics = await res.json();
                console.log(availableTopics)
            }
        } catch (e) {
            console.error("Erro topics:", e);
        } finally {
            loadingTopics = false;
        }
    });

    // Verifica se precisa de diagnóstico antes de começar o jogo
    async function checkAndStartGame(subject: string, subtopic: string) {
        selectedSubject = subject;
        selectedSubtopic = subtopic;
        
        try {
            // Verifica se precisa de diagnóstico
            const res = await apiFetch(
                `${PUBLIC_API_URL_HOST}/api/diagnostic/needs/${studentId}?disciplina=${subject}`
            );
            
            if (res.ok) {
                const data = await res.json();
                needsDiagnostic = data.needs;
                
                if (needsDiagnostic) {
                    // Precisa fazer diagnóstico primeiro
                    await startDiagnostic();
                } else {
                    // Pode jogar normalmente
                    startGame(subject, subtopic);
                }
            } else {
                // Se falhar, permite jogar (fallback)
                startGame(subject, subtopic);
            }
        } catch (error) {
            console.error('Erro ao verificar diagnóstico:', error);
            startGame(subject, subtopic);
        }
    }

    // Inicia o teste diagnóstico
    async function startDiagnostic() {
        loading = true;
        currentState = 'DIAGNOSTIC';
        
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/diagnostic/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId),
                    disciplina: selectedSubject,
                    classe: studentClass
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                diagnosticQuestions = data.perguntas || [];
                currentDiagnosticIndex = 0;
                diagnosticAnswers = [];
            } else {
                throw new Error('Falha ao gerar diagnóstico');
            }
        } catch (error) {
            console.error('Erro ao iniciar diagnóstico:', error);
            // Fallback: deixa jogar sem diagnóstico
            currentState = 'MENU';
            startGame(selectedSubject, selectedSubtopic);
        } finally {
            loading = false;
        }
    }

    // Responde pergunta do diagnóstico
    function answerDiagnostic(option: string) {
        if (!diagnosticQuestions[currentDiagnosticIndex]) return;
        
        const currentQuestion = diagnosticQuestions[currentDiagnosticIndex];
        const acertou = option === currentQuestion.correct_answer;
        
        diagnosticAnswers.push({
            topico: currentQuestion.topico,
            acertou
        });
        
        // Próxima pergunta ou finaliza
        if (currentDiagnosticIndex < diagnosticQuestions.length - 1) {
            currentDiagnosticIndex++;
            selectedOption = null; // ✅ Reset
            isCorrect = null; // ✅ Reset
        } else {
            // Finaliza diagnóstico
            finalizeDiagnostic(); // ✅ Remove await (não precisa bloquear)
        }
    }

    // Finaliza e processa diagnóstico
    async function finalizeDiagnostic() {
        loading = true;
        
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/diagnostic/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId),
                    disciplina: selectedSubject,
                    respostas: diagnosticAnswers
                })
            });
            
            if (res.ok) {
                const resultado = await res.json();
                // Mostra resultado e depois inicia o jogo
                alert(`Diagnóstico completo!\nNível: ${resultado.analise.nivel}\nAcertos: ${diagnosticAnswers.filter(r => r.acertou).length}/${diagnosticAnswers.length}`);
            }
        } catch (error) {
            console.error('Erro ao processar diagnóstico:', error);
        } finally {
            loading = false;
            needsDiagnostic = false;
            // Inicia o jogo após diagnóstico
            startGame(selectedSubject, selectedSubtopic);
        }
    }

    const ICON_MAP: Record<string, any> = {
        Hash, ListOrdered, Shapes, Calculator, X, Divide, Scale, Coins, LineChart,
        Triangle, Sigma, Ruler, PieChart, Equal,
        Activity, Tags, RefreshCcw, PenTool, MessageSquare, TrafficCone, Heart,
        UserCheck, MapPin, GitBranch, Calendar, Zap, BookOpen, Mail, Box
    };

    // 2. Estado dos Tópicos (Dinâmico)
    let availableTopics = { matematica: [], portugues: [] };
    let loadingTopics = true;



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
        lives = 3; // ✅ Reset local
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
                    alunoId: parseInt(studentId),
                    classe: studentClass,
                    disciplina: selectedSubject,
                    subtopico: selectedSubtopic
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
            
            // ✅ NOVO: Buscar vidas atuais do tópico na primeira pergunta
            if (score === 0) {
                await fetchCurrentLives();
            }
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

    // ✅ NOVO: Busca vidas atuais do servidor para o tópico específico
    async function fetchCurrentLives() {
        try {
            const res = await apiFetch(
                `${PUBLIC_API_URL_HOST}/api/rush/lives/${studentId}?disciplina=${selectedSubject}&subtopico=${encodeURIComponent(selectedSubtopic)}&classe=${studentClass}`
            );
            if (res.ok) {
                const data = await res.json();
                if (data.lives !== undefined) {
                    lives = data.lives;
                    console.log(`🎮 Vidas carregadas para ${selectedSubtopic}: ${data.lives}`);
                }
            }
        } catch (e) {
            console.error('Erro ao buscar vidas:', e);
        }
    }

async function handleAnswer(option: string) {
        if (selectedOption) return; // Evita duplo clique
        selectedOption = option;
        
        // 1. VALIDAÇÃO INSTANTÂNEA (Sem lag, sem glitch)
        // Usamos a resposta que veio no payload da pergunta
        const correctAnswer = questionData.correct_answer; 
        const instantIsCorrect = option === correctAnswer;
        
        // Atualiza estado visual IMEDIATAMENTE
        isCorrect = instantIsCorrect;

        // Feedback visual imediato (Confetti ou Shake)
        if (isCorrect) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
            score += 10;
            stats.xp += 10;
            stats.acertos += 1;
        } else {
            stats.erros += 1;
            lives--; // Reduz vida visualmente logo
        }

        // Atualiza stats
        const total = stats.acertos + stats.erros;
        stats.taxaAcerto = total > 0 ? Math.round((stats.acertos / total) * 100) : 0;
        stats.totalExercicios = total;

        // 2. SINCRONIZAÇÃO EM BACKGROUND (Fire and Forget)
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
            
            // Apenas verificamos se houve bloqueio (Cooldown)
            // Não precisamos de atualizar 'isCorrect' porque já sabemos
            if (result.blocked && result.blockedUntil) {
                blockedUntil = new Date(result.blockedUntil);
                setTimeout(() => { 
                    currentState = 'BLOCKED';
                }, 1500); // Dá tempo de ver o feedback do erro
            }
            
            // Sincroniza vidas reais do servidor (caso haja dessincronia)
            if (result.livesRemaining !== undefined) {
                lives = result.livesRemaining;
            }

        } catch (error) {
            console.error('Erro envio background:', error);
            // Não faz mal se falhar o envio, o aluno continua a jogar
            // O progresso pode ser perdido, mas a experiência não trava
        }

        // 3. VERIFICA GAME OVER (Visual)
        if (lives <= 0 && currentState !== 'BLOCKED') {
            setTimeout(() => { currentState = 'GAMEOVER'; }, 1500);
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
                {#if loadingTopics}
                     <div class="text-center py-10">
                        <div class="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p class="mt-2 text-surface-500">A carregar currículo...</p>
                     </div>
                {:else}
                    <section>
                        <h2 class="text-2xl font-bold mb-4 text-surface-900 dark:text-white flex items-center gap-2">
                            <Calculator class="text-blue-500" /> Matemática
                        </h2>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {#each availableTopics.matematica as topic}
                                <button on:click={() => checkAndStartGame('matematica', topic.nome)}
                                    class="relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border-2 border-surface-200 dark:border-surface-700 hover:border-blue-500 hover:shadow-md transition-all text-left group">
                                    
                                    <div class="relative z-10">
                                        <div class={`w-12 h-12 rounded-xl ${topic.metadata?.color || 'bg-blue-500'} text-white flex items-center justify-center mb-3 shadow-sm`}>
                                            <svelte:component this={ICON_MAP[topic.metadata?.icon] || Zap} size={24} />
                                        </div>
                                        
                                        <h3 class="font-bold text-lg text-surface-800 dark:text-surface-100 leading-tight">
                                            {topic.nome}
                                        </h3>
                                        
                                        <p class="text-xs text-surface-500 mt-1 font-medium">
                                            {topic.metadata?.desc || 'Vamos praticar!'}
                                        </p>
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
                            {#each availableTopics.portugues as topic}
                                <button on:click={() => checkAndStartGame('portugues', topic.nome)}
                                    class="relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border-2 border-surface-200 dark:border-surface-700 hover:border-green-500 hover:shadow-md transition-all text-left group">
                                    
                                    <div class="relative z-10">
                                        <div class={`w-12 h-12 rounded-xl ${topic.metadata?.color || 'bg-green-500'} text-white flex items-center justify-center mb-3 shadow-sm`}>
                                            <svelte:component this={ICON_MAP[topic.metadata?.icon] || Zap} size={24} />
                                        </div>
                                        <h3 class="font-bold text-lg text-surface-800 dark:text-surface-100 leading-tight">
                                            {topic.nome}
                                        </h3>
                                        <p class="text-xs text-surface-500 mt-1 font-medium">
                                            {topic.metadata?.desc || 'Vamos praticar!'}
                                        </p>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </section>
                {/if}

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
                            {selectedOption === option && isCorrect === null
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 animate-pulse'
                                : selectedOption === option && isCorrect 
                                    ? 'bg-green-500 border-green-700 text-white' 
                                    : selectedOption === option && !isCorrect
                                        ? 'bg-red-500 border-red-700 text-white'
                                        : selectedOption && option === questionData.correct_answer
                                            ? 'bg-green-500 border-green-700 text-white'
                                            : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:border-primary-400'}"
                            on:click={() => handleAnswer(option)}
                            disabled={!!selectedOption}>
                            {option}
                            
                            <!-- Loading state -->
                            {#if selectedOption === option && isCorrect === null}
                                <div class="absolute inset-0 flex items-center justify-center bg-black/5 rounded-2xl">
                                    <div class="w-6 h-6 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            {/if}
                            
                            <!-- Result state -->
                            {#if selectedOption === option && isCorrect !== null}
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

    <!-- DIAGNOSTIC STATE -->
    {:else if currentState === 'DIAGNOSTIC'}
        <div class="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full p-6">
            {#if loading}
                <div class="flex flex-col items-center justify-center">
                    <div class="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p class="text-lg font-medium text-surface-600 dark:text-surface-300">Preparando teste diagnóstico...</p>
                </div>
            {:else if diagnosticQuestions.length > 0}
                <!-- Progresso -->
                <div class="mb-8">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-bold text-surface-600 dark:text-surface-400">
                            Teste Diagnóstico de {selectedSubject === 'matematica' ? 'Matemática' : 'Português'}
                        </span>
                        <span class="text-sm font-bold text-primary-500">
                            {currentDiagnosticIndex + 1} / {diagnosticQuestions.length}
                        </span>
                    </div>
                    <div class="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                        <div 
                            class="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                            style="width: {((currentDiagnosticIndex + 1) / diagnosticQuestions.length) * 100}%"
                        ></div>
                    </div>
                </div>

                <!-- Pergunta atual -->
                {@const currentQ = diagnosticQuestions[currentDiagnosticIndex]}
                
                <div class="text-center mb-4">
                    <span class="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                        {currentQ.topico}
                    </span>
                </div>

                <h2 class="text-2xl md:text-3xl font-bold text-center mb-12 text-surface-900 dark:text-white">
                    {currentQ.question}
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each currentQ.options as option}
                        <button 
                            class="relative p-6 rounded-2xl border-2 border-b-[6px] text-lg font-bold transition-all bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            on:click={() => {
                                selectedOption = option;
                                isCorrect = option === currentQ.correct_answer;
                                setTimeout(() => answerDiagnostic(option), 800);
                            }}
                            disabled={!!selectedOption}
                            class:bg-green-500={selectedOption === option && isCorrect}
                            class:border-green-700={selectedOption === option && isCorrect}
                            class:text-white={selectedOption === option && isCorrect}
                            class:bg-red-500={selectedOption === option && !isCorrect}
                            class:border-red-700={selectedOption === option && !isCorrect}
                        >
                            {option}
                            {#if selectedOption === option}
                                <div class="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl">
                                    {#if isCorrect}
                                        <Check size={32} class="text-white" />
                                    {:else}
                                        <X size={32} class="text-white" />
                                    {/if}
                                </div>
                            {/if}
                        </button>
                    {/each}
                </div>

                <!-- Mensagem motivacional -->
                <div class="mt-8 text-center">
                    <p class="text-surface-600 dark:text-surface-400 italic">
                        {#if currentDiagnosticIndex < 3}
                            🎯 Vamos descobrir o teu nível!
                        {:else if currentDiagnosticIndex < 7}
                            💪 Estás a ir muito bem, continua!
                        {:else}
                            🌟 Quase lá, mais algumas perguntas!
                        {/if}
                    </p>
                </div>
            {/if}
        </div>
    {/if}
</div>