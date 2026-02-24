<script lang="ts">
    import { page } from '$app/stores';
    import { auth } from '$lib/store/auth'; 
    import { goto } from '$app/navigation';
    import { onDestroy, onMount } from 'svelte';
    import '../../../app.css';
    
    // Componentes
    import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
    import LogoutButton from '$lib/components/LogoutButton.svelte';
    import Notification from '$lib/components/Notification.svelte'; 

    // Ícones Lucide
    import { 
        LayoutDashboard, GraduationCap, FileText, Settings, Menu, X,
        Users, School, Key, AlertCircle, BookOpen, ChevronLeft, ChevronRight,
        Loader2, Home 
    } from 'lucide-svelte';
    import { browser } from '$app/environment';

    // --- ESTADO REATIVO ---
    $: user = $auth.user;
    $: isEncarregado = !!user?.perfilEncarregado;
    $: isProfessor = !!user?.perfilProfessor;
    $: isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;

    // ESTADO DA SIDEBAR
    let sidebarOpen = false; // Mobile: começa fechado (Drawer)
    let sidebarExpanded = true; // Desktop: começa expandido
    let isMobile = false;

    // --- 1. PROTEÇÃO DE ROTA ---
    $: if (browser && !$auth.isLoading && !$auth.isAuthenticated) {
        goto('/login');
    }

    onMount(async () => {
        await auth.initializeAuth();
        checkMobile();
        window.addEventListener('resize', checkMobile);
    });

    onDestroy(() => {
        if (browser) {
            window.removeEventListener('resize', checkMobile);
        }
    });

    // --- 2. Lógica de UI ---
    const checkMobile = () => {
        if (!browser) return;
        isMobile = window.innerWidth < 768;
        if (!isMobile) {
            sidebarOpen = false; // Garante consistência ao redimensionar
        }
    };

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
    
    // Filtra os 3 primeiros itens reais para a barra mobile
    $: mobileBottomItems = menuItems.filter(i => i.href).slice(0, 3);

    function getMenuItems(isEnc: boolean, isProf: boolean, isProfAtivo: boolean) {
        const items: any[] = [];
        const userHasBothProfiles = isEnc && isProf;

        if (userHasBothProfiles) {
            if (isProfAtivo) {
                items.push({ label: 'Visão Geral', href: '/dashboard/unified/overview', icon: LayoutDashboard, badge: 'ambos' });
            }
            items.push({ type: 'header', label: 'Docência' });
            if (!isProfAtivo) {
                items.push({ label: 'Concluir Perfil Professor', href: '/dashboard/teacher/become-teacher', icon: AlertCircle, highlight: true, badge: 'professor' });
            } else {
                items.push(
                    { label: 'Minhas Turmas', href: '/dashboard/teacher/class', icon: BookOpen, badge: 'professor' },
                    { label: 'Relatórios Turma', href: '/dashboard/teacher/reports', icon: FileText, badge: 'professor' }
                );
            }
            items.push({ type: 'header', label: 'Família' });
            items.push(
                { label: 'Meus Educandos', href: '/dashboard/foreman/student', icon: GraduationCap, badge: 'família' },
                { label: 'Relatórios Família', href: '/dashboard/foreman/reports', icon: FileText, badge: 'família' }
            );
        } else {
            if (isEnc) {
                items.push({ type: 'header', label: 'Família' });
                items.push(
                    { label: 'Visão Geral', href: '/dashboard/foreman/overview', icon: LayoutDashboard },
                    { label: 'Meus Educandos', href: '/dashboard/foreman/student', icon: GraduationCap },
                    { label: 'Relatórios', href: '/dashboard/foreman/reports', icon: FileText }
                );
            }
            if (isProf) {
                items.push({ type: 'header', label: 'Docência' });
                if (!isProfAtivo) {
                    items.push({ label: 'Concluir Perfil', href: '/dashboard/teacher/become-teacher', icon: AlertCircle, highlight: true });
                } else {
                    items.push(
                        { label: 'Visão Geral', href: '/dashboard/teacher/overview', icon: LayoutDashboard },
                        { label: 'Minhas Turmas', href: '/dashboard/teacher/class', icon: BookOpen },
                        { label: 'Relatórios Turma', href: '/dashboard/teacher/reports', icon: FileText }
                    );
                }
            }
        }

        items.push(
            { type: 'divider' },
            { label: 'Definições', href: '/dashboard/settings', icon: Settings }
        );

        return items;
    }

    function isActive(itemHref: string, currentPath: string) {
        if (!itemHref) return false;
        if (itemHref === '/dashboard') {
            return currentPath === '/dashboard';
        }
        return currentPath.startsWith(itemHref);
    }

    $: activeItem = menuItems.find(i => i.href && isActive(i.href, $page.url.pathname));

    function formatarNome(u: any): string {
        if (!u || !u.nome) return 'Utilizador';
        const fullName = `${u.nome} ${u.sobrenome || ''}`.trim();
        const parts = fullName.split(/\s+/);
        if (parts.length === 0) return '';
        const firstName = parts[0];
        const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        if (parts.length <= 2) return fullName;
        const middleInitials = parts.slice(1, -1).map(n => n[0].toUpperCase() + '.');
        return [firstName, ...middleInitials, lastName].filter(Boolean).join(' ');
    }
