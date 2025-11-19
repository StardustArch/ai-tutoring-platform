<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/store/auth';
	import { redirect } from '@sveltejs/kit';
	import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
	import LogoutButton from '$lib/components/LogoutButton.svelte';
	
	// Importar ícones da Lucide
	import { 
		LayoutDashboard, 
		GraduationCap, 
		FileText, 
		Settings, 
		Menu,
		Users,
		School
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Estados do utilizador
	$: user = $auth.user;
	$: isEncarregado = !!user?.perfilEncarregado;
	$: isProfessor = !!user?.perfilProfessor;
	$: isAdmin = !!user?.administradorEscola;
	$: hasAnyProfile = isEncarregado || isProfessor || isAdmin;
	$: isProfessorPendente = isProfessor && user?.perfilProfessor?.isVerificado === false;
	let isUserLoaded = false;

	console.log($auth.user);
	// REDIRECT: Se está na rota base (/dashboard) e já tem perfil, vai para home
	$: if ($page.url.pathname === '/dashboard' && isAdmin){
		goto('/dashboard/admin-school/')
	}
	$: if ($page.url.pathname === '/dashboard' && isEncarregado){
		goto('/dashboard/home')
	}	
	$: if ($page.url.pathname === '/dashboard' && isProfessor){
		goto('/dashboard/home')
	}
	// Itens do menu baseados no perfil
	$: menuItems = getMenuItems();

	function getMenuItems() {
		const baseItems = [
			{ label: 'Visão Geral', href: '/dashboard/home', icon: LayoutDashboard }
		];

		if (isEncarregado) {
			return [
				...baseItems,
				{ label: 'Meus Educandos', href: '/dashboard/educandos', icon: Users },
				{ label: 'Relatórios', href: '/dashboard/relatorios', icon: FileText },
				{ label: 'Definições', href: '/dashboard/settings', icon: Settings }
			];
		}

		if (isProfessor) {
			return [
				...baseItems,
				{ label: 'Minhas Turmas', href: '/dashboard/turmas', icon: School },
				{ label: 'Meus Alunos', href: '/dashboard/alunos', icon: GraduationCap },
				{ label: 'Relatórios', href: '/dashboard/relatorios', icon: FileText },
				{ label: 'Definições', href: '/dashboard/settings', icon: Settings }
			];
		}

		if (isAdmin) {
			return [
				{ label: 'Visão Geral', href: '/dashboard/admin-school', icon: LayoutDashboard },
				{ label: 'Minha Escola', href: '/dashboard/admin-school/school', icon: School },
				{ label: 'Professores', href: '/dashboard/admin-school/list-teachers', icon: Users },
				{ label: 'Definições', href: '/dashboard/settings', icon: Settings }
			];
		}

		// Utilizador neutro - menu mínimo (onboarding)
		return [
			{ label: 'Onboarding', href: '/dashboard', icon: LayoutDashboard },
			{ label: 'Definições', href: '/dashboard/settings', icon: Settings }
		];
	}
    onMount(() => {
        // Usar uma reactive statement para atualizar quando o auth.user mudar
        const unsubscribe = auth.subscribe(($auth) => {
            if ($auth.user && !isUserLoaded) {
				auth.refreshUser();
                isUserLoaded = true;
            }
        });

        return () => unsubscribe();
    });
	</script>

{#if $auth.isLoading}
<div class="min-h-screen bg-surface-50 bg-surface-900 flex items-center justify-center">
	<div class="text-center space-y-6">
		<!-- Loading spinner -->
		<div class="relative">
			<div class="w-16 h-16 border-4 border-primary-200 border-primary-800 rounded-full animate-spin"></div>
			<div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-4 border-primary-500 rounded-full animate-ping"></div>
		</div>

		<div class="space-y-2">
			<h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100">
				A Carregar...
			</h1>
		</div>
	</div>
</div>

{:else}

<div class="h-screen flex overflow-hidden bg-surface-50-900-token">
	
	<!-- Sidebar -->
	<aside class="w-64 hidden md:flex flex-col bg-surface-100-800-token border-r border-surface-500/30 transition-colors duration-300">
		
		<!-- Logo -->
		<div class="p-6  border-surface-500/30">
			<a href="/" class="text-2xl font-bold text-primary-500 tracking-wide hover:opacity-80 transition-opacity flex items-center gap-2">
				<span>KaniMente</span>
			</a>
		</div>

		<!-- Menu Dinâmico -->
		<nav class="flex-1 p-4 space-y-1 overflow-y-auto">
			{#each menuItems as item}
				<a 
					href={item.href}
					class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
						   {$page.url.pathname === item.href 
							? 'bg-primary-500 text-white shadow-md' 
							: 'text-surface-600-300-token hover:bg-surface-200-700-token hover:text-primary-500'}"
				>
					<svelte:component this={item.icon} size={20} />
					<span class="font-medium">{item.label}</span>
				</a>
			{/each}
		</nav>

		<!-- Perfil do Utilizador -->
		<div class="p-4 border-t border-surface-500/30">
			<div class="flex items-center gap-3 p-3 rounded-xl bg-surface-200-700-token/50">
				<div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold shadow-sm">
					{user?.nome?.charAt(0).toUpperCase() || 'U'}
				</div>
				
				<div class="flex-1 min-w-0">
					<p class="text-sm font-bold truncate text-surface-900-50-token">
						{user?.nome} {user?.sobrenome}
					</p>
					<p class="text-xs text-surface-500-400-token truncate capitalize">
						{#if !hasAnyProfile}
							Utilizador
						{:else if isEncarregado}
							Encarregado
						{:else if isProfessorPendente}
							Professor (Pendente)
						{:else if isProfessor}
							Professor
						{:else if isAdmin}
							Administrador
						{/if}
					</p>
				</div>
			</div>
		</div>

	</aside>

	<!-- Conteúdo Principal -->
	<div class="flex-1 flex flex-col h-full overflow-hidden relative">
		
		<!-- Top Bar -->
		<header class="h-16 bg-surface-100-800-token/80 backdrop-blur-md border-b border-surface-500/30 flex items-center justify-between px-4 md:px-8 z-10 transition-colors duration-300">
			
			<button class="md:hidden btn btn-icon variant-ghost-surface">
				<Menu size={24} />
			</button>

			<h2 class="h3 font-bold hidden md:block text-surface-700-200-token flex items-center gap-2">
				{menuItems.find(i => i.href === $page.url.pathname)?.label || 'Dashboard'}
			</h2>

			<div class="flex items-center gap-3">
				<ThemeSwitch />
				<div class="h-6 w-px bg-surface-500/30 mx-1"></div>
				<LogoutButton />
			</div>
		</header>

		<!-- Área de Conteúdo - APENAS O SLOT -->
		<main class="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
			<slot />
		</main>
	</div>
</div>
{/if}
<style>
	@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
	.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
</style>