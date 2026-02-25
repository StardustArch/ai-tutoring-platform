<svelte:head>
    <title>Registar | KaniMente</title>
</svelte:head>

<script lang="ts">
  import axios from 'axios';
  import { goto } from '$app/navigation';
  import { Check, X, AlertCircle, Loader2, ArrowRight } from 'lucide-svelte';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';

  let nome = '';
  let sobrenome = '';
  let telefone = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let isLoading = false;
  let error = '';
  
  // Estilos Enterprise
  const inputClass = "w-full px-4 py-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium text-surface-900 dark:text-white placeholder:text-surface-400";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-surface-500 dark:text-surface-400 mb-1.5";

  $: passwordStrength = calculatePasswordStrength(password);
  $: passwordsMatch = password && confirmPassword && password === confirmPassword;
  
  // Validação simplificada para UX mais fluida
  $: isFormValid = nome && sobrenome && email && password && passwordsMatch && passwordStrength.score >= 2;

  function calculatePasswordStrength(pwd: string) {
    if (!pwd) return { score: 0 };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return { score };
  }

  function getStrengthColor(score: number) {
    if (score <= 1) return 'bg-red-500';
    if (score === 2) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  async function handleRegister() {
    isLoading = true;
    error = '';

    try {
      await axios.post(`${PUBLIC_API_URL_HOST}/api/auth/register`, {
        nome, sobrenome, telefone, email, password
      });
      goto('/login');
    } catch (err: any) {
      error = err.response?.data?.message || 'Erro ao criar conta. Tente novamente.';
      console.log(error)
    } finally {
      isLoading = false;
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${PUBLIC_API_URL_HOST}/api/auth/google`;
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-white dark:bg-surface-950 relative overflow-hidden p-4">
  
  <div class="absolute inset-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none"></div>

  <div class="w-full max-w-lg relative z-10 animate-fade-in-up">
    
    <div class="text-center mb-8">
      <h1 class="text-3xl font-black text-surface-900 dark:text-white tracking-tight">Crie a sua conta</h1>
      <p class="text-sm text-surface-500 mt-2">Junte-se ao futuro da educação em Moçambique.</p>
    </div>

    <div class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xl p-6 md:p-8">
      
      {#if error}
        <div class="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-shake">
          <AlertCircle size={18} />
          {error}
        </div>
      {/if}

      <button 
        on:click={handleGoogleLogin} 
        type="button"
        class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-all text-sm font-bold text-surface-700 dark:text-white group mb-6"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" class="group-hover:scale-110 transition-transform">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Registar com Google
      </button>

      <div class="relative mb-6">
        <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-surface-200 dark:border-surface-800"></span></div>
        <div class="relative flex justify-center text-xs uppercase"><span class="bg-white dark:bg-surface-900 px-2 text-surface-400 font-medium">Ou via email</span></div>
      </div>

      <form on:submit|preventDefault={handleRegister} class="space-y-4">
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="nome" class={labelClass}>Nome</label>
            <input id="nome" type="text" bind:value={nome} required class={inputClass} placeholder="Seu nome"/>
          </div>
          <div>
            <label for="sobrenome" class={labelClass}>Sobrenome</label>
            <input id="sobrenome" type="text" bind:value={sobrenome} required class={inputClass} placeholder="Apelido"/>
          </div>
        </div>

        <div>
          <label for="email" class={labelClass}>Email</label>
          <input id="email" type="email" bind:value={email} required class={inputClass} placeholder="exemplo@email.com"/>
        </div>

        <div>
          <label for="telefone" class={labelClass}>Telefone (Opcional)</label>
          <input id="telefone" type="tel" bind:value={telefone} class={inputClass} placeholder="+258 84..."/>
        </div>

        <div>
          <label for="password" class={labelClass}>Password</label>
          <input id="password" type="password" bind:value={password} required class={inputClass} placeholder="Mínimo 8 caracteres"/>
          
          {#if password}
            <div class="mt-2 flex gap-1 h-1">
              {#each Array(4) as _, i}
                <div class="flex-1 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                    <div class="h-full transition-all duration-300 {i < passwordStrength.score ? getStrengthColor(passwordStrength.score) : 'opacity-0'}" style="width: 100%"></div>
                </div>
              {/each}
            </div>
            <p class="text-[10px] text-surface-400 mt-1 text-right">
                {passwordStrength.score < 2 ? 'Fraca' : passwordStrength.score === 2 ? 'Média' : 'Forte'}
            </p>
          {/if}
        </div>

        <div>
          <label for="confirmPassword" class={labelClass}>Confirmar Password</label>
          <div class="relative">
            <input id="confirmPassword" type="password" bind:value={confirmPassword} required class="{inputClass} pr-10" placeholder="Repita a password"/>
            {#if confirmPassword}
                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                    {#if passwordsMatch}
                        <Check size={16} class="text-emerald-500" />
                    {:else}
                        <X size={16} class="text-red-500" />
                    {/if}
                </div>
            {/if}
          </div>
        </div>

        <button 
          type="submit" 
          class="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          disabled={isLoading || !isFormValid}
        >
          {#if isLoading}
            <Loader2 size={18} class="animate-spin" />
          {:else}
            Criar Conta
          {/if}
        </button>
      </form>

      <p class="text-center mt-6 text-sm text-surface-500">
        Já tem conta? 
        <a href="/login" class="font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors">Entrar agora</a>
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