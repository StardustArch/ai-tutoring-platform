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
        CheckCircle2, Play, Trophy, Star,

		BrainCircuit

    } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import confetti from 'canvas-confetti';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';

    // --- PARÂMETROS ---
    let studentId = $page.params.id || '';
    let turmaId = Number($page.params.class) || 0; 
    let sessionId = $page.url.searchParams.get('sessionId') ? parseInt($page.url.searchParams.get('sessionId')!) : null;

    // --- ESTADO ---
    let studentClass: any = 3; 
    let studentData: any = null;
    let allowedTopicIds: number[] = []; 

    type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'BLOCKED' | 'DIAGNOSTIC';
    let currentState: GameState = 'MENU';

    let selectedSubject = 'matematica';
    let selectedSubtopic = '';
    
    let needsDiagnostic = false;
    let diagnosticQuestions: any[] = [];
    let currentDiagnosticIndex = 0;
    let diagnosticAnswers: Array<{ topico: string; acertou: boolean }> = [];
    // Variáveis de Jogo
    let loading = false;
    let questionData: any = null;
    let selectedOption: string | null = null;
    let isCorrect: boolean | null = null;
    let lives = 3;
    let score = 0;
    let blockTimeRemaining = '';
    let blockedUntil: Date | null = null;

    // Estatísticas
    let stats = { xp: 0, totalExercicios: 0, acertos: 0, taxaAcerto: 0, erros: 0 };
    let loadingStats = true;
    let availableTopics: { matematica: any[], portugues: any[] } = { matematica: [], portugues: [] };
    let loadingTopics = true;

    // Ícones
    const ICON_MAP: Record<string, any> = {
        Hash, ListOrdered, Shapes, Calculator, X, Divide, Scale, Coins, LineChart,
        Triangle, Sigma, Ruler, PieChart, Equal, Activity, Tags, RefreshCcw, PenTool, 
        MessageSquare, TrafficCone, Heart, UserCheck, MapPin, GitBranch, Calendar, Zap, BookOpen, Mail, Box
    };

    onMount(async () => {
        loading = true; loadingStats = true; loadingTopics = true;
        try {
            if (sessionId) {
                const resSession = await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}`); 
                if (resSession.ok) {
                    const sessionData = await resSession.json();
                    let rawIds = sessionData.topicosAlvo;
                    if (typeof rawIds === 'string') { try { rawIds = JSON.parse(rawIds); } catch(e) {} }
                    if (Array.isArray(rawIds)) allowedTopicIds = rawIds.map((id: any) => Number(id));
                }
            }

            const resUser = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
            if (resUser.ok) {
                studentData = await resUser.json();
                if (studentData.classe) studentClass = studentData.classe;
            }

            const resTopics = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${studentClass}&studentId=${studentId}`);
            if (resTopics.ok) {
                const allTopics = await resTopics.json();
                if (sessionId) {
                    availableTopics.matematica = (allTopics.matematica || []).filter((t: any) => allowedTopicIds.includes(Number(t.id)));
                    availableTopics.portugues = (allTopics.portugues || []).filter((t: any) => allowedTopicIds.includes(Number(t.id)));
                } else {
                    availableTopics = allTopics;
                }
            }
        } catch (e) { console.error(e); } 
        finally { loading = false; loadingTopics = false; loadingStats = false; }
    });

    function getIcon(iconName: string | undefined) {
        if (!iconName || !ICON_MAP[iconName]) return Calculator;
        return ICON_MAP[iconName];
    }

    function getColor(color: string | undefined, subject: string) {
        if (color && color.startsWith('bg-')) return color;
        return subject === 'matematica' ? 'bg-blue-500' : 'bg-green-500';
    }

