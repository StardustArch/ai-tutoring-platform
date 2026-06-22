<script lang="ts">
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { apiFetch } from '$lib/utils/api';
	import { PUBLIC_API_URL_HOST, PUBLIC_IA_HOST_API_URL } from '$env/static/public';
	import {
		Send,
		Bot,
		ArrowLeft,
		Sparkles,
		Brain,
		X,
		Smile,
		Frown,
		BookOpen,
		Calculator,
		Volume2,
		PenLine,
		Image as ImageIcon,
		FileText
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import SessionTimer from '$lib/components/SessionTimer.svelte';

	// ── Parâmetros ────────────────────────────────────────────────────────────
	let studentId = $page.params.id || '';
	let sessionId = $page.url.searchParams.get('sessionId')
		? parseInt($page.url.searchParams.get('sessionId')!)
		: null;
	$: turmaId = $page.params.class ? parseInt($page.params.class!) : null;

	let allowedTopicIds: number[] = [];
	let viewState: 'TOPICS' | 'CHAT' | 'GAMEOVER' = 'TOPICS';
	let sessionContext = { subject: '', topic: '' };
	let lastAudio: HTMLAudioElement | null = null;
	let availableTopics: { [key: string]: any[] } = { matematica: [], portugues: [] };
	let loadingTopics = true;
	let isTimeUp = false;
	let currentTimerKey = `kmind_timer_${studentId}_${sessionId || 'livre'}`;
	$: timerPaused = viewState !== 'CHAT';

	// ── Chat state (apenas UI — zero estado de sessão) ────────────────────────
	let messageInput = '';
	let isTyping = false;
	let isPreparingAudio = false;
	let chatContainer: HTMLElement;
	let isRevealing = false;
	let showFreeInput = false;
	let showAncoraModal = false;
	let buttonsHidden = false;

	// chatLog: histórico visível na tela (limpa por fase, não por mensagem)
	// revealingBubbles: resposta actual a ser revelada bolha a bolha
	let chatLog: { role: 'user' | 'ai'; text: string }[] = [];
	let revealingBubbles: string[] = [];

	// drag & drop
	let availableDragItems: string[] = [];
	let selectedDragItems: string[] = [];

	let currentAiMessage = {
		messages: [] as string[],
		emotion: 'NEUTRAL',
		type: 'FREE_TEXT',
		data: {} as any,
		ancora: null as any,
		phase: 'EXPLAIN' as string,
	};

	// show de espera
	const WAIT_PHRASES = [
		'A procurar nos livros...',
		'A contar pelos dedos...',
		'A afinar a voz...',
		'Quase lá...'
	];
	let waitPhraseText = '';
	let waitPhraseVisible = false;
	let waitInterval: ReturnType<typeof setInterval> | null = null;
	let waitPhraseIdx = 0;

	function startWaitShow() {
		waitPhraseIdx = 0;
		waitPhraseText = WAIT_PHRASES[0];
		waitPhraseVisible = true;
		waitInterval = setInterval(() => {
			waitPhraseVisible = false;
			setTimeout(() => {
				waitPhraseIdx = (waitPhraseIdx + 1) % WAIT_PHRASES.length;
				waitPhraseText = WAIT_PHRASES[waitPhraseIdx];
				waitPhraseVisible = true;
			}, 120);
		}, 1500);
	}
	function stopWaitShow() {
		if (waitInterval) {
			clearInterval(waitInterval);
			waitInterval = null;
		}
		waitPhraseVisible = false;
	}

	$: inputMode = resolveInputMode(
		currentAiMessage.type,
		currentAiMessage.data,
		isTyping,
		isPreparingAudio,
		isRevealing
	);
	$: if (inputMode !== 'none') showFreeInput = false;
	$: mascotEmotion = currentAiMessage.emotion;

	// ── Web Audio ─────────────────────────────────────────────────────────────
	let audioCtx: AudioContext | null = null;
	function getCtx() {
		if (!audioCtx) audioCtx = new AudioContext();
		return audioCtx;
	}
	function playPop() {
		try {
			const c = getCtx(), o = c.createOscillator(), g = c.createGain();
			o.connect(g); g.connect(c.destination);
			o.frequency.setValueAtTime(800, c.currentTime);
			o.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.08);
			g.gain.setValueAtTime(0.28, c.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
			o.start(); o.stop(c.currentTime + 0.08);
		} catch {}
	}
	function playDinDon() {
		try {
			const c = getCtx();
			[660, 880].forEach((f, i) => {
				const o = c.createOscillator(), g = c.createGain();
				o.connect(g); g.connect(c.destination);
				o.type = 'sine';
				o.frequency.setValueAtTime(f, c.currentTime + i * 0.18);
				g.gain.setValueAtTime(0.2, c.currentTime + i * 0.18);
				g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.18 + 0.25);
				o.start(c.currentTime + i * 0.18);
				o.stop(c.currentTime + i * 0.18 + 0.25);
			});
		} catch {}
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────────
	onMount(async () => { await loadStudentAndTopics(); });
	onDestroy(() => {
		if (lastAudio) lastAudio.pause();
		if (audioCtx) audioCtx.close();
		stopWaitShow();
	});
	afterUpdate(() => {
		if (viewState === 'CHAT' && chatContainer)
			chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
	});

	function handleTimeUp() {
		isTimeUp = true;
		viewState = 'GAMEOVER';
		if (lastAudio) lastAudio.pause();
		stopWaitShow();
	}

	async function loadStudentAndTopics() {
		loadingTopics = true;
		try {
			if (sessionId) {
				const r = await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}`);
				if (r.ok) {
					const d = await r.json();
					let ids = d.topicosAlvo;
					if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch {} }
					if (Array.isArray(ids)) allowedTopicIds = ids.map((id: any) => Number(id));
				}
			}
			const ru = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
			if (!ru.ok) throw new Error();
			const student = await ru.json();
			const classe = student.classe || 3;
			const rt = await apiFetch(
				`${PUBLIC_API_URL_HOST}/api/classes/topics?classe=${classe}&studentId=${studentId}`
			);
			if (rt.ok) {
				const all = await rt.json();
				if (sessionId) {
					availableTopics.matematica = (all.matematica || []).filter((t: any) =>
						allowedTopicIds.includes(Number(t.id))
					);
					availableTopics.portugues = (all.portugues || []).filter((t: any) =>
						allowedTopicIds.includes(Number(t.id))
					);
				} else {
					availableTopics = all;
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			loadingTopics = false;
		}
	}

	function speakText() {
		if (lastAudio) { lastAudio.currentTime = 0; lastAudio.play(); }
	}

	// ── Iniciar sessão — zero estado de sessão no frontend ───────────────────
	function startSession(subject: string, topicName: string) {
		sessionContext = { subject, topic: topicName };
		chatLog = [];
		revealingBubbles = [];
		showFreeInput = false;
		buttonsHidden = false;
		currentAiMessage = { messages: [], emotion: 'NEUTRAL', type: 'FREE_TEXT', data: {}, ancora: null, phase: 'EXPLAIN' };
		viewState = 'CHAT';
		// O backend deriva o estado (phase, slot, etc.) da BD — frontend só envia a mensagem
		sendMessage('INICIAR_SESSAO');
	}

	// ── tap → feedback imediato → depois enviar ───────────────────────────────
	function handleOptionTap(option: string, btn: HTMLElement) {
		playPop();
		btn.style.transform = 'scale(0.92)';
		btn.style.transition = 'transform 80ms ease, opacity 150ms ease';
		// Adiciona ao chatLog imediatamente para feedback visual
		chatLog = [...chatLog, { role: 'user', text: option }];
		setTimeout(() => { buttonsHidden = true; btn.style.opacity = '0'; }, 80);
		setTimeout(() => sendMessage(option), 160);
	}

	// ── Enviar mensagem — payload mínimo, zero estado de sessão ──────────────
	async function sendMessage(textOverride?: string) {
		const text = textOverride || messageInput;
		if (!text.trim() || isTyping) return;

		messageInput = '';
		showFreeInput = false;
		showAncoraModal = false;
		isTyping = true;
		revealingBubbles = [];
		currentAiMessage = { ...currentAiMessage, emotion: 'THOUGHTFUL' };
		startWaitShow();

		// Mensagens de texto livre (não de opções, que já foram ao chatLog via handleOptionTap)
		if (textOverride === undefined && text !== 'INICIAR_SESSAO') {
			chatLog = [...chatLog, { role: 'user', text }];
		}

		try {
			const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/chat/send`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				// ⚠️  Apenas contexto — ZERO estado de sessão
				body: JSON.stringify({
					alunoId: parseInt(studentId),
					userQuery: text,
					subject: sessionContext.subject,
					topic: sessionContext.topic,
					turmaId,
					sessaoId: sessionId || null,
				})
			});
			if (res.ok) {
				const data = await res.json();
				await handleAiResponse(data.response);
			} else throw new Error();
		} catch {
			await handleAiResponse(JSON.stringify({
				messages: ['Eish, a minha internet tropeçou! 🔌', 'Podes repetir?'],
				emotion: 'SAD',
				interaction_type: 'CHIPS',
				phase: currentAiMessage.phase,
				interaction_data: { options: ['Tentar de novo'] }
			}));
		} finally {
			isTyping = false;
			stopWaitShow();
		}
	}

	// ── Processar resposta da IA ──────────────────────────────────────────────
	async function handleAiResponse(rawText: string) {
		stopWaitShow();
		try {
			const content = JSON.parse(rawText);
			const msgs: string[] = Array.isArray(content.messages)
				? content.messages
				: content.text ? [content.text] : ['...'];

			const prevPhase = currentAiMessage.phase;
			const newPhase  = content.phase || prevPhase;

			// Limpar chatLog nas transições de fase certas
			// EXPLAIN→TEST: nova pergunta, ecrã limpo
			// FEEDBACK→EXPLAIN: novo slot, ecrã limpo
			// TEST→FEEDBACK e FEEDBACK→TEST(retry): mantém contexto visível
			if (
				(prevPhase === 'EXPLAIN' && newPhase === 'TEST') ||
				(prevPhase === 'FEEDBACK' && newPhase === 'EXPLAIN')
			) {
				chatLog = [];
			}

			currentAiMessage = {
				messages: msgs,
				emotion: content.emotion || 'NEUTRAL',
				type: content.interaction_type || 'FREE_TEXT',
				data: content.interaction_data || {},
				ancora: content.ancora || null,
				phase: newPhase,
			};

			if (content.ancora) setTimeout(() => { showAncoraModal = true; }, 500);

			playDinDon();
			buttonsHidden = false;

			if (content.audio_url) {
				if (lastAudio) { lastAudio.pause(); lastAudio.currentTime = 0; }
				isPreparingAudio = true;
				const url = `${PUBLIC_IA_HOST_API_URL}${content.audio_url}`;
				lastAudio = new Audio(url);
				await new Promise<void>((resolve) => {
					lastAudio!.oncanplaythrough = () => resolve();
					lastAudio!.onerror = () => resolve();
					setTimeout(() => resolve(), 4000);
				});
				isPreparingAudio = false;
				lastAudio.play().catch(() => {});
			}

			await triggerBubbleSequence(msgs);
		} catch (e) {
			console.warn(e);
			isPreparingAudio = false;
			await triggerBubbleSequence([rawText]);
		}
	}

	// ── Revela bolhas uma a uma; depois move para chatLog permanente ──────────
	async function triggerBubbleSequence(messages: string[]) {
		isRevealing = true;
		revealingBubbles = [];
		for (let i = 0; i < messages.length; i++) {
			await new Promise((r) => setTimeout(r, i === 0 ? 300 : 400));
			revealingBubbles = [...revealingBubbles, messages[i]];
		}
		// Move para o log permanente
		chatLog = [...chatLog, ...messages.map((t) => ({ role: 'ai' as const, text: t }))];
		revealingBubbles = [];
		isRevealing = false;
	}

	function resolveInputMode(
		type: string, data: any, typing: boolean, preparingAudio: boolean, revealing: boolean
	): 'confirmation' | 'quiz' | 'chips' | 'text' | 'drag_drop' | 'none' {
		if (typing || preparingAudio || revealing) return 'none';
		if (type === 'DIRECT_INPUT') return 'text';
		if (type === 'DRAG_DROP' && data?.items) return 'drag_drop';
		const opts: string[] = data?.options || [];
		if (type === 'EXPLANATION' && opts.length > 0) return 'confirmation';
		if (type === 'TRUE_FALSE' || type === 'CHIPS') return 'quiz';
		if (type === 'CLOZE') return 'chips';
		return 'text';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
	}

	async function exitSession() {
		if (sessionId)
			await apiFetch(`${PUBLIC_API_URL_HOST}/api/session/${sessionId}/end`, { method: 'PATCH' });
		goto(`/dashboard/foreman/student/${studentId}/class`);
	}
	function handleBack() {
		if (lastAudio) { lastAudio.pause(); lastAudio.currentTime = 0; }
		if (viewState === 'CHAT') { viewState = 'TOPICS'; }
		else if (sessionId) { exitSession(); }
		else { goto(`/dashboard/foreman/student/${studentId}/class`); }
	}

	const QUIZ_COLORS = [
		'bg-violet-500 border-violet-700 hover:shadow-violet-200',
		'bg-sky-500    border-sky-700    hover:shadow-sky-200',
		'bg-amber-500  border-amber-700  hover:shadow-amber-200',
		'bg-rose-500   border-rose-700   hover:shadow-rose-200'
	];
