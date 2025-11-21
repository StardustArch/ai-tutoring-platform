<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/store/auth'; 
  import { apiFetch } from '$lib/utils/api'; 
  import { notifications } from '$lib/store/notifications'; // Importamos a nossa store personalizada
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { School, Check, ArrowLeft } from 'lucide-svelte';

  let escolaNome = '';
  let isLoading = false;

  async function handleSubmit() {
    // Validação básica local
    if (escolaNome.length > 0 && escolaNome.length < 3) {
        notifications.send('O nome da escola é muito curto.', 'warning');
        return;
    }

    isLoading = true;

    try {
      // 1. Chamada ao Backend (NestJS)
      const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/professor`, {
        method: 'POST',
        body: JSON.stringify({
          escolaNome: escolaNome || undefined 
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        
        // 2. Atualizar Auth Store
        auth.refreshUser();

        // 3. Notificação de Sucesso Personalizada
        notifications.send('Bem-vindo, Professor! O seu perfil foi criado.', 'success');

        // Pequeno delay para o utilizador ler a mensagem antes de mudar de página
        setTimeout(() => {
            goto('/dashboard/teacher');
        }, 1000);

      } else {
        // Tentar ler a mensagem de erro do backend
        const err = await response.json();
        throw new Error(err.message || 'Falha ao criar perfil');
      }
    } catch (error: any) {
      console.error(error);
      notifications.send(error.message || 'Erro de conexão. Tente novamente.', 'error');
    } finally {
      isLoading = false;
    }
  }
</script>


<div class="container mx-auto h-full flex items-center justify-center p-4 animate-fade-in">
  <div class="card p-8 max-w-lg w-full space-y-6 shadow-xl border-t-4 border-secondary-500 bg-surface-100-800-token">
    
    <header class="text-center space-y-2">
      <div class="flex justify-center mb-4">
        <div class="p-4 bg-secondary-500/20 rounded-full text-secondary-500 shadow-inner">
          <School size={48} />
        </div>
      </div>
      <h2 class="h2 font-bold text-surface-900-50-token">Perfil de Professor</h2>
      <p class="text-surface-500">
        Configure a sua sala de aula virtual.
      </p>
    </header>

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      
      <label class="label">
        <span class="font-bold">Nome da Escola (Opcional)</span>
        <input 
          class="input p-4 border-surface-300-600-token focus:border-secondary-500" 
          type="text" 
          bind:value={escolaNome} 
          placeholder="Ex: Escola Primária Heróis Moçambicanos" 
        />
        <span class="text-xs text-surface-400">Isto será visível nos detalhes da turma.</span>
      </label>

      <div class="p-4 variant-soft-secondary rounded-container text-sm flex gap-3 items-start">
        <div class="mt-1"><School size={16}/></div>
        <div>
            <p><strong>Acesso Imediato:</strong></p>
            <p class="opacity-80">Ao confirmar, poderá criar turmas, gerar códigos de convite e monitorizar o progresso dos alunos.</p>
        </div>
      </div>

      <div class="flex flex-col gap-3 pt-4">
        <button type="submit" class="btn variant-filled-secondary w-full py-3 font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform" disabled={isLoading}>
          {#if isLoading}
            <span>A configurar...</span>
          {:else}
            <Check size={20} class="mr-2" /> Confirmar e Começar
          {/if}
        </button>
        
        <button type="button" class="btn variant-ghost w-full hover:bg-surface-200-700-token" on:click={() => goto('/dashboard')} disabled={isLoading}>
          <ArrowLeft size={16} class="mr-2" /> Voltar
        </button>
      </div>

    </form>
  </div>
</div>