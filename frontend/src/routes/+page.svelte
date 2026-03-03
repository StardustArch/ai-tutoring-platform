<script lang="ts">
	import '../app.css';
	import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import { onMount } from 'svelte';
	import {
		Sparkles,
		BookOpen,
		Brain,
		Zap,
		Users,
		TrendingUp,
		MessageCircle,
		Award,
		Target,
		ChevronRight,
		Calculator,
		CheckCircle2,
		Star,
		ArrowRight,
		Play,
		Battery,
		Flame,
		Home,
		MessageSquare,
		Signal,
		User
	} from 'lucide-svelte';

	onMount(() => {
		// "Fire and forget": Dispara o ping e não bloqueia a tela
		console.log('⏰ A enviar despertador para os servidores...');

		fetch(`${PUBLIC_API_URL_HOST}/api/health/wakeup`)
			.then((res) => {
				if (res.ok) console.log('☀️ Servidores acordados e prontos!');
			})
			.catch(() => console.log('⏳ Servidores a acordar da hibernação...'));
	});
	// Funcionalidades (Organizadas para Bento Grid)
	const features = [
		{
			icon: Brain,
			title: 'IA Adaptativa',
			description: 'O sistema aprende com os erros do aluno e adapta a dificuldade em tempo real.',
			color: 'text-purple-500',
			bg: 'bg-purple-50 dark:bg-purple-900/10',
			colSpan: 'md:col-span-2'
		},
		{
			icon: Zap,
			title: 'Modo Rush',
			description: 'Sessões cronometradas para treinar a agilidade mental e foco.',
			color: 'text-amber-500',
			bg: 'bg-amber-50 dark:bg-amber-900/10',
			colSpan: 'md:col-span-1'
		},
		{
			icon: Users,
			title: 'Portal Família',
			description: 'Encarregados acompanham a evolução detalhada dos educandos.',
			color: 'text-emerald-500',
			bg: 'bg-emerald-50 dark:bg-emerald-900/10',
			colSpan: 'md:col-span-1'
		},
		{
			icon: TrendingUp,
			title: 'Analytics Avançado',
			description: 'Relatórios de desempenho comparativos e identificação de lacunas.',
			color: 'text-blue-500',
			bg: 'bg-blue-50 dark:bg-blue-900/10',
			colSpan: 'md:col-span-2'
		}
	];

	const subjects = [
		{
			id: 'matematica',
			name: 'Matemática',
			topics: ['Aritmética', 'Geometria', 'Lógica', 'Problemas'],
			icon: Calculator,
			color: 'text-blue-600 dark:text-blue-400',
			bg: 'bg-blue-50 dark:bg-blue-900/20'
		},
		{
			id: 'portugues',
			name: 'Português',
			topics: ['Gramática', 'Leitura', 'Ortografia', 'Verbos'],
			icon: BookOpen,
			color: 'text-rose-600 dark:text-rose-400',
			bg: 'bg-rose-50 dark:bg-rose-900/20'
		}
	];

	const testimonials = [
		{
			name: 'Maria Silva',
			role: 'Encarregada de Educação',
			text: 'O meu filho via o estudo como uma obrigação chata. Com o KMind e o sistema de XP, ele agora pede para estudar.',
			rating: 5
		},
		{
			name: 'Prof. João Macamo',
			role: 'Escola Primária 3 de Fevereiro',
			text: 'Consigo ver exatamente onde cada aluno tem dificuldades antes mesmo da prova. Uma ferramenta indispensável.',
			rating: 5
		},
		{
			name: 'Ana Costa',
			role: 'Mãe de 2 alunos',
			text: 'A interface é muito limpa e segura. Gosto de saber que eles estão a aprender num ambiente controlado.',
			rating: 5
		}
	];
</script>

<svelte:head>
	<title>KMind | O Futuro da Educação em Moçambique</title>
	<meta
		name="description"
		content="Plataforma de ensino inteligente para a 3ª e 4ª classe. Matemática e Português com IA."
	/>
</svelte:head>

<div
	class="min-h-screen w-full bg-white font-sans text-surface-900 selection:bg-primary-500/30 dark:bg-surface-950 dark:text-surface-50"
