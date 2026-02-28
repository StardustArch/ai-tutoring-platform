<svelte:head>
    <title>Definir Nova Senha | KMind</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications'; 
  import Notification from '$lib/components/Notification.svelte';
  import { Lock, CheckCircle, Loader2, Eye, EyeOff, ArrowLeft, Check, X } from 'lucide-svelte';
  import '../../../app.css'

  let newPassword = '';
  let confirmPassword = '';
  let isLoading = false;
  let token = '';
  let success = false;
  
  // Controlo de visibilidade das senhas
  let showPassword = false;
  let showConfirmPassword = false;

  // --- LÓGICA DE SENHA FORTE (Igual ao Registo) ---
  $: passwordStrength = calculatePasswordStrength(newPassword);
  $: passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  
  // Regra: Pelo menos média (score 2) e coincidir
  $: isFormValid = newPassword && confirmPassword && passwordsMatch && passwordStrength.score >= 2;

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

  // Estilos Enterprise
  const inputClass = "w-full px-4 py-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium text-surface-900 dark:text-white placeholder:text-surface-400";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-surface-500 dark:text-surface-400 mb-1.5 ml-0.5";

  onMount(() => {
    token = $page.url.searchParams.get('token') || '';
    if (!token) {
        notifications.send('Link inválido ou expirado.', 'error');
        setTimeout(() => goto('/forgot-password'), 3000);
    }
  });

  async function handleReset() {
    // Validação
    if (passwordStrength.score < 2) {
        notifications.send('A senha é muito fraca. Use letras maiúsculas, números ou símbolos.', 'warning');
        return;
    }
    if (!passwordsMatch) {
        notifications.send('As senhas não coincidem.', 'warning');
        return;
    }

    isLoading = true;
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/auth/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });

        if (res.ok) {
            success = true;
            notifications.send('Senha alterada com sucesso!', 'success');
            setTimeout(() => goto('/login'), 3000);
        } else {
            const err = await res.json();
            throw new Error(err.message || 'Link expirado ou inválido.');
        }
    } catch (err: any) {
        notifications.send(err.message, 'error');
    } finally {
        isLoading = false;
    }
  }
</script>

<Notification />

<div class="min-h-screen flex items-center justify-center bg-white dark:bg-surface-950 relative overflow-hidden p-4">
  
  <div class="absolute inset-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none"></div>

  <div class="w-full max-w-md relative z-10 animate-fade-in-up">
    
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 text-white font-bold text-xl shadow-lg shadow-primary-500/30 mb-6">
        K
      </div>
      <h1 class="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Definir Nova Senha</h1>
      <p class="text-sm text-surface-500 mt-2">Escolha uma senha forte para proteger a sua conta.</p>
    </div>

    <div class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xl p-6 md:p-8 relative overflow-hidden">
    
    {#if success}
        <div class="text-center space-y-6 animate-scale-in py-4">
            <div class="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle size={40} />
            </div>
            
            <div class="space-y-2">
                <h3 class="text-xl font-bold text-surface-900 dark:text-white">Senha Atualizada!</h3>
                <p class="text-sm text-surface-500 leading-relaxed">
                    A sua palavra-passe foi alterada com sucesso. <br>
                    Já pode entrar na sua conta.
                </p>
            </div>

            <div class="pt-2">
                <a href="/login" class="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98]">
                    Ir para Login
                </a>
            </div>
            
            <p class="text-xs text-surface-400">A redirecionar automaticamente...</p>
        </div>
    {:else}
        <form on:submit|preventDefault={handleReset} class="space-y-5">
            
            <div>
                <label for="newPassword" class={labelClass}>Nova Senha</label>
                <div class="relative">
                    <input 
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'} 
                        bind:value={newPassword} 
                        placeholder="Mínimo 8 caracteres" 
                        class="{inputClass} pr-10 pl-10"
                        required
                    />
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
                        <Lock size={18} />
                    </div>
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

                {#if newPassword}
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
                <label for="confirmPassword" class={labelClass}>Confirmar Senha</label>
                <div class="relative">
                    <input 
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'} 
                        bind:value={confirmPassword} 
                        placeholder="Repita a senha" 
                        class="{inputClass} pr-10 pl-10"
                        required
                    />
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
                        <Lock size={18} />
                    </div>
                    
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
                        {#if confirmPassword}
                             {#if passwordsMatch}
                                <Check size={16} class="text-emerald-500" />
                            {:else}
                                <X size={16} class="text-red-500" />
                            {/if}
                        {/if}

                        <button
                            type="button"
                            on:click={() => showConfirmPassword = !showConfirmPassword}
                            class="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                            tabindex="-1"
                        >
                            {#if showConfirmPassword}
                                <EyeOff size={18} />
                            {:else}
                                <Eye size={18} />
                            {/if}
                        </button>
                    </div>
                </div>
            </div>

            <button 
                type="submit" 
                class="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                disabled={isLoading || !isFormValid}
            >
                {#if isLoading}
                    <Loader2 size={18} class="animate-spin" />
                    <span>A guardar...</span>
                {:else}
                    <span>Alterar Senha</span>
                {/if}
            </button>
        </form>

        <div class="text-center mt-6">
            <a href="/login" class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-surface-500 hover:text-surface-800 dark:hover:text-white transition-colors">
                <ArrowLeft size={14} />
                Cancelar e Voltar
            </a>
        </div>
    {/if}
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

  .animate-scale-in {
    animation: scaleIn 0.4s ease-out forwards;
  }
  @keyframes scaleIn { 
      from { opacity: 0; transform: scale(0.9); } 
      to { opacity: 1; transform: scale(1); } 
  }
</style>