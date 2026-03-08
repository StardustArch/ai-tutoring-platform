<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import confetti from 'canvas-confetti';
  import {
    ArrowLeft, CheckCircle2, X, Star, BookOpen, RotateCcw, Trophy
  } from 'lucide-svelte';
  import '../../../../../../../../app.css'

  // ─── Parâmetros da rota ───────────────────────────────────────────────────
  let studentId  = $page.params.id || '';
  let turmaId    = Number($page.params.class) || 0;
  let topicoId   = Number($page.url.searchParams.get('topicoId'));
  let topicoNome = $page.url.searchParams.get('topico') || 'Lição';

  // ─── Estado da lição ──────────────────────────────────────────────────────
  type Fase = 'normal' | 'revisao';
  type Screen = 'loading' | 'question' | 'feedback' | 'revisao_intro' | 'done';

  let screen: Screen = 'loading';

  // dados da pergunta actual
  let progressoId   = 0;
  let sessaoId      = 0;
  let exercicioId   = 0;
  let question      = '';
  let options: string[] = [];
  let correctAnswer = '';
  let explanation   = '';
  let slotIndex     = 0;
  let totalSlots    = 0;
  let fase: Fase    = 'normal';

  // feedback
  let selectedOption: string | null = null;
  let isCorrect: boolean | null = null;
  let revisaoCount  = 0;

  // stats
  let xpGanho   = 0;
  let acertos   = 0;
  let respostas = 0;

  // ─── Iniciar lição ────────────────────────────────────────────────────────
  onMount(async () => {
    if (!topicoId) {
      goto(`/dashboard/foreman/student/${studentId}/class`);
      return;
    }
    await startLesson();
  });

  async function startLesson() {
    screen = 'loading';
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/licao/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alunoId: parseInt(studentId),
          topicoId,
          turmaId: turmaId || undefined,
        })
      });
      if (!res.ok) throw new Error('Falha ao iniciar lição');
      const data = await res.json();
      loadQuestion(data);
    } catch (e) {
      console.error(e);
      goto(`/dashboard/foreman/student/${studentId}/class`);
    }
  }

  function loadQuestion(data: any) {
    progressoId   = data.progressoId;
    sessaoId      = data.sessaoId;
    exercicioId   = data.exercicioId;
    question      = data.question;
    options       = data.options;
    correctAnswer = data.correct_answer;
    explanation   = data.explanation;
    slotIndex     = data.slotIndex;
    totalSlots    = data.totalSlots;
    fase          = data.fase;
    selectedOption = null;
    isCorrect = null;
    screen = 'question';
  }

  // ─── Responder ────────────────────────────────────────────────────────────
  async function handleAnswer(option: string) {
    if (selectedOption) return;
    selectedOption = option;
    isCorrect = option === correctAnswer;
    respostas++;
    if (isCorrect) {
      acertos++;
      xpGanho += 15;
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    }

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/licao/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressoId, exercicioId, respostaAluno: option })
      });
      const data = await res.json();
      revisaoCount = data.revisaoCount;

      screen = 'feedback';

      if (data.done) {
        // pequena pausa antes de mostrar ecrã de conclusão
        setTimeout(() => {
          confetti({ particleCount: 200, spread: 100 });
          screen = 'done';
        }, 1400);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // ─── Continuar após feedback ──────────────────────────────────────────────
  async function continuar() {
    // Se havia errados e acabou a fase normal, mostra intro de revisão
    if (revisaoCount > 0 && fase === 'normal') {
      screen = 'revisao_intro';
      return;
    }
    await pedirProxima();
  }

  async function pedirProxima() {
    screen = 'loading';
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/licao/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressoId })
      });
      if (!res.ok) throw new Error('Erro ao pedir próxima pergunta');
      const data = await res.json();
      loadQuestion(data);
    } catch (e) {
      console.error(e);
    }
  }

  function sair() {
    goto(`/dashboard/foreman/student/${studentId}/class`);
  }

  // ─── Barra de progresso ───────────────────────────────────────────────────
  $: progressPercent = totalSlots > 0
    ? Math.round(((slotIndex) / totalSlots) * 100)
    : 0;
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <title>Lição | KMind</title>
</svelte:head>

