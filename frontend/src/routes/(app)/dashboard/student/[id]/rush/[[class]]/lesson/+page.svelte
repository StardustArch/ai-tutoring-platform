<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { apiFetch } from '$lib/utils/api';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import confetti from 'canvas-confetti';
	import { ArrowLeft, CheckCircle2, X, Star, BookOpen, PenLine } from 'lucide-svelte';

	// ─── Parâmetros da rota ───────────────────────────────────────────────────
	let studentId = $page.params.id || '';
	let turmaId = Number($page.params.class) || 0;
	let topicoId = Number($page.url.searchParams.get('topicoId'));
	let topicoNome = $page.url.searchParams.get('topico') || 'Lição';

	// ─── Estado da lição ──────────────────────────────────────────────────────
	type Fase = 'normal' | 'revisao';
	type Screen = 'loading' | 'question' | 'feedback' | 'revisao_intro' | 'done';
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
	let fase: Fase = 'normal';
	let questionType: QuestionType = 'multiple_choice';

	// feedback
	let selectedOption: string | null = null;
	let isCorrect: boolean | null = null;
	let revisaoCount = 0;

	// Direct Input
	let directInput = '';
	let inputEl: HTMLInputElement | null = null;
	let inputShake = false;

	// stats
	let xpGanho = 0;
	let acertos = 0;
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
			const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/lesson/start`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					alunoId: parseInt(studentId),
					topicoId,
					turmaId: turmaId || undefined
				})
			});
			if (!res.ok) throw new Error('Falha ao iniciar lição');
			loadQuestion(await res.json());
		} catch (e) {
			console.error(e);
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
		fase = data.fase;
		questionType = data.questionType ?? 'multiple_choice';
		selectedOption = null;
		isCorrect = null;
		directInput = '';
		inputShake = false;
		screen = 'question';

		if (questionType === 'direct_input') {
			tick().then(() => inputEl?.focus());
		}
	}

	// ─── Responder ────────────────────────────────────────────────────────────
	async function handleAnswer(option: string) {
		if (selectedOption) return;
		selectedOption = option;

		// Normalização: ignora espaços, pontos, vírgulas e maiúsculas
		const norm = (s: string) =>
			s
				.trim()
				.toLowerCase()
				.replace(/[\s.,]/g, '');
		isCorrect = norm(option) === norm(correctAnswer);

		respostas++;
		if (isCorrect) {
			acertos++;
			xpGanho += 15;
			confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
		} else if (questionType === 'direct_input') {
			inputShake = true;
			setTimeout(() => {
				inputShake = false;
			}, 500);
		}

		try {
			const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/lesson/answer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ progressoId, exercicioId, respostaAluno: option })
			});
			const data = await res.json();
			revisaoCount = data.revisaoCount;
			screen = 'feedback';
			if (data.done) {
				setTimeout(() => {
					confetti({ particleCount: 200, spread: 100 });
					screen = 'done';
				}, 1400);
			}
		} catch (e) {
			console.error(e);
		}
	}

	function submitDirectInput() {
		const val = directInput.trim();
		if (!val || selectedOption) return;
		handleAnswer(val);
	}

	function onDirectInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') submitDirectInput();
	}

	// ─── Continuar ────────────────────────────────────────────────────────────
	async function continuar() {
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
			if (!res.ok) throw new Error('Erro ao pedir próxima pergunta');
			loadQuestion(await res.json());
		} catch (e) {
			console.error(e);
		}
	}

	function sair() {
		goto(`/dashboard/foreman/student/${studentId}/class`);
	}

	// ─── Reactividade ─────────────────────────────────────────────────────────
	$: progressPercent = totalSlots > 0 ? Math.round(((slotIndex + 1) / totalSlots) * 100) : 0;
	$: clozeParts = question.split('___');
</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<title>Lição | KMind</title>
</svelte:head>

<div
	class="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-sky-100 via-blue-50 to-white font-['Fredoka']"
>
	<!-- HEADER ─────────────────────────────────────────────────────────────── -->
	<div
		class="z-10 flex shrink-0 items-center gap-3 border-b-4 border-sky-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm"
	>
		<button
			on:click={sair}
			class="shrink-0 rounded-xl border-2 border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition-all hover:border-sky-400 hover:text-sky-500 active:scale-95"
		>
			<ArrowLeft size={24} strokeWidth={3} />
		</button>

		<div class="flex flex-1 flex-col gap-1">
			<div class="flex items-center justify-between text-xs font-bold text-slate-500">
				<span class="flex items-center gap-1 text-sky-600"><BookOpen size={13} />{topicoNome}</span>
				{#if fase === 'revisao'}
					<span class="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">🔄 Revisão</span>
				{:else}
					<span>{slotIndex + 1}/{totalSlots}</span>
				{/if}
			</div>
			<div class="h-3 w-full overflow-hidden rounded-full bg-slate-100">
				<div
					class="h-full rounded-full transition-all duration-500 {fase === 'revisao'
						? 'bg-amber-400'
						: 'bg-sky-500'}"
					style="width:{progressPercent}%"
				></div>
			</div>
		</div>

		<div
			class="flex shrink-0 items-center gap-1 rounded-full border-2 border-amber-200 bg-amber-100 px-3 py-1 shadow-inner"
		>
			<Star class="h-4 w-4 fill-amber-500 text-amber-500" />
			<span class="text-base font-black text-amber-600">{xpGanho}</span>
		</div>
	</div>

	<!-- LOADING ───────────────────────────────────────────────────────────── -->
	{#if screen === 'loading'}
		<div class="flex flex-1 flex-col items-center justify-center">
			<div
				class="mb-4 h-16 w-16 animate-spin rounded-full border-8 border-sky-200 border-t-sky-500"
			></div>
			<p class="animate-pulse text-lg font-black tracking-wide text-sky-400">A PREPARAR...</p>
		</div>

		<!-- PERGUNTA + FEEDBACK ─────────────────────────────────────────────────── -->
	{:else if screen === 'question' || screen === 'feedback'}
		<div
			class="scrollbar-hide mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start overflow-y-auto p-4 pb-40 md:p-6"
		>
			<!-- badge de tipo -->
			{#if questionType === 'true_false'}
				<div class="mb-3 flex justify-center">
					<span
						class="rounded-full border-2 border-violet-200 bg-violet-100 px-3 py-1 text-xs font-black text-violet-700"
						>✅❌ Verdadeiro ou Falso</span
					>
				</div>
			{:else if questionType === 'direct_input'}
				<div class="mb-3 flex justify-center">
					<span
						class="flex items-center gap-1 rounded-full border-2 border-sky-200 bg-sky-100 px-3 py-1 text-xs font-black text-sky-700"
					>
						<PenLine size={12} /> Escreve a resposta
					</span>
				</div>
			{/if}

			<!-- card da pergunta ────────────────────────────────────────────────── -->
			<div
				class="relative mb-6 shrink-0 rounded-3xl border-b-8 border-slate-100 bg-white p-5 shadow-xl md:p-8"
			>
				<div
					class="absolute -top-3 -left-3 rotate-12 rounded-lg bg-sky-400 p-1.5 text-white shadow-lg"
				>
					<BookOpen size={20} fill="currentColor" />
				</div>

				{#if questionType === 'cloze'}
					<!-- Cloze: mostra ___ ou resposta colorida inline -->
					<h1 class="text-center text-xl leading-snug font-black text-slate-800 md:text-2xl">
						{#each clozeParts as part, i}
							{part}{#if i < clozeParts.length - 1}
								{#if selectedOption}
									<span
										class="mx-1 inline-block rounded-lg px-2 py-0.5 {isCorrect
											? 'bg-green-100 text-green-700'
											: 'bg-rose-100 text-rose-700'}">{selectedOption}</span
									>
								{:else}
									<span
										class="mx-1 inline-block min-w-[60px] border-b-4 border-teal-400 text-center text-teal-400"
										>___</span
									>
								{/if}
							{/if}
						{/each}
					</h1>
				{:else}
					<h1 class="text-center text-xl leading-snug font-black text-slate-800 md:text-2xl">
						{question}
					</h1>
				{/if}
			</div>

			<!-- ══ OPÇÕES ══════════════════════════════════════════════════════════ -->

			<!-- TRUE / FALSE -->
			{#if questionType === 'true_false'}
				<div class="grid grid-cols-2 gap-4">
					{#each ['Verdadeiro', 'Falso'] as opt}
						{@const sel = selectedOption === opt}
						{@const right = sel && !!isCorrect}
						{@const wrong = sel && !isCorrect}
						{@const show = !!selectedOption && opt === correctAnswer}
						<button
							on:click={() => handleAnswer(opt)}
							disabled={!!selectedOption}
							style={selectedOption && !sel && opt !== correctAnswer ? 'opacity:0.4' : ''}
							class="flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-3xl border-b-4 p-5 text-lg font-black transition-all
                {right || show
								? 'scale-[1.02] border-green-700 bg-green-500 text-white'
								: wrong
									? 'border-rose-700 bg-rose-500 text-white'
									: opt === 'Verdadeiro'
										? 'border-emerald-300 bg-emerald-50 text-emerald-700 active:translate-y-1 active:border-b-0'
										: 'border-rose-300 bg-rose-50 text-rose-700 active:translate-y-1 active:border-b-0'}"
						>
							<span class="text-3xl">{opt === 'Verdadeiro' ? '✅' : '❌'}</span>
							<span>{opt}</span>
						</button>
					{/each}
				</div>

				<!-- CLOZE -->
			{:else if questionType === 'cloze'}
				<div class="grid w-full grid-cols-2 gap-3">
					{#each options as opt}
						{@const sel = selectedOption === opt}
						{@const right = sel && !!isCorrect}
						{@const wrong = sel && !isCorrect}
						{@const show = !!selectedOption && opt === correctAnswer}
						<button
							on:click={() => handleAnswer(opt)}
							disabled={!!selectedOption}
							style={selectedOption && !sel && opt !== correctAnswer ? 'opacity:0.45' : ''}
							class="flex min-h-[60px] items-center justify-center rounded-2xl border-b-4 p-4 text-center font-bold transition-all
                {right || show
								? 'scale-[1.01] border-green-700 bg-green-500 text-white'
								: wrong
									? 'border-rose-700 bg-rose-500 text-white'
									: 'border-teal-200 bg-teal-50 text-teal-800 active:translate-y-1 active:border-b-0'}"
							class:text-base={opt.length > 15}
							class:text-lg={opt.length <= 15}>{opt}</button
						>
					{/each}
				</div>

				<!-- DIRECT INPUT -->
			{:else if questionType === 'direct_input'}
				<div class="flex flex-col items-center gap-4">
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
						class="w-full max-w-sm rounded-2xl border-b-4 bg-white p-4 text-center text-xl font-black text-slate-800 shadow-md transition-all outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-sky-200 disabled:opacity-70
              {inputShake ? 'animate-shake' : ''}
              {selectedOption && isCorrect ? 'border-green-500 bg-green-50 text-green-700' : ''}
              {selectedOption && !isCorrect ? 'border-rose-400 bg-rose-50 text-rose-700' : ''}
              {!selectedOption ? 'border-sky-300 focus:border-sky-500' : ''}"
					/>

					{#if !selectedOption}
						<button
							on:click={submitDirectInput}
							disabled={!directInput.trim()}
							class="w-full max-w-sm rounded-2xl border-b-4 border-sky-700 bg-sky-500 px-8 py-4 text-lg font-black text-white shadow-lg transition-all active:translate-y-1 active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40"
							>CONFIRMAR ✓</button
						>
					{:else if !isCorrect}
						<div
							class="w-full max-w-sm rounded-2xl border-2 border-green-200 bg-green-50 p-3 text-center"
						>
							<p class="mb-1 text-xs font-bold text-green-600 uppercase">Resposta correta</p>
							<p class="text-xl font-black text-green-700">{correctAnswer}</p>
						</div>
					{/if}
				</div>

				<!-- MULTIPLE CHOICE (original) -->
			{:else}
				<div class="grid w-full grid-cols-1 gap-3">
					{#each options as opt}
						<button
							on:click={() => handleAnswer(opt)}
							disabled={!!selectedOption}
							style={selectedOption && opt !== selectedOption && opt !== correctAnswer
								? 'opacity:0.5'
								: ''}
							class="group relative flex min-h-[60px] items-center justify-between rounded-2xl border-b-4 p-4 text-left font-bold transition-all
                {selectedOption === opt && isCorrect
								? 'scale-[1.01] border-green-700 bg-green-500 text-white'
								: selectedOption === opt && !isCorrect
									? 'border-rose-700 bg-rose-500 text-white'
									: selectedOption && opt === correctAnswer
										? 'border-green-700 bg-green-500 text-white'
										: 'border-slate-200 bg-white text-slate-600 active:translate-y-1 active:border-b-0'}"
							class:text-base={opt.length > 25}
							class:text-lg={opt.length <= 25}
						>
							<span class="pr-2 leading-tight">{opt}</span>
							{#if selectedOption === opt}
								{#if isCorrect}<CheckCircle2 size={24} class="shrink-0" />{:else}<X
										size={24}
										class="shrink-0"
									/>{/if}
							{/if}
						</button>
					{/each}
				</div>
			{/if}
			<!-- ══ FIM OPÇÕES ══════════════════════════════════════════════════════ -->
		</div>

		<!-- Painel de feedback ────────────────────────────────────────────────── -->
		{#if screen === 'feedback'}
			<div
				class="animate-slide-up fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-4 shadow-[0_-10px_50px_rgba(0,0,0,0.2)] md:p-6 {isCorrect
					? 'border-t-8 border-green-500 bg-green-100'
					: 'border-t-8 border-rose-500 bg-rose-100'}"
			>
				<div class="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row">
					<div class="w-full flex-1 text-center sm:text-left">
						{#if isCorrect}
							<div
								class="mb-2 flex items-center justify-center gap-2 text-xl font-black text-green-700 sm:justify-start"
							>
								<CheckCircle2 class="fill-current" size={24} /> ACERTASTE! +15 XP
							</div>
							<p class="text-sm leading-relaxed font-medium text-green-800">{explanation}</p>
						{:else}
							<div
								class="mb-2 flex items-center justify-center gap-2 text-xl font-black text-rose-600 sm:justify-start"
							>
								<X class="fill-current" size={24} /> ERRADO
							</div>
							{#if questionType !== 'direct_input'}
								<div class="text-sm font-medium text-rose-800">
									Resposta certa: <strong
										class="rounded border border-rose-200 bg-white px-2 py-0.5"
										>{correctAnswer}</strong
									>
								</div>
							{/if}
							<p class="mt-1 text-xs text-rose-700">{explanation}</p>
						{/if}
					</div>
					<button
						on:click={continuar}
						class="w-full shrink-0 rounded-2xl border-b-4 px-8 py-4 text-lg font-black text-white shadow-xl active:translate-y-1 active:border-b-0 sm:w-auto {isCorrect
							? 'border-green-700 bg-green-500'
							: 'border-rose-700 bg-rose-500'}">CONTINUAR</button
					>
				</div>
				<div class="h-[env(safe-area-inset-bottom)]"></div>
			</div>
		{/if}

		<!-- INTRO REVISÃO ──────────────────────────────────────────────────────── -->
	{:else if screen === 'revisao_intro'}
		<div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
			<div class="mb-6 text-7xl">🔄</div>
			<h2 class="mb-3 text-3xl font-black text-slate-800">Quase lá!</h2>
			<p class="mx-auto mb-2 max-w-xs text-base text-slate-600">
				Erraste <strong class="text-amber-600">{revisaoCount}</strong>
				{revisaoCount === 1 ? 'pergunta' : 'perguntas'}.
			</p>
			<p class="mx-auto mb-8 max-w-xs text-sm text-slate-500">
				Vamos repeti-las agora para completares a lição.
			</p>
			<button
				on:click={pedirProxima}
				class="w-full max-w-xs rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-8 py-4 text-lg font-black text-white shadow-lg active:translate-y-1 active:border-b-0"
				>VAMOS LÁ! 💪</button
			>
		</div>

		<!-- CONCLUÍDA ──────────────────────────────────────────────────────────── -->
	{:else if screen === 'done'}
		<div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
			<div class="mb-2 animate-bounce text-7xl">🏆</div>
			<h1 class="mb-2 text-3xl font-black text-slate-800">Lição Concluída!</h1>
			<p class="mb-8 text-base text-slate-500">Excelente trabalho, continua assim!</p>
			<div
				class="mb-8 w-full max-w-sm rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-lg"
			>
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
				>Voltar ao Menu</button
			>
		</div>
	{/if}
</div>

<style>
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
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	.animate-zoom-in {
		animation: zoomIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-8px);
		}
		40% {
			transform: translateX(8px);
		}
		60% {
			transform: translateX(-5px);
		}
		80% {
			transform: translateX(5px);
		}
	}
	.animate-shake {
		animation: shake 0.45s ease-in-out;
	}

	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
