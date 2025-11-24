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
        LayoutDashboard, GraduationCap, FileText, Settings, Menu, X,
        Users, School, Key, AlertCircle, BookOpen, ChevronLeft, ChevronRight
    } from 'lucide-svelte';

    // --- ESTADO REATIVO ---
    $: user = $auth.user;
    $: isEncarregado = !!user?.perfilEncarregado;
    $: isProfessor = !!user?.perfilProfessor;
    $: isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;

    let isUserLoaded = false;

    // ESTADO DA SIDEBAR
    let sidebarOpen = false; // Mobile: começa fechado
    let sidebarExpanded = true; // Desktop: começa expandido
    
    // Detectar se é mobile
    let isMobile = false;
    
    onMount(() => {
        // Detectar tamanho de tela
        const checkMobile = () => {
            isMobile = window.innerWidth < 768;
            if (!isMobile) {
                sidebarOpen = false; // No desktop, não usamos overlay
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        const unsubscribe = auth.subscribe(($auth) => {
            if ($auth.user && !isUserLoaded) {
                auth.refreshUser().then(() => {
                    isUserLoaded = true;
                });
            } else if (!$auth.isLoading && !$auth.user) {
                goto('/login');
            }
        });
        
        return () => {
            unsubscribe();
            window.removeEventListener('resize', checkMobile);
        };
    });

    // Toggle sidebar
    function toggleSidebar() {
        if (isMobile) {
            sidebarOpen = !sidebarOpen;
        } else {
            sidebarExpanded = !sidebarExpanded;
        }
    }

    function closeMobileSidebar() {
        if (isMobile) {
            sidebarOpen = false;
        }
    }

    // --- GERAÇÃO DINÂMICA DO MENU ---
    $: menuItems = getMenuItems(isEncarregado, isProfessor, isProfessorAtivo);

    function getMenuItems(isEnc: boolean, isProf: boolean, isProfAtivo: boolean) {
        const items: any[] = [];

        items.push({ 
            label: 'Visão Geral', 
            href: '/dashboard', 
            icon: LayoutDashboard 
        });

        if (isEnc) {
            items.push(
                { type: 'header', label: 'Família' },
                { label: 'Portal Encarregado', href: '/dashboard/foreman', icon: Users },
                { label: 'Meus Educandos', href: '/dashboard/foreman/student', icon: GraduationCap },
                { label: 'Relatórios', href: '/dashboard/relatorios', icon: FileText }
            );
        }

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

        items.push(
            { type: 'divider' },
            { label: 'Definições', href: '/dashboard/settings', icon: Settings }
        );

        return items;
    }

    function isActive(itemHref: string, currentPath: string) {
        if (itemHref === '/dashboard') {
            return currentPath === '/dashboard';
        }
        return currentPath.startsWith(itemHref);
    }
</script>

<Notification/>

{#if $auth.isLoading || !isUserLoaded}
    <div class="h-screen w-full bg-surface-50 dark:bg-surface-900 flex flex-col items-center justify-center gap-4 animate-pulse transition-colors duration-300">
        <div class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-surface-500 font-medium">A carregar o seu espaço...</p>
    </div>
{:else}
    <div class="h-screen flex overflow-hidden bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-100 transition-colors duration-300">
        
        <!-- OVERLAY MOBILE -->
        {#if isMobile && sidebarOpen}
            <div 
                class="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300"
                on:click={closeMobileSidebar}
                on:keydown={(e) => e.key === 'Escape' && closeMobileSidebar()}
                role="button"
                tabindex="0"
            ></div>
        {/if}

        <!-- SIDEBAR -->
        <aside 
            class="fixed md:relative h-full flex flex-col bg-surface-100 dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 transition-all duration-300 shadow-lg z-40
                   {isMobile 
                       ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') + ' w-64'
                       : (sidebarExpanded ? 'w-64' : 'w-20')
                   }"
        >
            
            <!-- HEADER -->
            <div class="p-6 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0 {sidebarExpanded || isMobile ? '' : 'justify-center w-full'}">
                    <div class="w-8 h-8 bg-gradient-to-tr from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                        K
                    </div>
                    {#if sidebarExpanded || isMobile}
                        <span class="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-50 truncate transition-opacity duration-300">
                            Kani<span class="text-primary-500">Mente</span>
                        </span>
                    {/if}
                </div>

                <!-- Botão de fechar (mobile) ou collapse (desktop) -->
                <button 
                    on:click={toggleSidebar}
                    class="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors flex-shrink-0
                           {sidebarExpanded || isMobile ? '' : 'hidden'}"
                >
                    {#if isMobile}
                        <X size={20} class="text-surface-600 dark:text-surface-300" />
                    {:else}
                        <ChevronLeft size={20} class="text-surface-600 dark:text-surface-300" />
                    {/if}
                </button>
            </div>

            <!-- NAVEGAÇÃO -->
            <nav class="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
                {#each menuItems as item}
                    {#if item.type === 'header'}
                        {#if sidebarExpanded || isMobile}
                            <div class="pt-4 pb-2 px-2 text-xs font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500 transition-opacity duration-300">
                                {item.label}
                            </div>
                        {:else}
                            <div class="pt-4 pb-2 border-t border-surface-200 dark:border-surface-700"></div>
                        {/if}
                    {:else if item.type === 'divider'}
                        <div class="my-2 border-t border-surface-200 dark:border-surface-700"></div>
                    {:else}
                        <a 
                            href={item.href}
                            on:click={closeMobileSidebar}
                            class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm group
                                   {isActive(item.href, $page.url.pathname)
                                    ? 'bg-primary-500 text-white shadow-md' 
                                    : 'text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-primary-600 dark:hover:text-white'}
                                   {item.highlight ? 'text-warning-700 dark:text-warning-400 bg-warning-500/10 border border-warning-500/20' : ''}
                                   {sidebarExpanded || isMobile ? '' : 'justify-center'}"
                            title={sidebarExpanded || isMobile ? '' : item.label}
                        >
                            <svelte:component this={item.icon} size={18} class="{item.highlight ? 'text-warning-600 dark:text-warning-400' : ''} flex-shrink-0" />
                            {#if sidebarExpanded || isMobile}
                                <span class="flex-1 truncate transition-opacity duration-300">{item.label}</span>
                            {/if}
                        </a>
                    {/if}
                {/each}
            </nav>

            <!-- RODAPÉ PERFIL -->
            <div class="p-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800">
                <div class="flex items-center gap-3 {sidebarExpanded || isMobile ? '' : 'justify-center'}">
                    <div class="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-surface-700 dark:text-surface-200 font-bold text-lg ring-2 ring-white dark:ring-surface-700 shadow-sm flex-shrink-0">
                        {user?.nome?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {#if sidebarExpanded || isMobile}
                        <div class="flex-1 min-w-0 transition-opacity duration-300">
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
                    {/if}
                </div>
            </div>

            <!-- BOTÃO DE EXPANDIR (DESKTOP - COLLAPSED) -->
            {#if !isMobile && !sidebarExpanded}
                <button 
                    on:click={toggleSidebar}
                    class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                    title="Expandir menu"
                >
                    <ChevronRight size={16} />
                </button>
            {/if}
        </aside>

        <!-- ÁREA PRINCIPAL -->
        <div class="flex-1 flex flex-col h-full overflow-hidden relative bg-surface-50 dark:bg-surface-900 transition-all duration-300">
            
            <header class="h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
               {#if isMobile }
                <button 
                    on:click={toggleSidebar}
                    class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                >
                    <Menu size={24} class="text-surface-600 dark:text-surface-300" />
                </button>
                
                   {/if}
                <h2 class="hidden md:flex items-center gap-2 text-sm font-medium text-surface-500 dark:text-surface-400">
                    <span class="opacity-50">Dashboard</span>
                    <span>/</span>
                    <span class="text-surface-900 dark:text-surface-100 font-bold">
                        {menuItems.find(i => i.href && isActive(i.href, $page.url.pathname))?.label || 'Visão Geral'}
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