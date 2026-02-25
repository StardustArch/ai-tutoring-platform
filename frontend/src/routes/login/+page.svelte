<svelte:head>
    <title>Entrar | KaniMente</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store'; 
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { auth } from '$lib/store/auth'; 
  import { notifications } from '$lib/store/notifications';
  import Notification from '$lib/components/Notification.svelte'; 
  import { LogIn, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-svelte';
  import { browser } from '$app/environment';
  import '../../app.css'
  
  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';
  let showPassword = false;

  // --- LÓGICA DE REDIRECIONAMENTO ---
  function getDashboardRoute(user: any) {
    if (!user) return '/dashboard';
    
    const isAdmin= user?.role === 'ADMIN';
    const isEncarregado = !!user.perfilEncarregado;
    const isProfessor = !!user.perfilProfessor;
    const isProfessorAtivo = isProfessor && !!user.perfilProfessor?.escolaNome;
    const userHasBothProfiles = isEncarregado && isProfessorAtivo;

    if (userHasBothProfiles) return '/dashboard/unified/overview';
    if (isProfessorAtivo) return '/dashboard/teacher/overview';
    if (isEncarregado) return '/dashboard/foreman/overview';
    if(isAdmin) return '/dashboard/admin/overview'
    
    return '/dashboard';
  }

  // --- 1. REATIVIDADE (O Guarda de Trânsito) ---
  // Assim que o Auth disser "Estou pronto e é válido", ele redireciona.
  $: if (browser && !$auth.isLoading && $auth.isAuthenticated && $auth.user) {
      console.log('🚀 [Login] Utilizador já autenticado. Redirecionando...');
      const target = getDashboardRoute($auth.user);
      goto(target, { replaceState: true });
  }

  // --- 2. INICIALIZAÇÃO FORÇADA ---
  onMount(async () => {
    console.log('🏁 [Login] Página montada. Estado atual:', $auth);
    
    // CORREÇÃO CRÍTICA: Removemos o 'if' que bloqueava.
    // Forçamos a verificação sempre que entra no login para garantir que
    // o estado está fresco (mesmo que o layout já o tenha feito).
    try {
        await auth.initializeAuth();
        console.log('✅ [Login] Auth inicializado. Novo estado:', get(auth));
    } catch (e) {
        console.error('❌ [Login] Erro ao inicializar auth:', e);
    }
  });
    
  // Tratamento de erros de URL
  $: {
    const errorParam = $page.url.searchParams.get('error');
    if (errorParam === "processing_failed") {
        notifications.send("Falha no login Google. Tente novamente.", "error");
        // Limpa a URL sem recarregar
        const newUrl = new URL($page.url);
        newUrl.searchParams.delete('error');
        goto(newUrl.toString(), { replaceState: true, noScroll: true });
    }
  }

  async function handleLogin() {
    isLoading = true;
    error = '';
    
    try {
      console.log('🔐 [Login] A tentar login com:', email);
      await auth.login({ email, password });
      
      // Pequeno delay para garantir que a store propagou
      const currentUser = get(auth).user;
      
      if (currentUser) {
        const target = getDashboardRoute(currentUser);
        await goto(target);
      } else {
        // Fallback: Se o login diz OK mas user é null, tentamos forçar o fetch do user
        console.warn('⚠️ [Login] Login OK mas user null. A buscar perfil...');
        await auth.refreshUser(); // Usa refreshUser para buscar dados, não refresh de token
        const updatedUser = get(auth).user;
        if (updatedUser) {
             goto(getDashboardRoute(updatedUser));
        } else {
             goto('/dashboard');
        }
      }

    } catch (err: any) {
      console.error('❌ [Login] Erro:', err);
      error = err.message || 'Credenciais inválidas.';
    } finally {
      isLoading = false;
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${PUBLIC_API_URL_HOST}/api/auth/google`;
  }

  const inputClass = "w-full px-4 py-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium text-surface-900 dark:text-white placeholder:text-surface-400";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-surface-500 dark:text-surface-400 mb-1.5 ml-0.5";
</script>
<Notification />

<div class="min-h-screen flex items-center justify-center bg-white dark:bg-surface-950 relative overflow-hidden p-4">
  
  <div class="absolute inset-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none"></div>

  <div class="w-full max-w-md relative z-10 animate-fade-in-up">
    
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 text-white font-bold text-xl shadow-lg shadow-primary-500/30 mb-6">
        K
      </div>
      <h1 class="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Bem-vindo de volta</h1>
      <p class="text-sm text-surface-500 mt-2">Aceda ao seu tutor inteligente KaniMente</p>
    </div>

    <div class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xl p-6 md:p-8">
      
      {#if error}
        <div class="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-shake">
          <AlertCircle size={18} class="shrink-0" />
          <span>{error}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleLogin} class="space-y-5">
        
        <div>
          <label for="email" class={labelClass}>Email</label>
          <input 
            id="email"
            type="email" 
            bind:value={email} 
            placeholder="nome@exemplo.com"
            required
            class={inputClass}
          />
        </div>

        <div>
          <div class="flex justify-between items-center mb-1.5">
            <label for="password" class={labelClass}>Palavra-passe</label>
            <a href="/reset-password" class="text-[10px] font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors">
                Recuperar senha
            </a>
          </div>
          <div class="relative">
            <input 
                id="password"
                type={showPassword ? 'text' : 'password'}
                bind:value={password} 
                placeholder="••••••••"
                required
                class="{inputClass} pr-10"
            />
            <button
                type="button"
                on:click={() => showPassword = !showPassword}
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                tabindex="-1"
            >
                {#if showPassword}
                    <EyeOff size={18} />
                {:else}
                    <Eye size={18} />
                {/if}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          class="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          disabled={isLoading}
        >
          {#if isLoading}
            <Loader2 size={18} class="animate-spin" />
            <span>A validar...</span>
          {:else}
            <span>Entrar</span>
            <LogIn size={18} />
          {/if}
        </button>
      </form>

      <div class="relative my-8">
        <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-surface-200 dark:border-surface-800"></span></div>
        <div class="relative flex justify-center text-xs uppercase"><span class="bg-white dark:bg-surface-900 px-2 text-surface-400 font-medium">Ou continue com</span></div>
      </div>

      <button 
        on:click={handleGoogleLogin} 
        type="button"
        class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-all text-sm font-bold text-surface-700 dark:text-white group"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" class="group-hover:scale-110 transition-transform">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar com Google
      </button>

      <p class="text-center mt-8 text-sm text-surface-500">
        Ainda não tem conta? 
        <a href="/register" class="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors">Criar conta grátis</a>
      </p>

    </div>
  </div>
</div>

<style>
  .animate-fade-in-up {
    animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(20px);
  }
  @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
  .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
  @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
</style>