<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
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
		Image as ImageIcon,
		FileText
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import SessionTimer from '$lib/components/SessionTimer.svelte';
	import { notify } from '$lib/store/toaster';
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
	let showAncoraModal = false;

	// ── GAME FEEL STATE ──────────────────────────────────────────────────────
	let countdown: number | null = null; // 3 → 2 → 1 → null
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	let xpFloats: { id: number; amount: number }[] = []; // "+10" a flutuar
	let xpFloatCounter = 0;
	let burstParticles: { id: number; x: number; y: number; color: string; angle: number }[] = [];
	let burstCounter = 0;
	let shakeOption: string | null = null; // opção a fazer shake

	// Stats / tópicos
	let statsLoaded = false;
	let loadingStats = true;
	let availableTopics: { matematica: any[]; portugues: any[] } = { matematica: [], portugues: [] };
	let loadingTopics = true;

	const ICON_MAP: Record<string, any> = {
		Hash,
		ListOrdered,
		Shapes,
		Calculator,
		X,
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
		Heart,
		UserCheck,
		MapPin,
		GitBranch,
		Calendar,
		Zap,
		BookOpen,
		Mail,
		Box
	};

	// ── WEB AUDIO API — Sons sintéticos ─────────────────────────────────────
	let audioCtx: AudioContext | null = null;

	function getAudioCtx(): AudioContext {
		if (!audioCtx) audioCtx = new AudioContext();
		return audioCtx;
	}

	function playPop() {
		try {
			const ctx = getAudioCtx();
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.connect(g);
			g.connect(ctx.destination);
			o.frequency.setValueAtTime(800, ctx.currentTime);
			o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
			g.gain.setValueAtTime(0.3, ctx.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
			o.start();
			o.stop(ctx.currentTime + 0.08);
		} catch {}
	}

	function playCorrect() {
		try {
			const ctx = getAudioCtx();
			const freqs = [523, 659, 784];
			freqs.forEach((freq, i) => {
				const o = ctx.createOscillator();
				const g = ctx.createGain();
				o.connect(g);
				g.connect(ctx.destination);
				o.type = 'sine';
				o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
				g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1);
				g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
				o.start(ctx.currentTime + i * 0.1);
				o.stop(ctx.currentTime + i * 0.1 + 0.15);
			});
		} catch {}
	}

	function playError() {
		try {
			const ctx = getAudioCtx();
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.connect(g);
			g.connect(ctx.destination);
			o.type = 'sawtooth';
			o.frequency.setValueAtTime(300, ctx.currentTime);
			o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.15);
			g.gain.setValueAtTime(0.2, ctx.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
			o.start();
			o.stop(ctx.currentTime + 0.15);
		} catch {}
	}

	function playCountdownBeep(final: boolean) {
		try {
			const ctx = getAudioCtx();
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.connect(g);
			g.connect(ctx.destination);
			o.frequency.setValueAtTime(final ? 880 : 440, ctx.currentTime);
			g.gain.setValueAtTime(0.2, ctx.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (final ? 0.3 : 0.1));
			o.start();
			o.stop(ctx.currentTime + (final ? 0.3 : 0.1));
		} catch {}
	}

	// ── CONTAGEM 3-2-1 ───────────────────────────────────────────────────────
	function startCountdown(callback: () => void) {
		countdown = 3;
		playCountdownBeep(false);

		countdownInterval = setInterval(() => {
			countdown!--;
			if (countdown! > 0) {
				playCountdownBeep(false);
			} else {
				clearInterval(countdownInterval!);
				countdownInterval = null;
				countdown = null;
				playCountdownBeep(true);
				callback();
			}
		}, 800);
	}

	// ── XP FLOAT ─────────────────────────────────────────────────────────────
	function spawnXpFloat(amount: number) {
		const id = xpFloatCounter++;
		xpFloats = [...xpFloats, { id, amount }];
		setTimeout(() => {
			xpFloats = xpFloats.filter((f) => f.id !== id);
		}, 900);
	}

	// ── BURST DE ESTRELAS ────────────────────────────────────────────────────
	const BURST_COLORS = ['#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA'];

	function spawnBurst(event: MouseEvent | TouchEvent) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const particles = Array.from({ length: 10 }, (_, i) => ({
			id: burstCounter++,
			x: cx,
			y: cy,
			color: BURST_COLORS[i % BURST_COLORS.length],
			angle: (i / 10) * 360
		}));
		burstParticles = [...burstParticles, ...particles];
		setTimeout(() => {
			const ids = new Set(particles.map((p) => p.id));
			burstParticles = burstParticles.filter((p) => !ids.has(p.id));
		}, 700);
	}

	// ── SHAKE ────────────────────────────────────────────────────────────────
	function triggerShake(option: string) {
		shakeOption = option;
		setTimeout(() => {
			shakeOption = null;
		}, 500);
	}

	// ────────────────────────────────────────────────────────────────────────
	onMount(async () => {
		rushStore.init(studentId);
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
						try {
							rawIds = JSON.parse(rawIds);
						} catch {}
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

	onDestroy(() => {
		if (countdownInterval) clearInterval(countdownInterval);
		if (audioCtx) audioCtx.close();
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
			const res = await apiFetch(
				`${PUBLIC_API_URL_HOST}/api/diagnostic/needs/${studentId}?disciplina=${subject}`
			);
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
					notify('Salvo','Diagnóstico concluído! A iniciar treino...', 'success');
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
		} catch {
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
		if (isCorrect) {
			playCorrect();
		} else {
			playError();
			triggerShake(option);
		}
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
			playCorrect();
			notify('Info','Diagnóstico completo!', 'info');
			startGame($rushStore.selectedSubject, $rushStore.selectedSubtopic);
		} catch {
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
		// Mostra contagem 3-2-1 antes de fazer o fetch
		loading = true;
		selectedOption = null;
		isCorrect = null;
		showAncoraModal = false;

		// Inicia fetch em background enquanto contagem corre
		const fetchPromise = apiFetch(`${PUBLIC_API_URL_HOST}/api/rush/next`, {
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

		// Só mostra contagem se ainda não temos dados (primeira pergunta ou depois de resposta)
		startCountdown(async () => {
			try {
				const res = await fetchPromise;
				if (res.status === 403) {
					const error = await res.json();
					$rushStore.blockedUntil = error.blockedUntil;
					startBlockCountdown();
					$rushStore.currentState = 'BLOCKED';
					return;
				}
				$rushStore.questionData = await res.json();
				if ($rushStore.questionData?.ancora) {
					setTimeout(() => {
						showAncoraModal = true;
					}, 300);
				}
			} catch (e) {
				console.error(e);
			} finally {
				loading = false;
			}
		});
	}

	async function handleAnswer(option: string, event?: MouseEvent | TouchEvent) {
		if (selectedOption) return;

		// Feedback imediato — antes de qualquer await
		playPop();
		if (event) spawnBurst(event);
		selectedOption = option;

		const correct = option === $rushStore.questionData.correct_answer;
		isCorrect = correct;

		// Som + efeito visual após tiny delay para o pop assentar
		setTimeout(() => {
			if (correct) {
				playCorrect();
			} else {
				playError();
				triggerShake(option);
			}
		}, 80);

		rushStore.update((s) => {
			const points = correct ? 10 + s.streak * 2 : 0;
			const newStreak = correct ? s.streak + 1 : 0;
			const newAcertos = correct ? s.acertos + 1 : s.acertos;
			const newErros = !correct ? s.erros + 1 : s.erros;

			if (correct) spawnXpFloat(points);

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
			if (res.ok) {
				const result = await res.json();
				rushStore.update((s) => ({
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
			console.error('🚨 Falha de rede:', error);
		}

		if ($rushStore.lives <= 0 && $rushStore.currentState !== 'BLOCKED') {
			setTimeout(() => {
				$rushStore.currentState = 'GAMEOVER';
			}, 1500);
		}
	}

	function handleBack() {
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
			countdown = null;
		}
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
		if (typeof window !== 'undefined') localStorage.removeItem(`rush_timer_${studentId}`);
		goto(`/dashboard/foreman/student/${studentId}/class`);
	}

	// Classe de opção múltipla escolha
	function mcClass(option: string): string {
		if (selectedOption === option && isCorrect)
			return 'border-green-700 bg-green-500 text-white scale-[1.01]';
		if (selectedOption === option && !isCorrect) return 'border-rose-700 bg-rose-500 text-white';
		if (selectedOption && option === $rushStore.questionData.correct_answer)
			return 'border-green-700 bg-green-500 text-white';
		return 'border-slate-200 bg-white text-slate-600 active:translate-y-1 active:border-b-0';
	}
	function mcStyle(option: string): string {
		if (
			selectedOption &&
			option !== selectedOption &&
			option !== $rushStore.questionData.correct_answer
		)
			return 'opacity:0.5';
		return '';
	}
</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<title>Rush | KMind</title>
</svelte:head>

<!-- ── PARTÍCULAS DE BURST (posição fixa, sobre tudo) ──────────────────────── -->
{#each burstParticles as p (p.id)}
	<div
		class="burst-particle"
		style="left:{p.x}px; top:{p.y}px; --angle:{p.angle}deg; background:{p.color};"
	></div>
{/each}

<!-- ── XP FLOATS ──────────────────────────────────────────────────────────── -->
{#each xpFloats as f (f.id)}
	<div class="xp-float">+{f.amount}</div>
{/each}

<!-- ── MODAL ÂNCORA ───────────────────────────────────────────────────────── -->
{#if showAncoraModal && $rushStore.questionData?.ancora}
	{@const ancora = $rushStore.questionData.ancora}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
		on:click={() => (showAncoraModal = false)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
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
					on:click={() => (showAncoraModal = false)}
					class="rounded-full bg-slate-200 p-2 text-slate-600 transition-transform hover:scale-105 active:scale-95"
				>
					<X size={20} strokeWidth={3} />
				</button>
			</div>
			<div class="overflow-y-auto p-4 sm:p-6">
				{#if ancora.tipo === 'visual'}
					<img
						src={`/ancoras/${ancora.chave}.svg`}
						alt="Contexto"
						class="w-full rounded-2xl object-contain shadow-sm"
						on:error={(e) => {
							const target = e.target as HTMLImageElement;

							if (target.src.endsWith('.svg')) {
								target.src = `/ancoras/${ancora.chave}.png`;
							} else if (target.src.endsWith('.png')) {
								target.src = `/ancoras/${ancora.chave}.jpg`;
							} else {
								target.onerror = null; // evita loop
							}
						}}
					/>
				{:else}
					<div
						class="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 leading-relaxed font-medium text-slate-800 shadow-inner"
					>
						{ancora.conteudo}
					</div>
				{/if}
			</div>
			<div class="border-t-4 border-slate-100 bg-white p-4">
				<button
					on:click={() => (showAncoraModal = false)}
					class="w-full rounded-2xl border-b-4 border-amber-700 bg-amber-500 py-4 text-lg font-black text-white shadow-md active:translate-y-1 active:border-b-0"
				>
					JÁ VI, VAMOS À PERGUNTA!
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── LAYOUT PRINCIPAL ───────────────────────────────────────────────────── -->
<div
	class="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-amber-100 via-orange-50 to-white font-['Fredoka']"
>
	<!-- HEADER -->
	<div
		class="z-10 flex w-full shrink-0 items-center justify-between gap-1 overflow-hidden border-b-4 border-amber-200 bg-white/90 p-2 shadow-sm backdrop-blur-sm sm:gap-2 sm:p-3"
	>
		<div class="flex shrink-0 items-center gap-1 sm:gap-2">
			<button
				on:click={handleBack}
				class="shrink-0 rounded-xl border-2 border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-all hover:border-amber-400 hover:text-amber-500 active:scale-95 sm:p-2"
			>
				<ArrowLeft class="h-4 w-4 sm:h-6 sm:w-6" strokeWidth={3} />
			</button>

			{#if $rushStore.currentState === 'PLAYING'}
				<div
					class="animate-pop-in flex items-center gap-0.5 rounded-lg border-2 border-red-100 bg-white px-1.5 py-1 shadow-sm sm:gap-1 sm:rounded-xl sm:px-3 sm:py-1.5"
				>
					{#each Array(3) as _, i}
						<Heart
							class="h-3 w-3 transition-all duration-500 sm:h-5 sm:w-5 {i < $rushStore.lives
								? 'animate-pulse-slow fill-red-500 text-red-500'
								: 'fill-slate-100 text-slate-200'}"
						/>
					{/each}
				</div>
			{:else}
				<div class="hidden flex-col items-center sm:flex">
					<h1
						class="flex items-center gap-2 text-xl font-black tracking-wide text-amber-500 drop-shadow-sm"
					>
						<Zap class="animate-bounce-slow fill-current" size={20} /> RUSH
					</h1>
				</div>
			{/if}
		</div>

		<div class="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
			<div
				class="min-w-0 shrink {$rushStore.currentState === 'GAMEOVER' ||
				$rushStore.currentState === 'BLOCKED'
					? 'hidden'
					: ''}"
			>
				<div class="zoom-75 sm:zoom-100">
					<SessionTimer timerKey={`rush_timer_${studentId}`} on:timeup={handleTimeUp} />
				</div>
			</div>

			<div class="relative shrink-0">
				<div
					class="flex items-center gap-1 rounded-full border-2 border-amber-200 bg-amber-100 px-2 py-0.5 shadow-inner sm:px-3 sm:py-1"
				>
					<Star class="h-3 w-3 fill-amber-500 text-amber-500 sm:h-4 sm:w-4" />
					<span class="xp-counter text-xs font-black text-amber-600 sm:text-base"
						>{$rushStore.xp}</span
					>
				</div>
			</div>
		</div>
	</div>

	<!-- ── BLOCKED ──────────────────────────────────────────────────────────── -->
	{#if $rushStore.currentState === 'BLOCKED'}
		<div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
			<div class="animate-shake mb-6 rounded-full border-4 border-rose-200 bg-rose-100 p-6">
				<Lock size={48} class="text-rose-500" />
			</div>
			<h2 class="mb-2 text-2xl font-black text-slate-800">Pausa! ☕</h2>
			<p class="mx-auto mb-6 max-w-xs text-base text-slate-500">
				Já treinaste muito. Descansa um pouco.
			</p>
			<div
				class="mx-auto my-4 w-full max-w-xs rounded-3xl border-b-8 border-slate-700 bg-slate-900 px-8 py-5 text-white shadow-xl"
			>
				<div class="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">Volta em</div>
				<p class="animate-pulse font-mono text-4xl font-black tracking-widest tabular-nums">
					{blockTimeRemaining || '--:--'}
				</p>
			</div>
			<button
				on:click={handleBack}
				class="mt-8 rounded-2xl border-b-4 border-blue-700 bg-blue-500 px-8 py-4 font-bold text-white shadow-lg active:translate-y-1 active:border-b-0"
			>
				Escolher Outro Tópico
			</button>
		</div>

		<!-- ── MENU ─────────────────────────────────────────────────────────────── -->
	{:else if $rushStore.currentState === 'MENU'}
		<div class="scrollbar-hide flex-1 overflow-y-auto p-4">
			<div class="animate-slide-up mx-auto max-w-4xl space-y-6">
				<div
					class="relative overflow-hidden rounded-3xl border-4 border-white/20 bg-gradient-to-tr from-violet-500 via-purple-500 to-fuchsia-500 p-5 text-white shadow-xl shadow-purple-200"
				>
					<div class="absolute -top-10 -right-10 rotate-12 opacity-20"><Trophy size={140} /></div>
					<div class="relative z-10 flex items-center justify-between">
						<div>
							<p class="mb-1 text-xs font-bold tracking-wider text-purple-100 uppercase">
								XP Total
							</p>
							<p class="text-4xl font-black drop-shadow-md">{$rushStore.xp}</p>
						</div>
						<div
							class="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right backdrop-blur-sm"
						>
							<p class="mb-1 text-[10px] font-bold text-purple-100 uppercase">Certas</p>
							<p class="flex items-center justify-end gap-2 text-2xl font-bold text-green-300">
								<CheckCircle2 size={20} />{$rushStore.acertos}
							</p>
						</div>
					</div>
				</div>

				{#if loadingTopics}
					<div class="flex flex-col items-center justify-center py-20">
						<div
							class="h-12 w-12 animate-spin rounded-full border-8 border-blue-200 border-t-blue-500"
						></div>
					</div>
				{:else}
					{#if availableTopics.matematica.length > 0}
						<section>
							<h2 class="mb-3 flex items-center gap-2 text-xl font-black text-slate-700">
								<div class="rounded-xl bg-blue-100 p-2 text-blue-500"><Calculator size={20} /></div>
								Matemática
							</h2>
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
								{#each availableTopics.matematica as topic}
									<button
										on:click={() => checkAndStartGame('matematica', topic.nome)}
										class="group relative overflow-hidden rounded-2xl border-b-4 border-slate-200 bg-white p-4 text-left shadow-sm transition-all active:translate-y-1 active:border-b-0"
									>
										<div class="mb-3 flex items-start justify-between">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg transition-transform group-hover:scale-110"
											>
												<svelte:component this={getIcon(topic.metadata?.icon)} size={20} />
											</div>
										</div>
										<h3 class="text-base leading-tight font-bold text-slate-700">{topic.nome}</h3>
									</button>
								{/each}
							</div>
						</section>
					{/if}
					{#if availableTopics.portugues.length > 0}
						<section class="mt-6">
							<h2 class="mb-3 flex items-center gap-2 text-xl font-black text-slate-700">
								<div class="rounded-xl bg-green-100 p-2 text-green-500"><BookOpen size={20} /></div>
								Português
							</h2>
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
								{#each availableTopics.portugues as topic}
									<button
										on:click={() => checkAndStartGame('portugues', topic.nome)}
										class="group relative overflow-hidden rounded-2xl border-b-4 border-slate-200 bg-white p-4 text-left shadow-sm transition-all active:translate-y-1 active:border-b-0"
									>
										<div class="mb-3 flex items-start justify-between">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg transition-transform group-hover:scale-110"
											>
												<svelte:component this={getIcon(topic.metadata?.icon)} size={20} />
											</div>
										</div>
										<h3 class="text-base leading-tight font-bold text-slate-700">{topic.nome}</h3>
									</button>
								{/each}
							</div>
						</section>
					{/if}
				{/if}
			</div>
		</div>

		<!-- ── DIAGNOSTIC ───────────────────────────────────────────────────────── -->
	{:else if $rushStore.currentState === 'DIAGNOSTIC'}
		<div
			class="animate-zoom-in mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start overflow-y-auto p-4"
		>
			<div class="mb-6 text-center">
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black tracking-widest text-purple-700 uppercase shadow-sm"
				>
					<BrainCircuit size={14} /> Teste de Nível
				</div>
				<div class="mb-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
					<div
						class="h-full rounded-full bg-purple-500 transition-all duration-500"
						style="width: {($rushStore.diagnosticQuestions.length > 0
							? $rushStore.currentDiagnosticIndex / $rushStore.diagnosticQuestions.length
							: 0) * 100}%"
					></div>
				</div>
				<p class="text-[10px] font-bold text-slate-400">
					PERGUNTA {$rushStore.currentDiagnosticIndex + 1} DE {$rushStore.diagnosticQuestions
						.length}
				</p>
			</div>
			{#if loading}
				<div class="flex justify-center">
					<div
						class="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"
					></div>
				</div>
			{:else if $rushStore.questionData}
				<h1 class="mb-6 text-center text-xl leading-snug font-black text-slate-800">
					{$rushStore.questionData.question}
				</h1>
				<div class="grid grid-cols-1 gap-3 pb-24">
					{#each $rushStore.questionData.options as option}
						<button
							class="relative flex items-center justify-between rounded-2xl border-b-4 p-4 text-left font-bold transition-all
                                {selectedOption === option && isCorrect
								? 'border-green-700 bg-green-500 text-white'
								: selectedOption === option && !isCorrect
									? 'border-rose-700 bg-rose-500 text-white'
									: 'border-slate-200 bg-white text-slate-600 active:translate-y-1 active:border-b-0'}
                                {shakeOption === option ? 'animate-shake' : ''}"
							class:text-base={option.length > 30}
							class:text-lg={option.length <= 30}
							on:click={(e) => handleDiagnosticAnswer(option)}
							disabled={!!selectedOption}
						>
							<span class="pr-2">{option}</span>
							{#if selectedOption === option}{#if isCorrect}<CheckCircle2 size={20} />{:else}<X
										size={20}
									/>{/if}{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- ── PLAYING ──────────────────────────────────────────────────────────── -->
	{:else if $rushStore.currentState === 'PLAYING'}
		<!-- CONTAGEM 3-2-1 -->
		{#if countdown !== null}
			<div class="flex flex-1 flex-col items-center justify-center">
				<div class="countdown-number" class:countdown-final={countdown === 0}>
					{countdown === 0 ? '🚀' : countdown}
				</div>
				<p class="mt-4 animate-pulse text-lg font-black tracking-widest text-amber-400">
					{countdown === 3
						? 'PREPARA-TE...'
						: countdown === 2
							? 'QUASE...'
							: countdown === 1
								? 'JÁ!'
								: 'VÁ!'}
				</p>
			</div>

			<!-- LOADING (fetch ainda não voltou após contagem) -->
		{:else if loading}
			<div class="flex flex-1 flex-col items-center justify-center">
				<div
					class="mb-4 h-16 w-16 animate-spin rounded-full border-8 border-amber-200 border-t-amber-500"
				></div>
				<p class="animate-pulse text-lg font-black tracking-wide text-amber-400">A CARREGAR...</p>
			</div>
		{:else if $rushStore.questionData}
			<div
				class="animate-pop-in scrollbar-hide mx-auto flex w-full max-w-2xl flex-1 flex-col justify-start overflow-y-auto p-4 pb-40"
				bind:this={optionsContainer}
			>
				<!-- botão ver âncora novamente -->
				{#if $rushStore.questionData?.ancora}
					{@const ancora = $rushStore.questionData.ancora}
					<div class="mb-4 flex justify-center">
						<button
							on:click={() => (showAncoraModal = true)}
							class="flex animate-pulse items-center gap-2 rounded-full border-b-4 border-amber-700 bg-amber-500 px-5 py-2 font-black text-white shadow-md active:translate-y-1 active:border-b-0"
						>
							{#if ancora.tipo === 'visual'}<ImageIcon size={20} /> VER IMAGEM NOVAMENTE{:else}<FileText
									size={20}
								/> LER TEXTO NOVAMENTE{/if}
						</button>
					</div>
				{/if}

				<!-- badges tópico / streak / tipo -->
				<div
					class="mb-3 flex shrink-0 flex-wrap items-center justify-center gap-2 sm:mb-4 sm:gap-3"
				>
					<span
						class="flex items-center gap-1 rounded-full border-2 border-slate-100 bg-white px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase shadow-sm sm:gap-2 sm:px-3 sm:py-1 sm:text-xs"
					>
						<Hash size={12} class="sm:h-[14px] sm:w-[14px]" />
						{$rushStore.selectedSubtopic}
					</span>
					{#if $rushStore.streak > 1}
						<div
							class="animate-pop-in flex items-center gap-1 rounded-full border-2 {$rushStore.streak >=
							3
								? 'border-yellow-400 bg-yellow-100 text-yellow-700'
								: 'border-orange-200 bg-orange-100 text-orange-600'} px-2 py-0.5 shadow-sm sm:px-3 sm:py-1"
						>
							<Flame
								size={12}
								class="animate-pulse sm:h-[14px] sm:w-[14px] {$rushStore.streak >= 3
									? 'fill-yellow-500'
									: 'fill-orange-500'}"
							/>
							<span class="text-[10px] font-black sm:text-xs">COMBO x{$rushStore.streak}</span>
						</div>
					{/if}
					{#if $rushStore.questionData.type === 'true_false'}
						<span
							class="flex items-center gap-1 rounded-full border-2 border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700 sm:px-3 sm:py-1 sm:text-xs"
							>✅❌ V / F</span
						>
					{:else if $rushStore.questionData.type === 'cloze'}
						<span
							class="flex items-center gap-1 rounded-full border-2 border-teal-200 bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-700 sm:px-3 sm:py-1 sm:text-xs"
							>📝 Completa</span
						>
					{/if}
				</div>

				<div
					class="relative mb-4 shrink-0 rounded-3xl border-b-[6px] border-slate-100 bg-white p-4 shadow-xl sm:mb-6 sm:border-b-8 sm:p-5"
				>
					<div
						class="absolute -top-3 -left-3 rotate-12 rounded-lg bg-yellow-400 p-1 text-white shadow-lg sm:p-1.5"
					>
						<Zap class="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
					</div>
					{#if $rushStore.questionData.type === 'cloze'}
						<h1 class="text-center text-lg leading-snug font-black text-slate-800 sm:text-xl">
							{#each $rushStore.questionData.question.split('___') as part, i}
								{part}{#if i < $rushStore.questionData.question.split('___').length - 1}<span
										class="mx-1 inline-block min-w-[40px] border-b-4 border-teal-500 text-center text-teal-500 sm:min-w-[60px]"
										>___</span
									>{/if}
							{/each}
						</h1>
					{:else}
						<h1 class="text-center text-lg leading-snug font-black text-slate-800 sm:text-xl">
							{$rushStore.questionData.question}
						</h1>
					{/if}
				</div>

				<!-- OPÇÕES TRUE/FALSE -->
				{#if $rushStore.questionData.type === 'true_false'}
					<div class="grid grid-cols-2 gap-4">
						{#each ['Verdadeiro', 'Falso'] as option}
							{@const isSelected = selectedOption === option}
							{@const isRight = isSelected && isCorrect}
							{@const isWrong = isSelected && !isCorrect}
							{@const showGreen =
								selectedOption && option === $rushStore.questionData.correct_answer}
							<button
								class="flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-3xl border-b-4 p-5 text-lg font-black transition-all
                                    {isRight || showGreen
									? 'scale-[1.02] border-green-700 bg-green-500 text-white'
									: isWrong
										? 'border-rose-700 bg-rose-500 text-white'
										: option === 'Verdadeiro'
											? 'border-emerald-300 bg-emerald-50 text-emerald-700 active:translate-y-1 active:border-b-0'
											: 'border-rose-300 bg-rose-50 text-rose-700 active:translate-y-1 active:border-b-0'}
                                    {shakeOption === option ? 'animate-shake' : ''}"
								on:click={(e) => handleAnswer(option, e)}
								disabled={!!selectedOption}
								style={selectedOption &&
								!isSelected &&
								option !== $rushStore.questionData.correct_answer
									? 'opacity:0.4'
									: ''}
							>
								<span class="text-3xl">{option === 'Verdadeiro' ? '✅' : '❌'}</span>
								<span>{option}</span>
							</button>
						{/each}
					</div>

					<!-- OPÇÕES CLOZE -->
				{:else if $rushStore.questionData.type === 'cloze'}
					<div class="grid w-full grid-cols-2 gap-3">
						{#each $rushStore.questionData.options as option}
							{@const isSelected = selectedOption === option}
							{@const isRight = isSelected && isCorrect}
							{@const isWrong = isSelected && !isCorrect}
							{@const showGreen =
								selectedOption && option === $rushStore.questionData.correct_answer}
							<button
								class="group relative flex min-h-[50px] items-center justify-between rounded-2xl border-b-4 p-3 text-left font-bold transition-all sm:min-h-[60px] sm:p-4
        {mcClass(option)}
        {shakeOption === option ? 'animate-shake' : ''}"
								class:text-sm={option.length > 25}
								class:text-base={option.length <= 25 && option.length > 15}
								class:text-lg={option.length <= 15}
								on:click={(e) => handleAnswer(option, e)}
								disabled={!!selectedOption}
								style={mcStyle(option)}
							>
								<span class="pr-2 leading-tight">{option}</span>
								{#if selectedOption === option}{#if isCorrect}<CheckCircle2
											class="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
										/>{:else}<X class="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />{/if}{/if}
							</button>
						{/each}
					</div>

					<!-- OPÇÕES MÚLTIPLA ESCOLHA -->
				{:else}
					<div class="grid w-full grid-cols-1 gap-3">
						{#each $rushStore.questionData.options as option}
							<button
								class="group relative flex min-h-[50px] items-center justify-between rounded-2xl border-b-4 p-3 text-left font-bold transition-all sm:min-h-[60px] sm:p-4
        {mcClass(option)}
        {shakeOption === option ? 'animate-shake' : ''}"
								class:text-sm={option.length > 25}
								class:text-base={option.length <= 25 && option.length > 15}
								class:text-lg={option.length <= 15}
								on:click={(e) => handleAnswer(option, e)}
								disabled={!!selectedOption}
								style={mcStyle(option)}
							>
								<span class="pr-2 leading-tight">{option}</span>
								{#if selectedOption === option}{#if isCorrect}<CheckCircle2
											class="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
										/>{:else}<X class="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />{/if}{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- PAINEL DE FEEDBACK (slide up) -->
			{#if selectedOption}
				<div
					class="animate-slide-up fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-3xl p-4 shadow-[0_-10px_50px_rgba(0,0,0,0.2)]
                    {isCorrect
						? 'border-t-8 border-green-500 bg-green-100'
						: 'border-t-8 border-rose-500 bg-rose-100'}"
				>
					<div
						class="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 sm:flex-row"
					>
						<div class="w-full flex-1 text-center sm:text-left">
							{#if isCorrect}
								<div
									class="mb-2 flex items-center justify-center gap-2 text-xl font-black text-green-700 sm:justify-start"
								>
									<CheckCircle2 class="fill-current" size={24} />
									{#if $rushStore.streak >= 3}IMPARÁVEL! 🔥{:else if $rushStore.streak === 2}A
										BOMBAR! 💥{:else}ACERTASTE!{/if}
								</div>
								<p class="text-sm leading-relaxed font-medium text-green-800">
									{$rushStore.questionData.explanation || 'Muito bem!'}
								</p>
							{:else}
								<div
									class="mb-2 flex items-center justify-center gap-2 text-xl font-black text-rose-600 sm:justify-start"
								>
									<X class="fill-current" size={24} /> ERRADO
								</div>
								<div class="text-sm font-medium text-rose-800">
									Resposta certa: <strong
										class="rounded border border-rose-200 bg-white px-2 py-0.5"
										>{$rushStore.questionData.correct_answer}</strong
									>
								</div>
							{/if}
						</div>
						<button
							on:click={loadQuestion}
							class="w-full shrink-0 rounded-2xl border-b-4 px-8 py-4 text-lg font-black text-white shadow-xl transition-all active:translate-y-1 active:border-b-0 sm:w-auto
                            {isCorrect
								? 'border-green-700 bg-green-500'
								: 'border-rose-700 bg-rose-500'}"
						>
							{isCorrect ? 'CONTINUAR' : 'PRÓXIMA'}
						</button>
					</div>
					<div class="h-[env(safe-area-inset-bottom)]"></div>
				</div>
			{/if}
		{/if}

		<!-- ── GAMEOVER ─────────────────────────────────────────────────────────── -->
	{:else if $rushStore.currentState === 'GAMEOVER'}
		<div class="animate-zoom-in flex flex-1 flex-col items-center justify-center p-6 text-center">
			<div class="mb-4 animate-bounce text-7xl">
				{#if isTimeUp}⏰{:else}💔{/if}
			</div>
			<h1 class="mb-4 text-3xl font-black text-slate-800">
				{#if isTimeUp}Tempo Esgotado!{:else}Acabaram as vidas!{/if}
			</h1>
			<p class="mx-auto mb-6 max-w-xs text-base text-slate-500">
				{#if isTimeUp}Bom trabalho hoje!{:else}Tenta de novo!{/if}
			</p>
			<div
				class="mb-8 w-full max-w-sm rounded-3xl border-2 border-slate-100 bg-white p-6 shadow-lg"
			>
				<p class="mb-2 text-xs font-bold tracking-widest text-slate-500 uppercase">XP Ganho</p>
				<p class="text-5xl font-black text-amber-500">{$rushStore.xp}</p>
			</div>
			<button
				on:click={() => {
					if (isTimeUp) exitSession();
					else {
						rushStore.clear();
						isTimeUp = false;
					}
				}}
				class="w-full max-w-xs rounded-2xl border-b-4 border-blue-700 bg-blue-500 px-8 py-4 text-lg font-bold text-white shadow-lg active:translate-y-1 active:border-b-0"
			>
				{#if isTimeUp}Sair{:else}Voltar ao Menu{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	/* ── CONTAGEM 3-2-1 ───────────────────────────────────────────────────── */
	.countdown-number {
		font-family: 'Fredoka', sans-serif;
		font-size: 120px;
		font-weight: 700;
		color: #f59e0b;
		line-height: 1;
		animation: countdown-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
		text-shadow:
			0 8px 0 #b45309,
			0 12px 20px rgba(245, 158, 11, 0.4);
		user-select: none;
	}
	.countdown-final {
		font-size: 80px;
		animation: countdown-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes countdown-pop {
		0% {
			transform: scale(2);
			opacity: 0;
		}
		60% {
			transform: scale(0.9);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* ── BURST DE ESTRELAS ────────────────────────────────────────────────── */
	.burst-particle {
		position: fixed;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		pointer-events: none;
		z-index: 9999;
		transform: translate(-50%, -50%);
		animation: burst-fly 0.7s ease-out forwards;
	}
	@keyframes burst-fly {
		0% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(
					calc(-50% + cos(var(--angle)) * 80px),
					calc(-50% + sin(var(--angle)) * 80px)
				)
				scale(0);
			opacity: 0;
		}
	}

	/* ── XP FLOAT ─────────────────────────────────────────────────────────── */
	.xp-float {
		position: fixed;
		top: 52px;
		right: 16px;
		font-family: 'Fredoka', sans-serif;
		font-size: 22px;
		font-weight: 700;
		color: #f59e0b;
		pointer-events: none;
		z-index: 9999;
		animation: xp-float-up 0.9s ease-out forwards;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	}
	@keyframes xp-float-up {
		0% {
			transform: translateY(0) scale(0.8);
			opacity: 0;
		}
		20% {
			transform: translateY(-8px) scale(1.2);
			opacity: 1;
		}
		80% {
			transform: translateY(-40px) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(-55px) scale(0.8);
			opacity: 0;
		}
	}

	/* ── SHAKE ────────────────────────────────────────────────────────────── */
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		15% {
			transform: translateX(-8px);
		}
		30% {
			transform: translateX(8px);
		}
		45% {
			transform: translateX(-6px);
		}
		60% {
			transform: translateX(6px);
		}
		75% {
			transform: translateX(-3px);
		}
		90% {
			transform: translateX(3px);
		}
	}
	.animate-shake {
		animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
	}

	/* ── ANIMAÇÕES EXISTENTES ─────────────────────────────────────────────── */
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

	@keyframes popIn {
		0% {
			opacity: 0;
			transform: scale(0.9);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}
	.animate-pop-in {
		animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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

	.animate-bounce-slow {
		animation: bounce 3s infinite;
	}
	.animate-pulse-slow {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.zoom-75 {
		zoom: 0.75;
	}
	@media (min-width: 640px) {
		.sm\:zoom-100 {
			zoom: 1;
		}
	}
</style>