</script>

<Notification/>

{#if $auth.isLoading}
    <div class="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-surface-950 p-4">
        <div class="text-center space-y-6 animate-fade-in">
            <div class="relative inline-flex items-center justify-center">
                <div class="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/10">
                    <Loader2 size={32} class="animate-spin" />
                </div>
                <span class="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                </span>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-surface-500 dark:text-surface-400">
                    A carregar o seu espaço...
                </p>
            </div>
        </div>
    </div>
{:else}
    <div class="h-screen flex overflow-hidden bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-100 transition-colors duration-300">
        
        {#if isMobile && sidebarOpen}
            <div 
                class="fixed inset-0 bg-black/60 z-50 md:hidden transition-opacity duration-300 backdrop-blur-sm"
                on:click={closeMobileSidebar}
                on:keydown={(e) => e.key === 'Escape' && closeMobileSidebar()}
                role="button"
                tabindex="0"
            ></div>
        {/if}

        <aside 
            class="fixed md:relative h-full flex flex-col bg-surface-100 dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 transition-all duration-300 shadow-2xl md:shadow-lg z-[60] md:z-40
                   {isMobile 
                       ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') + ' w-72'
                       : (sidebarExpanded ? 'w-64' : 'w-20')
                   }"
        >
            <div class="p-6 flex items-center justify-between gap-3 bg-surface-50 md:bg-transparent dark:bg-surface-800/50 md:dark:bg-transparent">
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

                {#if isMobile}
                     <button on:click={closeMobileSidebar} class="p-1 rounded-full bg-surface-200 dark:bg-surface-700">
                        <X size={20} class="text-surface-600 dark:text-surface-300" />
                    </button>
                {:else}
                    <button 
                        on:click={toggleSidebar}
                        class="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors flex-shrink-0
                               {sidebarExpanded ? '' : 'hidden'}"
                    >
                        <ChevronLeft size={20} class="text-surface-600 dark:text-surface-300" />
                    </button>
                {/if}
            </div>

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

<div class="p-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800">
                <div class="flex items-center gap-3 {sidebarExpanded || isMobile ? '' : 'justify-center'}">
                    
                    <div class="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-surface-700 dark:text-surface-200 font-bold text-lg ring-2 ring-white dark:ring-surface-700 shadow-sm flex-shrink-0">
                        {user?.nome?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    {#if sidebarExpanded || isMobile}
                        <div class="flex-1 min-w-0 transition-opacity duration-300">
                            <p class="text-sm font-bold truncate text-surface-900 dark:text-surface-50">
                                {formatarNome(user)}
                            </p>
                            <p class="text-xs text-surface-500 dark:text-surface-400 truncate flex items-center gap-1">
                               {#if isProfessor && isEncarregado}
                                    <span class="badge variant-soft-primary text-[10px] px-1 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Pro</span>
                                    <span class="badge variant-soft-secondary text-[10px] px-1 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Enc</span>
                               {:else if isProfessor}
                                    <span>Professor</span>
                               {:else if isEncarregado}
                                    <span>Encarregado</span>
                               {:else}
                                    Novo Utilizador
                               {/if}
                            </p>
                        </div>
                        
                        {#if isMobile}
                            <div class="ml-2 pl-3 border-l border-surface-300 dark:border-surface-600">
                                <LogoutButton />
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>

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

        <div class="flex-1 flex flex-col h-full overflow-hidden relative bg-surface-50 dark:bg-surface-900 transition-all duration-300">
            
            <header class="h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
               {#if isMobile }
                    <div class="w-2"></div> {/if}

                <h2 class="flex items-center gap-2 text-sm font-medium text-surface-500 dark:text-surface-400">
                    {#if !isMobile}
                        <span class="opacity-50">Dashboard</span>
                        <span>/</span>
                    {/if}
                    
                    {#if activeItem}
                        {#if activeItem.badge && !isMobile}
                            <span class="text-[10px] px-1.5 py-0.5 rounded-full 
                                {activeItem.badge === 'professor' 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                    : activeItem.badge === 'família' 
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                        : 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200'
                                } mr-1 uppercase font-bold tracking-wide">
                                {activeItem.badge}
                            </span>
                        {/if}
                        <span class="text-surface-900 dark:text-surface-100 font-bold text-base md:text-sm">
                            {activeItem.label}
                        </span>
                    {:else}
                         <span class="text-surface-900 dark:text-surface-100 font-bold text-base md:text-sm">Visão Geral</span>
                    {/if}
                </h2>
                
                <div class="flex items-center gap-2">
                    <ThemeSwitch />
                    <div class="hidden md:block h-6 w-px bg-surface-200 dark:bg-surface-700 mx-2"></div>
                    <div class="hidden md:block"><LogoutButton /></div>
                </div>
            </header>
            
            <main class="flex-1 flex flex-col overflow-y-auto p-4 md:p-8 scroll-smooth pb-24 md:pb-8">
                <slot />

<div class="mt-auto pt-8 hidden md:block">
                     <p class="text-xs text-center text-surface-400">© 2026 KaniMente</p>
                </div>
            </main>

            {#if isMobile}
                <nav class="fixed bottom-0 left-0 w-full bg-white/95 dark:bg-surface-800/95 backdrop-blur-xl border-t border-surface-200 dark:border-surface-700 z-50 pb-safe">
                    <div class="flex items-center justify-around h-16 px-1">
                        
                        {#each mobileBottomItems as item}
                            <a 
                                href={item.href} 
                                class="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform duration-200
                                       {isActive(item.href, $page.url.pathname) ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}"
                            >
                                <div class="relative p-1 rounded-xl {isActive(item.href, $page.url.pathname) ? 'bg-primary-50 dark:bg-primary-500/10' : ''}">
                                    <svelte:component this={item.icon} size={22} strokeWidth={isActive(item.href, $page.url.pathname) ? 2.5 : 2} />
                                </div>
                                <span class="text-[10px] font-bold tracking-tight">{item.label}</span>
                            </a>
                        {/each}

                        <button 
                            on:click={toggleSidebar}
                            class="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform duration-200 text-surface-400 dark:text-surface-500"
                        >
                            <div class="relative p-1">
                                <Menu size={22} />
                            </div>
                            <span class="text-[10px] font-bold tracking-tight">Menu</span>
                        </button>
                    </div>
                    <div class="h-[env(safe-area-inset-bottom)]"></div>
                </nav>
            {/if}
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 20px; }
    
    .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
</style>