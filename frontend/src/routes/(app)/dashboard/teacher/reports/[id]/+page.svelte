<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiFetch } from '$lib/utils/api';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import { notifications } from '$lib/store/notifications';
	import {
		ArrowLeft,
		AlertTriangle,
		TrendingUp,
		Clock,
		Calendar,
		FileText,
		Loader,
		Award,
		ChevronDown,
		ChevronUp,
		Target,
		MessageSquare,
		Zap,
		BookOpen,
		Download,
		CheckCircle2,
		XCircle,
		HelpCircle
	} from 'lucide-svelte';

	// --- ESTADO ---
	const studentId = $page.params.id;
	let report: any = null;
	let isLoading = true;
	let isExporting = false;
	let error: string | null = null;
	let timeRange = 'all';
	let expandedActivities = false;

	// Estilos Padronizados
	const selectClass =
		'bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm font-medium text-surface-700 dark:text-surface-200 py-1.5 pl-3 pr-8 appearance-none cursor-pointer shadow-sm transition-all hover:border-surface-400';

	$: (timeRange, carregarRelatorio());

	async function carregarRelatorio() {
		isLoading = true;
		error = null;
		try {
			const res = await apiFetch(
				`${PUBLIC_API_URL_HOST}/api/students/teacher/report/${studentId}?range=${timeRange}`
			);
			if (res.ok) {
				report = await res.json();
			} else {
				throw new Error('Falha ao carregar relatório');
			}
		} catch (err) {
			error = 'Não foi possível carregar os dados do aluno.';
		} finally {
			isLoading = false;
		}
	}

	async function exportarPDF() {
		isExporting = true;
		try {
			const response = await apiFetch(
				`${PUBLIC_API_URL_HOST}/api/pdf/student/${studentId}/report/pdf?range=${timeRange}`,
				{ method: 'GET', headers: { Accept: 'application/pdf' } }
			);
			if (!response.ok) throw new Error('Erro ao gerar PDF');
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `Relatorio_${report.aluno.nome}_${new Date().toISOString().split('T')[0]}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
			notifications.send('PDF gerado com sucesso!', 'success');
		} catch (e) {
			notifications.send('Falha ao exportar o PDF.', 'error');
		} finally {
			isExporting = false;
		}
	}

	// Helpers de Cores
	function getScoreColor(score: number) {
		if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
		if (score >= 50) return 'text-amber-600 dark:text-amber-400';
		return 'text-red-600 dark:text-red-400';
	}

	function getAvatarColor(name: string) {
		if (!name) return 'bg-surface-500';
		const gradients = [
			'bg-blue-500',
			'bg-emerald-500',
			'bg-purple-500',
			'bg-amber-500',
			'bg-rose-500',
			'bg-indigo-500'
		];
		return gradients[name.charCodeAt(0) % gradients.length];
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-PT', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getActivityIcon(type: string) {
		switch (type) {
			case 'RUSH':
				return Zap;
			case 'TUTOR':
				return MessageSquare;
			default:
				return FileText;
		}
	}
</script>

<svelte:head>
	<title>Relatório do Aluno | KMind</title>
</svelte:head>

<div class="animate-fade-in container mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-8">
	<div
		class="flex flex-col items-start justify-between gap-4 border-b border-surface-200 pb-4 md:flex-row md:items-center dark:border-surface-700"
	>
		<div class="flex items-center gap-3">
			<button
				on:click={() => history.back()}
				class="-ml-2 rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-primary-600 dark:hover:bg-surface-700"
			>
				<ArrowLeft size={20} />
			</button>
			<div>
				<h1 class="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
					Relatório Individual
				</h1>
			</div>
		</div>

		<div class="flex w-full items-center gap-3 md:w-auto">
			<div class="relative flex-1 md:flex-none">
				<select bind:value={timeRange} class={selectClass}>
					<option value="all">Todo o Período</option>
					<option value="30d">Últimos 30 Dias</option>
					<option value="7d">Últimos 7 Dias</option>
				</select>
				<Calendar
					size={14}
					class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-surface-400"
				/>
			</div>

			<button
				class="btn flex items-center gap-2 rounded-md border border-surface-300 bg-white px-3 py-1.5 text-sm font-medium text-surface-700 shadow-sm transition-all hover:bg-surface-50 disabled:opacity-50 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700"
				on:click={exportarPDF}
				disabled={isExporting || !report}
			>
				{#if isExporting}
					<Loader size={14} class="animate-spin" />
					<span class="hidden sm:inline">A gerar...</span>
				{:else}
					<Download size={14} />
					<span class="hidden sm:inline">Exportar PDF</span>
				{/if}
			</button>
		</div>
	</div>

	{#if isLoading}
		<div class="animate-pulse space-y-6">
			<div class="h-40 rounded-lg bg-surface-200 dark:bg-surface-800"></div>
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div class="h-64 rounded-lg bg-surface-200 lg:col-span-2 dark:bg-surface-800"></div>
				<div class="h-64 rounded-lg bg-surface-200 dark:bg-surface-800"></div>
			</div>
		</div>
	{:else if error}
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-12 text-center dark:border-red-900/30 dark:bg-red-900/10"
		>
			<AlertTriangle size={32} class="mx-auto mb-3 text-red-500" />
			<h3 class="font-bold text-red-800 dark:text-red-200">Erro ao carregar dados</h3>
			<p class="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
			<button
				class="mt-4 text-sm font-medium text-red-700 underline hover:text-red-800"
				on:click={carregarRelatorio}>Tentar novamente</button
			>
		</div>
	{:else if report}
		<div
			class="overflow-hidden rounded-lg border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-800"
		>
			<div class="flex flex-col justify-between gap-6 p-6 md:flex-row md:gap-8 md:p-8">
				<div class="flex gap-5">
					<div
						class={`h-16 w-16 rounded-lg ${getAvatarColor(report.aluno.nome)} flex items-center justify-center text-2xl font-bold text-white shadow-sm ring-4 ring-surface-50 dark:ring-surface-800`}
					>
						{report.aluno.nome.charAt(0)}
					</div>
					<div>
						<h2 class="text-2xl leading-tight font-bold text-surface-900 dark:text-white">
							{report.aluno.nome}
							{report.aluno.sobrenome}
						</h2>
						<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500">
							<span class="flex items-center gap-1.5 font-medium"
								><Target size={14} /> {report.aluno.classe}ª Classe</span
							>
							<span class="hidden h-1 w-1 rounded-full bg-surface-300 sm:inline"></span>
							<span class="flex items-center gap-1.5"
								><Award size={14} class="text-amber-500" /> {report.stats.xp} XP</span
							>
						</div>
					</div>
				</div>

				<div
					class="flex gap-8 border-t border-surface-100 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-8 dark:border-surface-700"
				>
					<div>
						<span class="text-[10px] font-bold tracking-wider text-surface-400 uppercase"
							>Média Global</span
						>
						<div class="text-3xl font-black {getScoreColor(report.stats.taxaGlobal)}">
							{report.stats.taxaGlobal}%
						</div>
					</div>
					<div>
						<span class="text-[10px] font-bold tracking-wider text-surface-400 uppercase"
							>Interações</span
						>
						<div class="text-3xl font-black text-surface-900 dark:text-white">
							{report.stats.totalInteracoes}
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div class="space-y-6 lg:col-span-2">
				{#if report.atencaoNecessaria.length > 0}
					<section
						class="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-900/10"
					>
						<h3
							class="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-red-800 uppercase dark:text-red-300"
						>
							<AlertTriangle size={16} />
							Tópicos Críticos
						</h3>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{#each report.atencaoNecessaria as item}
								<div
									class="flex items-center justify-between rounded-md border border-red-100 bg-white px-4 py-3 shadow-sm dark:border-red-900/40 dark:bg-surface-800"
								>
									<span
										class="truncate pr-2 text-sm font-semibold text-surface-700 dark:text-surface-200"
										>{item.topico}</span
									>
									<span class="rounded bg-red-500 px-1.5 py-0.5 text-xs font-black text-white"
										>{item.taxa}%</span
									>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<section
					class="rounded-lg border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-800"
				>
					<h3
						class="mb-6 flex items-center gap-2 text-base font-bold text-surface-900 dark:text-white"
					>
						<TrendingUp size={18} class="text-surface-400" />
						Domínio por Disciplina
					</h3>
					<div class="space-y-6">
						{#each report.disciplinas as disc}
							<div>
								<div class="mb-1.5 flex justify-between text-sm font-bold">
									<span class="text-surface-700 dark:text-surface-300">{disc.disciplina}</span>
									<span class={getScoreColor(disc.taxa)}>{disc.taxa}%</span>
								</div>
								<div
									class="h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700"
								>
									<div
										class="h-full rounded-full transition-all duration-1000 {disc.taxa < 50
											? 'bg-red-500'
											: disc.taxa < 70
												? 'bg-amber-500'
												: 'bg-emerald-500'}"
										style="width: {disc.taxa}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				</section>
			</div>

			<aside
				class="h-fit rounded-lg border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-800"
			>
				<h3
					class="mb-6 flex items-center gap-2 text-base font-bold text-surface-900 dark:text-white"
				>
					<Clock size={18} class="text-surface-400" />
					Atividade Recente
				</h3>

				<div class="relative space-y-6 border-l border-surface-200 pl-4 dark:border-surface-700">
					{#each report.historicoRecente.slice(0, expandedActivities ? 10 : 5) as log}
						<div class="group relative pl-6">
							<div
								class="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white dark:border-surface-800 {log.acertou ===
								true
									? 'bg-emerald-500'
									: log.acertou === false
										? 'bg-red-500'
										: 'bg-surface-400'} ring-1 ring-surface-200 dark:ring-surface-600"
							></div>

							<div>
								<div class="mb-0.5 flex items-center gap-2">
									<span class="text-[10px] font-bold tracking-wide text-surface-400 uppercase"
										>{formatDate(log.data)}</span
									>
									<span
										class="rounded border border-surface-200 bg-surface-100 px-1.5 text-[10px] font-bold text-surface-600 uppercase dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300"
									>
										{log.tipo}
									</span>
								</div>
								<h4
									class="text-sm leading-snug font-bold text-surface-800 transition-colors group-hover:text-primary-600 dark:text-surface-200"
								>
									{log.topico}
								</h4>
								{#if log.pergunta}
									<p class="mt-1 line-clamp-2 text-xs text-surface-500 italic">"{log.pergunta}"</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if report.historicoRecente.length > 5}
					<button
						on:click={() => (expandedActivities = !expandedActivities)}
						class="mt-6 flex w-full items-center justify-center gap-1 rounded py-2 text-xs font-bold text-surface-500 transition-colors hover:bg-surface-50 hover:text-surface-900 dark:hover:bg-surface-700/50"
					>
						{expandedActivities ? 'Ver Menos' : 'Ver Mais Histórico'}
						{#if expandedActivities}
							<ChevronUp size={14} />
						{:else}
							<ChevronDown size={14} />
						{/if}
					</button>
				{/if}
			</aside>
		</div>
	{/if}
</div>

<style>
	.animate-fade-in {
		animation: fadeIn 0.4s ease-out;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