// 1. O GATILHO: Quando o aluno clica num tópico
async function checkAndStartGame(subject: string, subtopic: string) {
    // Guarda o que o aluno queria jogar
    selectedSubject = subject;
    selectedSubtopic = subtopic;

    loading = true;
    try {
        // PERGUNTA AO BACKEND: Precisa de diagnóstico?
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/diagnostic/needs/${studentId}?disciplina=${subject}`);
        
        if (res.ok) {
            const data = await res.json();
            
            if (data.needs) {
                // 🚨 DESVIO: O aluno precisa de diagnóstico primeiro!
                console.log("⚠️ Diagnóstico necessário! A iniciar modo de calibração...");
                await startDiagnostic(subject);
            } else {
                // ✅ TUDO OK: Pode jogar o tópico que escolheu
                startGame(subject, subtopic);
            }
        } else {
            // Se a API falhar, assume que não precisa e deixa jogar (Fail-safe)
            startGame(subject, subtopic);
        }
    } catch (e) {
        console.error("Erro ao verificar diagnóstico:", e);
        startGame(subject, subtopic);
    } finally {
        loading = false;
    }
}

// 2. INICIAR DIAGNÓSTICO (Gera Perguntas)
async function startDiagnostic(subject: string) {
    loading = true;
    currentState = 'DIAGNOSTIC';
    diagnosticAnswers = [];
    currentDiagnosticIndex = 0;
    
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/diagnostic/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                alunoId: parseInt(studentId), 
                disciplina: subject, 
                classe: studentClass,
                topico: selectedSubtopic
            })
        });

        if (res.ok) {
            const data = await res.json(); // Recebe o objeto { alunoId, perguntas: [...] }
            
            // 🚨 CORREÇÃO AQUI: Acessamos .perguntas
            if (data.perguntas && Array.isArray(data.perguntas)) {
                diagnosticQuestions = data.perguntas;
            } else {
                console.warn("Formato inesperado:", data);
                diagnosticQuestions = [];
            }

            console.log("🧠 Perguntas carregadas:", diagnosticQuestions.length);
            
            if (diagnosticQuestions.length > 0) {
                questionData = diagnosticQuestions[0];
            } else {
                currentState = 'MENU';
            }
        }
    } catch (e) {
        console.error("Erro diagnóstico:", e);
        currentState = 'MENU';
    } finally {
        loading = false;
    }
}
// 3. RESPONDER NO DIAGNÓSTICO
async function handleDiagnosticAnswer(option: string) {
    if (selectedOption) return;
    selectedOption = option;

    const correctAnswer = questionData.correct_answer; 
    isCorrect = option === correctAnswer;

    // 🚨 CORREÇÃO AQUI: Usamos 'topico' (do JSON) em vez de 'topic'
    diagnosticAnswers.push({
        topico: questionData.topico || selectedSubject, 
        acertou: isCorrect
    });

    if (isCorrect) confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });

    setTimeout(async () => {
        selectedOption = null;
        isCorrect = null;
        currentDiagnosticIndex++;

        if (currentDiagnosticIndex < diagnosticQuestions.length) {
            questionData = diagnosticQuestions[currentDiagnosticIndex];
        } else {
            await submitDiagnosticResults();
        }
    }, 1000); // Reduzi para 1s para ser mais fluido
}

// 4. FINALIZAR DIAGNÓSTICO
async function submitDiagnosticResults() {
    loading = true;
    try {
        console.log("📤 A enviar resultados...", diagnosticAnswers);
        await apiFetch(`${PUBLIC_API_URL_HOST}/api/diagnostic/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                alunoId: parseInt(studentId),
                disciplina: selectedSubject,
                respostas: diagnosticAnswers
            })
        });

        // Sucesso! Agora o aluno pode jogar o que queria originalmente
        // Mostra um alerta de sucesso ou vai direto
        confetti({ particleCount: 200, spread: 100 });
        alert("Diagnóstico completo! Agora estás pronto para jogar.");
        
        // Redireciona para o jogo normal
        startGame(selectedSubject, selectedSubtopic);

    } catch (e) {
        console.error("Erro ao salvar diagnóstico:", e);
        currentState = 'MENU';
    } finally {
        loading = false;
    }
}
    function startGame(subject: string, subtopic: string) {
        selectedSubject = subject;
        selectedSubtopic = subtopic;
        currentState = 'PLAYING';
        lives = 3; 
        loadQuestion();
    }

    async function loadQuestion() {
        loading = true; selectedOption = null; isCorrect = null;
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: parseInt(studentId),
                    classe: studentClass,
                    disciplina: selectedSubject,
                    subtopico: selectedSubtopic,
                    sessionId: sessionId || null
                })
            });
            
            if (res.status === 403) {
                const error = await res.json();
                blockedUntil = new Date(error.blockedUntil);
                currentState = 'BLOCKED';
                return;
            }
            questionData = await res.json();
        } catch (e) { console.error(e); } finally { loading = false; }
    }

    async function handleAnswer(option: string) {
        if (selectedOption) return;
        selectedOption = option;
        
        const correctAnswer = questionData.correct_answer; 
        isCorrect = option === correctAnswer;

        if (isCorrect) {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ['#4ade80', '#22c55e', '#ffffff'] });
            score += 10; stats.xp += 10; stats.acertos += 1;
        } else {
            stats.erros += 1; lives--;
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
                    sessaoId: sessionId || null
                })
            });
            
            const result = await res.json();
            if (result.blocked && result.blockedUntil) {
                blockedUntil = new Date(result.blockedUntil);
                setTimeout(() => { currentState = 'BLOCKED'; }, 1500);
            }
        } catch (error) { console.error(error); }

        if (lives <= 0 && currentState !== 'BLOCKED') {
            setTimeout(() => { currentState = 'GAMEOVER'; }, 1500);
        }
    }
    
    async function exitSession() {
        if (sessionId) await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}/end`, { method: 'PATCH' });
        goto(`/dashboard/foreman/student/${studentId}/class`);
    }

</script>

<svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="flex flex-col h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-white font-['Fredoka'] overflow-hidden">
    
    <div class="flex justify-between items-center p-4 bg-white/90 backdrop-blur-sm border-b-4 border-amber-200 z-10 shadow-sm">
        <button on:click={() => currentState === 'MENU' ? exitSession() : currentState = 'MENU'} 
                class="p-2 rounded-xl bg-white border-2 border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-500 hover:scale-105 transition-all shadow-sm active:translate-y-1 active:border-b-2">
            <ArrowLeft size={28} strokeWidth={3} />
        </button>
        
        {#if currentState === 'PLAYING'}
            <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border-2 border-red-100 shadow-sm animate-pop-in">
                {#each Array(3) as _, i}
                    <Heart 
                        size={28} 
                        class={`transition-all duration-500 ${i < lives ? 'text-red-500 fill-red-500 animate-pulse-slow' : 'text-slate-200 fill-slate-100'}`} 
                    />
                {/each}
            </div>
        {:else}
            <div class="flex flex-col items-center">
                <h1 class="font-black text-2xl text-amber-500 flex items-center gap-2 drop-shadow-sm tracking-wide">
                    <Zap class="fill-current animate-bounce-slow" /> MODO RUSH
                </h1>
            </div>
        {/if}
        
        <div class="bg-amber-100 border-2 border-amber-200 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-inner">
            <Star class="text-amber-500 fill-amber-500" size={18} />
            <span class="text-lg font-black text-amber-600">{stats.xp} XP</span>
        </div>
    </div>

    {#if currentState === 'BLOCKED'}
        <div class="flex-1 flex flex-col items-center justify-center text-center p-6 animate-zoom-in">
            <div class="bg-rose-100 p-8 rounded-full mb-6 border-4 border-rose-200 animate-shake">
                <Lock size={64} class="text-rose-500" />
            </div>
            <h2 class="text-3xl font-black text-slate-800 mb-2">Pausa para Café! ☕</h2>
            <p class="text-slate-500 text-lg max-w-xs mx-auto">Já treinaste muito este tópico. Vamos dar descanso ao cérebro.</p>
            <div class="my-8 bg-white px-8 py-4 rounded-2xl shadow-lg border-b-4 border-slate-200">
                <p class="font-black text-rose-500 text-4xl font-mono tracking-widest">{blockTimeRemaining}</p>
            </div>
            <button on:click={() => currentState = 'MENU'} class="px-10 py-5 bg-blue-500 text-white rounded-2xl font-bold shadow-lg border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 hover:brightness-110 transition-all">
                Escolher Outra Missão
            </button>
        </div>

    {:else if currentState === 'MENU'}
        <div class="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div class="max-w-4xl mx-auto space-y-8 animate-slide-up">

                <div class="bg-gradient-to-tr from-violet-500 via-purple-500 to-fuchsia-500 rounded-3xl p-6 text-white shadow-xl shadow-purple-200 relative overflow-hidden border-4 border-white/20">
                    <div class="absolute -top-10 -right-10 opacity-20 rotate-12">
                        <Trophy size={180} />
                    </div>
                    
                    <div class="flex items-center justify-between relative z-10">
                        <div>
                            <p class="text-purple-100 text-sm font-bold uppercase tracking-wider mb-1">XP Total</p>
                            <p class="text-5xl font-black drop-shadow-md">{stats.xp}</p>
                        </div>
                        <div class="text-right bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10">
                            <p class="text-purple-100 text-xs font-bold uppercase mb-1">Respostas Certas</p>
                            <p class="text-3xl font-bold text-green-300 flex items-center justify-end gap-2">
                                <CheckCircle2 size={24} /> {stats.acertos}
                            </p>
                        </div>
                    </div>
                </div>

                {#if loadingTopics}
                     <div class="flex flex-col items-center justify-center py-20">
                        <div class="w-16 h-16 border-8 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                     </div>
                {:else}
                    
                    {#if availableTopics.matematica.length > 0}
                    <section>
                        <h2 class="text-2xl font-black mb-4 text-slate-700 flex items-center gap-3">
                            <div class="bg-blue-100 p-2 rounded-xl text-blue-500"><Calculator /></div> Matemática
                        </h2>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {#each availableTopics.matematica as topic}
                                <button 
                                    on:click={() => checkAndStartGame('matematica', topic.nome)}
                                    class="relative overflow-hidden p-5 rounded-2xl bg-white shadow-sm border-b-4 border-slate-200 hover:border-blue-400 hover:shadow-md active:border-b-0 active:translate-y-1 transition-all text-left group"
                                >
                                    <div class="flex items-start justify-between mb-4">
                                        <div class="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <svelte:component this={getIcon(topic.metadata?.icon)} size={24} />
                                        </div>
                                        <div class="bg-slate-50 p-2 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                            <Play size={18} class="fill-current text-slate-300 group-hover:text-blue-500" />
                                        </div>
                                    </div>
                                    <h3 class="font-bold text-lg text-slate-700 leading-tight group-hover:text-blue-600 transition-colors">
                                        {topic.nome}
                                    </h3>
                                </button>
                            {/each}
                        </div>
                    </section>
                    {/if}

                    {#if availableTopics.portugues.length > 0}
                    <section class="mt-8">
                        <h2 class="text-2xl font-black mb-4 text-slate-700 flex items-center gap-3">
                            <div class="bg-green-100 p-2 rounded-xl text-green-500"><BookOpen /></div> Português
                        </h2>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {#each availableTopics.portugues as topic}
                                <button on:click={() => checkAndStartGame('portugues', topic.nome)}
                                    class="relative overflow-hidden p-5 rounded-2xl bg-white shadow-sm border-b-4 border-slate-200 hover:border-green-400 hover:shadow-md active:border-b-0 active:translate-y-1 transition-all text-left group">
                                    
                                    <div class="flex items-start justify-between mb-4">
                                        <div class="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <svelte:component this={getIcon(topic.metadata?.icon)} size={24} />
                                        </div>
                                        <div class="bg-slate-50 p-2 rounded-full group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                                            <Play size={18} class="fill-current text-slate-300 group-hover:text-green-500" />
                                        </div>
                                    </div>
                                    <h3 class="font-bold text-lg text-slate-700 leading-tight group-hover:text-green-600 transition-colors">
                                        {topic.nome}
                                    </h3>
                                </button>
                            {/each}
                        </div>
                    </section>
                    {/if}
                {/if}
            </div>
        </div>
    
    {:else if currentState === 'DIAGNOSTIC'}
        <div class="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full p-6 animate-zoom-in">
            
            <div class="text-center mb-8">
                <div class="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-sm mb-4">
                    <BrainCircuit size={18} />
                    Teste de Nível
                </div>
                
                <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2">
                    <div class="bg-purple-500 h-full transition-all duration-500" 
                         style="width: {((currentDiagnosticIndex) / diagnosticQuestions.length) * 100}%">
                    </div>
                </div>
                <p class="text-slate-400 text-xs font-bold">PERGUNTA {currentDiagnosticIndex + 1} DE {diagnosticQuestions.length}</p>
            </div>

            {#if loading}
                <div class="flex flex-col items-center py-10">
                    <div class="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
            {:else if questionData}
                <h1 class="text-2xl md:text-3xl font-black text-center text-slate-800 mb-8 leading-snug">
                    {questionData.question}
                </h1>

                <div class="grid grid-cols-1 gap-4">
                    {#each questionData.options as option}
                        <button 
                            class="relative p-6 rounded-2xl border-b-4 font-bold text-xl text-left transition-all flex items-center justify-between group
                            {selectedOption === option && isCorrect === null
                                ? 'bg-purple-100 border-purple-300 text-purple-900' // Selecionado (A aguardar)
                                : selectedOption === option && isCorrect 
                                    ? 'bg-green-500 border-green-700 text-white' // Correto
                                    : selectedOption === option && !isCorrect
                                        ? 'bg-rose-500 border-rose-700 text-white' // Errado
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-400 hover:bg-purple-50 active:border-b-0 active:translate-y-1'}"
                            on:click={() => handleDiagnosticAnswer(option)}
                            disabled={!!selectedOption}
                        >
                            <span>{option}</span>
                            
                            {#if selectedOption === option}
                                {#if isCorrect}<CheckCircle2 class="animate-bounce" />{/if}
                                {#if isCorrect === false}<X class="animate-shake" />{/if}
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {:else if currentState === 'PLAYING'}
        {#if loading}
            <div class="flex-1 flex flex-col items-center justify-center">
                <div class="w-20 h-20 border-8 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-6"></div>
                <p class="font-black text-xl text-amber-400 animate-pulse tracking-wide">A PREPARAR DESAFIO...</p>
            </div>
        {:else if questionData}
             <div class="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full p-6 animate-pop-in pb-32">
                <div class="text-center mb-6">
                    <span class="bg-white border-2 border-slate-100 text-slate-400 text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                        {selectedSubtopic}
                    </span>
                </div>
                
                <div class="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-slate-100 mb-8 relative">
                    <div class="absolute -top-4 -left-4 bg-yellow-400 text-white p-2 rounded-xl rotate-12 shadow-lg">
                        <Zap size={24} fill="currentColor" />
                    </div>
                    <h1 class="text-2xl md:text-3xl font-black text-center text-slate-800 leading-snug">
                        {questionData.question}
                    </h1>
                </div>

                <div class="grid grid-cols-1 gap-4">
                    {#each questionData.options as option}
                        <button 
                            class="relative p-6 rounded-2xl border-b-4 font-bold text-xl text-left transition-all flex items-center justify-between group
                            {selectedOption === option && isCorrect === null
                                ? 'bg-amber-100 border-amber-300 text-amber-800'
                                : selectedOption === option && isCorrect 
                                    ? 'bg-green-500 border-green-700 text-white shadow-lg scale-[1.02]' 
                                    : selectedOption === option && !isCorrect
                                        ? 'bg-rose-500 border-rose-700 text-white shadow-lg'
                                        : selectedOption && option === questionData.correct_answer
                                            ? 'bg-green-500 border-green-700 text-white opacity-100 scale-[1.02] shadow-lg' // Revela a certa
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50 active:border-b-0 active:translate-y-1'}"
                            on:click={() => handleAnswer(option)}
                            disabled={!!selectedOption}
                            style={selectedOption && option !== selectedOption && option !== questionData.correct_answer ? 'opacity: 0.5' : ''}
                        >
                            <span>{option}</span>
                            
                            {#if selectedOption === option}
                                {#if isCorrect}
                                    <CheckCircle2 class="animate-bounce" size={28} />
                                {:else if isCorrect === false}
                                    <X class="animate-shake" size={28} />
                                {/if}
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
            
            {#if selectedOption}
                <div class="fixed bottom-0 inset-x-0 p-6 z-50 animate-slide-up rounded-t-3xl shadow-[0_-10px_50px_rgba(0,0,0,0.2)]
                            {isCorrect ? 'bg-green-100 border-t-8 border-green-500' : 'bg-rose-100 border-t-8 border-rose-500'}">
                    <div class="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                        
                        <div class="flex-1 w-full text-center sm:text-left">
                            {#if isCorrect}
                                <div class="text-green-700 font-black text-2xl flex items-center justify-center sm:justify-start gap-2 mb-2">
                                    <CheckCircle2 class="fill-current" size={32} /> ACERTASTE!
                                </div>
                                <p class="text-green-800 text-lg font-medium leading-relaxed">
                                    {questionData.explanation || "Muito bem! Ganhaste 10 XP."}
                                </p>
                            {:else}
                                <div class="text-rose-600 font-black text-2xl flex items-center justify-center sm:justify-start gap-2 mb-2">
                                    <X class="fill-current" size={32} /> ERRADO
                                </div>
                                <div class="text-rose-800 font-medium">
                                    <p class="text-lg mb-1">
                                        A resposta certa era <strong class="bg-white px-3 py-1 rounded-lg border border-rose-200 shadow-sm">{questionData.correct_answer}</strong>
                                    </p>
                                </div>
                            {/if}
                        </div>

                        <button on:click={loadQuestion} 
                                class={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-xl text-white shadow-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all min-w-[200px]
                                ${isCorrect ? 'bg-green-500 border-green-700 hover:bg-green-400' : 'bg-rose-500 border-rose-700 hover:bg-rose-400'}`}>
                            {isCorrect ? 'CONTINUAR' : 'PRÓXIMA'}
                        </button>
                    </div>
                </div>
            {/if}

        {/if}

    {:else if currentState === 'GAMEOVER'}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center animate-zoom-in">
            <div class="mb-6 text-8xl animate-bounce">💔</div>
            <h1 class="text-5xl font-black text-slate-800 mb-4">Acabaram as vidas!</h1>
            <div class="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 mb-8 w-full max-w-sm">
                <p class="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">Total da Sessão</p>
                <p class="text-6xl font-black text-amber-500">{score} <span class="text-2xl text-amber-300">XP</span></p>
            </div>
            
            <button on:click={() => currentState = 'MENU'} class="w-full max-w-xs px-8 py-5 bg-blue-500 text-white rounded-2xl font-bold shadow-lg border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 hover:brightness-110 transition-all text-xl">
                Voltar ao Mapa
            </button>
        </div>
    {/if}
</div>

<style>
    /* Animações Personalizadas */
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

    .animate-bounce-slow {
        animation: bounce 3s infinite;
    }
    .animate-pulse-slow {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    /* Utilitário para esconder scroll */
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>