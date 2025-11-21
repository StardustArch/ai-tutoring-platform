<script lang="ts">
    import { page } from '$app/stores';
    import { auth } from '$lib/store/auth';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
	import '../../../app.css'
    
    // Componentes
    import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
    import LogoutButton from '$lib/components/LogoutButton.svelte';
    import Notification from '$lib/components/Notification.svelte'; 

    // Ícones Lucide
    import { 
        LayoutDashboard, GraduationCap, FileText, Settings, Menu,
        Users, School, Key, AlertCircle, BookOpen
    } from 'lucide-svelte';

    // --- ESTADO REATIVO ---
    $: user = $auth.user;
    $: isEncarregado = !!user?.perfilEncarregado;
    $: isProfessor = !!user?.perfilProfessor;
    
    // Verificação V4.0: Professor está "ativo" se tiver nome da escola definido
    $: isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;

    let isUserLoaded = false;

    // --- GERAÇÃO DINÂMICA DO MENU ---
    $: menuItems = getMenuItems(isEncarregado, isProfessor, isProfessorAtivo);

    function getMenuItems(isEnc: boolean, isProf: boolean, isProfAtivo: boolean) {
        const items: any[] = [];

        // 1. VISÃO GERAL (SEMPRE NO TOPO)
        items.push({ 
            label: 'Visão Geral', 
            href: '/dashboard', 
            icon: LayoutDashboard 
        });

        // 2. PERFIL ENCARREGADO (FAMÍLIA)
        if (isEnc) {
            items.push(
                { type: 'header', label: 'Família' },
                { label: 'Portal Encarregado', href: '/dashboard/foreman', icon: Users },
                { label: 'Meus Educandos', href: '/dashboard/foreman/student', icon: GraduationCap },
                { label: 'Relatórios', href: '/dashboard/relatorios', icon: FileText }
            );
        }

        // 3. PERFIL PROFESSOR (DOCÊNCIA)
        if (isProf) {
            items.push({ type: 'header', label: 'Docência' });

            if (!isProfAtivo) {
                items.push(
                    { label: 'Concluir Perfil', href: '/dashboard/teacher/become-teacher', icon: AlertCircle, highlight: true }
                );
            } else {
                items.push(
                    { label: 'Minhas Turmas', href: '/dashboard/teacher/class', icon: BookOpen },
                    { label: 'Relatórios Turma', href: '/dashboard/professor/relatorios', icon: FileText }
                );
            }
        }

        // 4. RODAPÉ DO MENU
        items.push(
            { type: 'divider' },
            { label: 'Definições', href: '/dashboard/settings', icon: Settings }
        );

        return items;
    }

    // Função auxiliar para verificar se o menu está ativo
    function isActive(itemHref: string, currentPath: string) {
        if (itemHref === '/dashboard') {
            return currentPath === '/dashboard';
        }
        return currentPath.startsWith(itemHref);
    }

    onMount(() => {
        const unsubscribe = auth.subscribe(($auth) => {
            if ($auth.user && !isUserLoaded) {
                auth.refreshUser().then(() => {
                    isUserLoaded = true;
                });
            } else if (!$auth.isLoading && !$auth.user) {
                goto('/login');
            }
        });
        return () => unsubscribe();
    });
</script>

<Notification/>

{#if $auth.isLoading || !isUserLoaded}
    <!-- Loading Screen Suave -->
    <div class="h-screen w-full bg-surface-50 dark:bg-surface-900 flex flex-col items-center justify-center gap-4 animate-pulse transition-colors duration-300">
        <div class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-surface-500 font-medium">A carregar o seu espaço...</p>
    </div>
{:else}
    <!-- 
        LAYOUT PRINCIPAL 
        Correção: Usamos cores explícitas (bg-surface-50 e dark:bg-surface-900) 
        em vez de classes -token que podem causar conflitos visuais.
    -->
    <div class="h-screen flex overflow-hidden bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-100 transition-colors duration-300">
        
        <!-- SIDEBAR -->
        <!-- Light: Branco (surface-100) | Dark: Cinza Escuro (surface-800) -->
        <aside class="w-64 hidden md:flex flex-col bg-surface-100 dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 transition-colors duration-300 shadow-sm z-20">
            
            <div class="p-6 flex items-center gap-3">
                <div class="w-8 h-8 bg-gradient-to-tr from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">K</div>
                <span class="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
                    Kani<span class="text-primary-500">Mente</span>
                </span>
            </div>

            <nav class="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
                {#each menuItems as item}
                    {#if item.type === 'header'}
                        <div class="pt-4 pb-2 px-2 text-xs font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                            {item.label}
                        </div>
                    {:else if item.type === 'divider'}
                        <div class="my-2 border-t border-surface-200 dark:border-surface-700"></div>
                    {:else}
                        <a 
                            href={item.href}
                            class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm group
                                   {isActive(item.href, $page.url.pathname)
                                    ? 'bg-primary-500 text-white shadow-md' 
                                    : 'text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-primary-600 dark:hover:text-white'}
                                   {item.highlight ? 'text-warning-700 dark:text-warning-400 bg-warning-500/10 border border-warning-500/20' : ''}"
                        >
                            <svelte:component this={item.icon} size={18} class={item.highlight ? 'text-warning-600 dark:text-warning-400' : ''} />
                            <span class="flex-1">{item.label}</span>
                        </a>
                    {/if}
                {/each}
            </nav>

            <!-- RODAPÉ PERFIL -->
            <div class="p-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-surface-700 dark:text-surface-200 font-bold text-lg ring-2 ring-white dark:ring-surface-700 shadow-sm">
                        {user?.nome?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold truncate text-surface-900 dark:text-surface-50">
                            {user?.nome}
                        </p>
                        <p class="text-xs text-surface-500 dark:text-surface-400 truncate flex items-center gap-1">
                           {#if isProfessor && isEncarregado}
                                <span class="badge variant-soft-primary text-[10px] px-1">Pro</span>
                                <span class="badge variant-soft-secondary text-[10px] px-1">Pai</span>
                           {:else if isProfessor}
                                <span>Professor</span>
                           {:else if isEncarregado}
                                <span>Encarregado</span>
                           {:else}
                                Novo Utilizador
                           {/if}
                        </p>
                    </div>
                </div>
            </div>
        </aside>

        <!-- ÁREA PRINCIPAL -->
        <!-- Light: surface-50 | Dark: surface-900 (Contraste correto com a sidebar) -->
        <div class="flex-1 flex flex-col h-full overflow-hidden relative bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
            
            <header class="h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
                <button class="md:hidden btn btn-icon variant-ghost-surface"><Menu size={24} /></button>
                <h2 class="hidden md:flex items-center gap-2 text-sm font-medium text-surface-500 dark:text-surface-400">
                    <span class="opacity-50">Dashboard</span>
                    <span>/</span>
                    <span class="text-surface-900 dark:text-surface-100 font-bold">
                        {menuItems.find(i => isActive(i.href, $page.url.pathname))?.label || 'Visão Geral'}
                    </span>
                </h2>
                <div class="flex items-center gap-2">
                    <ThemeSwitch />
                    <div class="h-6 w-px bg-surface-200 dark:bg-surface-700 mx-2"></div>
                    <LogoutButton />
                </div>
            </header>
            
            <main class="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                <slot />
            </main>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 20px; }
</style>