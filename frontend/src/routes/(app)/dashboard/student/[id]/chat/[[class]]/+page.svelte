<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST, PUBLIC_IA_HOST_API_URL } from '$env/static/public';
  import { 
    Send, Bot, ArrowLeft, Sparkles, Brain, X,
    Smile, Frown, BookOpen, Calculator, ChevronRight, GraduationCap, Volume2, Star, ArrowDown, PenLine
  } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import confetti from 'canvas-confetti';
  import SessionTimer from '$lib/components/SessionTimer.svelte';

  // --- PARÂMETROS ---
  let studentId = $page.params.id || '';
  let sessionId = $page.url.searchParams.get('sessionId') ? parseInt($page.url.searchParams.get('sessionId')!) : null;
  $: turmaId = $page.params.class ? parseInt($page.params.class!) : null;

  let allowedTopicIds: number[] = [];
  let viewState: 'TOPICS' | 'CHAT' | 'GAMEOVER' = 'TOPICS';

  let sessionContext = { subject: '', topic: '' };
  let lastAudio: HTMLAudioElement | null = null;
  let availableTopics: { [key: string]: any[] } = { matematica: [], portugues: [] };
  let loadingTopics = true;
  let isTimeUp = false;

  // ── FIX 1: Timer key única por sessão de chat ─────────────────────────────
  // Ao iniciar uma nova sessão de tópico, geramos uma chave nova.
  // Isto garante que o localStorage não reaproveita o timer de sessões anteriores.
  let currentTimerKey = `kmind_timer_${Date.now()}`;

  // ── FIX 1: Timer só corre quando está no CHAT ─────────────────────────────
  $: timerPaused = viewState !== 'CHAT';

  // --- ESTADO DO CHAT ---
  let messageInput = '';
  let isTyping = false;
  let isPreparingAudio = false;
  let chatContainer: HTMLElement;
  let isRevealing = false;
  let visibleBubbles: string[] = [];

  // ── FIX 2: Input livre sempre acessível ──────────────────────────────────
  // Quando o Kani dá opções (quiz/chips/confirmation), o aluno pode sempre
  // alternar para escrever livremente — ex: tirar uma dúvida no meio de um teste.
  let showFreeInput = false;

  // --- ESTADO DRAG & DROP ---
  let availableDragItems: string[] = [];
  let selectedDragItems: string[] = [];

  // ── State machine da lição (Opção A) ─────────────────────────────────────
  // Guardamos os campos necessários para o FEEDBACK determinístico.
  let currentPhase: 'EXPLAIN' | 'TEST' | 'FEEDBACK' = 'EXPLAIN';
  let lastQuestion: string | null = null;
  let lastCorrectAnswer: string | null = null;
  let lastInteractionType: string | null = null;

  let currentAiMessage = {
    messages: [] as string[],
    emotion: "NEUTRAL",
    type: "FREE_TEXT",
    data: {} as any
  };

  $: inputMode = resolveInputMode(currentAiMessage.type, currentAiMessage.data, isTyping, isPreparingAudio, isRevealing);

  function resolveInputMode(
    type: string,
    data: any,
    typing: boolean,
    preparingAudio: boolean,
    revealing: boolean
  ): 'confirmation' | 'quiz' | 'chips' | 'text' | 'drag_drop' | 'none' {
    if (typing || preparingAudio || revealing) return 'none';
    if (type === 'DIRECT_INPUT') return 'text';
    if (type === 'DRAG_DROP' && data?.items) return 'drag_drop';
    const options: string[] = data?.options || [];
    if (type === 'EXPLANATION' && options.length > 0) return 'confirmation';
    if (type === 'TRUE_FALSE' || type === 'CHIPS') return 'quiz';
    if (type === 'CLOZE') return 'chips';
    return 'text';
  }

  // O input livre deve fechar quando o inputMode muda
  $: if (inputMode !== 'none') showFreeInput = false;

  $: mascotState = getMascotState(currentAiMessage.emotion);

  // --- LIFECYCLE ---
  onMount(async () => {
    await loadStudentAndTopics();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined' && lastAudio) lastAudio.pause();
  });

  afterUpdate(() => {
    if (viewState === 'CHAT' && chatContainer) {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }
  });

  function handleTimeUp() {
    isTimeUp = true;
    viewState = 'GAMEOVER';
    if (typeof window !== 'undefined' && lastAudio) lastAudio.pause();
  }

  async function loadStudentAndTopics() {
    loadingTopics = true;
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
      if (!resUser.ok) throw new Error('Erro aluno');
      const student = await resUser.json();
      const classe = student.classe || 3;
      const resTopics = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${classe}&studentId=${studentId}`);
      if (resTopics.ok) {
        const allTopics = await resTopics.json();
        if (sessionId) {
          availableTopics.matematica = (allTopics.matematica || []).filter((t: any) => allowedTopicIds.includes(Number(t.id)));
          availableTopics.portugues  = (allTopics.portugues  || []).filter((t: any) => allowedTopicIds.includes(Number(t.id)));
        } else {
          availableTopics = allTopics;
        }
      }
    } catch (e) {
      console.error("Erro ao carregar currículo:", e);
    } finally {
      loadingTopics = false;
    }
  }

  function speakText() {
    if (lastAudio) {
      lastAudio.currentTime = 0;
      lastAudio.play();
    }
  }

  function startSession(subject: string, topicName: string) {
    sessionContext = { subject, topic: topicName };

    // ── FIX 1+3: Timer reseta com nova chave única ────────────────────────
    // Limpa o timer antigo do localStorage e gera uma chave nova.
    // Quando o SessionTimer recebe a nova timerKey, não encontra nada no
    // localStorage e começa do MAX_TIME.
    localStorage.removeItem(currentTimerKey);
    currentTimerKey = `kmind_timer_${Date.now()}`;

    // Reseta a state machine
    currentPhase = 'EXPLAIN';
    lastQuestion = null;
    lastCorrectAnswer = null;
    lastInteractionType = null;
    showFreeInput = false;

    viewState = 'CHAT';
    handleAiResponse(JSON.stringify({
      messages: [`Olá campeão! 🌟`, `Hoje vamos dominar ${topicName}!`, "Estás pronto?"],
      emotion: "HAPPY",
      interaction_type: "EXPLANATION",
      interaction_data: { options: ["Vamos lá!", "O que é isso?"] },
      phase: "EXPLAIN"
    }));
  }

  async function sendMessage(textOverride?: string) {
    const textToSend = textOverride || messageInput;
    if (!textToSend.trim() || isTyping) return;

    messageInput = '';
    showFreeInput = false;
    isTyping = true;
    visibleBubbles = [];
    currentAiMessage.emotion = "THOUGHTFUL";

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alunoId: parseInt(studentId),
          userQuery: textToSend,
          subject: sessionContext.subject,
          topic: sessionContext.topic,
          mode: 'tutor',
          turmaId: turmaId,
          sessaoId: sessionId || null,
          // ── State machine (Opção A) ────────────────────────────────────
          phase: currentPhase,
          lastQuestion: lastQuestion,
          lastCorrectAnswer: lastCorrectAnswer,
          lastInteractionType: lastInteractionType,
        })
      });
      if (res.ok) {
        const data = await res.json();
        handleAiResponse(data.response);
      } else {
        throw new Error('Erro API');
      }
    } catch (err: any) {
      handleAiResponse(JSON.stringify({
        messages: ["Eish, a minha internet tropeçou! 🔌", "Podes repetir?"],
        emotion: "SAD",
        interaction_type: "CHIPS",
        interaction_data: { options: ["Tentar de novo"] }
      }));
    } finally {
      isTyping = false;
    }
  }

  async function handleAiResponse(rawText: string) {
    try {
      const content = JSON.parse(rawText);
      let msgs: string[] = [];

      if (content.messages && Array.isArray(content.messages)) {
        msgs = content.messages;
      } else if (content.text) {
        msgs = [content.text];
      } else {
        msgs = ["..."];
      }

      currentAiMessage = {
        messages: msgs,
        emotion: content.emotion || "NEUTRAL",
        type: content.interaction_type || "FREE_TEXT",
        data: content.interaction_data || {}
      };

      // ── Actualiza a state machine com a fase devolvida pelo backend ──────
      if (content.phase) currentPhase = content.phase;

      // ── Guarda os campos de contexto para o próximo FEEDBACK ─────────────
      // Quando o Kani devolve uma pergunta (fase TEST), guardamos a pergunta
      // e a resposta correcta para enviar no próximo pedido (fase FEEDBACK).
      if (content.phase === 'TEST') {
        // A última mensagem do array é normalmente a pergunta
        lastQuestion = msgs[msgs.length - 1] || null;
        // correct_answer vem no interaction_data para CHIPS/CLOZE/TRUE_FALSE
        // e o backend também pode devolvê-lo num campo dedicado
        lastCorrectAnswer = content.correct_answer
          || content.interaction_data?.correct_answer
          || null;
        lastInteractionType = content.interaction_type || null;
      }

      if (content.emotion === 'HAPPY' || content.assessment === 'CORRECT') {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FFD700', '#FF4500', '#00BFFF'] });
      }

      if (content.audio_url) {
        isPreparingAudio = true;
        const fullAudioUrl = `${PUBLIC_IA_HOST_API_URL}${content.audio_url}`;
        lastAudio = new Audio(fullAudioUrl);

        const audioReadyPromise = new Promise<void>((resolve) => {
          lastAudio!.oncanplaythrough = () => resolve();
          lastAudio!.onerror = () => resolve();
          setTimeout(() => resolve(), 4000);
        });

        await audioReadyPromise;
        isPreparingAudio = false;
        lastAudio.play().catch(e => console.warn("Autoplay bloqueado"));
        triggerBubbleSequence(msgs);
      } else {
        triggerBubbleSequence(msgs);
      }

    } catch (e) {
      console.warn("Erro parsing ou áudio:", e);
      isPreparingAudio = false;
      triggerBubbleSequence([rawText]);
    }
  }

  function getMascotState(emotion: string) {
    switch (emotion) {
      case 'HAPPY':      return { color: 'bg-green-400',  ring: 'ring-green-200',  icon: Smile,    animation: 'animate-bounce-slow' };
      case 'INTERESTED': return { color: 'bg-violet-500', ring: 'ring-violet-200', icon: Sparkles, animation: 'animate-pulse' };
      case 'THOUGHTFUL': return { color: 'bg-amber-400',  ring: 'ring-amber-200',  icon: Brain,    animation: 'animate-float' };
      case 'SAD':        return { color: 'bg-rose-400',   ring: 'ring-rose-200',   icon: Frown,    animation: 'animate-shake' };
      default:           return { color: 'bg-blue-500',   ring: 'ring-blue-200',   icon: Bot,      animation: 'animate-float' };
    }
  }

  async function triggerBubbleSequence(messages: string[]) {
    isRevealing = true;
    visibleBubbles = [];
    for (let i = 0; i < messages.length; i++) {
      const delay = i === 0 ? 100 : Math.min(messages[i-1].length * 20, 1000);
      await new Promise(r => setTimeout(r, delay));
      visibleBubbles = [...visibleBubbles, messages[i]];
    }
    isRevealing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function exitSession() {
    if (sessionId) await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}/end`, { method: 'PATCH' });
    goto(`/dashboard/foreman/student/${studentId}/class`);
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">
  <title>Sessão | KMind</title>
