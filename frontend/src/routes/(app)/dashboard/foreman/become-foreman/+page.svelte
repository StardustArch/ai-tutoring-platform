<svelte:head>
    <title>Ativar Perfil Familiar | KaniMente</title>
</svelte:head>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/store/auth'; 
  import { apiFetch } from '$lib/utils/api'; 
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications'; 
  import { page } from '$app/stores';
  
  import { Users, Check, ArrowLeft, Loader, Info, ShieldCheck } from 'lucide-svelte';

  let isLoading = false;

  $: ref = $page.url.searchParams.get('ref');

  async function handleSubmit() {
    isLoading = true;
    try {
      const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/encarregado`, {
        method: 'POST'
      });

      if (response.ok) {
        await auth.refreshUser();
        notifications.send('Perfil familiar ativado com sucesso.', 'success');
        
        setTimeout(() => {
            goto('/dashboard/foreman/student/create?first_time=true');
        }, 800);

      } else {
        const err = await response.json();
        throw new Error(err.message || 'Falha ao ativar perfil');
      }
    } catch (error: any) {
      console.error(error);
      notifications.send(error.message || 'Erro de conexão.', 'error');
    } finally {
      isLoading = false;
    }
  }

  function goBack() {
    if (ref === 'homet' || ref === 'homer') {
        goto('/dashboard/teacher/overview'); 
    } else {
        goto('/dashboard');
    }
  }
</script>

<div class="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
  <div class="max-w-md w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm overflow-hidden">
    
    <div class="p-8 pb-6 text-center">
      <div class="mx-auto w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-lg flex items-center justify-center mb-4 border border-surface-200 dark:border-surface-600">
        <Users size={24} class="text-surface-600 dark:text-surface-300" />
      </div>
      <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Perfil de Encarregado</h1>
      <p class="text-surface-500 mt-2 text-sm">
        Ative a sua área familiar para acompanhar o desempenho escolar dos seus educandos.
      </p>
    </div>

    <div class="px-8 pb-8 space-y-6">
      
      <div class="p-4 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-surface-700 rounded-md flex gap-3 items-start">
        <Info size={16} class="text-surface-500 mt-0.5 flex-shrink-0"/>
        <div class="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
            <span class="font-semibold text-surface-900 dark:text-surface-100 block mb-1">Próximos Passos:</span>
            <ul class="space-y-1.5 opacity-90">
                <li class="flex items-start gap-2">
                    <span class="text-emerald-500 font-bold">1.</span> Ativação da conta de encarregado.
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-emerald-500 font-bold">2.</span> Registo dos dados do primeiro educando.
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-emerald-500 font-bold">3.</span> Vinculação às turmas via códigos de acesso.
                </li>
            </ul>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <button 
            class="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md py-2.5 flex items-center justify-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 disabled:opacity-70"
            on:click={handleSubmit}
            disabled={isLoading}
        >
          {#if isLoading}
            <Loader size={18} class="animate-spin" />
            <span>A processar...</span>
          {:else}
            <Check size={18} /> 
            <span>Confirmar e Continuar</span>
          {/if}
        </button>
        
        <button 
            class="w-full btn bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 font-medium rounded-md py-2.5 flex items-center justify-center gap-2 transition-all"
            on:click={goBack} 
            disabled={isLoading}
        >
          <ArrowLeft size={18} /> 
          <span>Voltar</span>
        </button>
      </div>

    </div>
  </div>
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>