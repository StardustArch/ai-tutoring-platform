<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiFetch } from '$lib/utils/api';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import {
		ArrowLeft,
		CheckCircle2,
		X,
		Star,
		BookOpen,
		PenLine,
		Image as ImageIcon,
		FileText
	} from 'lucide-svelte';

	let studentId = $page.params.id || '';
	let turmaId = Number($page.params.class) || 0;
	let topicoId = Number($page.url.searchParams.get('topicoId'));
	let topicoNome = $page.url.searchParams.get('topico') || 'Lição';

	type Fase = 'normal' | 'revisao';
	type Screen = 'loading' | 'question' | 'feedback' | 'revisao_intro' | 'celebrating' | 'done';
	type QuestionType = 'multiple_choice' | 'true_false' | 'cloze' | 'direct_input';

	let screen: Screen = 'loading';
	let progressoId = 0;
	let sessaoId = 0;
	let exercicioId = 0;
	let question = '';
	let options: string[] = [];
	let correctAnswer = '';
	let explanation = '';
	let slotIndex = 0;
	let totalSlots = 0;
	let totalSlotsPlan = 0;
	let fase: Fase = 'normal';
	let questionType: QuestionType = 'multiple_choice';

	let showAncoraModal = false;
	let ancoraKey: string | null = null;
	let ancoraConteudo: string | null = null;
	let ancoraTipo: string | null = null;

	let selectedOption: string | null = null;
	let isCorrect: boolean | null = null;
	let revisaoCount = 0;
	let showFeedback = false;

	let directInput = '';
	let inputEl: HTMLInputElement | null = null;
	let inputShake = false;

	let xpGanho = 0;
	let xpDisplay = 0;
	let acertos = 0;
	let respostas = 0;

	let xpFloats: { id: number; amount: number }[] = [];
	let xpFloatCounter = 0;
	let shakeOption: string | null = null;
	let celebrationStep = 0;
	let celebrationTimer: ReturnType<typeof setTimeout> | null = null;

	$: segments = Array.from({ length: totalSlotsPlan || totalSlots }, (_, i) => i);
	$: clozeParts = question.split('___');
	$: isVisualAnchor = ancoraTipo === 'visual';

	const OPTION_COLORS = [
		{
			bg: 'bg-violet-500',
			text: 'text-white',
			border: 'border-violet-200',
			optBg: 'bg-violet-50',
			optText: 'text-violet-800'
		},
		{
			bg: 'bg-sky-500',
			text: 'text-white',
			border: 'border-sky-200',
			optBg: 'bg-sky-50',
			optText: 'text-sky-800'
		},
		{
			bg: 'bg-amber-500',
			text: 'text-white',
			border: 'border-amber-200',
			optBg: 'bg-amber-50',
			optText: 'text-amber-800'
		},
		{
			bg: 'bg-rose-500',
			text: 'text-white',
			border: 'border-rose-200',
			optBg: 'bg-rose-50',
			optText: 'text-rose-800'
		}
	];
	const OPTION_LABELS = ['A', 'B', 'C', 'D'];

	// ── Web Audio ─────────────────────────────────────────────────────────────
	let audioCtx: AudioContext | null = null;
	function getCtx(): AudioContext {
		if (!audioCtx) audioCtx = new AudioContext();
		return audioCtx;
	}
	function playPop() {
		try {
			const c = getCtx(),
				o = c.createOscillator(),
				g = c.createGain();
			o.connect(g);
			g.connect(c.destination);
			o.frequency.setValueAtTime(700, c.currentTime);
			o.frequency.exponentialRampToValueAtTime(350, c.currentTime + 0.08);
			g.gain.setValueAtTime(0.25, c.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
			o.start();
			o.stop(c.currentTime + 0.08);
		} catch {}
	}
	function playCorrect() {
		try {
			const c = getCtx();
			[523, 659, 784].forEach((f, i) => {
				const o = c.createOscillator(),
					g = c.createGain();
				o.connect(g);
				g.connect(c.destination);
				o.type = 'sine';
				o.frequency.setValueAtTime(f, c.currentTime + i * 0.1);
				g.gain.setValueAtTime(0.2, c.currentTime + i * 0.1);
				g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.1 + 0.15);
				o.start(c.currentTime + i * 0.1);
				o.stop(c.currentTime + i * 0.1 + 0.15);
			});
		} catch {}
	}
	function playError() {
		try {
			const c = getCtx(),
				o = c.createOscillator(),
				g = c.createGain();
			o.connect(g);
			g.connect(c.destination);
			o.type = 'sawtooth';
			o.frequency.setValueAtTime(280, c.currentTime);
			o.frequency.exponentialRampToValueAtTime(160, c.currentTime + 0.15);
			g.gain.setValueAtTime(0.18, c.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
			o.start();
			o.stop(c.currentTime + 0.15);
		} catch {}
	}
	function playCelebration() {
		try {
			const c = getCtx();
			[523, 659, 784, 1047].forEach((f, i) => {
				const o = c.createOscillator(),
					g = c.createGain();
				o.connect(g);
				g.connect(c.destination);
				o.type = 'sine';
				o.frequency.setValueAtTime(f, c.currentTime + i * 0.15);
				g.gain.setValueAtTime(0.2, c.currentTime + i * 0.15);
				g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.15 + 0.2);
				o.start(c.currentTime + i * 0.15);
				o.stop(c.currentTime + i * 0.15 + 0.2);
			});
		} catch {}
	}

	// ── XP ────────────────────────────────────────────────────────────────────
	function spawnXpFloat(amount: number) {
		const id = xpFloatCounter++;
		xpFloats = [...xpFloats, { id, amount }];
		setTimeout(() => {
			xpFloats = xpFloats.filter((f) => f.id !== id);
		}, 900);
	}
	function animateXp(target: number) {
		const start = xpDisplay,
			diff = target - start,
			dur = 600,
			ts = performance.now();
		function step(now: number) {
			const t = Math.min((now - ts) / dur, 1);
			xpDisplay = Math.round(start + diff * t);
			if (t < 1) requestAnimationFrame(step);
			else xpDisplay = target;
		}
		requestAnimationFrame(step);
	}

	function triggerShake(opt: string) {
		shakeOption = opt;
		setTimeout(() => {
			shakeOption = null;
		}, 520);
	}

	function optClass(opt: string, idx: number): string {
		const c = OPTION_COLORS[idx % 4];
		if (!selectedOption)
			return `${c.border} ${c.optBg} ${c.optText} active:scale-[0.96] active:border-b-0`;
		if (opt === correctAnswer) return 'border-green-600 bg-green-500 text-white scale-[1.01]';
		if (selectedOption === opt) return 'border-rose-600 bg-rose-400 text-white';
		return `${c.border} ${c.optBg} ${c.optText} opacity-40`;
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────────
	onMount(async () => {
		if (!topicoId) {
			goto(`/dashboard/foreman/student/${studentId}/class`);
			return;
		}
		await startLesson();
	});
	onDestroy(() => {
		if (audioCtx) audioCtx.close();
		if (celebrationTimer) clearTimeout(celebrationTimer);
	});

	async function startLesson() {
		screen = 'loading';
		try {
			const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/lesson/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					alunoId: parseInt(studentId),
					topicoId,
					turmaId: turmaId || undefined
				})
			});
			if (!res.ok) throw new Error();
			loadQuestion(await res.json());
		} catch {
			goto(`/dashboard/foreman/student/${studentId}/class`);
		}
	}

	function loadQuestion(data: any) {
		progressoId = data.progressoId;
		sessaoId = data.sessaoId;
		exercicioId = data.exercicioId;
		question = data.question;
		options = data.options ?? [];
		correctAnswer = data.correct_answer;
		explanation = data.explanation;
		slotIndex = data.slotIndex;
		totalSlots = data.totalSlots;
		totalSlotsPlan = data.totalSlotsPlan || data.totalSlots;
		fase = data.fase;
		questionType = data.questionType ?? 'multiple_choice';
		showAncoraModal = false;
		ancoraKey = data.ancora?.chave || null;
		ancoraConteudo = data.ancora?.conteudo || null;
		ancoraTipo = data.ancora?.tipo || null;
		selectedOption = null;
		isCorrect = null;
		showFeedback = false;
		directInput = '';
		inputShake = false;
		screen = 'question';
		if (ancoraKey) {
			setTimeout(() => {
				showAncoraModal = true;
			}, 300);
		} else if (questionType === 'direct_input') {
			tick().then(() => inputEl?.focus());
		}
	}

	async function handleAnswer(option: string) {
		if (selectedOption) return;
		playPop();
		selectedOption = option;
		const norm = (s: string) =>
			s
				.trim()
				.toLowerCase()
				.replace(/[\s.,]/g, '');
		isCorrect = norm(option) === norm(correctAnswer);
		respostas++;
		setTimeout(() => {
			if (isCorrect) {
				playCorrect();
				xpGanho += 15;
				animateXp(xpGanho);
				spawnXpFloat(15);
			} else {
				playError();
				triggerShake(option);
			}
		}, 80);
		setTimeout(() => {
			showFeedback = true;
		}, 500);
		try {
			const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/lesson/answer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ progressoId, exercicioId, respostaAluno: option })
			});
			const data = await res.json();
			revisaoCount = data.revisaoCount ?? 0;
			if (isCorrect) acertos++;
			if (data.done) {
				setTimeout(() => {
					startCelebration();
				}, 1600);
			}
		} catch (e) {
			console.error(e);
		}
	}

	function startCelebration() {
		playCelebration();
		screen = 'celebrating';
		celebrationStep = 1;
		celebrationTimer = setTimeout(() => {
			celebrationStep = 2;
			celebrationTimer = setTimeout(() => {
				screen = 'done';
			}, 1500);
		}, 1200);
	}

	function submitDirectInput() {
		const val = directInput.trim();
		if (!val || selectedOption) return;
		handleAnswer(val);
	}
	function onDirectInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') submitDirectInput();
	}

	async function continuar() {
		showFeedback = false;
		if (revisaoCount > 0 && fase === 'normal') {
			screen = 'revisao_intro';
			return;
		}
		await pedirProxima();
	}
	async function pedirProxima() {
		screen = 'loading';
		try {
			const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/lesson/next`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ progressoId })
			});
			if (!res.ok) throw new Error();
			loadQuestion(await res.json());
		} catch (e) {
			console.error(e);
		}
	}
	function sair() {
		goto(`/dashboard/foreman/student/${studentId}/class`);
	}
</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<title>Lição | KMind</title>
</svelte:head>

{#each xpFloats as f (f.id)}
	<div class="xp-float">+{f.amount}</div>
{/each}

{#if showAncoraModal && ancoraKey}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
		on:click={() => {
			showAncoraModal = false;
			if (questionType === 'direct_input') inputEl?.focus();
		}}
	>
		<div
			class="animate-zoom-in relative max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
			on:click|stopPropagation
		>
			<div
				class="flex items-center justify-between border-b-4 border-slate-100 bg-slate-50 p-3 sm:p-4"
			>
				<h2 class="flex items-center gap-2 text-base font-black text-slate-700 sm:text-lg">
					{#if isVisualAnchor}<ImageIcon class="shrink-0 text-sky-500" size={20} /> Observa a Imagem
					{:else}<FileText class="shrink-0 text-amber-500" size={20} /> Lê o Texto{/if}
				</h2>
				<button
					on:click={() => {
						showAncoraModal = false;
					}}
					class="rounded-full bg-slate-200 p-1.5 text-slate-600 active:scale-95"
				>
					<X size={18} strokeWidth={3} />
				</button>
			</div>
			<div class="overflow-y-auto p-3 sm:p-5">
				{#if isVisualAnchor}
					<img
						src={`/ancoras/${ancoraKey}.svg`}
						alt="Contexto"
						class="w-full rounded-2xl object-contain"
						on:error={(e) => {
							const target = e.target as HTMLImageElement;

							if (target.src.endsWith('.svg')) {
								target.src = `/ancoras/${ancoraKey}.png`;
							} else if (target.src.endsWith('.png')) {
								target.src = `/ancoras/${ancoraKey}.jpg`;
							} else {
								target.onerror = null; // evita loop
							}
						}}
					/>
				{:else}
					<div
						class="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 text-sm leading-relaxed font-medium text-slate-800 sm:p-6 sm:text-base"
					>
						{ancoraConteudo}
					</div>
				{/if}
			</div>
			<div class="border-t-4 border-slate-100 p-3 sm:p-4">
				<button
					on:click={() => {
						showAncoraModal = false;
					}}
					class="w-full rounded-2xl border-b-4 border-sky-700 bg-sky-500 py-3 text-base font-black text-white shadow-md active:translate-y-1 active:border-b-0 sm:py-4 sm:text-lg"
				>
					JÁ VI, VAMOS À PERGUNTA!
				</button>
			</div>
		</div>
	</div>
{/if}

<div
	class="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-sky-100 via-blue-50 to-white font-['Fredoka']"
>
	<!-- HEADER -->
	<div
		class="z-10 flex shrink-0 items-center gap-2 border-b-4 border-sky-200 bg-white/90 px-2 py-2 shadow-sm backdrop-blur-sm sm:gap-3 sm:px-3 sm:py-3"
	>
		<button
			on:click={sair}
			class="shrink-0 rounded-xl border-2 border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm active:scale-95 sm:p-2"
		>
			<ArrowLeft size={20} strokeWidth={3} />
		</button>
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<div class="flex items-center justify-between">
				<span class="truncate text-[10px] font-bold text-sky-600 sm:text-xs">
					<BookOpen size={11} class="mr-0.5 inline" />{topicoNome}
				</span>
				{#if fase === 'revisao'}
					<span
						class="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700"
						>🔄 Revisão</span
					>
				{:else}
					<span class="shrink-0 text-[10px] font-bold text-slate-400"
						>{slotIndex + 1}/{totalSlotsPlan || totalSlots}</span
					>
				{/if}
			</div>
			<div class="flex h-2.5 gap-0.5">
				{#each segments as i}
					<div
						class="flex-1 rounded-full transition-all duration-500
                        {fase === 'revisao'
							? i <= slotIndex
								? 'bg-amber-400'
								: 'bg-slate-100'
							: i <= slotIndex
								? 'bg-sky-500'
								: 'bg-slate-100'}"
					></div>
				{/each}
			</div>
		</div>
		<div class="relative shrink-0">
			<div
				class="flex items-center gap-1 rounded-full border-2 border-amber-200 bg-amber-100 px-2 py-1 shadow-inner sm:px-3"
			>
				<Star class="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
				<span
					class="xp-counter min-w-[1.5rem] text-center text-sm font-black text-amber-600 sm:text-base"
					>{xpDisplay}</span
				>
			</div>
		</div>
	</div>

	{#if screen === 'loading'}
		<div class="flex flex-1 flex-col items-center justify-center">
			<div
				class="mb-3 h-12 w-12 animate-spin rounded-full border-8 border-sky-200 border-t-sky-500"
			></div>
			<p class="animate-pulse text-base font-black tracking-wide text-sky-400">A PREPARAR...</p>
		</div>
	{:else if screen === 'question' || screen === 'feedback'}
		<div
			class="scrollbar-hide mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start overflow-y-auto px-3 pt-3 pb-36 sm:px-4 sm:pt-4"
		>
			{#if ancoraKey}
				<div class="mb-3 flex justify-center">
					<button
						on:click={() => (showAncoraModal = true)}
						class="flex animate-pulse items-center gap-1.5 rounded-full border-b-4 border-amber-600 bg-amber-400 px-4 py-1.5 text-xs font-black text-white shadow-md active:translate-y-1 active:border-b-0 sm:px-5 sm:py-2 sm:text-sm"
					>
						{#if isVisualAnchor}<ImageIcon size={14} /> VER IMAGEM{:else}<FileText size={14} /> LER TEXTO{/if}
					</button>
				</div>
			{/if}

			{#if questionType === 'true_false'}
				<div class="mb-3 flex justify-center">
					<span
						class="rounded-full border-2 border-violet-200 bg-violet-100 px-3 py-0.5 text-xs font-black text-violet-700"
						>✅❌ Verdadeiro ou Falso</span
					>
				</div>
			{:else if questionType === 'direct_input'}
				<div class="mb-3 flex justify-center">
					<span
						class="flex items-center gap-1 rounded-full border-2 border-sky-200 bg-sky-100 px-3 py-0.5 text-xs font-black text-sky-700"
					>
						<PenLine size={11} /> Escreve a resposta
					</span>
				</div>
			{/if}

			<!-- card pergunta -->
			<div
				class="relative mb-4 shrink-0 rounded-3xl border-b-[6px] border-slate-100 bg-white px-4 py-4 shadow-lg sm:mb-5 sm:px-6 sm:py-6"
			>
				<div
					class="absolute -top-2.5 -left-2.5 rotate-12 rounded-lg bg-sky-400 p-1 text-white shadow-md sm:p-1.5"
				>
					<BookOpen size={15} fill="currentColor" />
				</div>
				{#if questionType === 'cloze'}
					<h1 class="text-center text-base leading-snug font-black text-slate-800 sm:text-xl">
						{#each clozeParts as part, i}
							{part}{#if i < clozeParts.length - 1}
								{#if selectedOption}
									<span
										class="mx-1 inline-block rounded-lg px-1.5 py-0.5 text-sm {isCorrect
											? 'bg-green-100 text-green-700'
											: 'bg-rose-100 text-rose-700'}">{selectedOption}</span
									>
								{:else}
									<span
										class="mx-1 inline-block min-w-[48px] border-b-4 border-teal-400 text-center text-sm text-teal-400"
										>___</span
									>
								{/if}
							{/if}
						{/each}
					</h1>
				{:else}
					<h1 class="text-center text-base leading-snug font-black text-slate-800 sm:text-xl">
						{question}
					</h1>
				{/if}
			</div>

			<!-- TRUE/FALSE -->
			{#if questionType === 'true_false'}
				<div class="grid grid-cols-2 gap-2 sm:gap-3">
					{#each ['Verdadeiro', 'Falso'] as opt}
						{@const sel = selectedOption === opt}
						{@const right = sel && !!isCorrect}
						{@const wrong = sel && !isCorrect}
						{@const show = !!selectedOption && opt === correctAnswer}
						<button
							on:click={() => handleAnswer(opt)}
							disabled={!!selectedOption}
							style={selectedOption && !sel && opt !== correctAnswer ? 'opacity:0.4' : ''}
							class="flex min-h-[70px] flex-col items-center justify-center gap-1.5 rounded-3xl border-b-4 p-3 text-sm font-black transition-all sm:min-h-[90px] sm:p-5 sm:text-lg
                                {right || show
								? 'scale-[1.02] border-green-700 bg-green-500 text-white'
								: wrong
									? 'border-rose-700 bg-rose-500 text-white'
									: opt === 'Verdadeiro'
										? 'border-emerald-300 bg-emerald-50 text-emerald-700 active:scale-[0.96] active:border-b-0'
										: 'border-rose-300 bg-rose-50 text-rose-700 active:scale-[0.96] active:border-b-0'}
                                {shakeOption === opt ? 'animate-shake' : ''}"
						>
							<span class="text-2xl sm:text-3xl">{opt === 'Verdadeiro' ? '✅' : '❌'}</span>
							<span>{opt}</span>
						</button>
					{/each}
				</div>

				<!-- CLOZE -->
			{:else if questionType === 'cloze'}
				<div class="grid w-full grid-cols-2 gap-2 sm:gap-3">
					{#each options as opt, idx}
						{@const sel = selectedOption === opt}
						{@const right = sel && !!isCorrect}
						{@const wrong = sel && !isCorrect}
						{@const show = !!selectedOption && opt === correctAnswer}
						{@const c = OPTION_COLORS[idx % 4]}
						<button
							on:click={() => handleAnswer(opt)}
							disabled={!!selectedOption}
							style={selectedOption && !sel && opt !== correctAnswer ? 'opacity:0.45' : ''}
							class="flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl border-b-4 px-2 py-2 text-center font-bold transition-all sm:min-h-[64px] sm:gap-2 sm:px-4 sm:py-3
                                {right || show
								? 'scale-[1.01] border-green-700 bg-green-500 text-white'
								: wrong
									? 'border-rose-700 bg-rose-500 text-white'
									: `${c.border} ${c.optBg} ${c.optText} active:scale-[0.96] active:border-b-0`}
                                {shakeOption === opt ? 'animate-shake' : ''}"
						>
							{#if !selectedOption}
								<span
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full {c.bg} {c.text} text-[10px] font-black sm:h-6 sm:w-6 sm:text-xs"
									>{OPTION_LABELS[idx]}</span
								>
							{/if}
							<span
								class="leading-tight {opt.length > 15
									? 'text-xs sm:text-sm'
									: 'text-sm sm:text-base'}">{opt}</span
							>
						</button>
					{/each}
				</div>

				<!-- DIRECT INPUT -->
			{:else if questionType === 'direct_input'}
				<div class="flex flex-col items-center gap-3">
					<input
						bind:this={inputEl}
						bind:value={directInput}
						on:keydown={onDirectInputKeydown}
						disabled={!!selectedOption}
						type="text"
						inputmode="text"
						autocomplete="off"
						autocorrect="off"
						spellcheck="false"
						placeholder="Escreve a tua resposta..."
						class="w-full max-w-sm rounded-2xl border-b-4 bg-white p-3 text-center text-base font-black text-slate-800 shadow-md outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-sky-200 disabled:opacity-70 sm:p-4 sm:text-xl
                            {inputShake ? 'animate-shake' : ''}
                            {selectedOption && isCorrect
							? 'border-green-500 bg-green-50 text-green-700'
							: ''}
                            {selectedOption && !isCorrect
							? 'border-rose-400 bg-rose-50 text-rose-700'
							: ''}
                            {!selectedOption ? 'border-sky-300 focus:border-sky-500' : ''}"
					/>
					{#if !selectedOption}
						<button
							on:click={submitDirectInput}
							disabled={!directInput.trim()}
							class="w-full max-w-sm rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-8 py-3 text-base font-black text-white shadow-lg active:translate-y-1 active:border-b-0 disabled:opacity-40 sm:py-4 sm:text-lg"
						>
							CONFIRMAR ✓
						</button>
					{:else if !isCorrect}
						<div
							class="w-full max-w-sm rounded-2xl border-2 border-green-200 bg-green-50 p-3 text-center"
						>
							<p class="mb-1 text-xs font-bold text-green-600 uppercase">Resposta correta</p>
							<p class="text-lg font-black text-green-700 sm:text-xl">{correctAnswer}</p>
						</div>
					{/if}
				</div>

				<!-- MÚLTIPLA ESCOLHA com A B C D -->
			{:else}
				<div class="grid w-full grid-cols-1 gap-2 sm:gap-3">
					{#each options as opt, idx}
						{@const c = OPTION_COLORS[idx % 4]}
						<button
							on:click={() => handleAnswer(opt)}
							disabled={!!selectedOption}
							style={selectedOption && opt !== selectedOption && opt !== correctAnswer
								? 'opacity:0.5'
								: ''}
							class="group relative flex min-h-[50px] items-center gap-2.5 rounded-2xl border-[1.5px] border-b-4 px-3 py-2.5 text-left font-bold transition-all sm:min-h-[58px] sm:gap-3 sm:px-4 sm:py-3
                                {optClass(opt, idx)}
                                {shakeOption === opt ? 'animate-shake' : ''}"
						>
							<span
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-transform sm:h-8 sm:w-8 sm:text-sm
                                {selectedOption
									? opt === correctAnswer
										? 'bg-green-700 text-white'
										: selectedOption === opt
											? 'bg-rose-700 text-white'
											: `${c.bg} text-white opacity-40`
									: `${c.bg} text-white group-active:scale-90`}"
							>
								{#if selectedOption && opt === correctAnswer}
									<CheckCircle2 size={14} class="checkmark-pop" />
								{:else if selectedOption === opt && !isCorrect}
									<X size={14} />
								{:else}
									{OPTION_LABELS[idx]}
								{/if}
							</span>
							<span
								class="flex-1 leading-tight {opt.length > 35
									? 'text-xs sm:text-sm'
									: opt.length > 20
										? 'text-sm sm:text-base'
										: 'text-sm sm:text-base'}">{opt}</span
							>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- FEEDBACK slide-up com delay 500ms -->
		{#if showFeedback}
			<div
				class="animate-slide-up fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:p-5
                {isCorrect
					? 'border-t-8 border-green-500 bg-green-100'
					: 'border-t-8 border-rose-500 bg-rose-100'}"
			>
				<div
					class="mx-auto flex max-w-2xl flex-col items-center justify-between gap-2 sm:flex-row sm:gap-4"
				>
					<div class="w-full flex-1 text-center sm:text-left">
						{#if isCorrect}
							<div
								class="mb-1 flex items-center justify-center gap-1.5 text-base font-black text-green-700 sm:justify-start sm:text-xl"
							>
								<CheckCircle2 class="shrink-0 fill-current" size={20} /> ACERTASTE! +15 XP
							</div>
							<p class="text-xs leading-relaxed font-medium text-green-800 sm:text-sm">
								{explanation}
							</p>
						{:else}
							<div
								class="mb-1 flex items-center justify-center gap-1.5 text-base font-black text-rose-600 sm:justify-start sm:text-xl"
							>
								<X class="shrink-0 fill-current" size={20} /> ERRADO
							</div>
							{#if questionType !== 'direct_input'}
								<p class="text-xs font-medium text-rose-800 sm:text-sm">
									Resposta certa: <strong
										class="rounded border border-rose-200 bg-white px-1.5 py-0.5"
										>{correctAnswer}</strong
									>
								</p>
							{/if}
							<p class="mt-0.5 text-xs text-rose-700">{explanation}</p>
						{/if}
					</div>
					<button
						on:click={continuar}
						class="w-full shrink-0 rounded-2xl border-b-4 px-6 py-3 text-sm font-black text-white shadow-xl active:translate-y-1 active:border-b-0 sm:w-auto sm:px-8 sm:py-4 sm:text-lg
                        {isCorrect
							? 'border-green-700 bg-green-500'
							: 'border-rose-700 bg-rose-500'}"
					>
						CONTINUAR
					</button>
				</div>
				<div class="h-[env(safe-area-inset-bottom)]"></div>
			</div>
		{/if}
	{:else if screen === 'revisao_intro'}
		<div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-5 text-center">
			<div class="mb-4 text-6xl">🔄</div>
			<h2 class="mb-2 text-2xl font-black text-slate-800 sm:text-3xl">Quase lá!</h2>
			<p class="mx-auto mb-1 max-w-xs text-sm text-slate-600 sm:text-base">
				Erraste <strong class="text-amber-600">{revisaoCount}</strong>
				{revisaoCount === 1 ? 'pergunta' : 'perguntas'}.
			</p>
			<p class="mx-auto mb-7 max-w-xs text-xs text-slate-500 sm:text-sm">
				Vamos repeti-las para completares a lição.
			</p>
			<button
				on:click={pedirProxima}
				class="w-full max-w-xs rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-8 py-3 text-base font-black text-white shadow-lg active:translate-y-1 active:border-b-0 sm:py-4 sm:text-lg"
			>
				VAMOS LÁ! 💪
			</button>
		</div>
	{:else if screen === 'celebrating'}
		<div class="flex flex-1 flex-col items-center justify-center p-5 text-center">
			{#if celebrationStep >= 1}
				<div class="celebration-trophy mb-3 text-7xl sm:text-8xl">🏆</div>
				<h1 class="celebration-title text-2xl font-black text-slate-800 sm:text-3xl">
					Lição Concluída!
				</h1>
				<p class="mt-1 text-sm text-slate-500">Excelente trabalho!</p>
			{/if}
			{#if celebrationStep >= 2}
				<div
					class="celebration-stats mt-5 w-full max-w-sm rounded-3xl border-2 border-slate-100 bg-white p-4 shadow-lg"
				>
					<div class="grid grid-cols-3 gap-3 text-center">
						<div>
							<p class="text-3xl font-black text-amber-500">{xpGanho}</p>
							<p class="text-[10px] font-bold text-slate-400 uppercase">XP</p>
						</div>
						<div>
							<p class="text-3xl font-black text-green-500">{acertos}</p>
							<p class="text-[10px] font-bold text-slate-400 uppercase">Certas</p>
						</div>
						<div>
							<p class="text-3xl font-black text-slate-600">{respostas}</p>
							<p class="text-[10px] font-bold text-slate-400 uppercase">Total</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else if screen === 'done'}
		<div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-5 text-center">
			<div class="mb-2 animate-bounce text-6xl sm:text-7xl">🏆</div>
			<h1 class="mb-2 text-2xl font-black text-slate-800 sm:text-3xl">Lição Concluída!</h1>
			<p class="mb-5 text-sm text-slate-500 sm:text-base">Excelente trabalho, continua assim!</p>
			<div
				class="mb-5 w-full max-w-sm rounded-3xl border-2 border-slate-100 bg-white p-4 shadow-lg sm:p-6"
			>
				<div class="grid grid-cols-3 gap-3 text-center">
					<div>
						<p class="text-3xl font-black text-amber-500 sm:text-4xl">{xpGanho}</p>
						<p class="text-[10px] font-bold text-slate-400 uppercase sm:text-xs">XP</p>
					</div>
					<div>
						<p class="text-3xl font-black text-green-500 sm:text-4xl">{acertos}</p>
						<p class="text-[10px] font-bold text-slate-400 uppercase sm:text-xs">Certas</p>
					</div>
					<div>
						<p class="text-3xl font-black text-slate-600 sm:text-4xl">{respostas}</p>
						<p class="text-[10px] font-bold text-slate-400 uppercase sm:text-xs">Total</p>
					</div>
				</div>
			</div>
			<button
				on:click={sair}
				class="w-full max-w-xs rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-8 py-3 text-base font-bold text-white shadow-lg active:translate-y-1 active:border-b-0 sm:py-4 sm:text-lg"
			>
				Voltar ao Menu
			</button>
		</div>
	{/if}
</div>

<style>
	.xp-float {
		position: fixed;
		top: 46px;
		right: 10px;
		font-family: 'Fredoka', sans-serif;
		font-size: 18px;
		font-weight: 700;
		color: #f59e0b;
		pointer-events: none;
		z-index: 9999;
		animation: xp-float-up 0.9s ease-out forwards;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
	}
	@keyframes xp-float-up {
		0% {
			transform: translateY(0) scale(0.8);
			opacity: 0;
		}
		20% {
			transform: translateY(-6px) scale(1.2);
			opacity: 1;
		}
		80% {
			transform: translateY(-34px) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(-48px) scale(0.8);
			opacity: 0;
		}
	}
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		15% {
			transform: translateX(-7px);
		}
		30% {
			transform: translateX(7px);
		}
		45% {
			transform: translateX(-5px);
		}
		60% {
			transform: translateX(5px);
		}
		75% {
			transform: translateX(-3px);
		}
		90% {
			transform: translateX(3px);
		}
	}
	.animate-shake {
		animation: shake 0.52s cubic-bezier(0.36, 0.07, 0.19, 0.97);
	}
	.checkmark-pop {
		animation: checkmark-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}
	@keyframes checkmark-pop {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
	.celebration-trophy {
		animation: trophy-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}
	@keyframes trophy-pop {
		0% {
			transform: scale(0) rotate(-20deg);
			opacity: 0;
		}
		70% {
			transform: scale(1.2) rotate(5deg);
			opacity: 1;
		}
		100% {
			transform: scale(1) rotate(0);
			opacity: 1;
		}
	}
	.celebration-title {
		animation: slide-fade-in 0.4s 0.2s ease-out both;
	}
	.celebration-stats {
		animation: slide-fade-in 0.5s ease-out both;
	}
	@keyframes slide-fade-in {
		from {
			transform: translateY(16px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.animate-fade-in {
		animation: fade-in 0.2s ease-out forwards;
	}
	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	.animate-slide-up {
		animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes zoomIn {
		from {
			opacity: 0;
			transform: scale(0.85);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	.animate-zoom-in {
		animation: zoomIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
