<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/store/auth'; 
  import { apiFetch } from '$lib/utils/api'; 
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications'; 
  
  import { Users, Check, ArrowLeft, Baby } from 'lucide-svelte';

  let isLoading = false;

  async function handleSubmit() {
    isLoading = true;

    try {
      // 1. Chamada ao Backend (NestJS)
      const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/encarregado`, {
        method: 'POST'
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        
        // 2. Atualizar a Store Local
        // Forçamos um refresh do utilizador para garantir que os roles são atualizados
        await auth.refreshUser();

        notifications.send('Perfil de Encarregado ativado!', 'success');

        // 3. Redirecionar para criar o PRIMEIRO ALUNO
        // Pequeno delay para UX suave
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
</script>

<div class="container mx-auto h-full flex items-center justify-center p-4 animate-fade-in">
  <div class="card p-8 max-w-lg w-full space-y-6 shadow-xl border-t-4 border-primary-500 bg-surface-100 dark:bg-surface-800">
    
    <header class="text-center space-y-2">
      <div class="flex justify-center mb-4">
        <div class="p-4 bg-primary-500/20 rounded-full text-primary-500 shadow-inner">
          <Users size={48} />
        </div>
      </div>
      <h2 class="h2 font-bold text-surface-900 dark:text-surface-50">Perfil de Encarregado</h2>
      <p class="text-surface-500">
        Acompanhe a educação dos seus filhos com IA.
      </p>
    </header>

    <div class="space-y-6">
      
      <!-- Info Box -->
      <div class="p-4 bg-surface-50 dark:bg-surface-700/50 rounded-lg border border-surface-200 dark:border-surface-700">
        <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
            <Baby size={20} class="text-primary-500"/> O que acontece a seguir?
        </h3>
        <ul class="list-disc list-inside text-sm space-y-1 text-surface-600 dark:text-surface-300 opacity-90">
            <li>O seu perfil de Encarregado será ativado.</li>
            <li>Será redirecionado para <strong>registar o seu primeiro educando</strong>.</li>
            <li>Poderá usar códigos de turma para ligar o educando à escola.</li>
        </ul>
      </div>

      <div class="flex flex-col gap-3 pt-4">
        <button 
            class="btn variant-filled-primary w-full py-3 font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform" 
            on:click={handleSubmit}
            disabled={isLoading}
        >
          {#if isLoading}
            <span class="loading loading-spinner loading-sm"></span>
            <span>A processar...</span>
          {:else}
            <Check size={20} class="mr-2" /> Confirmar e Continuar
          {/if}
        </button>
        
        <button 
            class="btn variant-ghost w-full hover:bg-surface-200 dark:hover:bg-surface-700" 
            on:click={() => goto('/dashboard')} 
            disabled={isLoading}
        >
          <ArrowLeft size={16} class="mr-2" /> Cancelar
        </button>
      </div>

    </div>
  </div>
</div>