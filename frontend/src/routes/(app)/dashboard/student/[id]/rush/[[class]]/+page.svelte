<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { apiFetch } from '$lib/utils/api';
    import {
        ArrowLeft,
        Zap,
        Check,
        X,
        Heart,
        Lock,
        Hash,
        ListOrdered,
        Shapes,
        Calculator,
        Divide,
        Scale,
        Coins,
        LineChart,
        Triangle,
        Sigma,
        Ruler,
        PieChart,
        Equal,
        Activity,
        Tags,
        RefreshCcw,
        PenTool,
        MessageSquare,
        TrafficCone,
        UserCheck,
        MapPin,
        GitBranch,
        Calendar,
        BookOpen,
        Mail,
        Box,
        CheckCircle2,
        Play,
        Trophy,
        Star,
        BrainCircuit,
        Flame,
        Image as ImageIcon, // 🆕 Importado
        FileText            // 🆕 Importado
    } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import confetti from 'canvas-confetti';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import SessionTimer from '$lib/components/SessionTimer.svelte';
    import { notifications } from '$lib/store/notifications';
    import { rushStore } from '$lib/store/rush';

    // --- PARÂMETROS ---
    let studentId = $page.params.id || '';
    let turmaId = Number($page.params.class) || 0;
    let sessionId = $page.url.searchParams.get('sessionId')
        ? parseInt($page.url.searchParams.get('sessionId')!)
        : null;

    // --- ESTADO LOCAL ---
    let studentClass: any = 3;
    let studentData: any = null;
    let allowedTopicIds: number[] = [];
    let isTimeUp = false;

    let loading = false;
    let selectedOption: string | null = null;
    let isCorrect: boolean | null = null;
    let blockTimeRemaining: any;
    let optionsContainer: HTMLElement;
    
    // 🆕 Estado da Âncora
    let showAncoraModal = false;

    // Stats visuais
    let statsLoaded = false;
    let loadingStats = true;
    let availableTopics: { matematica: any[]; portugues: any[] } = { matematica: [], portugues: [] };
    let loadingTopics = true;

    const ICON_MAP: Record<string, any> = {
        Hash, ListOrdered, Shapes, Calculator, X, Divide, Scale, Coins,
        LineChart, Triangle, Sigma, Ruler, PieChart, Equal, Activity,
        Tags, RefreshCcw, PenTool, MessageSquare, TrafficCone, Heart,
        UserCheck, MapPin, GitBranch, Calendar, Zap, BookOpen, Mail, Box
    };

    onMount(async () => {
        const currentState = rushStore.init(studentId);

        loading = true;
        loadingStats = true;
        loadingTopics = true;
        try {
            if (sessionId) {
                const resSession = await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}`);
                if (resSession.ok) {
                    const sessionData = await resSession.json();
                    let rawIds = sessionData.topicosAlvo;
                    if (typeof rawIds === 'string') {
                        try { rawIds = JSON.parse(rawIds); } catch (e) {}
                    }
                    if (Array.isArray(rawIds)) allowedTopicIds = rawIds.map((id: any) => Number(id));
                }
            }

            const resUser = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
            if (resUser.ok) {
                studentData = await resUser.json();
                if (studentData.classe) studentClass = studentData.classe;
            }

            const resTopics = await apiFetch(
                `${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${studentClass}&studentId=${studentId}`
            );
            if (resTopics.ok) {
                const allTopics = await resTopics.json();
                if (sessionId) {
                    availableTopics.matematica = (allTopics.matematica || []).filter((t: any) =>
                        allowedTopicIds.includes(Number(t.id))
                    );
                    availableTopics.portugues = (allTopics.portugues || []).filter((t: any) =>
                        allowedTopicIds.includes(Number(t.id))
                    );
                } else {
                    availableTopics = allTopics;
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
            loadingTopics = false;
            loadingStats = false;
        }
    });

    function getIcon(iconName: string | undefined) {
        if (!iconName || !ICON_MAP[iconName]) return Calculator;
        return ICON_MAP[iconName];
    }

    function handleTimeUp() {
        isTimeUp = true;
        $rushStore.currentState = 'GAMEOVER';
    }

    // --- LÓGICA DE JOGO ---
    async function checkAndStartGame(subject: string, subtopic: string) {
        $rushStore.selectedSubject = subject;
        $rushStore.selectedSubtopic = subtopic;
        loading = true;

        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/diagnostic/needs/${studentId}?disciplina=${subject}`);
            if (res.ok) {
                const data = await res.json();
                if (data.needs) {
                    await startDiagnostic(subject);
                    return;
                }
            }
        } catch (e) {
            console.error(e);
        }

        startGame(subject, subtopic);
    }

    async function startDiagnostic(subject: string) {
        // (Mantido igual)
        loading = true;
        $rushStore.currentState = 'DIAGNOSTIC';
        $rushStore.diagnosticAnswers = [];
        $rushStore.currentDiagnosticIndex = 0;
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/diagnostic/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId),
                    disciplina: subject,
                    classe: studentClass,
                    topico: $rushStore.selectedSubtopic
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.jaConcluido) {
                    notifications.send('Diagnóstico concluído! A iniciar treino...', 'success');
                    startGame(subject, $rushStore.selectedSubtopic);
                    return;
                }

                if (data.perguntas && Array.isArray(data.perguntas)) {
                    $rushStore.diagnosticQuestions = data.perguntas;
                    if ($rushStore.diagnosticQuestions.length > 0) {
                        $rushStore.questionData = $rushStore.diagnosticQuestions[0];
                        loading = false;
                    } else {
                        startGame(subject, $rushStore.selectedSubtopic);
                    }
                } else {
                    $rushStore.currentState = 'MENU';
                    loading = false;
                }
            } else {
                $rushStore.currentState = 'MENU';
                loading = false;
            }
        } catch (e) {
            $rushStore.currentState = 'MENU';
            loading = false;
        }
    }

    async function handleDiagnosticAnswer(option: string) {
        if (selectedOption) return;
        selectedOption = option;
        const correctAnswer = $rushStore.questionData.correct_answer;
        isCorrect = option === correctAnswer;

        $rushStore.diagnosticAnswers = [
            ...$rushStore.diagnosticAnswers,
            { topico: $rushStore.questionData.topico || $rushStore.selectedSubject, acertou: isCorrect }
        ];

        if (isCorrect) confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });

        setTimeout(async () => {
            selectedOption = null;
            isCorrect = null;
            $rushStore.currentDiagnosticIndex++;

            if ($rushStore.currentDiagnosticIndex < $rushStore.diagnosticQuestions.length) {
                $rushStore.questionData = $rushStore.diagnosticQuestions[$rushStore.currentDiagnosticIndex];
            } else {
                await submitDiagnosticResults();
            }
        }, 1000);
    }

    function startBlockCountdown() {
        if (blockTimeRemaining) clearInterval(blockTimeRemaining);
        blockTimeRemaining = setInterval(() => {
            if (!$rushStore.blockedUntil) return;
            const diff = new Date($rushStore.blockedUntil).getTime() - new Date().getTime();
            if (diff <= 0) {
                clearInterval(blockTimeRemaining);
                $rushStore.currentState = 'MENU';
                $rushStore.blockedUntil = null;
            } else {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                blockTimeRemaining = `${m}:${s < 10 ? '0' : ''}${s}`;
            }
        }, 1000);
    }

    async function submitDiagnosticResults() {
        loading = true;
        try {
            await apiFetch(`${PUBLIC_API_URL_HOST}/api/diagnostic/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId),
                    disciplina: $rushStore.selectedSubject,
                    respostas: $rushStore.diagnosticAnswers
                })
            });
            confetti({ particleCount: 200, spread: 100 });
            notifications.send('Diagnóstico completo!', 'info');
            startGame($rushStore.selectedSubject, $rushStore.selectedSubtopic);
        } catch (e) {
            $rushStore.currentState = 'MENU';
            loading = false;
        }
    }

    function startGame(subject: string, subtopic: string) {
        $rushStore.selectedSubject = subject;
        $rushStore.selectedSubtopic = subtopic;
        $rushStore.currentState = 'PLAYING';
        $rushStore.lives = 3;
        loadQuestion();
    }

    async function loadQuestion() {
        loading = true;
        selectedOption = null;
        isCorrect = null;
        showAncoraModal = false; // 🆕 Fechar modal ao carregar nova
        
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId),
                    classe: studentClass,
                    disciplina: $rushStore.selectedSubject,
                    subtopico: $rushStore.selectedSubtopic,
                    sessionId: sessionId || null
                })
            });
            if (res.status === 403) {
                const error = await res.json();
                $rushStore.blockedUntil = error.blockedUntil;
                startBlockCountdown();
                $rushStore.currentState = 'BLOCKED';
                return;
            }
            $rushStore.questionData = await res.json();
            
            // 🆕 Se tiver âncora, abre o modal
            if ($rushStore.questionData?.ancora) {
                setTimeout(() => { showAncoraModal = true; }, 300);
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function handleAnswer(option: string) {
        if (selectedOption) return;
        selectedOption = option;

        const correct = option === $rushStore.questionData.correct_answer;
        isCorrect = correct;
        rushStore.update((s) => {
            const points = correct ? 10 + s.streak * 2 : 0;
            const newStreak = correct ? s.streak + 1 : 0;
            const newAcertos = correct ? s.acertos + 1 : s.acertos;
            const newErros = !correct ? s.erros + 1 : s.erros;

            if (correct && newStreak >= 3) {
                confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } });
            }

            return {
                ...s,
                xp: s.xp + points,
                streak: newStreak,
                acertos: newAcertos,
                erros: newErros,
                totalExercicios: newAcertos + newErros,
                lives: correct ? s.lives : s.lives - 1,
                currentState: s.lives - (correct ? 0 : 1) <= 0 ? 'GAMEOVER' : s.currentState
            };
        });

        try {
            const payload: any = {
                alunoId: parseInt(studentId),
                exercicioId: parseInt($rushStore.questionData.exercicioId),
                respostaAluno: option,
                classe: studentClass
            };

            if (turmaId && turmaId > 0) payload.turmaId = turmaId;
            if (sessionId && sessionId > 0) payload.sessaoId = sessionId;

            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                console.error('🚨 API ERROR:', err);
            } else {
                const result = await res.json();
                rushStore.update(s => ({
                    ...s,
                    lives: result.currentLives !== undefined ? result.currentLives : s.lives,
                    blockedUntil: result.blockedUntil || s.blockedUntil
                }));
                if (result.blocked) {
                    $rushStore.blockedUntil = result.blockedUntil;
                    startBlockCountdown();
                    setTimeout(() => {
                        $rushStore.currentState = 'BLOCKED';
                    }, 1500);
                }
            }
        } catch (error) {
            console.error('🚨 Falha grave de rede:', error);
        }

        if ($rushStore.lives <= 0 && $rushStore.currentState !== 'BLOCKED') {
            setTimeout(() => {
                $rushStore.currentState = 'GAMEOVER';
            }, 1500);
        }
    }

    function handleBack() {
        if ($rushStore.currentState === 'MENU') {
            exitSession();
        } else {
            loading = false;
            selectedOption = null;
            isCorrect = null;
            rushStore.clear();
        }
    }

    async function exitSession() {
        if (sessionId)
            await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}/end`, { method: 'PATCH' });
        rushStore.clear();
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`rush_timer_${studentId}`);
        }
        goto(`/dashboard/foreman/student/${studentId}/class`);
    }
