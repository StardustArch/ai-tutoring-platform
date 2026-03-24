<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiFetch } from '$lib/utils/api';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import { notifications } from '$lib/store/notifications';
	import {
		ArrowLeft, AlertTriangle, TrendingUp, Clock, Calendar,
		FileText, Loader, Award, ChevronDown, ChevronUp, Target,
		MessageSquare, Zap, BookOpen, Download, CheckCircle2,
		XCircle, ThumbsUp, ThumbsDown, MessageCircle, ChevronRight,
		X, Activity, Brain, BarChart2
	} from 'lucide-svelte';

	// ── Estado principal ──────────────────────────────────────────────────────
	const studentId = $page.params.id;
	let report: any = null;
	let isLoading = true;
	let isExporting = false;
	let error: string | null = null;
	let timeRange = 'all';
	let expandedActivities = false;

	// ── Estado do slide-over de sessão ────────────────────────────────────────
	let sessaoAberta: number | null = null;
	let detalhe: any = null;
	let isLoadingDetalhe = false;

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
				console.log(report)
			} else {
				throw new Error('Falha ao carregar relatório');
			}
		} catch (err) {
			error = 'Não foi possível carregar os dados do aluno.';
		} finally {
			isLoading = false;
		}
	}

	async function abrirDetalhe(sessaoId: number) {
		sessaoAberta = sessaoId;
		isLoadingDetalhe = true;
		detalhe = null;
		try {
			const res = await apiFetch(
				`${PUBLIC_API_URL_HOST}/api/students/teacher/session/${sessaoId}/detail`
			);
			if (res.ok) {
				detalhe = await res.json();
			} else {
				throw new Error('Falha ao carregar detalhe');
			}
		} catch {
			notifications.send('Não foi possível carregar o detalhe da sessão.', 'error');
			sessaoAberta = null;
		} finally {
			isLoadingDetalhe = false;
		}
	}

	function fecharDetalhe() {
		sessaoAberta = null;
		detalhe = null;
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
		} catch {
			notifications.send('Falha ao exportar o PDF.', 'error');
		} finally {
			isExporting = false;
		}
	}

	async function votarDidatica(idContexto: number, isAdequado: boolean) {
		try {
			const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/teacher/evaluate-ia`, {
				method: 'POST',
				body: JSON.stringify({ idContexto, isAdequado })
			});
			if (res.ok) {
				notifications.send('Avaliação registada! Obrigado pelo feedback.', 'success');
				report.trilhaAuditoria = report.trilhaAuditoria.map((t: any) =>
					t.idContexto === idContexto ? { ...t, avaliado: true, voto: isAdequado } : t
				);
			}
		} catch {
			notifications.send('Erro ao guardar avaliação.', 'error');
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────────
	function getScoreColor(score: number) {
		if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
		if (score >= 50) return 'text-amber-600 dark:text-amber-400';
		return 'text-red-600 dark:text-red-400';
	}

	function getAvatarColor(name: string) {
		if (!name) return 'bg-surface-500';
		const gradients = ['bg-blue-500','bg-emerald-500','bg-purple-500','bg-amber-500','bg-rose-500','bg-indigo-500'];
		return gradients[name.charCodeAt(0) % gradients.length];
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-PT', {
			day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
		});
	}

	function formatDuracao(segundos: number | null) {
		if (!segundos) return '—';
		if (segundos < 60) return `${segundos}s`;
		return `${Math.round(segundos / 60)}min`;
	}

	function getModoIcon(modo: string) {
		switch (modo) {
			case 'RUSH': return Zap;
			case 'TUTOR': return MessageSquare;
			case 'LESSON': return BookOpen;
			default: return FileText;
		}
	}

	function getModoColor(modo: string) {
		switch (modo) {
			case 'RUSH': return 'text-amber-500';
			case 'TUTOR': return 'text-blue-500';
			case 'LESSON': return 'text-emerald-500';
			default: return 'text-surface-400';
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'CONCLUIDA': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
			case 'ABANDONADA': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
			default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
		}
	}
</script>

<svelte:head>
	<title>Relatório do Aluno | KMind</title>
</svelte:head>

<!-- Overlay do slide-over -->
{#if sessaoAberta !== null}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
		on:click={fecharDetalhe}
	></div>

	<!-- Slide-over -->
	<div class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-surface-900">
		<!-- Cabeçalho -->
		<div class="flex items-center justify-between border-b border-surface-200 px-6 py-4 dark:border-surface-700">
			<h2 class="text-base font-bold text-surface-900 dark:text-white">Detalhe da Sessão</h2>
			<button
				on:click={fecharDetalhe}
				class="rounded-md p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800"
			>
				<X size={18} />
			</button>
		</div>

		<!-- Conteúdo -->
		<div class="flex-1 overflow-y-auto">
			{#if isLoadingDetalhe}
				<div class="flex h-full items-center justify-center">
					<Loader size={28} class="animate-spin text-primary-500" />
				</div>
			{:else if detalhe}
				<!-- Resumo da sessão -->
				<div class="border-b border-surface-100 bg-surface-50 px-6 py-4 dark:border-surface-700 dark:bg-surface-800/50">
					<div class="flex items-center gap-3 mb-3">
						<svelte:component
							this={getModoIcon(detalhe.sessao.modo)}
							size={18}
							class={getModoColor(detalhe.sessao.modo)}
						/>
						<span class="font-bold text-surface-800 dark:text-white">{detalhe.sessao.modo}</span>
						<span class="text-xs px-2 py-0.5 rounded font-bold {getStatusBadge(detalhe.sessao.status)}">
							{detalhe.sessao.status}
						</span>
					</div>
					<div class="grid grid-cols-3 gap-3 text-center">
						<div class="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-surface-800">
							<div class="text-lg font-black text-emerald-600">{detalhe.resumo.acertos}</div>
							<div class="text-[10px] font-bold uppercase text-surface-400">Acertos</div>
						</div>
						<div class="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-surface-800">
							<div class="text-lg font-black text-red-500">{detalhe.resumo.erros}</div>
							<div class="text-[10px] font-bold uppercase text-surface-400">Erros</div>
						</div>
						<div class="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-surface-800">
							<div class="text-lg font-black {getScoreColor(detalhe.resumo.taxaAcerto)}">{detalhe.resumo.taxaAcerto}%</div>
							<div class="text-[10px] font-bold uppercase text-surface-400">Taxa</div>
						</div>
					</div>

					<!-- Por tópico -->
					{#if Object.keys(detalhe.resumo.porTopico).length > 0}
						<div class="mt-3 space-y-1.5">
							{#each Object.entries(detalhe.resumo.porTopico) as [topico, stats]}
								{@const s = stats as any}
								<div class="flex items-center justify-between text-xs">
									<span class="truncate text-surface-600 dark:text-surface-400">{topico}</span>
									<span class="ml-2 shrink-0 font-bold {getScoreColor(s.total ? Math.round((s.acertos/s.total)*100) : 0)}">
										{s.acertos}/{s.total}
									</span>
								</div>
							{/each}
						</div>
					{/if}

					<div class="mt-2 text-xs text-surface-400">
						{formatDate(detalhe.sessao.inicio)} · {formatDuracao(detalhe.sessao.duracaoSegundos)}
					</div>
				</div>

				<!-- Timeline -->
				<div class="px-6 py-4 space-y-3">
					<h3 class="text-xs font-bold uppercase tracking-wider text-surface-400">
						Timeline da Sessão ({detalhe.timeline.length} eventos)
					</h3>

					{#each detalhe.timeline as evento}
						<div class="rounded-lg border border-surface-100 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
							<div class="flex items-center gap-2 mb-2">
								<svelte:component
									this={getModoIcon(evento.tipo)}
									size={12}
									class={getModoColor(evento.tipo)}
								/>
								<span class="text-[10px] font-black uppercase {getModoColor(evento.tipo)}">{evento.tipo}</span>
								{#if evento.slot !== null}
									<span class="text-[10px] text-surface-400">· Slot {evento.slot + 1}</span>
								{/if}
								<span class="ml-auto text-[10px] text-surface-400">{formatDate(evento.timestamp)}</span>
							</div>

							<!-- Exercício (Rush/Lesson) -->
							{#if evento.tipo !== 'TUTOR' && evento.pergunta}
								<p class="text-sm font-medium text-surface-800 dark:text-surface-200 mb-1">{evento.pergunta}</p>
								{#if evento.respostaAluno}
									<div class="flex items-center gap-2 mt-1">
										{#if evento.acertou}
											<CheckCircle2 size={13} class="text-emerald-500 shrink-0" />
										{:else}
											<XCircle size={13} class="text-red-500 shrink-0" />
										{/if}
										<span class="text-xs text-surface-500">
											Respondeu: <strong class="text-surface-700 dark:text-surface-300">{evento.respostaAluno}</strong>
											{#if !evento.acertou && evento.respostaCorrecta}
												· Correcto: <strong class="text-emerald-600">{evento.respostaCorrecta}</strong>
											{/if}
										</span>
									</div>
								{/if}
								{#if evento.ancoraChave}
									<div class="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
										🔗 {evento.ancoraChave}
									</div>
								{/if}

							<!-- Tutor (Chat) -->
							{:else if evento.tipo === 'TUTOR'}
								{#if evento.perguntaAluno}
									<div class="flex gap-2 mb-1.5">
										<span class="text-[10px] font-black uppercase text-surface-400 w-8 shrink-0 mt-0.5">Aluno</span>
										<p class="text-sm text-surface-700 dark:text-surface-300">{evento.perguntaAluno}</p>
									</div>
								{/if}
								{#if evento.respostaIa && evento.respostaIa.length > 0}
									<div class="flex gap-2">
										<span class="text-[10px] font-black uppercase text-primary-500 w-8 shrink-0 mt-0.5">IA</span>
										<div class="space-y-1">
											{#each evento.respostaIa as msg}
												<p class="text-sm text-surface-600 dark:text-surface-400">{msg}</p>
											{/each}
										</div>
									</div>
								{/if}
								{#if evento.assessment}
									<div class="mt-1.5 flex items-center gap-1 text-[10px] font-bold {evento.assessment === 'CORRECT' ? 'text-emerald-600' : 'text-red-500'}">
										{evento.assessment === 'CORRECT' ? '✓' : '✗'} Assessment: {evento.assessment}
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ── Página principal ───────────────────────────────────────────────────── -->
<div class="animate-fade-in container mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-8">

	<!-- Cabeçalho -->
	<div class="flex flex-col items-start justify-between gap-4 border-b border-surface-200 pb-4 md:flex-row md:items-center dark:border-surface-700">
		<div class="flex items-center gap-3">
			<button
				on:click={() => history.back()}
				class="-ml-2 rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-primary-600 dark:hover:bg-surface-700"
			>
				<ArrowLeft size={20} />
			</button>
			<h1 class="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
				Relatório Individual
			</h1>
		</div>

		<div class="flex w-full items-center gap-3 md:w-auto">
			<div class="relative flex-1 md:flex-none">
				<select bind:value={timeRange} class={selectClass}>
					<option value="all">Todo o Período</option>
					<option value="30d">Últimos 30 Dias</option>
					<option value="7d">Últimos 7 Dias</option>
				</select>
				<Calendar size={14} class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-surface-400" />
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
		<div class="rounded-lg border border-red-200 bg-red-50 p-12 text-center dark:border-red-900/30 dark:bg-red-900/10">
			<AlertTriangle size={32} class="mx-auto mb-3 text-red-500" />
			<h3 class="font-bold text-red-800 dark:text-red-200">Erro ao carregar dados</h3>
			<p class="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
			<button class="mt-4 text-sm font-medium text-red-700 underline hover:text-red-800" on:click={carregarRelatorio}>
				Tentar novamente
			</button>
		</div>

	{:else if report}

		<!-- Card do aluno -->
		<div class="overflow-hidden rounded-lg border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-800">
			<div class="flex flex-col justify-between gap-6 p-6 md:flex-row md:gap-8 md:p-8">
				<div class="flex gap-5">
					<div class={`h-16 w-16 rounded-lg ${getAvatarColor(report.aluno.nome)} flex items-center justify-center text-2xl font-bold text-white shadow-sm`}>
						{report.aluno.nome.charAt(0)}
					</div>
					<div>
						<h2 class="text-2xl font-bold leading-tight text-surface-900 dark:text-white">
							{report.aluno.nome} {report.aluno.sobrenome}
						</h2>
						<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500">
							<span class="flex items-center gap-1.5 font-medium"><Target size={14} /> {report.aluno.classe}ª Classe</span>
							<span class="flex items-center gap-1.5"><Award size={14} class="text-amber-500" /> {report.stats.xp} XP</span>
						</div>
					</div>
				</div>
				<div class="flex gap-8 border-t border-surface-100 pt-4 md:border-l md:border-t-0 md:pl-8 md:pt-0 dark:border-surface-700">
					<div>
						<span class="text-[10px] font-bold uppercase tracking-wider text-surface-400">Média Global</span>
						<div class="text-3xl font-black {getScoreColor(report.stats.taxaGlobal)}">{report.stats.taxaGlobal}%</div>
					</div>
					<div>
						<span class="text-[10px] font-bold uppercase tracking-wider text-surface-400">Interações</span>
						<div class="text-3xl font-black text-surface-900 dark:text-white">{report.stats.totalInteracoes}</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Insights e Recomendações -->
		{#if report.insights?.length > 0 || report.recomendacoes?.length > 0}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#if report.insights?.length > 0}
					<div class="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
						<h3 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
							<Brain size={14} /> Insights
						</h3>
						<ul class="space-y-1">
							{#each report.insights as insight}
								<li class="text-sm text-blue-800 dark:text-blue-300">{insight}</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if report.recomendacoes?.length > 0}
					<div class="rounded-lg border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
						<h3 class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
							<Activity size={14} /> Recomendações
						</h3>
						<ul class="space-y-1">
							{#each report.recomendacoes as rec}
								<li class="text-sm text-amber-800 dark:text-amber-300">{rec}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div class="space-y-6 lg:col-span-2">

				<!-- Tópicos críticos -->
				{#if report.atencaoNecessaria?.length > 0}
					<section class="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-900/10">
						<h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red-800 dark:text-red-300">
							<AlertTriangle size={16} /> Tópicos Críticos
						</h3>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{#each report.atencaoNecessaria as item}
								<div class="flex items-center justify-between rounded-md border border-red-100 bg-white px-4 py-3 shadow-sm dark:border-red-900/40 dark:bg-surface-800">
									<span class="truncate pr-2 text-sm font-semibold text-surface-700 dark:text-surface-200">{item.topico} ({item.disciplina})</span>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Sessões Navegáveis -->
				{#if report.sessoesRecentes?.length > 0}
					<section class="overflow-hidden rounded-lg border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-800">
						<div class="border-b border-surface-100 bg-surface-50/50 px-4 py-3 dark:border-surface-700 dark:bg-surface-900/50">
							<h3 class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
								<Clock size={16} class="text-primary-500" />
								Sessões Recentes
							</h3>
							<p class="mt-0.5 text-xs text-surface-500">Clique numa sessão para ver a timeline completa</p>
						</div>

						<div class="divide-y divide-surface-100 dark:divide-surface-700">
							{#each report.sessoesRecentes as sessao}
								<button
									on:click={() => abrirDetalhe(sessao.id)}
									class="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/50"
								>
									<!-- Modo icon -->
									<div class="shrink-0">
										<svelte:component
											this={getModoIcon(sessao.modo)}
											size={16}
											class={getModoColor(sessao.modo)}
										/>
									</div>

									<!-- Info -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-sm font-semibold text-surface-800 dark:text-surface-200">{sessao.modo}</span>
											<span class="text-[10px] px-1.5 py-0.5 rounded font-bold {getStatusBadge(sessao.status)}">
												{sessao.status}
											</span>
											{#if sessao.licaoConcluida}
												<span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
													Lição ✓
												</span>
											{/if}
										</div>
										<span class="text-xs text-surface-400">{formatDate(sessao.inicio)}</span>
									</div>

									<!-- Métricas -->
									<div class="flex items-center gap-4 text-xs shrink-0">
										{#if sessao.totalExercicios > 0}
											<span class="text-emerald-600 font-bold">{sessao.acertos}✓</span>
											<span class="text-red-500 font-bold">{sessao.erros}✗</span>
										{/if}
										{#if sessao.totalMensagens > 0}
											<span class="text-blue-500 font-medium">{sessao.totalMensagens} msgs</span>
										{/if}
										<span class="text-surface-400">{formatDuracao(sessao.duracaoSegundos)}</span>
										<ChevronRight size={14} class="text-surface-300" />
									</div>
								</button>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Auditoria de Didática -->
				{#if report.trilhaAuditoria?.length > 0}
					<section class="overflow-hidden rounded-lg border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-800">
						<div class="border-b border-surface-100 bg-surface-50/50 px-4 py-3 dark:border-surface-700 dark:bg-surface-900/50">
							<h3 class="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
								<MessageCircle size={16} class="text-primary-500" />
								Auditoria de Didática
							</h3>
							<p class="mt-0.5 text-xs text-surface-500">Avalie se as explicações da IA foram adequadas para o nível do aluno.</p>
						</div>

						<div class="divide-y divide-surface-100 dark:divide-surface-700">
							{#each report.trilhaAuditoria as trilha}
								<div class="p-5">
									<div class="flex items-start justify-between mb-3">
										<div>
											<span class="text-[10px] font-black uppercase px-2 py-0.5 rounded {trilha.statusDidatico === 'ALERTA' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : trilha.statusDidatico === 'EXCELENTE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-surface-100 text-surface-600'}">
												{trilha.statusDidatico}
											</span>
											<h4 class="text-sm font-bold mt-1.5 text-surface-800 dark:text-surface-200">
												{trilha.topico}
											</h4>
										</div>
										<span class="text-xs text-surface-400 shrink-0 ml-4">{formatDate(trilha.dataUltimaInteracao)}</span>
									</div>

									<div class="space-y-2 rounded-lg bg-surface-50 p-3 mb-3 border border-surface-100 dark:bg-surface-900/50 dark:border-surface-700">
										{#each trilha.interacoes as msg}
											<div class="flex gap-2">
												<span class="text-[10px] font-black w-8 shrink-0 mt-0.5 {msg.ator === 'IA' ? 'text-primary-500' : 'text-surface-400'} uppercase">
													{msg.ator}
												</span>
												<div class="text-sm leading-relaxed text-surface-700 dark:text-surface-300">
													{msg.mensagem}
													{#if msg.assessment}
														<span class="ml-2 text-[10px] font-bold {msg.assessment === 'CORRECT' ? 'text-emerald-600' : 'text-red-500'}">
															[{msg.assessment}]
														</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>

									<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
										<p class="text-xs italic text-surface-500">
											<strong>Diagnóstico:</strong> {trilha.resumoProblema}
										</p>
										<div class="flex items-center gap-2 shrink-0">
											{#if trilha.avaliado}
												<span class="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800">
													<CheckCircle2 size={13} /> Avaliação Registada
												</span>
											{:else}
												<span class="text-xs font-medium text-surface-500">A didática foi adequada?</span>
												<button
													on:click={() => votarDidatica(trilha.idContexto, true)}
													class="p-1.5 rounded-full border border-surface-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all dark:border-surface-600"
													title="Adequada"
												>
													<ThumbsUp size={14} />
												</button>
												<button
													on:click={() => votarDidatica(trilha.idContexto, false)}
													class="p-1.5 rounded-full border border-surface-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all dark:border-surface-600"
													title="Inadequada"
												>
													<ThumbsDown size={14} />
												</button>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Domínio por Disciplina -->
				{#if report.disciplinas?.length > 0}
					<section class="rounded-lg border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-800">
						<h3 class="mb-5 flex items-center gap-2 text-base font-bold text-surface-900 dark:text-white">
							<BarChart2 size={18} class="text-surface-400" />
							Domínio por Disciplina
						</h3>
						<div class="space-y-5">
							{#each report.disciplinas as disc}
								<div>
									<div class="mb-1.5 flex justify-between text-sm font-bold">
										<span class="text-surface-700 dark:text-surface-300">{disc.disciplina}</span>
										<span class={getScoreColor(disc.taxa)}>{disc.taxa}%</span>
									</div>
									<div class="h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
										<div
											class="h-full rounded-full transition-all duration-1000 {disc.taxa < 50 ? 'bg-red-500' : disc.taxa < 70 ? 'bg-amber-500' : 'bg-emerald-500'}"
											style="width: {disc.taxa}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>

			<!-- Sidebar: Actividade Recente -->
			<aside class="h-fit rounded-lg border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-800">
				<h3 class="mb-5 flex items-center gap-2 text-base font-bold text-surface-900 dark:text-white">
					<Clock size={18} class="text-surface-400" />
					Atividade Recente
				</h3>

				<div class="relative space-y-5 border-l border-surface-200 pl-4 dark:border-surface-700">
					{#each (report.historicoRecente || []).slice(0, expandedActivities ? 10 : 5) as log}
						<div class="group relative pl-5">
							<div
								class="absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-white dark:border-surface-800 ring-1 ring-surface-200 dark:ring-surface-600
								{log.acertou === true ? 'bg-emerald-500' : log.acertou === false ? 'bg-red-500' : 'bg-surface-400'}"
							></div>
							<div>
								<div class="mb-0.5 flex items-center gap-2">
									<span class="text-[10px] font-bold uppercase tracking-wide text-surface-400">{formatDate(log.data)}</span>
									<span class="rounded border border-surface-200 bg-surface-100 px-1.5 text-[10px] font-bold text-surface-600 uppercase dark:border-surface-600 dark:bg-surface-700 dark:text-surface-300">
										{log.tipo}
									</span>
								</div>
								<h4 class="text-sm font-bold leading-snug text-surface-800 dark:text-surface-200 transition-colors group-hover:text-primary-600">
									{log.topico}
								</h4>
								{#if log.pergunta}
									<p class="mt-0.5 line-clamp-2 text-xs italic text-surface-500">"{log.pergunta}"</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if (report.historicoRecente || []).length > 5}
					<button
						on:click={() => (expandedActivities = !expandedActivities)}
						class="mt-5 flex w-full items-center justify-center gap-1 rounded py-2 text-xs font-bold text-surface-500 transition-colors hover:bg-surface-50 hover:text-surface-900 dark:hover:bg-surface-700/50"
					>
						{expandedActivities ? 'Ver Menos' : 'Ver Mais Histórico'}
						{#if expandedActivities}<ChevronUp size={14} />{:else}<ChevronDown size={14} />{/if}
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
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>