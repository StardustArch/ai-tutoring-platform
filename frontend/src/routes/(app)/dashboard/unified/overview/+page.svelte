<svelte:head>
	<title>Dashboard - KaniMente</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		School,
		BarChart3,
		Plus,
		Users,
		GraduationCap,
		BookOpen,
		Target,
		Clock,
		ChevronRight,
		AlertCircle,
		Briefcase,
		ArrowUpRight
	} from 'lucide-svelte';
	import { apiFetch } from '$lib/utils/api';
	import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import { auth } from '$lib/store/auth';

	$: user = $auth.user;
	$: isEncarregado = !!user?.perfilEncarregado;
	$: isProfessor = !!user?.perfilProfessor;
	$: isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;

	let dashboardData: any = null;
	let encarregadoData: any = null;
	let professorData: any = null;
	let loading = true;

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		try {
			loading = true;
			const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/unified-dashboard`);

			if (res.ok) {
				dashboardData = await res.json();
				professorData = dashboardData.professor;
				encarregadoData = dashboardData.encarregado;
			}
		} catch (e) {
			console.error('Erro ao carregar dashboard unificado:', e);
		} finally {
			loading = false;
		}
	}

	function formatarNome(user: any): string {
		if (!user?.nome) return 'Utilizador';
		const parts = user.nome.split(' ');
		return parts.length > 0 ? parts[0] : user.nome;
	}
</script>

<div class="container mx-auto p-4 md:p-8 space-y-8 animate-fade-in max-w-8xl">
	<header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
		<div>
			<h1 class="h2 font-bold text-surface-900 dark:text-surface-50 tracking-tight">
				Dashboard
			</h1>
			<p class="text-surface-500 dark:text-surface-400 mt-1">
				Bem-vindo de volta, <span class="font-semibold text-primary-600 dark:text-primary-400">{formatarNome(user)}</span>.
			</p>
		</div>

		<div class="flex items-center gap-2">
			{#if isProfessor}
				<span class="badge variant-soft-primary rounded-md font-semibold">Professor</span>
			{/if}
			{#if isEncarregado}
				<span class="badge variant-soft-tertiary rounded-md font-semibold">Encarregado</span>
			{/if}
		</div>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{#if isProfessorAtivo}
			<div class="card p-4 rounded-lg border-l-4 border-primary-500 bg-white dark:bg-surface-800 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex justify-between items-start">
					<div>
						<p class="text-sm font-medium text-surface-500 uppercase tracking-wide">Turmas Ativas</p>
						<h3 class="h2 font-bold text-surface-900 dark:text-surface-50 mt-1">
							{dashboardData?.stats.totalTurmas || 0}
						</h3>
					</div>
					<div class="p-2 bg-surface-100 dark:bg-surface-700 rounded-md text-primary-600">
						<School size={20} />
					</div>
				</div>
				<div class="mt-4 text-xs text-surface-500 flex items-center gap-1">
					<Users size={12} />
					<span>{dashboardData?.stats.totalAlunosEnsina || 0} alunos totais</span>
				</div>
			</div>
		{:else if isProfessor}
			<div class="card p-4 rounded-lg border-l-4 border-warning-500 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
				<div class="flex justify-between items-start">
					<div>
						<p class="text-sm font-medium text-warning-700 dark:text-warning-500 uppercase tracking-wide">Ação Necessária</p>
						<h3 class="h3 font-bold text-surface-900 dark:text-surface-50 mt-1">Perfil Pendente</h3>
					</div>
					<div class="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-md text-warning-600">
						<AlertCircle size={20} />
					</div>
				</div>
				<button on:click={() => goto('/dashboard/teacher/become-teacher')} class="btn btn-sm variant-outline-warning mt-3 w-full rounded-md">
					Concluir Cadastro
				</button>
			</div>
		{/if}

		{#if isEncarregado}
			<div class="card p-4 rounded-lg border-l-4 border-tertiary-500 bg-white dark:bg-surface-800 shadow-sm hover:shadow-md transition-shadow">
				<div class="flex justify-between items-start">
					<div>
						<p class="text-sm font-medium text-surface-500 uppercase tracking-wide">Educandos</p>
						<h3 class="h2 font-bold text-surface-900 dark:text-surface-50 mt-1">
							{dashboardData?.stats.totalEducandos || 0}
						</h3>
					</div>
					<div class="p-2 bg-surface-100 dark:bg-surface-700 rounded-md text-tertiary-600">
						<Users size={20} />
					</div>
				</div>
				<div class="mt-4 text-xs text-surface-500 flex items-center gap-1">
					<Target size={12} />
					<span>Acompanhamento ativo</span>
				</div>
			</div>
			
			<div class="card p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-sm">
				<div class="flex justify-between items-start">
					<div>
						<p class="text-sm font-medium text-surface-500 uppercase tracking-wide">Atividades Hoje</p>
						<h3 class="h2 font-bold text-surface-900 dark:text-surface-50 mt-1">
							{dashboardData?.stats.atividadesHoje || 0}
						</h3>
					</div>
					<div class="p-2 bg-surface-100 dark:bg-surface-700 rounded-md text-surface-600">
						<Clock size={20} />
					</div>
				</div>
				<div class="mt-4 text-xs text-emerald-600 font-medium flex items-center gap-1">
					<ArrowUpRight size={12} />
					<span>Atualizado agora</span>
				</div>
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		
		<section class="space-y-4">
			<div class="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-2">
				<h2 class="h4 font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
					<Briefcase size={20} class="text-primary-500" />
					Painel do Professor
				</h2>
				{#if isProfessorAtivo}
					<button 
						on:click={() => goto('/dashboard/teacher/class/create-class?ref=homef')}
						class="btn btn-sm variant-filled-primary rounded-md font-medium"
					>
						<Plus size={16} class="mr-1" /> Nova Turma
					</button>
				{/if}
			</div>

			{#if isProfessorAtivo}
				<div class="card bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden shadow-sm">
					<div class="p-4 bg-surface-50 dark:bg-surface-900/40 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center">
						<span class="font-semibold text-sm uppercase text-surface-600">Minhas Turmas</span>
						<button on:click={() => goto('/dashboard/teacher/classes')} class="text-xs text-primary-600 hover:underline font-medium">Ver todas</button>
					</div>

					{#if professorData?.turmasRecentes?.length > 0}
						<div class="divide-y divide-surface-200 dark:divide-surface-700">
							{#each professorData.turmasRecentes.slice(0, 4) as turma}
								<div 
									class="p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors cursor-pointer flex items-center justify-between group"
									on:click={() => goto(`/dashboard/teacher/class/${turma.id}?ref=homef`)}
								>
									<div class="flex items-center gap-4">
										<div class="w-10 h-10 rounded-md bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-primary-600 font-bold border border-surface-200 dark:border-surface-600">
											{turma.nome.substring(0,2).toUpperCase()}
										</div>
										<div>
											<p class="font-semibold text-surface-900 dark:text-white group-hover:text-primary-600 transition-colors">{turma.nome}</p>
											<p class="text-xs text-surface-500">{turma.totalAlunos} Alunos • {turma.classe}ª Classe</p>
										</div>
									</div>
									<ChevronRight size={18} class="text-surface-300 group-hover:text-primary-500" />
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-8 text-center">
							<p class="text-surface-500 mb-4">Nenhuma turma ativa encontrada.</p>
						</div>
					{/if}
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<button on:click={() => goto('/dashboard/teacher/reports')} class="card variant-soft-surface p-4 rounded-lg border border-surface-200 hover:border-primary-400 transition-colors text-left group">
						<BarChart3 size={20} class="mb-2 text-surface-600 group-hover:text-primary-600" />
						<div class="font-semibold text-surface-800">Relatórios</div>
						<div class="text-xs text-surface-500">Desempenho da turma</div>
					</button>
					</div>

			{:else if isProfessor}
				<div class="card p-6 border-dashed border-2 border-surface-300 rounded-lg text-center bg-surface-50/50">
					<p class="text-surface-500">Complete o seu cadastro para gerir turmas.</p>
				</div>
			{:else}
				<div class="card p-6 border border-surface-200 rounded-lg text-center bg-surface-50">
					<h3 class="font-bold text-surface-800">Torne-se Professor</h3>
					<p class="text-sm text-surface-500 mt-2 mb-4">Crie turmas e acompanhe alunos.</p>
					<button on:click={() => goto('/dashboard/teacher/become-teacher')} class="btn variant-outline-primary rounded-md w-full">Ativar Perfil</button>
				</div>
			{/if}
		</section>

		<section class="space-y-4">
			<div class="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-2">
				<h2 class="h4 font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
					<GraduationCap size={20} class="text-tertiary-500" />
					Painel do Encarregado
				</h2>
			</div>

			{#if isEncarregado}
				<div class="card bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden shadow-sm">
					<div class="p-4 bg-surface-50 dark:bg-surface-900/40 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center">
						<span class="font-semibold text-sm uppercase text-surface-600">Meus Educandos</span>
						<button 
							on:click={() => goto('/dashboard/foreman/student/create?ref=homef')}
							class="text-xs text-tertiary-600 hover:underline font-medium flex items-center gap-1"
						>
							<Plus size={12} /> Adicionar
						</button>
					</div>

					{#if encarregadoData?.educandos?.length > 0}
						<div class="divide-y divide-surface-200 dark:divide-surface-700">
							{#each encarregadoData.educandos.slice(0, 3) as educando}
								<div class="p-4 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
									<div class="flex items-center gap-4">
										<div class="w-10 h-10 rounded-md bg-tertiary-100 dark:bg-tertiary-900/30 text-tertiary-700 dark:text-tertiary-400 flex items-center justify-center font-bold border border-tertiary-200 dark:border-tertiary-800">
											{educando.nome.charAt(0)}
										</div>
										<div>
											<p class="font-semibold text-surface-900 dark:text-white">{educando.nome}</p>
											<div class="flex items-center gap-2 text-xs text-surface-500">
												<span>{educando.classe}ª Classe</span>
												{#if educando.desempenho}
													<span class="badge variant-soft-success text-[10px] px-1 py-0 rounded-sm">
														{educando.desempenho}% Nota
													</span>
												{/if}
											</div>
										</div>
									</div>
									<button 
										on:click={() => goto(`/dashboard/foreman/student/${educando.id}/class`)}
										class="btn btn-sm variant-outline-surface border-surface-300 hover:bg-surface-100 rounded-md"
									>
										Detalhes
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-8 text-center">
							<p class="text-surface-500">Nenhum educando associado.</p>
						</div>
					{/if}
				</div>

				{#if encarregadoData?.atividadesRecentes?.length > 0}
					<div class="card bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4">
						<h3 class="font-bold text-sm text-surface-700 mb-3 uppercase tracking-wide">Últimas Atividades</h3>
						<div class="space-y-2">
							{#each encarregadoData.atividadesRecentes.slice(0, 3) as atividade}
								<div class="flex items-center justify-between text-sm p-2 rounded border border-surface-100 bg-surface-50/50">
									<div class="flex items-center gap-2">
										<div class={`w-2 h-2 rounded-full ${atividade.nota >= 50 ? 'bg-green-500' : 'bg-red-500'}`}></div>
										<span class="font-medium text-surface-700">{atividade.titulo}</span>
									</div>
									<div class="text-surface-500 text-xs">
										{atividade.nota}/100 pts
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

			{:else}
				<div class="card p-6 border border-surface-200 rounded-lg text-center bg-surface-50">
					<h3 class="font-bold text-surface-800">Área Familiar</h3>
					<p class="text-sm text-surface-500 mt-2 mb-4">Acompanhe o desempenho dos seus filhos.</p>
					<button on:click={() => goto('/dashboard/foreman/become-foreman')} class="btn variant-outline-tertiary rounded-md w-full">Ativar Encarregado</button>
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	/* Animação suave de entrada */
	.animate-fade-in {
		animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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