</svelte:head>

<div class="flex flex-col h-[100dvh] bg-gradient-to-b from-sky-200 via-blue-50 to-white font-['Fredoka'] overflow-hidden">

  <div class="bg-white/80 backdrop-blur-md border-b border-blue-100 p-3 flex items-center justify-between shadow-sm z-30 shrink-0">
    <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
      <button
        on:click={() => viewState === 'CHAT' ? viewState = 'TOPICS' : (sessionId ? exitSession() : goto(`/dashboard/student/${studentId}/class`))}
        class="p-2 rounded-full bg-white border-2 border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-all shadow-sm active:scale-95 shrink-0"
      >
        <ArrowLeft size={20} strokeWidth={3} />
      </button>
      <div class="flex items-center gap-2 md:gap-3 min-w-0">
        <div class="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-md border-2 border-white shrink-0">
          <Brain size={18} />
        </div>
        <div class="min-w-0">
          <h2 class="font-bold text-slate-700 leading-tight text-sm md:text-base truncate">KMind</h2>
          <p class="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider truncate">
            {viewState === 'CHAT' ? sessionContext.topic : 'Menu Principal'}
          </p>
        </div>
      </div>
    </div>
    {#if viewState !== 'GAMEOVER'}
      <div class="shrink-0 ml-2">
        <!-- FIX 1: paused=true enquanto não está no CHAT, timerKey única por sessão -->
        <SessionTimer
          timerKey={currentTimerKey}
          paused={timerPaused}
          on:timeup={handleTimeUp}
        />
      </div>
    {/if}
  </div>

  {#if viewState === 'GAMEOVER'}
    <div class="flex-1 flex flex-col items-center justify-center p-6 text-center animate-zoom-in bg-white/50 backdrop-blur-sm">
      <div class="mb-6 text-8xl animate-bounce">⏰</div>
      <h1 class="text-4xl md:text-5xl font-black text-slate-800 mb-4">Tempo Esgotado!</h1>
      <button on:click={() => exitSession()} class="px-10 py-5 bg-blue-500 text-white rounded-2xl font-bold text-xl shadow-lg border-b-4 border-blue-700">
        Terminar
      </button>
    </div>

  {:else if viewState === 'TOPICS'}
    <div class="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
      <div class="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in-up pb-10">
        <div class="text-center py-4 md:py-6">
          <h1 class="text-2xl md:text-4xl font-black text-slate-800 mb-2 drop-shadow-sm">O que vamos aprender? 🚀</h1>
        </div>
        {#if loadingTopics}
          <div class="flex justify-center"><div class="animate-spin w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>
        {:else}
          {#if availableTopics.matematica.length > 0}
            <section class="bg-white/60 p-4 md:p-6 rounded-3xl border border-blue-100 shadow-sm">
              <h3 class="text-lg md:text-2xl font-black text-slate-700 mb-4 flex items-center gap-3">
                <div class="p-2 bg-blue-100 rounded-xl text-blue-600"><Calculator size={24} /></div> Matemática
              </h3>
              <div class="grid grid-cols-1 gap-3">
                {#each availableTopics.matematica as topic}
                  <button on:click={() => startSession('Matemática', topic.nome)} class="p-4 bg-white rounded-2xl border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 text-left font-bold text-slate-700 shadow-sm">
                    {topic.nome}
                  </button>
                {/each}
              </div>
            </section>
          {/if}
          {#if availableTopics.portugues.length > 0}
            <section class="bg-white/60 p-4 md:p-6 rounded-3xl border border-green-100 shadow-sm">
              <h3 class="text-lg md:text-2xl font-black text-slate-700 mb-4 flex items-center gap-3">
                <div class="p-2 bg-green-100 rounded-xl text-green-600"><BookOpen size={24} /></div> Português
              </h3>
              <div class="grid grid-cols-1 gap-3">
                {#each availableTopics.portugues as topic}
                  <button on:click={() => startSession('Português', topic.nome)} class="p-4 bg-white rounded-2xl border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 text-left font-bold text-slate-700 shadow-sm">
                    {topic.nome}
                  </button>
                {/each}
              </div>
            </section>
          {/if}
        {/if}
      </div>
    </div>

  {:else}
    <div
      class="flex-1 overflow-y-auto relative pb-40 md:pb-48 scroll-smooth"
      bind:this={chatContainer}
    >
      <div class="flex flex-col items-center justify-start pt-6 px-4 space-y-6 min-h-[50vh]">

        <div class="w-full flex justify-center relative z-10 shrink-0">
          <div class={`
            w-32 h-32 md:w-48 md:h-48 rounded-full shadow-xl flex items-center justify-center
            border-4 border-white transition-all duration-700
            ${mascotState.color} ${mascotState.animation}
          `}>
            <svelte:component this={mascotState.icon} size={64} class="text-white drop-shadow-md" strokeWidth={2.5} />
          </div>
        </div>

        <div class="w-full max-w-2xl flex flex-col items-center space-y-4 pb-4">
          {#if visibleBubbles.length > 0}
            {#each visibleBubbles as bubble, i}
              <div class="animate-pop-in relative px-6 py-4 md:px-8 md:py-6 shadow-sm border-b-4
                bg-white border-slate-200 text-slate-700
                text-center text-lg md:text-2xl font-medium leading-relaxed rounded-3xl
                w-auto max-w-full md:max-w-[85%]"
                style="animation-delay: {i * 100}ms;">
                {@html bubble}
              </div>
            {/each}

            {#if visibleBubbles.length === currentAiMessage.messages.length && !isRevealing}
              <button
                on:click={() => speakText()}
                class="mt-2 p-3 rounded-full bg-slate-100 text-slate-400 hover:text-blue-500 transition-all animate-fade-in"
              >
                <Volume2 size={24} />
              </button>
            {/if}
          {:else if isPreparingAudio}
            <div class="flex items-center justify-center gap-2 mt-4 animate-pulse text-blue-500 font-bold text-sm">
              <Volume2 size={16} class="animate-bounce" />
              <span>A preparar a voz...</span>
            </div>
          {:else if !isTyping}
            <div class="text-center opacity-50 text-sm font-bold animate-pulse text-slate-400 mt-4">
              À espera do K...
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- ZONA DE INPUT FIXA ──────────────────────────────────────────────── -->
    <div class="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-100 z-40">
      <div class="max-w-3xl mx-auto flex flex-col justify-center p-3 pb-safe">

        {#if inputMode === 'none'}
          <div class="flex justify-center items-center gap-2 py-4 h-[60px]">
            <div class="h-3 w-3 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div class="h-3 w-3 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div class="h-3 w-3 bg-blue-400 rounded-full animate-bounce"></div>
          </div>

        {:else if inputMode === 'confirmation'}
          <div class="flex flex-col gap-2 w-full animate-slide-up pb-1">
            <div class="flex gap-3 w-full">
              {#each (currentAiMessage.data.options || []) as option}
                <button
                  class="flex-1 px-4 py-4 rounded-2xl border-b-4 font-black text-base transition-all
                    active:translate-y-1 active:border-b-0
                    {option.toLowerCase().includes('não') || option.toLowerCase().includes('duvida') || option.toLowerCase().includes('dúvida')
                      ? 'bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-400'
                      : 'bg-green-50 text-green-700 border-green-200 hover:border-green-400'}"
                  on:click={() => sendMessage(option)}
                >
                  {option}
                </button>
              {/each}
            </div>
            <!-- FIX 2: botão para escrever livremente mesmo com opções -->
            {#if !showFreeInput}
              <button
                on:click={() => showFreeInput = true}
                class="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 transition-colors mt-1"
              >
                <PenLine size={12} /> Escrever outra coisa
              </button>
            {:else}
              <div class="flex items-center gap-2 mt-1 animate-slide-up">
                <input
                  type="text"
                  class="flex-1 pl-4 pr-4 py-2.5 bg-slate-100 border-2 border-slate-200
                    focus:border-blue-400 focus:bg-white rounded-xl outline-none transition-all
                    text-slate-700 font-bold shadow-inner text-sm"
                  placeholder="Escreve aqui..."
                  bind:value={messageInput}
                  on:keydown={handleKeydown}
                  autofocus
                />
                <button
                  class="p-2.5 rounded-xl bg-blue-500 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 shadow-md disabled:opacity-50 shrink-0"
                  on:click={() => sendMessage()}
                  disabled={!messageInput.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            {/if}
          </div>

        {:else if inputMode === 'quiz'}
          {@const opts = currentAiMessage.data.options || []}
          <div class="animate-slide-up pb-1 w-full flex flex-col gap-2">
            <div
              class:grid={opts.length <= 4}
              class:grid-cols-2={opts.length === 4}
              class:grid-cols-1={opts.length !== 4}
              class:flex={opts.length > 4}
              class:flex-col={opts.length > 4}
              style="gap: 10px;"
            >
              {#each opts as option}
                <button
                  class="px-4 py-3 rounded-2xl border-b-4 border-slate-200 bg-white
                    text-slate-700 font-bold text-base shadow-sm
                    hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700
                    active:translate-y-1 active:border-b-0 transition-all
                    flex items-center justify-center text-center min-h-[52px]"
                  on:click={() => sendMessage(option)}
                >
                  <span class="leading-tight">{option}</span>
                </button>
              {/each}
            </div>
            <!-- FIX 2: input livre sempre acessível -->
            {#if !showFreeInput}
              <button
                on:click={() => showFreeInput = true}
                class="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 transition-colors mt-1"
              >
                <PenLine size={12} /> Tirar uma dúvida
              </button>
            {:else}
              <div class="flex items-center gap-2 mt-1 animate-slide-up">
                <input
                  type="text"
                  class="flex-1 pl-4 pr-4 py-2.5 bg-slate-100 border-2 border-slate-200
                    focus:border-blue-400 focus:bg-white rounded-xl outline-none transition-all
                    text-slate-700 font-bold shadow-inner text-sm"
                  placeholder="Escreve a tua pergunta..."
                  bind:value={messageInput}
                  on:keydown={handleKeydown}
                  autofocus
                />
                <button
                  class="p-2.5 rounded-xl bg-blue-500 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 shadow-md disabled:opacity-50 shrink-0"
                  on:click={() => sendMessage()}
                  disabled={!messageInput.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            {/if}
          </div>

        {:else if inputMode === 'chips'}
          <div class="flex flex-col gap-2 w-full animate-slide-up pb-1">
            <div class="flex flex-col gap-2 max-h-[35vh] overflow-y-auto custom-scrollbar px-1">
              {#each (currentAiMessage.data.options || []) as option}
                <button
                  class="w-full px-5 py-3 md:py-4 rounded-xl shadow-sm border-b-4
                    transition-all active:border-b-0 active:translate-y-1 active:bg-blue-50
                    bg-white text-blue-600 border-slate-200 hover:border-blue-400
                    flex items-center justify-center text-center font-bold"
                  class:text-lg={option.length < 20}
                  class:text-sm={option.length >= 20}
                  on:click={() => sendMessage(option)}
                >
                  {option}
                </button>
              {/each}
            </div>
            <!-- FIX 2 -->
            {#if !showFreeInput}
              <button
                on:click={() => showFreeInput = true}
                class="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 transition-colors mt-1"
              >
                <PenLine size={12} /> Tirar uma dúvida
              </button>
            {:else}
              <div class="flex items-center gap-2 mt-1 animate-slide-up">
                <input
                  type="text"
                  class="flex-1 pl-4 pr-4 py-2.5 bg-slate-100 border-2 border-slate-200
                    focus:border-blue-400 focus:bg-white rounded-xl outline-none transition-all
                    text-slate-700 font-bold shadow-inner text-sm"
                  placeholder="Escreve a tua pergunta..."
                  bind:value={messageInput}
                  on:keydown={handleKeydown}
                  autofocus
                />
                <button
                  class="p-2.5 rounded-xl bg-blue-500 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 shadow-md disabled:opacity-50 shrink-0"
                  on:click={() => sendMessage()}
                  disabled={!messageInput.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            {/if}
          </div>

        {:else if inputMode === 'drag_drop'}
          <div class="flex flex-col gap-3 w-full animate-slide-up pb-1">
            <div class="flex flex-wrap gap-2 justify-center min-h-[50px] p-3 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300">
               {#if selectedDragItems.length === 0}
                 <span class="text-slate-400 font-bold text-sm my-auto">Toca nas palavras abaixo para ordenar</span>
               {/if}
               {#each selectedDragItems as item}
                 <button on:click={() => {
                    selectedDragItems = selectedDragItems.filter(i => i !== item);
                    availableDragItems = [...availableDragItems, item];
                 }} class="px-3 py-1.5 bg-blue-500 text-white font-bold rounded-lg shadow-sm animate-pop-in">
                   {item}
                 </button>
               {/each}
            </div>
            <div class="flex flex-wrap gap-2 justify-center mt-2">
               {#each availableDragItems as item}
                 <button on:click={() => {
                    availableDragItems = availableDragItems.filter(i => i !== item);
                    selectedDragItems = [...selectedDragItems, item];
                 }} class="px-3 py-1.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:border-blue-400 transition-colors">
                   {item}
                 </button>
               {/each}
            </div>
            <button
              class="mt-2 py-3 rounded-xl bg-green-500 text-white font-black text-lg border-b-4 border-green-700 active:border-b-0 active:translate-y-1 shadow-md disabled:opacity-50 disabled:bg-slate-300 disabled:border-slate-400 transition-all"
              disabled={availableDragItems.length > 0}
              on:click={() => sendMessage(selectedDragItems.join(' '))}
            >
              Confirmar Ordem
            </button>
          </div>

        {:else}
          <!-- DIRECT_INPUT ou fallback — input de texto principal -->
          <div class="flex items-center gap-2 animate-slide-up pb-1">
            <input
              type="text"
              class="flex-1 pl-4 pr-4 py-3 bg-slate-100 border-2 border-slate-200
                focus:border-blue-400 focus:bg-white rounded-xl outline-none transition-all
                text-slate-700 font-bold shadow-inner"
              placeholder="Escreve aqui..."
              bind:value={messageInput}
              on:keydown={handleKeydown}
            />
            <button
              class="p-3 rounded-xl bg-blue-500 text-white border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 shadow-md disabled:opacity-50 shrink-0"
              on:click={() => sendMessage()}
              disabled={!messageInput.trim()}
            >
              <Send size={24} />
            </button>
          </div>
        {/if}

      </div>
      <div class="h-[env(safe-area-inset-bottom)]"></div>
    </div>
  {/if}
</div>

<style>
  .pb-safe { padding-bottom: env(safe-area-inset-bottom, 10px); }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-15px); }
  }
  .animate-float { animation: float 4s ease-in-out infinite; }

  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-10px); }
  }
  .animate-bounce-slow { animation: bounce-slow 2s infinite; }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25%       { transform: translateX(-5px); }
    75%       { transform: translateX(5px); }
  }
  .animate-shake { animation: shake 0.5s ease-in-out infinite; }

  @keyframes popIn {
    0%   { opacity: 0; transform: scale(0.8) translateY(20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }

  @keyframes zoomIn {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }
  .animate-zoom-in { animation: zoomIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
</style>