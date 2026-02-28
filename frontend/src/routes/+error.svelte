<script lang="ts">
  import { page } from '$app/stores';
  import { Bot, Map, Lock, AlertTriangle, ArrowLeft, Home } from 'lucide-svelte';
  import '../app.css'

  
  // O SvelteKit injeta o status do erro (404, 403, 500) automaticamente na store $page
  $: status = $page.status;
  $: message = $page.error?.message || 'Algo correu mal...';

  // Configuração dinâmica baseada no erro
  $: errorConfig = getErrorConfig(status);

  function getErrorConfig(code: number) {
    switch (code) {
      case 404:
        return {
          title: 'Eish! Página não encontrada',
          desc: 'Parece que te perdeste no caminho para a escola.',
          icon: Map,
          color: 'text-blue-500',
          bg: 'bg-blue-50',
          mascotEmoji: '🤔'
        };
      case 403:
        return {
          title: 'Ops! Área Restrita',
          desc: 'Não tens permissão para entrar nesta sala de aula.',
          icon: Lock,
          color: 'text-amber-500',
          bg: 'bg-amber-50',
          mascotEmoji: 'police' // Usaremos lógica no HTML para mudar o ícone
        };
      case 500:
        return {
          title: 'Erro no Sistema',
          desc: 'O KMind ficou confuso. Tenta recarregar a página.',
          icon: AlertTriangle,
          color: 'text-rose-500',
          bg: 'bg-rose-50',
          mascotEmoji: 'dizzy'
        };
      default:
        return {
          title: `Erro ${code}`,
          desc: message,
          icon: Bot,
          color: 'text-slate-500',
          bg: 'bg-slate-50',
          mascotEmoji: 'sad'
        };
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-white p-4 font-['Fredoka']">
  <div class="max-w-md w-full text-center space-y-8 animate-fade-in-up">
    
    <div class="relative inline-block">
      <div class="w-32 h-32 rounded-full {errorConfig.bg} flex items-center justify-center mx-auto mb-4 animate-pulse">
        
        {#if status === 403}
             <Lock size={64} class="{errorConfig.color}" strokeWidth={2} />
        {:else if status === 404}
             <Map size={64} class="{errorConfig.color}" strokeWidth={2} />
        {:else}
             <Bot size={64} class="{errorConfig.color}" strokeWidth={2} />
        {/if}
      </div>

      <div class="absolute -top-2 -right-2 bg-white px-3 py-1 rounded-full shadow-lg border border-slate-100 text-2xl animate-bounce">
        {#if status === 404}❓
        {:else if status === 403}🚫
        {:else}😵‍💫{/if}
      </div>
    </div>

    <div class="space-y-3">
      <h1 class="text-4xl md:text-5xl font-black text-slate-800">
        {status}
      </h1>
      <h2 class="text-xl md:text-2xl font-bold text-slate-700">
        {errorConfig.title}
      </h2>
      <p class="text-slate-500 text-lg max-w-xs mx-auto">
        {errorConfig.desc}
      </p>
    </div>

    <div class="flex flex-col sm:flex-row gap-3 justify-center pt-4">
      <button 
        on:click={() => history.back()}
        class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
      >
        <ArrowLeft size={20} />
        Voltar atrás
      </button>

      <a 
        href="/"
        class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95"
      >
        <Home size={20} />
        Ir para o Início
      </a>
    </div>

    <p class="text-xs text-slate-300 font-mono mt-8">
      KMind Error Handler v1.0
    </p>

  </div>
</div>

<style>
  /* Pequena animação de entrada */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
  }
</style>