</script>

<svelte:head>
	<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet" />
	<title>Sessão | KMind</title>
</svelte:head>

<!-- ── MODAL ÂNCORA ──────────────────────────────────────────────────────── -->
{#if showAncoraModal && currentAiMessage.ancora}
	{@const ancora = currentAiMessage.ancora}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" on:click={() => (showAncoraModal = false)}>
		<div class="animate-zoom-in relative max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl" on:click|stopPropagation>
			<div class="flex items-center justify-between border-b-4 border-slate-100 bg-slate-50 p-3 sm:p-4">
				<h2 class="flex items-center gap-2 text-base font-black text-slate-700 sm:text-lg">
					{#if ancora.tipo === 'visual'}<ImageIcon class="shrink-0 text-blue-500" size={20} /> Observa a Imagem
					{:else}<FileText class="shrink-0 text-amber-500" size={20} /> Lê o Texto{/if}
				</h2>
				<button on:click={() => (showAncoraModal = false)} class="rounded-full bg-slate-200 p-1.5 text-slate-600 active:scale-95">
					<X size={18} strokeWidth={3} />
				</button>
			</div>
			<div class="overflow-y-auto p-3 sm:p-5">
				{#if ancora.tipo === 'visual'}
					<img src={`/ancoras/${ancora.chave}.svg`} alt="Contexto" class="w-full rounded-2xl object-contain"
						on:error={(e) => {
							const t = e.target as HTMLImageElement;
							if (t.src.endsWith('.svg')) t.src = `/ancoras/${ancora.chave}.png`;
							else if (t.src.endsWith('.png')) t.src = `/ancoras/${ancora.chave}.jpg`;
							else t.onerror = null;
						}} />
				{:else}
					<div class="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 text-sm leading-relaxed font-medium text-slate-800 sm:p-6 sm:text-base">
						{ancora.conteudo}
					</div>
				{/if}
			</div>
			<div class="border-t-4 border-slate-100 p-3 sm:p-4">
				<button on:click={() => (showAncoraModal = false)} class="w-full rounded-2xl border-b-4 border-blue-700 bg-blue-500 py-3 text-base font-black text-white shadow-md active:translate-y-1 active:border-b-0 sm:py-4 sm:text-lg">
					JÁ VI, VOU RESPONDER!
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── LAYOUT ─────────────────────────────────────────────────────────────── -->
<div class="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-sky-200 via-blue-50 to-white font-['Fredoka']">

	<!-- HEADER -->
	<div class="z-30 w-full shrink-0 overflow-hidden border-b border-blue-100 bg-white/90 p-2 shadow-sm backdrop-blur-md sm:p-3">
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-1 sm:gap-3">
			<div class="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
				<button on:click={handleBack} class="shrink-0 rounded-xl border-2 border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all hover:border-blue-400 hover:text-blue-500 active:scale-95 sm:p-2">
					<ArrowLeft class="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
				</button>
				<div class="flex min-w-0 items-center gap-1.5 sm:gap-3">
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-blue-500 to-cyan-400 text-white shadow-md sm:h-10 sm:w-10">
						<Brain class="h-4 w-4 sm:h-5 sm:w-5" />
					</div>
					<div class="min-w-0">
						<h2 class="truncate text-sm leading-tight font-bold text-slate-700 sm:text-base">KMind</h2>
						<p class="truncate text-[9px] font-bold tracking-wider text-slate-500 uppercase sm:text-xs">
							{viewState === 'CHAT' ? sessionContext.topic : 'Menu Principal'}
						</p>
					</div>
				</div>
			</div>
			{#if viewState !== 'GAMEOVER'}
				<div class="ml-1 shrink-0 sm:ml-2">
					<div class="zoom-75 sm:zoom-100">
						<SessionTimer timerKey={currentTimerKey} paused={timerPaused} on:timeup={handleTimeUp} />
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- GAMEOVER -->
	{#if viewState === 'GAMEOVER'}
		<div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
			<div class="mb-6 animate-bounce text-7xl">⏰</div>
			<h1 class="mb-4 text-3xl font-black text-slate-800 sm:text-5xl">Tempo Esgotado!</h1>
			<button on:click={exitSession} class="rounded-2xl border-b-4 border-blue-700 bg-blue-500 px-10 py-4 text-lg font-bold text-white shadow-lg active:translate-y-1 active:border-b-0">
				Terminar
			</button>
		</div>

	<!-- TOPICS -->
	{:else if viewState === 'TOPICS'}
		<div class="scrollbar-hide flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
			<div class="animate-fade-in-up mx-auto max-w-4xl space-y-5 pb-10">
				<div class="py-4 text-center">
					<h1 class="mb-2 text-2xl font-black text-slate-800 drop-shadow-sm sm:text-4xl">O que vamos aprender? 🚀</h1>
				</div>
				{#if loadingTopics}
					<div class="flex justify-center">
						<div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
					</div>
				{:else}
					{#if availableTopics.matematica.length > 0}
						<section class="rounded-3xl border border-blue-100 bg-white/60 p-3 shadow-sm sm:p-5">
							<h3 class="mb-3 flex items-center gap-2 text-base font-black text-slate-700 sm:mb-4 sm:text-xl">
								<div class="rounded-xl bg-blue-100 p-1.5 text-blue-600"><Calculator size={18} /></div>
								Matemática
							</h3>
							<div class="grid grid-cols-1 gap-2">
								{#each availableTopics.matematica as topic}
									<button on:click={() => startSession('Matemática', topic.nome)}
										class="rounded-2xl border-b-4 border-blue-200 bg-white p-3 text-left text-sm font-bold text-slate-700 shadow-sm transition-all hover:scale-[1.02] hover:border-blue-400 hover:shadow-md active:translate-y-1 active:border-b-0 sm:p-4 sm:text-base">
										{topic.nome}
									</button>
								{/each}
							</div>
						</section>
					{/if}
					{#if availableTopics.portugues.length > 0}
						<section class="rounded-3xl border border-green-100 bg-white/60 p-3 shadow-sm sm:p-5">
							<h3 class="mb-3 flex items-center gap-2 text-base font-black text-slate-700 sm:mb-4 sm:text-xl">
								<div class="rounded-xl bg-green-100 p-1.5 text-green-600"><BookOpen size={18} /></div>
								Português
							</h3>
							<div class="grid grid-cols-1 gap-2">
								{#each availableTopics.portugues as topic}
									<button on:click={() => startSession('Português', topic.nome)}
										class="rounded-2xl border-b-4 border-green-200 bg-white p-3 text-left text-sm font-bold text-slate-700 shadow-sm transition-all hover:scale-[1.02] hover:border-green-400 hover:shadow-md active:translate-y-1 active:border-b-0 sm:p-4 sm:text-base">
										{topic.nome}
									</button>
								{/each}
							</div>
						</section>
					{/if}
				{/if}
			</div>
		</div>

	<!-- CHAT -->
	{:else}
		<div class="relative flex-1 overflow-y-auto scroll-smooth pb-44" bind:this={chatContainer}>
			<div class="flex min-h-[50vh] flex-col items-center justify-start space-y-4 px-3 pt-4 sm:space-y-5 sm:px-4 sm:pt-6">

				<!-- MASCOTE -->
				<div class="relative z-10 flex w-full shrink-0 justify-center">
					<div class="relative">
						<div class="kani-wrap flex h-24 w-24 items-center justify-center rounded-full border-4 border-white shadow-xl transition-colors duration-700 sm:h-36 sm:w-36 md:h-44 md:w-44
							{mascotEmotion === 'HAPPY' ? 'kani-bounce bg-green-400'
							: mascotEmotion === 'INTERESTED' ? 'kani-idle bg-violet-500'
							: mascotEmotion === 'THOUGHTFUL' ? 'kani-thinking bg-amber-400'
							: mascotEmotion === 'SAD' ? 'kani-shake bg-rose-400'
							: 'kani-idle bg-blue-500'}">
							{#if mascotEmotion === 'HAPPY'}<Smile size={44} class="text-white drop-shadow-md sm:h-14 sm:w-14" strokeWidth={2.5} />
							{:else if mascotEmotion === 'INTERESTED'}<Sparkles size={44} class="text-white drop-shadow-md sm:h-14 sm:w-14" strokeWidth={2.5} />
							{:else if mascotEmotion === 'THOUGHTFUL'}<Brain size={44} class="text-white drop-shadow-md sm:h-14 sm:w-14" strokeWidth={2.5} />
							{:else if mascotEmotion === 'SAD'}<Frown size={44} class="text-white drop-shadow-md sm:h-14 sm:w-14" strokeWidth={2.5} />
							{:else}<Bot size={44} class="text-white drop-shadow-md sm:h-14 sm:w-14" strokeWidth={2.5} />{/if}
						</div>
						<div class="kani-pulse-ring absolute inset-0 rounded-full
							{mascotEmotion === 'HAPPY' ? 'bg-green-400'
							: mascotEmotion === 'THOUGHTFUL' ? 'bg-amber-400'
							: mascotEmotion === 'SAD' ? 'bg-rose-400'
							: 'bg-blue-500'}"></div>
					</div>
				</div>

				<!-- show de espera -->
				{#if isTyping || isPreparingAudio}
					<div class="flex flex-col items-center gap-2">
						<div class="flex items-center gap-1.5">
							<div class="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"></div>
							<div class="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]"></div>
							<div class="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400"></div>
						</div>
						{#if waitPhraseVisible && waitPhraseText}
							<p class="wait-phrase text-xs font-bold text-slate-400 sm:text-sm">{waitPhraseText}</p>
						{/if}
					</div>
				{/if}

				<!-- chatLog: histórico persistente da conversa actual -->
				<div class="flex w-full max-w-2xl flex-col items-center space-y-3 pb-2">
					{#each chatLog as entry}
						{#if entry.role === 'user'}
							<div class="flex w-full justify-end px-1">
								<div class="user-bubble-instant max-w-[80%] rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white shadow-md sm:px-5 sm:py-3 sm:text-base">
									{entry.text}
								</div>
							</div>
						{:else}
							<div class="animate-pop-in relative w-auto max-w-[92%] rounded-3xl border-b-4 border-slate-200 bg-white px-4 py-3 text-center text-base leading-relaxed font-medium text-slate-700 shadow-sm sm:px-6 sm:py-4 sm:text-lg md:max-w-[85%] md:text-xl">
								{@html entry.text}
							</div>
						{/if}
					{/each}

					<!-- Resposta actual a ser revelada (animação) -->
					{#each revealingBubbles as bubble, i}
						<div class="animate-pop-in relative w-auto max-w-[92%] rounded-3xl border-b-4 border-slate-200 bg-white px-4 py-3 text-center text-base leading-relaxed font-medium text-slate-700 shadow-sm sm:px-6 sm:py-4 sm:text-lg md:max-w-[85%] md:text-xl"
							style="animation-delay:{i * 80}ms">
							{@html bubble}
						</div>
					{/each}

					{#if revealingBubbles.length === 0 && !isRevealing && chatLog.some(e => e.role === 'ai')}
						<button on:click={speakText} class="animate-fade-in mt-1 rounded-full bg-slate-100 p-2.5 text-slate-400 transition-all hover:text-blue-500 sm:p-3">
							<Volume2 size={20} />
						</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- BARRA DE INPUT -->
		<div class="fixed bottom-0 left-0 z-40 w-full border-t border-slate-100 bg-white/95 backdrop-blur-xl">
			<div class="mx-auto flex max-w-3xl flex-col justify-center p-2 sm:p-3" style="padding-bottom: max(env(safe-area-inset-bottom, 8px), 8px)">

				<!-- botão âncora -->
				{#if currentAiMessage.ancora && inputMode !== 'none'}
					<div class="animate-slide-up mb-2 flex justify-center">
						<button on:click={() => (showAncoraModal = true)}
							class="flex animate-pulse items-center gap-1.5 rounded-full border-b-4 border-amber-600 bg-amber-400 px-3 py-1 text-xs font-black text-white shadow-sm active:translate-y-1 active:border-b-0 sm:px-4 sm:py-1.5 sm:text-sm">
							{#if currentAiMessage.ancora.tipo === 'visual'}<ImageIcon size={13} /> REVER IMAGEM
							{:else}<FileText size={13} /> LER TEXTO{/if}
						</button>
					</div>
				{/if}

				<!-- NONE -->
				{#if inputMode === 'none'}
					<div class="flex h-14 items-center justify-center gap-2 py-3">
						<div class="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"></div>
						<div class="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]"></div>
						<div class="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400"></div>
					</div>

				<!-- CONFIRMATION -->
				{:else if inputMode === 'confirmation'}
					{#if !buttonsHidden}
						<div class="animate-slide-up flex w-full flex-col gap-2">
							<div class="flex w-full gap-2 sm:gap-3">
								{#each currentAiMessage.data.options || [] as option, idx}
									<button class="option-solid flex-1 rounded-2xl border-b-4 px-3 py-3 text-sm font-black shadow-md transition-all sm:px-4 sm:py-4 sm:text-base
										{idx === 0 ? 'border-green-700 bg-green-500 text-white hover:scale-[1.04] hover:shadow-lg hover:shadow-green-200'
										: 'border-rose-700 bg-rose-500 text-white hover:scale-[1.04] hover:shadow-lg hover:shadow-rose-200'}"
										on:click={(e) => handleOptionTap(option, e.currentTarget)}>
										{option}
									</button>
								{/each}
							</div>
							{#if !showFreeInput}
								<button on:click={() => (showFreeInput = true)} class="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-400 transition-colors hover:text-blue-500">
									<PenLine size={11} /> Escrever outra coisa
								</button>
							{:else}
								<div class="animate-slide-up mt-1 flex items-center gap-2">
									<input type="text" placeholder="Escreve aqui..." class="flex-1 rounded-xl border-2 border-slate-200 bg-slate-100 py-2 pr-3 pl-3 text-sm font-bold text-slate-700 shadow-inner outline-none focus:border-blue-400 focus:bg-white" bind:value={messageInput} on:keydown={handleKeydown} autofocus />
									<button class="shrink-0 rounded-xl border-b-4 border-blue-700 bg-blue-500 p-2 text-white shadow-md active:translate-y-1 active:border-b-0 disabled:opacity-50" on:click={() => sendMessage()} disabled={!messageInput.trim()}><Send size={16} /></button>
								</div>
							{/if}
						</div>
					{/if}

				<!-- QUIZ -->
				{:else if inputMode === 'quiz'}
					{@const opts = currentAiMessage.data.options || []}
					{#if !buttonsHidden}
						<div class="animate-slide-up flex w-full flex-col gap-2">
							<div class="{opts.length === 4 ? 'grid grid-cols-2' : 'flex flex-col'} gap-2">
								{#each opts as option, idx}
									<button class="option-solid min-h-[48px] rounded-2xl border-b-4 px-3 py-3 text-center text-sm font-black text-white shadow-md transition-all sm:min-h-[54px] sm:px-4 sm:py-3.5 sm:text-base {QUIZ_COLORS[idx % 4]} hover:scale-[1.04] hover:shadow-lg"
										on:click={(e) => handleOptionTap(option, e.currentTarget)}>
										<span class="leading-tight">{option}</span>
									</button>
								{/each}
							</div>
							{#if !showFreeInput}
								<button on:click={() => (showFreeInput = true)} class="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-400 transition-colors hover:text-blue-500">
									<PenLine size={11} /> Tirar uma dúvida
								</button>
							{:else}
								<div class="animate-slide-up mt-1 flex items-center gap-2">
									<input type="text" placeholder="Escreve a tua pergunta..." class="flex-1 rounded-xl border-2 border-slate-200 bg-slate-100 py-2 pr-3 pl-3 text-sm font-bold text-slate-700 shadow-inner outline-none focus:border-blue-400 focus:bg-white" bind:value={messageInput} on:keydown={handleKeydown} autofocus />
									<button class="shrink-0 rounded-xl border-b-4 border-blue-700 bg-blue-500 p-2 text-white shadow-md active:translate-y-1 active:border-b-0 disabled:opacity-50" on:click={() => sendMessage()} disabled={!messageInput.trim()}><Send size={16} /></button>
								</div>
							{/if}
						</div>
					{/if}

				<!-- CHIPS -->
				{:else if inputMode === 'chips'}
					{#if !buttonsHidden}
						<div class="animate-slide-up flex w-full flex-col gap-2">
							<div class="custom-scrollbar flex max-h-[32vh] flex-col gap-1.5 overflow-y-auto px-0.5">
								{#each currentAiMessage.data.options || [] as option, idx}
									<button class="option-solid w-full rounded-xl border-b-4 px-4 py-2.5 text-center font-bold text-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md sm:py-3 {QUIZ_COLORS[idx % 4]} {option.length >= 20 ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}"
										on:click={(e) => handleOptionTap(option, e.currentTarget)}>
										{option}
									</button>
								{/each}
							</div>
							{#if !showFreeInput}
								<button on:click={() => (showFreeInput = true)} class="flex items-center justify-center gap-1 text-xs text-slate-400 transition-colors hover:text-blue-500">
									<PenLine size={11} /> Tirar uma dúvida
								</button>
							{:else}
								<div class="animate-slide-up flex items-center gap-2">
									<input type="text" placeholder="Escreve a tua pergunta..." class="flex-1 rounded-xl border-2 border-slate-200 bg-slate-100 py-2 pr-3 pl-3 text-sm font-bold text-slate-700 shadow-inner outline-none focus:border-blue-400 focus:bg-white" bind:value={messageInput} on:keydown={handleKeydown} autofocus />
									<button class="shrink-0 rounded-xl border-b-4 border-blue-700 bg-blue-500 p-2 text-white shadow-md active:translate-y-1 active:border-b-0 disabled:opacity-50" on:click={() => sendMessage()} disabled={!messageInput.trim()}><Send size={16} /></button>
								</div>
							{/if}
						</div>
					{/if}

				<!-- DRAG & DROP -->
				{:else if inputMode === 'drag_drop'}
					<div class="animate-slide-up flex w-full flex-col gap-2">
						<div class="flex min-h-[44px] flex-wrap justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 p-2.5">
							{#if selectedDragItems.length === 0}
								<span class="my-auto text-xs font-bold text-slate-400">Toca nas palavras abaixo para ordenar</span>
							{/if}
							{#each selectedDragItems as item}
								<button on:click={() => { selectedDragItems = selectedDragItems.filter(i => i !== item); availableDragItems = [...availableDragItems, item]; }} class="animate-pop-in rounded-lg bg-blue-500 px-2.5 py-1 text-sm font-bold text-white shadow-sm">{item}</button>
							{/each}
						</div>
						<div class="flex flex-wrap justify-center gap-1.5">
							{#each availableDragItems as item}
								<button on:click={() => { availableDragItems = availableDragItems.filter(i => i !== item); selectedDragItems = [...selectedDragItems, item]; }} class="rounded-lg border-2 border-slate-200 bg-white px-2.5 py-1 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-400">{item}</button>
							{/each}
						</div>
						<button class="rounded-xl border-b-4 border-green-700 bg-green-500 py-3 text-base font-black text-white shadow-md transition-all active:translate-y-1 active:border-b-0 disabled:border-slate-400 disabled:bg-slate-300 disabled:opacity-40"
							disabled={availableDragItems.length > 0}
							on:click={() => sendMessage(selectedDragItems.join(' '))}>
							Confirmar Ordem
						</button>
					</div>

				<!-- TEXT -->
				{:else}
					<div class="animate-slide-up flex items-center gap-2">
						<input type="text" placeholder="Escreve aqui..." class="flex-1 rounded-xl border-2 border-slate-200 bg-slate-100 py-3 pr-3 pl-3 text-sm font-bold text-slate-700 shadow-inner outline-none focus:border-blue-400 focus:bg-white sm:pr-4 sm:pl-4 sm:text-base" bind:value={messageInput} on:keydown={handleKeydown} />
						<button class="shrink-0 rounded-xl border-b-4 border-blue-700 bg-blue-500 p-2.5 text-white shadow-md active:translate-y-1 active:border-b-0 disabled:opacity-50 sm:p-3" on:click={() => sendMessage()} disabled={!messageInput.trim()}><Send size={18} /></button>
					</div>
				{/if}

			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes kani-idle-anim { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-12px) scale(1.02)} }
	.kani-idle { animation: kani-idle-anim 3s ease-in-out infinite; }

	@keyframes kani-bounce-anim { 0%,100%{transform:translateY(0) scale(1)} 30%{transform:translateY(-18px) scale(1.06)} 60%{transform:translateY(-6px) scale(1.02)} }
	.kani-bounce { animation: kani-bounce-anim 0.7s cubic-bezier(0.34,1.56,0.64,1); }

	@keyframes kani-thinking-anim { 0%,100%{transform:rotate(0deg) scale(1)} 25%{transform:rotate(-4deg) scale(0.97)} 75%{transform:rotate(4deg) scale(0.97)} }
	.kani-thinking { animation: kani-thinking-anim 2s ease-in-out infinite; }

	@keyframes kani-shake-anim { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
	.kani-shake { animation: kani-shake-anim 0.6s ease-in-out infinite; }

	@keyframes kani-pulse-ring-anim { 0%{transform:scale(1);opacity:0.22} 70%{transform:scale(1.28);opacity:0} 100%{transform:scale(1.28);opacity:0} }
	.kani-pulse-ring { position:absolute;inset:0;border-radius:9999px;pointer-events:none;animation:kani-pulse-ring-anim 2s ease-out infinite; }

	.wait-phrase { animation: wait-slide 0.2s ease-out both; }
	@keyframes wait-slide { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }

	.user-bubble-instant { animation: bubble-pop-right 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }
	@keyframes bubble-pop-right { from{transform:scale(0.8) translateX(16px);opacity:0} to{transform:scale(1) translateX(0);opacity:1} }

	.option-solid { will-change: transform, opacity; }

	@keyframes popIn { 0%{opacity:0;transform:scale(0.82) translateY(18px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
	.animate-pop-in { animation: popIn 0.38s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }

	@keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
	.animate-slide-up { animation: slideUp 0.28s ease-out forwards; }

	@keyframes fadeIn { from{opacity:0} to{opacity:1} }
	.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }

	@keyframes zoomIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
	.animate-zoom-in { animation: zoomIn 0.45s cubic-bezier(0.16,1,0.3,1); }

	.scrollbar-hide::-webkit-scrollbar{display:none}
	.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
	.custom-scrollbar::-webkit-scrollbar{width:3px}
	.custom-scrollbar::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}

	.zoom-75{zoom:0.75}
	@media(min-width:640px){.sm\:zoom-100{zoom:1}}
</style>