</script>

<svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <title>Rush | KMind</title>
</svelte:head>

{#if showAncoraModal && $rushStore.questionData?.ancora}
    {@const ancora = $rushStore.questionData.ancora}
    <div 
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-fade-in"
        on:click={() => showAncoraModal = false}
    >
        <div 
            class="animate-zoom-in relative max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            on:click|stopPropagation
        >
            <div class="flex items-center justify-between border-b-4 border-slate-100 bg-slate-50 p-4">
                <h2 class="flex items-center gap-2 text-lg font-black text-slate-700">
                    {#if ancora.tipo === 'visual'}
                        <ImageIcon class="text-amber-500" size={24} /> Observa a Imagem
                    {:else}
                        <FileText class="text-amber-500" size={24} /> Lê o Texto
                    {/if}
                </h2>
                <button 
                    on:click={() => showAncoraModal = false}
                    class="rounded-full bg-slate-200 p-2 text-slate-600 transition-transform hover:scale-105 active:scale-95"
                >
                    <X size={20} strokeWidth={3} />
                </button>
            </div>
            
            <div class="overflow-y-auto p-4 sm:p-6">
                {#if ancora.tipo === 'visual'}
                    <img src={`/ancoras/${ancora.chave}.jpg`} alt="Contexto" class="w-full rounded-2xl object-contain shadow-sm" />
                {:else}
                    <div class="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 font-medium text-slate-800 leading-relaxed shadow-inner">
                        {ancora.conteudo}
                    </div>
                {/if}
            </div>
            
            <div class="border-t-4 border-slate-100 p-4 bg-white">
                <button 
                    on:click={() => showAncoraModal = false}
                    class="w-full rounded-2xl border-b-4 border-amber-700 bg-amber-500 py-4 text-lg font-black text-white shadow-md active:translate-y-1 active:border-b-0"
                >
                    JÁ VI, VAMOS À PERGUNTA!
                </button>
            </div>
        </div>
    </div>
{/if}

<div class="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-amber-100 via-orange-50 to-white font-['Fredoka']">
    <div class="z-10 flex shrink-0 items-center justify-between gap-2 border-b-4 border-amber-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
        <button on:click={handleBack} class="shrink-0 rounded-xl border-2 border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition-all hover:border-amber-400 hover:text-amber-500 active:scale-95">
            <ArrowLeft size={24} strokeWidth={3} />
        </button>

        {#if $rushStore.currentState === 'PLAYING'}
            <div class="animate-pop-in flex items-center gap-1 rounded-xl border-2 border-red-100 bg-white px-3 py-1.5 shadow-sm md:gap-2 md:rounded-2xl md:px-4 md:py-2">
                {#each Array(3) as _, i}
                    <Heart class={`h-5 w-5 transition-all duration-500 md:h-6 md:w-6 ${i < $rushStore.lives ? 'animate-pulse-slow fill-red-500 text-red-500' : 'fill-slate-100 text-slate-200'}`} />
                {/each}
            </div>
        {:else}
            <div class="hidden flex-col items-center sm:flex">
                <h1 class="flex items-center gap-2 text-xl font-black tracking-wide text-amber-500 drop-shadow-sm">
                    <Zap class="animate-bounce-slow fill-current" size={20} /> RUSH
                </h1>
            </div>
        {/if}

        <div class="shrink-0 {$rushStore.currentState === 'GAMEOVER' || $rushStore.currentState === 'BLOCKED' ? 'invisible' : ''}">
            <SessionTimer timerKey={`rush_timer_${studentId}`} on:timeup={handleTimeUp} />
        </div>

        <div class="flex shrink-0 items-center gap-1 rounded-full border-2 border-amber-200 bg-amber-100 px-3 py-1 shadow-inner md:gap-2 md:px-4 md:py-1.5">
            <Star class="h-4 w-4 fill-amber-500 text-amber-500 md:h-5 md:w-5" />
            <span class="text-base font-black text-amber-600 md:text-lg">{$rushStore.xp}</span>
        </div>
    </div>

    {#if $rushStore.currentState === 'BLOCKED'}
        <div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div class="animate-shake mb-6 rounded-full border-4 border-rose-200 bg-rose-100 p-6 md:p-8">
                <Lock size={48} class="text-rose-500 md:h-16 md:w-16" />
            </div>
            <h2 class="mb-2 text-2xl font-black text-slate-800 md:text-3xl">Pausa! ☕</h2>
            <p class="mx-auto mb-6 max-w-xs text-base text-slate-500 md:text-lg">Já treinaste muito. Descansa um pouco.</p>

            <div class="mx-auto my-4 w-full max-w-xs rounded-3xl border-b-8 border-slate-700 bg-slate-900 px-8 py-5 text-white shadow-xl md:px-10 md:py-6">
                <div class="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">Volta em</div>
                <p class="animate-pulse font-mono text-4xl font-black tracking-widest tabular-nums md:text-5xl">{blockTimeRemaining || '--:--'}</p>
            </div>
            <button on:click={() => handleBack()} class="mt-8 rounded-2xl border-b-4 border-blue-700 bg-blue-500 px-8 py-4 font-bold text-white shadow-lg active:translate-y-1 active:border-b-0">
                Escolher Outro Tópico
            </button>
        </div>

    {:else if $rushStore.currentState === 'MENU'}
        <div class="scrollbar-hide flex-1 overflow-y-auto p-4 md:p-6">
            <div class="animate-slide-up mx-auto max-w-4xl space-y-6 md:space-y-8">
                <div class="relative overflow-hidden rounded-3xl border-4 border-white/20 bg-gradient-to-tr from-violet-500 via-purple-500 to-fuchsia-500 p-5 text-white shadow-xl shadow-purple-200 md:p-6">
                    <div class="absolute -top-10 -right-10 rotate-12 opacity-20">
                        <Trophy size={140} class="md:h-[180px] md:w-[180px]" />
                    </div>
                    <div class="relative z-10 flex items-center justify-between">
                        <div>
                            <p class="mb-1 text-xs font-bold tracking-wider text-purple-100 uppercase md:text-sm">XP Total</p>
                            <p class="text-4xl font-black drop-shadow-md md:text-5xl">{$rushStore.xp}</p>
                        </div>
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right backdrop-blur-sm md:px-4 md:py-2">
                            <p class="mb-1 text-[10px] font-bold text-purple-100 uppercase md:text-xs">Certas</p>
                            <p class="flex items-center justify-end gap-2 text-2xl font-bold text-green-300 md:text-3xl">
                                <CheckCircle2 size={20} class="md:h-6 md:w-6" />{$rushStore.acertos}
                            </p>
                        </div>
                    </div>
                </div>

                {#if loadingTopics}
                    <div class="flex flex-col items-center justify-center py-20">
                        <div class="h-12 w-12 animate-spin rounded-full border-8 border-blue-200 border-t-blue-500"></div>
                    </div>
                {:else}
                    {#if availableTopics.matematica.length > 0}
                        <section>
                            <h2 class="mb-3 flex items-center gap-2 text-xl font-black text-slate-700 md:gap-3 md:text-2xl">
                                <div class="rounded-xl bg-blue-100 p-2 text-blue-500"><Calculator size={20} /></div> Matemática
                            </h2>
                            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {#each availableTopics.matematica as topic}
                                    <button on:click={() => checkAndStartGame('matematica', topic.nome)} class="group relative overflow-hidden rounded-2xl border-b-4 border-slate-200 bg-white p-4 text-left shadow-sm transition-all active:translate-y-1 active:border-b-0 md:p-5">
                                        <div class="mb-3 flex items-start justify-between">
                                            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg transition-transform group-hover:scale-110 md:h-12 md:w-12">
                                                <svelte:component this={getIcon(topic.metadata?.icon)} size={20} />
                                            </div>
                                        </div>
                                        <h3 class="text-base leading-tight font-bold text-slate-700 md:text-lg">{topic.nome}</h3>
                                    </button>
                                {/each}
                            </div>
                        </section>
                    {/if}

                    {#if availableTopics.portugues.length > 0}
                        <section class="mt-6 md:mt-8">
                            <h2 class="mb-3 flex items-center gap-2 text-xl font-black text-slate-700 md:gap-3 md:text-2xl">
                                <div class="rounded-xl bg-green-100 p-2 text-green-500"><BookOpen size={20} /></div> Português
                            </h2>
                            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {#each availableTopics.portugues as topic}
                                    <button on:click={() => checkAndStartGame('portugues', topic.nome)} class="group relative overflow-hidden rounded-2xl border-b-4 border-slate-200 bg-white p-4 text-left shadow-sm transition-all active:translate-y-1 active:border-b-0 md:p-5">
                                        <div class="mb-3 flex items-start justify-between">
                                            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg transition-transform group-hover:scale-110 md:h-12 md:w-12">
                                                <svelte:component this={getIcon(topic.metadata?.icon)} size={20} />
                                            </div>
                                        </div>
                                        <h3 class="text-base leading-tight font-bold text-slate-700 md:text-lg">{topic.nome}</h3>
                                    </button>
                                {/each}
                            </div>
                        </section>
                    {/if}
                {/if}
            </div>
        </div>

    {:else if $rushStore.currentState === 'DIAGNOSTIC'}
        <div class="animate-zoom-in mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start overflow-y-auto p-4 md:p-6">
            <div class="mb-6 text-center">
                <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black tracking-widest text-purple-700 uppercase shadow-sm">
                    <BrainCircuit size={14} /> Teste de Nível
                </div>
                <div class="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full bg-purple-500 transition-all duration-500" style="width: {($rushStore.currentDiagnosticIndex / $rushStore.diagnosticQuestions.length) * 100}%"></div>
                </div>
                <p class="text-[10px] font-bold text-slate-400 md:text-xs">PERGUNTA {$rushStore.currentDiagnosticIndex + 1} DE {$rushStore.diagnosticQuestions.length}</p>
            </div>

            {#if loading}
                <div class="flex justify-center">
                    <div class="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
                </div>
            {:else if $rushStore.questionData}
                <h1 class="mb-6 text-center text-xl leading-snug font-black text-slate-800 md:text-2xl">{$rushStore.questionData.question}</h1>
                <div class="grid grid-cols-1 gap-3 pb-24">
                    {#each $rushStore.questionData.options as option}
                        <button class="relative flex items-center justify-between rounded-2xl border-b-4 p-4 text-left font-bold transition-all
                            {selectedOption === option && isCorrect === null ? 'border-purple-300 bg-purple-100 text-purple-900' : selectedOption === option && isCorrect ? 'border-green-700 bg-green-500 text-white' : selectedOption === option && !isCorrect ? 'border-rose-700 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-600 active:translate-y-1 active:border-b-0'}"
                            class:text-base={option.length > 30}
                            class:text-lg={option.length <= 30}
                            on:click={() => handleDiagnosticAnswer(option)}
                            disabled={!!selectedOption}>
                            <span class="pr-2">{option}</span>
                            {#if selectedOption === option}{#if isCorrect}<CheckCircle2 size={20} />{:else}<X size={20} />{/if}{/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

    {:else if $rushStore.currentState === 'PLAYING'}
        {#if loading}
            <div class="flex flex-1 flex-col items-center justify-center">
                <div class="mb-4 h-16 w-16 animate-spin rounded-full border-8 border-amber-200 border-t-amber-500"></div>
                <p class="animate-pulse text-lg font-black tracking-wide text-amber-400">A PREPARAR...</p>
            </div>
        {:else if $rushStore.questionData}
            <div class="animate-pop-in scrollbar-hide mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start overflow-y-auto p-4 pb-40 md:p-6" bind:this={optionsContainer}>
                
                {#if $rushStore.questionData?.ancora}
                    {@const ancora = $rushStore.questionData.ancora}
                    <div class="mb-4 flex justify-center">
                        <button 
                            on:click={() => showAncoraModal = true}
                            class="flex animate-pulse items-center gap-2 rounded-full border-b-4 border-amber-700 bg-amber-500 px-5 py-2 font-black text-white shadow-md active:translate-y-1 active:border-b-0"
                        >
                            {#if ancora.tipo === 'visual'}
                                <ImageIcon size={20} /> VER IMAGEM NOVAMENTE
                            {:else}
                                <FileText size={20} /> LER TEXTO NOVAMENTE
                            {/if}
                        </button>
                    </div>
                {/if}

                <div class="mb-4 flex shrink-0 flex-wrap items-center justify-center gap-3 md:mb-6">
                    <span class="flex items-center gap-2 rounded-full border-2 border-slate-100 bg-white px-3 py-1 text-xs font-bold tracking-wider text-slate-500 uppercase shadow-sm md:text-sm">
                        <Hash size={14} /> {$rushStore.selectedSubtopic}
                    </span>
                    {#if $rushStore.streak > 1}
                        <div class="animate-pop-in flex items-center gap-1 rounded-full border-2 border-orange-200 bg-orange-100 px-3 py-1 text-orange-600 shadow-sm">
                            <Flame size={14} class="animate-pulse fill-orange-500" />
                            <span class="text-xs font-black md:text-sm">COMBO x{$rushStore.streak}</span>
                        </div>
                    {/if}
                    {#if $rushStore.questionData.type === 'true_false'}
                        <span class="flex items-center gap-1 rounded-full border-2 border-violet-200 bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">✅❌ V / F</span>
                    {:else if $rushStore.questionData.type === 'cloze'}
                        <span class="flex items-center gap-1 rounded-full border-2 border-teal-200 bg-teal-100 px-3 py-1 text-xs font-black text-teal-700">📝 Completa</span>
                    {/if}
                </div>

                <div class="relative mb-6 shrink-0 rounded-3xl border-b-8 border-slate-100 bg-white p-5 shadow-xl md:p-8">
                    <div class="absolute -top-3 -left-3 rotate-12 rounded-lg bg-yellow-400 p-1.5 text-white shadow-lg">
                        <Zap size={20} fill="currentColor" />
                    </div>
                    {#if $rushStore.questionData.type === 'cloze'}
                        <h1 class="text-center text-xl leading-snug font-black text-slate-800 md:text-2xl">
                            {#each $rushStore.questionData.question.split('___') as part, i}
                                {part}{#if i < $rushStore.questionData.question.split('___').length - 1}<span class="inline-block mx-1 min-w-[60px] border-b-4 border-teal-500 text-teal-500 text-center">___</span>{/if}
                            {/each}
                        </h1>
                    {:else}
                        <h1 class="text-center text-xl leading-snug font-black text-slate-800 md:text-2xl">{$rushStore.questionData.question}</h1>
                    {/if}
                </div>

                {#if $rushStore.questionData.type === 'true_false'}
                    <div class="grid grid-cols-2 gap-4">
                        {#each ['Verdadeiro', 'Falso'] as option}
                            {@const isSelected = selectedOption === option}
                            {@const isRight    = isSelected && isCorrect}
                            {@const isWrong    = isSelected && !isCorrect}
                            {@const showGreen  = selectedOption && option === $rushStore.questionData.correct_answer}
                            <button class="flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-3xl border-b-4 p-5 font-black text-lg transition-all
                                {isRight  ? 'scale-[1.02] border-green-700 bg-green-500 text-white' : isWrong  ? 'border-rose-700 bg-rose-500 text-white' : showGreen ? 'border-green-700 bg-green-500 text-white' : option === 'Verdadeiro' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 active:translate-y-1 active:border-b-0' : 'border-rose-300 bg-rose-50 text-rose-700 active:translate-y-1 active:border-b-0'}"
                                on:click={() => handleAnswer(option)} disabled={!!selectedOption} style={selectedOption && !isSelected && option !== $rushStore.questionData.correct_answer ? 'opacity:0.4' : ''}>
                                <span class="text-3xl">{option === 'Verdadeiro' ? '✅' : '❌'}</span>
                                <span>{option}</span>
                            </button>
                        {/each}
                    </div>

                {:else if $rushStore.questionData.type === 'cloze'}
                    <div class="grid w-full grid-cols-2 gap-3 md:gap-4">
                        {#each $rushStore.questionData.options as option}
                            {@const isSelected = selectedOption === option}
                            {@const isRight    = isSelected && isCorrect}
                            {@const isWrong    = isSelected && !isCorrect}
                            {@const showGreen  = selectedOption && option === $rushStore.questionData.correct_answer}
                            <button class="group relative flex min-h-[60px] items-center justify-center rounded-2xl border-b-4 p-4 text-center font-bold transition-all
                                {isRight  ? 'scale-[1.01] border-green-700 bg-green-500 text-white' : isWrong  ? 'border-rose-700 bg-rose-500 text-white' : showGreen ? 'border-green-700 bg-green-500 text-white' : 'border-teal-200 bg-teal-50 text-teal-800 active:translate-y-1 active:border-b-0'}"
                                class:text-base={option.length > 15} class:text-lg={option.length <= 15}
                                on:click={() => handleAnswer(option)} disabled={!!selectedOption} style={selectedOption && !isSelected && option !== $rushStore.questionData.correct_answer ? 'opacity:0.45' : ''}>
                                {option}
                                {#if isSelected}{#if isCorrect}<CheckCircle2 size={18} class="ml-1 shrink-0" />{:else}<X size={18} class="ml-1 shrink-0" />{/if}{/if}
                            </button>
                        {/each}
                    </div>

                {:else}
                    <div class="grid w-full grid-cols-1 gap-3 md:gap-4">
                        {#each $rushStore.questionData.options as option}
                            <button class="group relative flex min-h-[60px] items-center justify-between rounded-2xl border-b-4 p-4 text-left font-bold transition-all
                                {selectedOption === option && isCorrect ? 'scale-[1.01] border-green-700 bg-green-500 text-white' : selectedOption === option && !isCorrect ? 'border-rose-700 bg-rose-500 text-white' : selectedOption && option === $rushStore.questionData.correct_answer ? 'border-green-700 bg-green-500 text-white opacity-100' : 'border-slate-200 bg-white text-slate-600 active:translate-y-1 active:border-b-0'}"
                                class:text-base={option.length > 25} class:text-lg={option.length <= 25}
                                on:click={() => handleAnswer(option)} disabled={!!selectedOption} style={selectedOption && option !== selectedOption && option !== $rushStore.questionData.correct_answer ? 'opacity: 0.5' : ''}>
                                <span class="pr-2 leading-tight">{option}</span>
                                {#if selectedOption === option}{#if isCorrect}<CheckCircle2 size={24} class="shrink-0" />{:else}<X size={24} class="shrink-0" />{/if}{/if}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            {#if selectedOption}
                <div class="animate-slide-up fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-3xl p-4 shadow-[0_-10px_50px_rgba(0,0,0,0.2)] md:p-6
                    {isCorrect ? 'border-t-8 border-green-500 bg-green-100' : 'border-t-8 border-rose-500 bg-rose-100'}">
                    <div class="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row md:gap-6">
                        <div class="w-full flex-1 text-center sm:text-left">
                            {#if isCorrect}
                                <div class="mb-2 flex items-center justify-center gap-2 text-xl font-black text-green-700 sm:justify-start">
                                    <CheckCircle2 class="fill-current" size={24} />
                                    {#if $rushStore.streak > 2}IMPARÁVEL! 🔥{:else}ACERTASTE!{/if}
                                </div>
                                <p class="text-sm leading-relaxed font-medium text-green-800 md:text-base">{$rushStore.questionData.explanation || 'Muito bem! Ganhaste XP.'}</p>
                            {:else}
                                <div class="mb-2 flex items-center justify-center gap-2 text-xl font-black text-rose-600 sm:justify-start">
                                    <X class="fill-current" size={24} /> ERRADO
                                </div>
                                <div class="text-sm font-medium text-rose-800">
                                    Resposta certa: <strong class="rounded border border-rose-200 bg-white px-2 py-0.5">{$rushStore.questionData.correct_answer}</strong>
                                </div>
                            {/if}
                        </div>
                        <button on:click={loadQuestion} class="w-full shrink-0 rounded-2xl border-b-4 px-8 py-4 text-lg font-black text-white shadow-xl transition-all active:translate-y-1 active:border-b-0 sm:w-auto md:text-xl
                            {isCorrect ? 'border-green-700 bg-green-500' : 'border-rose-700 bg-rose-500'}">
                            {isCorrect ? 'CONTINUAR' : 'PRÓXIMA'}
                        </button>
                    </div>
                    <div class="h-[env(safe-area-inset-bottom)]"></div>
                </div>
            {/if}
        {/if}

    {:else if $rushStore.currentState === 'GAMEOVER'}
        <div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div class="mb-4 animate-bounce text-7xl md:text-8xl">{#if isTimeUp}⏰{:else}💔{/if}</div>
            <h1 class="mb-4 text-3xl font-black text-slate-800 md:text-5xl">{#if isTimeUp}Tempo Esgotado!{:else}Acabaram as vidas!{/if}</h1>
            <p class="mx-auto mb-6 max-w-xs text-base text-slate-500 md:text-lg">{#if isTimeUp}Bom trabalho hoje! Descansa.{:else}Tenta de novo!{/if}</p>
            <div class="mb-8 w-full max-w-sm rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-lg">
                <p class="mb-2 text-xs font-bold tracking-widest text-slate-500 uppercase">XP Ganho</p>
                <p class="text-5xl font-black text-amber-500 md:text-6xl">{$rushStore.xp}</p>
            </div>
            <button on:click={() => { if (isTimeUp) exitSession(); else { rushStore.clear(); isTimeUp = false; } }} class="w-full max-w-xs rounded-2xl border-b-4 border-blue-700 bg-blue-500 px-8 py-4 text-lg font-bold text-white shadow-lg active:translate-y-1 active:border-b-0">
                {#if isTimeUp}Sair{:else}Voltar ao Menu{/if}
            </button>
        </div>
    {/if}
</div>

<style>
    /* NOVAS ANIMAÇÕES ADICIONADAS PARA O MODAL (fade-in) */
    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    .animate-fade-in {
        animation: fade-in 0.2s ease-out forwards;
    }

    @keyframes slide-up {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
    .animate-slide-up {
        animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popIn {
        0% { opacity: 0; transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
    }
    .animate-pop-in {
        animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes zoomIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
    }
    .animate-zoom-in {
        animation: zoomIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .animate-bounce-slow { animation: bounce 3s infinite; }
    .animate-pulse-slow { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>