>
	<nav
		class="fixed top-0 z-50 w-full border-b border-surface-200/50 bg-white/80 backdrop-blur-md dark:border-surface-800/50 dark:bg-surface-950/80"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<a href="/" class="group flex items-center gap-2">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 font-bold text-white shadow-sm transition-colors group-hover:bg-primary-700"
					>
						K
					</div>
					<span class="text-lg font-bold tracking-tight text-surface-900 dark:text-white">
						K<span class="text-primary-600 dark:text-primary-400">Mind</span>
					</span>
				</a>

				<div class="flex items-center gap-3 md:gap-6">
					<div
						class="hidden items-center gap-6 text-sm font-medium text-surface-600 md:flex dark:text-surface-300"
					>
						<a href="#funcionalidades" class="transition-colors hover:text-primary-600"
							>Funcionalidades</a
						>
						<a href="#disciplinas" class="transition-colors hover:text-primary-600">Disciplinas</a>
						<!-- <a href="#depoimentos" class="hover:text-primary-600 transition-colors">Depoimentos</a> -->
					</div>

					<div class="hidden h-6 w-px bg-surface-200 md:block dark:bg-surface-800"></div>

					<ThemeSwitch />

					<a
						href="/login"
						class="px-3 py-2 text-sm font-bold text-surface-700 hover:text-primary-600 dark:text-surface-200"
					>
						Entrar
					</a>
					<a
						href="/register"
						class="btn hidden rounded-lg bg-surface-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-surface-800 sm:flex dark:bg-surface-50 dark:text-surface-900 dark:hover:bg-surface-200"
					>
						Começar Agora
					</a>
				</div>
			</div>
		</div>
	</nav>

	<section class="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
		<div
			class="pointer-events-none absolute top-0 left-1/2 h-full w-full max-w-7xl -translate-x-1/2"
		>
			<div
				class="animate-pulse-slow absolute top-20 left-10 h-[500px] w-[500px] rounded-full bg-primary-500/10 opacity-50 blur-[100px] dark:opacity-20"
			></div>
			<div
				class="absolute right-10 bottom-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 opacity-50 blur-[100px] dark:opacity-20"
			></div>
		</div>

		<div class="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
			<div
				class="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-100 px-3 py-1 text-xs font-bold tracking-wider text-surface-600 uppercase dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
			>
				<Sparkles size={14} class="text-primary-500" />
				Nova Geração de Ensino
			</div>

			<h1
				class="animate-fade-in-up mx-auto mb-6 max-w-4xl text-5xl leading-[1.1] font-black tracking-tight text-surface-900 delay-100 sm:text-6xl lg:text-7xl dark:text-white"
			>
				Educação Inteligente para <br class="hidden md:block" />
				<span
					class="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent dark:from-primary-400 dark:to-purple-400"
				>
					Mentes Brilhantes.
				</span>
			</h1>

			<p
				class="animate-fade-in-up mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-surface-600 delay-200 sm:text-xl dark:text-surface-400"
			>
				Apoio escolar personalizado para a 3ª e 4ª classe. Transformamos o estudo numa experiência
				motivadora com IA, gamificação e relatórios em tempo real.
			</p>

			<div class="animate-fade-in-up flex flex-col justify-center gap-4 delay-300 sm:flex-row">
				<a
					href="/register"
					class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary-500/25 transition-all hover:scale-105 hover:bg-primary-700"
				>
					Criar Conta Grátis
					<ArrowRight size={20} />
				</a>
				<a
					href="#como-funciona"
					class="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-8 py-4 text-lg font-bold text-surface-700 transition-all hover:scale-105 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:hover:border-surface-600"
				>
					Como Funciona
				</a>
			</div>
			<div
				class="relative mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-8 px-4 py-12 lg:flex-row lg:gap-12"
			>
				<div class="animate-fade-in-up w-full delay-200 lg:flex-1">
					<div
						class="relative aspect-[16/10] overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-2xl md:aspect-[21/9] dark:border-surface-700 dark:bg-surface-900"
					>
						<div
							class="flex h-10 items-center justify-between border-b border-surface-100 bg-surface-50/80 px-4 backdrop-blur-sm dark:border-surface-800 dark:bg-surface-900/80"
						>
							<div class="flex gap-1.5">
								<div class="h-3 w-3 rounded-full bg-red-400/80"></div>
								<div class="h-3 w-3 rounded-full bg-amber-400/80"></div>
								<div class="h-3 w-3 rounded-full bg-green-400/80"></div>
							</div>
							<div
								class="hidden rounded-md border border-surface-200 bg-white px-3 py-1 font-mono text-[10px] text-surface-400 sm:flex dark:border-surface-700 dark:bg-surface-800"
							>
								KMind.vercel.app/dashboard/student
							</div>
							<div class="w-10"></div>
						</div>

						<div
							class="grid h-full grid-cols-1 gap-6 bg-surface-50/30 p-4 md:grid-cols-3 md:p-6 dark:bg-surface-950"
						>
							<div class="flex flex-col justify-center space-y-4 md:col-span-2">
								<div
									class="group relative flex items-center justify-between overflow-hidden rounded-xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
								>
									<div
										class="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-primary-50 to-transparent opacity-50 dark:from-primary-900/20"
									></div>
									<div class="relative z-10">
										<h3 class="text-lg font-bold text-surface-900 dark:text-white">
											Olá, Campeão! 👋
										</h3>
										<p class="mb-3 text-sm text-surface-500">Vamos continuar a missão?</p>
										<div
											class="flex w-fit items-center gap-2 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
										>
											<Zap size={14} class="fill-current" /> Modo Rush: Frações
										</div>
									</div>
									<div
										class="relative z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform group-hover:scale-110 sm:flex"
									>
										<Play size={20} class="ml-1" />
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div
										class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-700 dark:bg-surface-800"
									>
										<div
											class="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-surface-500 uppercase"
										>
											<Award size={14} class="text-amber-500" /> XP Total
										</div>
										<div class="text-2xl font-black text-surface-900 dark:text-white">1,250</div>
									</div>
									<div
										class="rounded-xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-700 dark:bg-surface-800"
									>
										<div
											class="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-surface-500 uppercase"
										>
											<Target size={14} class="text-blue-500" /> Matemática
										</div>
										<div class="mb-2 h-2 w-full rounded-full bg-surface-100 dark:bg-surface-700">
											<div class="h-2 rounded-full bg-blue-500" style="width: 75%"></div>
										</div>
									</div>
								</div>
							</div>

							<div
								class="hidden h-full flex-col gap-4 rounded-xl border border-surface-200 bg-white p-5 md:col-span-1 md:flex dark:border-surface-700 dark:bg-surface-800"
							>
								<div
									class="flex items-center gap-3 border-b border-surface-100 pb-4 dark:border-surface-700"
								>
									<div
										class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 font-bold text-white"
									>
										J
									</div>
									<div>
										<div class="text-sm font-bold text-surface-900 dark:text-white">João Silva</div>
										<div class="text-xs text-surface-500">3ª Classe</div>
									</div>
								</div>
								<div class="space-y-3">
									<div class="flex items-center gap-3">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600"
										>
											<Zap size={14} />
										</div>
										<div class="flex-1">
											<div class="text-xs font-bold">Velocista</div>
											<div class="mt-1 h-1 w-full rounded-full bg-surface-100">
												<div class="h-1 w-4/5 rounded-full bg-amber-500"></div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div
					class="animate-fade-in-up relative h-[580px] w-[280px] flex-shrink-0 transform rounded-[3rem] border-[8px] border-surface-900 bg-surface-900 shadow-2xl ring-1 ring-white/10 delay-500 lg:translate-y-12"
				>
					<div class="absolute top-24 -right-3 h-16 w-1 rounded-r-md bg-surface-800"></div>
					<div class="absolute top-24 -left-3 h-8 w-1 rounded-l-md bg-surface-800"></div>
					<div class="absolute top-36 -left-3 h-16 w-1 rounded-l-md bg-surface-800"></div>

					<div
						class="relative flex h-full w-full flex-col overflow-hidden rounded-[2.5rem] bg-surface-50 dark:bg-surface-950"
					>
						<div
							class="flex h-8 items-center justify-between px-6 pt-2 text-[10px] font-bold text-surface-900 dark:text-white"
						>
							<span>9:41</span>
							<div class="flex gap-1">
								<div class="h-3 w-3"><Signal size={10} /></div>
								<div class="h-3 w-3"><Battery size={10} /></div>
							</div>
						</div>

						<div class="flex items-center justify-between px-5 py-4">
							<div class="flex flex-col">
								<span class="text-xs text-surface-500">Bom dia,</span>
								<span class="text-lg font-bold text-surface-900 dark:text-white">João 👋</span>
							</div>
							<div
								class="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-0.5 shadow-md"
							>
								<div
									class="flex h-full w-full items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white dark:border-surface-900"
								>
									J
								</div>
							</div>
						</div>

						<div class="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-20">
							<div
								class="relative overflow-hidden rounded-2xl bg-primary-600 p-5 text-white shadow-lg shadow-primary-500/30"
							>
								<div
									class="absolute top-0 right-0 -mt-8 -mr-8 h-24 w-24 rounded-full bg-white/10 blur-xl"
								></div>
								<div class="relative z-10">
									<div
										class="mb-1 flex items-center gap-2 text-xs font-bold tracking-wider text-primary-100 uppercase"
									>
										<Zap size={12} class="fill-current" /> Modo Rush
									</div>
									<h3 class="mb-3 text-xl font-bold">Frações</h3>
									<button
										class="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-primary-700 shadow-sm transition-transform active:scale-95"
									>
										<Play size={12} class="fill-current" /> Jogar Agora
									</button>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-3">
								<div
									class="flex flex-col items-center justify-center gap-1 rounded-xl border border-surface-200 bg-white p-3 text-center shadow-sm dark:border-surface-700 dark:bg-surface-800"
								>
									<div
										class="mb-1 rounded-full bg-amber-100 p-2 text-amber-500 dark:bg-amber-900/30"
									>
										<Award size={16} />
									</div>
									<span class="text-lg font-black text-surface-900 dark:text-white">1,250</span>
									<span class="text-[10px] font-bold text-surface-400 uppercase">XP Total</span>
								</div>
								<div
									class="flex flex-col items-center justify-center gap-1 rounded-xl border border-surface-200 bg-white p-3 text-center shadow-sm dark:border-surface-700 dark:bg-surface-800"
								>
									<div
										class="mb-1 rounded-full bg-green-100 p-2 text-green-500 dark:bg-green-900/30"
									>
										<Flame size={16} />
									</div>
									<span class="text-lg font-black text-surface-900 dark:text-white">5</span>
									<span class="text-[10px] font-bold text-surface-400 uppercase">Dias Seq.</span>
								</div>
							</div>

							<div>
								<h4 class="mb-3 text-sm font-bold text-surface-900 dark:text-white">Continuar</h4>
								<div
									class="flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-3 shadow-sm dark:border-surface-700 dark:bg-surface-800"
								>
									<div
										class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600"
									>
										<Calculator size={18} />
									</div>
									<div class="flex-1">
										<div class="text-xs font-bold text-surface-900 dark:text-white">Geometria</div>
										<div class="mt-1 h-1 w-full rounded-full bg-surface-100 dark:bg-surface-700">
											<div class="h-1 w-1/2 rounded-full bg-blue-500"></div>
										</div>
									</div>
									<ChevronRight size={16} class="text-surface-400" />
								</div>
							</div>
						</div>

						<div
							class="absolute bottom-0 flex w-full items-center justify-between border-t border-surface-200 bg-white px-6 py-4 text-surface-400 dark:border-surface-700 dark:bg-surface-800"
						>
							<button
								class="flex flex-col items-center gap-1 text-primary-600 dark:text-primary-400"
							>
								<Home size={20} />
								<span class="text-[10px] font-bold">Início</span>
							</button>
							<button
								class="flex flex-col items-center gap-1 transition-colors hover:text-surface-600 dark:hover:text-surface-200"
							>
								<BookOpen size={20} />
							</button>
							<button
								class="flex flex-col items-center gap-1 transition-colors hover:text-surface-600 dark:hover:text-surface-200"
							>
								<MessageSquare size={20} />
							</button>
							<button
								class="flex flex-col items-center gap-1 transition-colors hover:text-surface-600 dark:hover:text-surface-200"
							>
								<User size={20} />
							</button>
						</div>

						<div
							class="absolute bottom-1 left-1/2 h-1 w-1/3 -translate-x-1/2 rounded-full bg-surface-900/20 dark:bg-white/20"
						></div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section
		id="funcionalidades"
		class="border-y border-surface-200 bg-surface-50 px-4 py-24 dark:border-surface-800 dark:bg-surface-900/50"
	>
		<div class="mx-auto max-w-6xl">
			<div class="mx-auto mb-16 max-w-2xl text-center">
				<h2
					class="mb-4 text-3xl font-black tracking-tight text-surface-900 md:text-4xl dark:text-white"
				>
					Tudo o que precisa para o sucesso escolar
				</h2>
				<p class="text-lg text-surface-600 dark:text-surface-400">
					Uma plataforma completa que conecta alunos, encarregados e professores.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
				{#each features as feature}
					<div
						class="{feature.colSpan} group rounded-2xl border border-surface-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg dark:border-surface-700 dark:bg-surface-800"
					>
						<div
							class="h-12 w-12 rounded-xl {feature.bg} {feature.color} mb-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
						>
							<svelte:component this={feature.icon} size={24} />
						</div>
						<h3 class="mb-2 text-xl font-bold text-surface-900 dark:text-white">{feature.title}</h3>
						<p class="leading-relaxed text-surface-600 dark:text-surface-400">
							{feature.description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section id="disciplinas" class="px-4 py-24">
		<div class="mx-auto max-w-5xl">
			<div class="mb-12 flex flex-col items-end justify-between gap-6 md:flex-row">
				<div>
					<h2
						class="mb-2 text-3xl font-black tracking-tight text-surface-900 md:text-4xl dark:text-white"
					>
						Currículo Nacional
					</h2>
					<p class="text-lg text-surface-600 dark:text-surface-400">
						Conteúdos alinhados com o programa da 3ª e 4ª classe.
					</p>
				</div>
				<a
					href="/register"
					class="flex items-center gap-1 font-bold text-primary-600 hover:underline"
				>
					Ver plano curricular <ChevronRight size={16} />
				</a>
			</div>

			<div class="grid gap-6 md:grid-cols-2">
				{#each subjects as subject}
					<div
						class="group relative overflow-hidden rounded-2xl border border-surface-200 bg-white p-8 transition-all hover:border-primary-500/30 hover:shadow-xl dark:border-surface-700 dark:bg-surface-800"
					>
						<div
							class="absolute top-0 right-0 h-32 w-32 {subject.bg} rounded-bl-full opacity-50 transition-transform group-hover:scale-110"
						></div>

						<div class="relative z-10">
							<div
								class="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl {subject.bg} {subject.color}"
							>
								<svelte:component this={subject.icon} size={28} />
							</div>
							<h3 class="mb-4 text-2xl font-bold text-surface-900 dark:text-white">
								{subject.name}
							</h3>
							<div class="flex flex-wrap gap-2">
								{#each subject.topics as topic}
									<span
										class="rounded-md border border-surface-200 bg-surface-100 px-3 py-1 text-sm font-medium text-surface-700 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300"
									>
										{topic}
									</span>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- <section id="depoimentos" class="py-24 px-4 bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-800">
    <div class="max-w-6xl mx-auto">
        <h2 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white mb-16 text-center tracking-tight">
            Aprovado por Famílias e Escolas
        </h2>

        <div class="grid md:grid-cols-3 gap-6">
            {#each testimonials as item}
                <div class="bg-white dark:bg-surface-800 p-8 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col h-full">
                    <div class="flex gap-1 mb-4">
                        {#each Array(item.rating) as _}
                            <Star size={16} class="fill-amber-400 text-amber-400" />
                        {/each}
                    </div>
                    <p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-6 flex-1">
                        "{item.text}"
                    </p>
                    <div class="flex items-center gap-3 pt-6 border-t border-surface-100 dark:border-surface-700">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-surface-200 to-surface-300 dark:from-surface-700 dark:to-surface-600 flex items-center justify-center font-bold text-surface-600 dark:text-surface-300 text-sm">
                            {item.name.charAt(0)}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-surface-900 dark:text-white">{item.name}</p>
                            <p class="text-xs text-surface-500">{item.role}</p>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
  </section> -->

	<section class="relative overflow-hidden px-4 py-24">
		<div class="absolute inset-0 bg-surface-900 dark:bg-surface-950"></div>
		<div class="absolute inset-0 opacity-20">
			<div
				class="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-900 via-surface-900 to-surface-900"
			></div>
		</div>

		<div class="relative z-10 mx-auto max-w-4xl space-y-8 text-center">
			<h2 class="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
				Comece hoje a transformação.
			</h2>
			<p class="mx-auto max-w-2xl text-xl text-surface-300">
				Junte-se a professores e encarregados que estão a elevar o nível da educação em Moçambique.
			</p>

			<div class="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
				<a
					href="/register"
					class="inline-flex transform items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-primary-900/50 transition-all hover:-translate-y-1 hover:bg-primary-500"
				>
					Criar Conta Gratuita
					<ChevronRight size={20} />
				</a>
			</div>

			<p class="pt-6 text-sm text-surface-500">Plataforma 100% segura • Suporte local</p>
		</div>
	</section>

	<footer
		class="border-t border-surface-200 bg-white px-4 pt-16 pb-8 dark:border-surface-800 dark:bg-surface-950"
	>
		<div class="mx-auto max-w-7xl">
			<div class="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4">
				<div class="col-span-2 md:col-span-1">
					<div class="mb-4 flex items-center gap-2">
						<div
							class="flex h-6 w-6 items-center justify-center rounded bg-primary-600 text-xs font-bold text-white"
						>
							K
						</div>
						<span class="font-bold text-surface-900 dark:text-white">KMind</span>
					</div>
					<p class="text-sm leading-relaxed text-surface-500">
						Desenvolvendo o futuro através da educação e tecnologia.
					</p>
				</div>

				<div>
					<h4 class="mb-4 font-bold text-surface-900 dark:text-white">Plataforma</h4>
					<ul class="space-y-2 text-sm text-surface-600 dark:text-surface-400">
						<li><a href="/login" class="transition-colors hover:text-primary-600">Entrar</a></li>
						<li>
							<a href="/register" class="transition-colors hover:text-primary-600">Registar</a>
						</li>
					</ul>
				</div>

				<div>
					<h4 class="mb-4 font-bold text-surface-900 dark:text-white">Legal</h4>
					<ul class="space-y-2 text-sm text-surface-600 dark:text-surface-400">
						<li>
							<a href="/privacy" class="transition-colors hover:text-primary-600">Privacidade</a>
						</li>
						<li><a href="/terms" class="transition-colors hover:text-primary-600">Termos</a></li>
					</ul>
				</div>

				<div>
					<h4 class="mb-4 font-bold text-surface-900 dark:text-white">Contacto</h4>
					<ul class="space-y-2 text-sm text-surface-600 dark:text-surface-400">
						<li>suporte@KMind.co.mz</li>
						<li>Maputo, Moçambique</li>
					</ul>
				</div>
			</div>

			<div
				class="flex flex-col items-center justify-between gap-4 border-t border-surface-200 pt-8 text-sm text-surface-500 md:flex-row dark:border-surface-800"
			>
				<p>&copy; {new Date().getFullYear()} KMind Inc.</p>
				<div class="flex gap-4"></div>
			</div>
		</div>
	</footer>
</div>

<style>
	.animate-fade-in-up {
		animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		opacity: 0;
		transform: translateY(20px);
	}

	.delay-100 {
		animation-delay: 0.1s;
	}
	.delay-200 {
		animation-delay: 0.2s;
	}
	.delay-300 {
		animation-delay: 0.3s;
	}
	.delay-500 {
		animation-delay: 0.5s;
	}

	@keyframes fadeInUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-pulse-slow {
		animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.1;
		}
		50% {
			opacity: 0.3;
		}
	}
</style>
