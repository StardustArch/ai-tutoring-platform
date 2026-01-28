<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/store/auth'; 
  import { apiFetch } from '$lib/utils/api'; 
  import { notifications } from '$lib/store/notifications'; // Importamos a nossa store personalizada
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { School, Check, ArrowLeft } from 'lucide-svelte';
	import { page } from '$app/stores';

  let escolaNome = '';
  let isLoading = false;

  async function handleSubmit() {
    // Validação básica local
// Verifica se não existe (null/undefined) OU se, removendo os espaços, fica vazio
if (!escolaNome || escolaNome.trim() === "") {
    notifications.send('O nome da escola é obrigatório.', "error");
    return;
}
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

        const ref = $page.url.searchParams.get('ref');

    function goBack() {
        if (ref === 'homet') {
            goto('/dashboard/foreman/overview'); // Volta para a Visão Geral
        } else {
            // Default (ou se vier da lista)
            goto('/dashboard'); 
        }
    }
</script>


<div class="container  mx-auto h-full flex items-center justify-center p-4 animate-fade-in ">
  <div class="card p-8 max-w-2xl w-full space-y-6 shadow-xl border-t-4 border-secondary-500 bg-surface-100 dark:bg-surface-800 rounded-xl">
    
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
        <span class="font-bold">Nome da Escola</span>
        <input 
                        class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
          type="text" 
          bind:value={escolaNome} 
          placeholder="Ex: Escola Primária Heróis Moçambicanos" 
        />
        <span class="text-xs text-surface-400">Isto será visível nos detalhes da turma.</span>
      </label>

      <div class="p-4 variant-soft-secondary rounded-container text-sm flex gap-3 items-start bg-surface-50 dark:bg-surface-700/50 rounded-lg border border-surface-200 dark:border-surface-700">
        <div class="mt-1"><School size={16}/></div>
        <div>
            <p><strong>Acesso Imediato:</strong></p>
            <p class="opacity-80">Ao confirmar, poderá criar turmas, gerar códigos de convite e monitorizar o progresso dos alunos.</p>
        </div>
      </div>

      <div class="flex flex-col gap-3 pt-4">
        <button type="submit" 
                    class="inline-flex items-center justify-center px-4 py-2 bg-secondary-600 hover:bg-secondary-700 focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}>
          {#if isLoading}
            <span>A configurar...</span>
          {:else}
            <Check size={20} class="mr-2" /> Confirmar e Começar
          {/if}
        </button>
        
        <button type="button"                     class="inline-flex items-center justify-center px-4 py-2 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 focus:ring-2 focus:ring-surface-500 focus:ring-offset-2 text-surface-700 dark:text-surface-300 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
 on:click={() => goBack()} disabled={isLoading}>
          <ArrowLeft size={16} class="mr-2" /> Cancelar
        </button>
      </div>

    </form>
  </div>
</div>