<div class="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-sky-100 via-blue-50 to-white font-['Fredoka']">

  <!-- HEADER -->
  <div class="z-10 flex shrink-0 items-center gap-3 border-b-4 border-sky-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
    <button
      on:click={sair}
      class="shrink-0 rounded-xl border-2 border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition-all hover:border-sky-400 hover:text-sky-500 active:scale-95"
    >
      <ArrowLeft size={24} strokeWidth={3} />
    </button>

    <!-- barra de progresso -->
    <div class="flex flex-1 flex-col gap-1">
      <div class="flex items-center justify-between text-xs font-bold text-slate-500">
        <span class="flex items-center gap-1 text-sky-600">
          <BookOpen size={13} />
          {topicoNome}
        </span>
        {#if fase === 'revisao'}
          <span class="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">🔄 Revisão</span>
        {:else}
          <span>{slotIndex}/{totalSlots}</span>
        {/if}
      </div>
      <div class="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full transition-all duration-500 {fase === 'revisao' ? 'bg-amber-400' : 'bg-sky-500'}"
          style="width: {progressPercent}%"
        ></div>
      </div>
    </div>

    <!-- XP -->
    <div class="flex shrink-0 items-center gap-1 rounded-full border-2 border-amber-200 bg-amber-100 px-3 py-1 shadow-inner">
      <Star class="h-4 w-4 fill-amber-500 text-amber-500" />
      <span class="text-base font-black text-amber-600">{xpGanho}</span>
    </div>
  </div>

  <!-- ── LOADING ─────────────────────────────────────────────────────────── -->
  {#if screen === 'loading'}
    <div class="flex flex-1 flex-col items-center justify-center">
      <div class="mb-4 h-16 w-16 animate-spin rounded-full border-8 border-sky-200 border-t-sky-500"></div>
      <p class="animate-pulse text-lg font-black tracking-wide text-sky-400">A PREPARAR...</p>
    </div>

  <!-- ── PERGUNTA ────────────────────────────────────────────────────────── -->
  {:else if screen === 'question' || screen === 'feedback'}
    <div class="scrollbar-hide mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start overflow-y-auto p-4 pb-40 md:p-6">

      <!-- card da pergunta -->
      <div class="relative mb-6 shrink-0 rounded-3xl border-b-8 border-slate-100 bg-white p-5 shadow-xl md:p-8">
        <div class="absolute -top-3 -left-3 rotate-12 rounded-lg bg-sky-400 p-1.5 text-white shadow-lg">
          <BookOpen size={20} fill="currentColor" />
        </div>
        <h1 class="text-center text-xl leading-snug font-black text-slate-800 md:text-2xl">
          {question}
        </h1>
      </div>

      <!-- opções -->
      <div class="grid w-full grid-cols-1 gap-3">
        {#each options as option}
          <button
            class="group relative flex min-h-[60px] items-center justify-between rounded-2xl border-b-4 p-4 text-left font-bold transition-all
              {selectedOption === option && isCorrect
                ? 'scale-[1.01] border-green-700 bg-green-500 text-white'
                : selectedOption === option && !isCorrect
                  ? 'border-rose-700 bg-rose-500 text-white'
                  : selectedOption && option === correctAnswer
                    ? 'border-green-700 bg-green-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 active:translate-y-1 active:border-b-0'}"
            class:text-base={option.length > 25}
            class:text-lg={option.length <= 25}
            on:click={() => handleAnswer(option)}
            disabled={!!selectedOption}
            style={selectedOption && option !== selectedOption && option !== correctAnswer ? 'opacity:0.45' : ''}
          >
            <span class="pr-2 leading-tight">{option}</span>
            {#if selectedOption === option}
              {#if isCorrect}<CheckCircle2 size={24} class="shrink-0" />{:else}<X size={24} class="shrink-0" />{/if}
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- painel de feedback (desliza de baixo) -->
    {#if screen === 'feedback'}
      <div
        class="animate-slide-up fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-4 shadow-[0_-10px_50px_rgba(0,0,0,0.2)] md:p-6
          {isCorrect ? 'border-t-8 border-green-500 bg-green-100' : 'border-t-8 border-rose-500 bg-rose-100'}"
      >
        <div class="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div class="w-full flex-1 text-center sm:text-left">
            {#if isCorrect}
              <div class="mb-2 flex items-center justify-center gap-2 text-xl font-black text-green-700 sm:justify-start">
                <CheckCircle2 class="fill-current" size={24} /> ACERTASTE! +15 XP
              </div>
              <p class="text-sm leading-relaxed font-medium text-green-800">{explanation}</p>
            {:else}
              <div class="mb-2 flex items-center justify-center gap-2 text-xl font-black text-rose-600 sm:justify-start">
                <X class="fill-current" size={24} /> ERRADO
              </div>
              <div class="text-sm font-medium text-rose-800">
                Resposta certa: <strong class="rounded border border-rose-200 bg-white px-2 py-0.5">{correctAnswer}</strong>
              </div>
              <p class="mt-1 text-xs text-rose-700">{explanation}</p>
            {/if}
          </div>

          <button
            on:click={continuar}
            class="w-full shrink-0 rounded-2xl border-b-4 px-8 py-4 text-lg font-black text-white shadow-xl active:translate-y-1 active:border-b-0 sm:w-auto
              {isCorrect ? 'border-green-700 bg-green-500' : 'border-rose-700 bg-rose-500'}"
          >
            CONTINUAR
          </button>
        </div>
        <div class="h-[env(safe-area-inset-bottom)]"></div>
      </div>
    {/if}

  <!-- ── INTRO REVISÃO ───────────────────────────────────────────────────── -->
  {:else if screen === 'revisao_intro'}
    <div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div class="mb-6 text-7xl">🔄</div>
      <h2 class="mb-3 text-3xl font-black text-slate-800">Quase lá!</h2>
      <p class="mx-auto mb-2 max-w-xs text-base text-slate-600">
        Erraste <strong class="text-amber-600">{revisaoCount}</strong> {revisaoCount === 1 ? 'pergunta' : 'perguntas'}.
      </p>
      <p class="mx-auto mb-8 max-w-xs text-sm text-slate-500">
        Vamos repeti-las agora para completares a lição.
      </p>
      <button
        on:click={pedirProxima}
        class="w-full max-w-xs rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-8 py-4 text-lg font-black text-white shadow-lg active:translate-y-1 active:border-b-0"
      >
        VAMOS LÁ! 💪
      </button>
    </div>

  <!-- ── CONCLUÍDA ───────────────────────────────────────────────────────── -->
  {:else if screen === 'done'}
    <div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div class="mb-2 animate-bounce text-7xl">🏆</div>
      <h1 class="mb-2 text-3xl font-black text-slate-800">Lição Concluída!</h1>
      <p class="mb-8 text-base text-slate-500">Excelente trabalho, continua assim!</p>

      <div class="mb-8 w-full max-w-sm rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-lg">
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-3xl font-black text-amber-500">{xpGanho}</p>
            <p class="text-xs font-bold text-slate-400 uppercase">XP</p>
          </div>
          <div>
            <p class="text-3xl font-black text-green-500">{acertos}</p>
            <p class="text-xs font-bold text-slate-400 uppercase">Certas</p>
          </div>
          <div>
            <p class="text-3xl font-black text-slate-600">{respostas}</p>
            <p class="text-xs font-bold text-slate-400 uppercase">Total</p>
          </div>
        </div>
      </div>

      <button
        on:click={sair}
        class="w-full max-w-xs rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-8 py-4 text-lg font-bold text-white shadow-lg active:translate-y-1 active:border-b-0"
      >
        Voltar ao Menu
      </button>
    </div>
  {/if}
</div>

<style>
  @keyframes slide-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0);    }
  }
  .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

  @keyframes zoomIn {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1);   }
  }
  .animate-zoom-in { animation: zoomIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>