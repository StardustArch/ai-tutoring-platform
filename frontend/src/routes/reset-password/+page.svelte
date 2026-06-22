<svelte:head>
    <title>Recuperar Senha | KMind</title>
</svelte:head>

<script lang="ts">
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notify } from '$lib/store/toaster';
  import { ArrowLeft, Mail, Send, Loader2, KeyRound, CheckCircle } from 'lucide-svelte';
  import '../../app.css'
	import ToastContainer from '$lib/components/ToastContainer.svelte';

  let email = '';
  let isLoading = false;
  let isSent = false;

  async function handleForgot() {
    if (!email) {
        notify('Atenção','Por favor, insira o seu email.', 'warning');
        return;
    }

    isLoading = true;
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/auth/forgot-password`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        const r = await res.json();
        
        // Sucesso visual
        isSent = true;
        notify('Salvo',r.message, 'success');
    } catch (err) {
        notify('Erro','Erro ao conectar ao servidor.', 'error');
    } finally {
        isLoading = false;
    }
  }

  // Estilos partilhados com o Login para consistência total
  const inputClass = "w-full px-4 py-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium text-surface-900 dark:text-white placeholder:text-surface-400 disabled:opacity-50";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-surface-500 dark:text-surface-400 mb-1.5 ml-0.5";
</script>

<ToastContainer />

<div class="min-h-screen flex items-center justify-center bg-white dark:bg-surface-950 relative overflow-hidden p-4">
  
  <div class="absolute inset-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none"></div>

  <div class="w-full max-w-md relative z-10 animate-fade-in-up">
    
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 text-white font-bold text-xl shadow-lg shadow-primary-500/30 mb-6">
        K
      </div>
      <h1 class="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Recuperar Conta</h1>
      <p class="text-sm text-surface-500 mt-2">Não se preocupe, acontece aos melhores.</p>
    </div>

    <div class="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xl p-6 md:p-8 relative overflow-hidden">
      
      {#if isSent}
        <div class="text-center space-y-6 animate-scale-in">
            <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
            </div>
            
            <div class="space-y-2">
                <h3 class="text-lg font-bold text-surface-900 dark:text-white">Verifique o seu email</h3>
                <p class="text-sm text-surface-500 leading-relaxed">
                    Enviámos um link de recuperação para <br>
                    <span class="font-bold text-surface-900 dark:text-white">{email}</span>
                </p>
            </div>

            <div class="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg border border-surface-100 dark:border-surface-700 text-xs text-surface-500">
                <p>Não recebeu? Verifique a pasta de Spam ou tente novamente em alguns minutos.</p>
            </div>

            <a href="/login" class="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-900 dark:text-white font-bold rounded-lg transition-colors">
                <ArrowLeft size={18} />
                Voltar ao Login
            </a>
        </div>

      {:else}
        <div class="space-y-6">
            <div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex gap-3">
                <KeyRound class="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                <p class="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    Insira o email associado à sua conta e enviaremos instruções para redefinir a sua palavra-passe.
                </p>
            </div>

            <form on:submit|preventDefault={handleForgot} class="space-y-5">
                <div>
                    <label for="email" class={labelClass}>Email Registado</label>
                    <div class="relative">
                        <input 
                            id="email"
                            type="email" 
                            bind:value={email} 
                            placeholder="nome@exemplo.com"
                            required
                            disabled={isLoading}
                            class="{inputClass} pl-10"
                        />
                        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
                            <Mail size={18} />
                        </div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    class="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {#if isLoading}
                        <Loader2 size={18} class="animate-spin" />
                        <span>A enviar...</span>
                    {:else}
                        <span>Enviar Link de Reset</span>
                        <Send size={18} />
                    {/if}
                </button>
            </form>

            <div class="text-center pt-2">
                <a href="/login" class="inline-flex items-center gap-2 text-sm font-bold text-surface-500 hover:text-surface-800 dark:hover:text-white transition-colors">
                    <ArrowLeft size={16} />
                    Voltar ao Login
                </a>
            </div>
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
    animation: scaleIn 0.3s ease-out forwards;
  }
  @keyframes scaleIn { 
      from { opacity: 0; transform: scale(0.95); } 
      to { opacity: 1; transform: scale(1); } 
  }
</style>