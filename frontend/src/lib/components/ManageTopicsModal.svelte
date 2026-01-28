<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { X, Save, CheckCircle2, Circle, Loader2 } from 'lucide-svelte';
  import { notifications } from '$lib/store/notifications';

  export let turmaId: number;
  export let isOpen = false;

  const dispatch = createEventDispatcher();

  let topics: Array<{ id: number, nome: string, nivel: number, ativo: boolean }> = [];
  let isLoading = true;
  let isSaving = false;

  // Carregar dados quando o modal abre
  $: if (isOpen && turmaId) {
    loadTopics();
  }

  async function loadTopics() {
    isLoading = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${turmaId}/topics/manage`);
      if (res.ok) {
        topics = await res.json();
      } else {
        notifications.send('Erro ao carregar tópicos.', 'error');
        close();
      }
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  function toggleTopic(index: number) {
    topics[index].ativo = !topics[index].ativo;
    topics = [...topics]; // Reatividade Svelte
  }

  function toggleAll() {
    const allActive = topics.every(t => t.ativo);
    topics = topics.map(t => ({ ...t, ativo: !allActive }));
  }

  async function save() {
    isSaving = true;
    // Filtrar apenas os IDs que estão marcados como true
    const selectedIds = topics.filter(t => t.ativo).map(t => t.id);

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${turmaId}/topics`, {
        method: 'PATCH',
        body: JSON.stringify({ topicosIds: selectedIds })
      });

      if (res.ok) {
        notifications.send('Conteúdos atualizados com sucesso!', 'success');
        dispatch('saved'); // Avisa o pai para recarregar se necessário
        close();
      } else {
        notifications.send('Erro ao salvar.', 'error');
      }
    } catch (e) {
      notifications.send('Erro de conexão.', 'error');
    } finally {
      isSaving = false;
    }
  }

  function close() {
    dispatch('close');
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
    <div class="bg-white dark:bg-surface-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
      
      <div class="p-5 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-surface-900 dark:text-white">Gerir Conteúdos</h2>
          <p class="text-sm text-surface-500">Selecione o que os alunos podem estudar.</p>
        </div>
        <button on:click={close} class="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-full transition-colors">
          <X size={20} class="text-surface-500" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 md:p-4">
        {#if isLoading}
          <div class="flex justify-center py-10">
            <Loader2 class="animate-spin text-primary-500" size={32} />
          </div>
        {:else if topics.length === 0}
          <p class="text-center text-surface-500 py-10">Nenhum tópico disponível para esta disciplina.</p>
        {:else}
          <div class="space-y-2">
            <div class="flex justify-end px-2 mb-2">
               <button on:click={toggleAll} class="text-xs font-bold text-primary-600 hover:text-primary-700">
                 Selecionar/Deselecionar Todos
               </button>
            </div>

            {#each topics as topic, i (topic.id)}
              <button 
                on:click={() => toggleTopic(i)}
                class="w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left
                {topic.ativo 
                  ? 'bg-primary-50 border-primary-500 dark:bg-primary-900/20 dark:border-primary-500/50' 
                  : 'bg-surface-50 border-surface-200 dark:bg-surface-900/50 dark:border-surface-700 hover:border-surface-300'}"
              >
                <div class="{topic.ativo ? 'text-primary-600' : 'text-surface-400'}">
                  {#if topic.ativo}
                    <CheckCircle2 size={22} class="fill-primary-100 dark:fill-primary-900/50" />
                  {:else}
                    <Circle size={22} />
                  {/if}
                </div>
                
                <div class="flex-1">
                  <p class="font-bold text-surface-800 dark:text-surface-100 text-sm md:text-base">{topic.nome}</p>
                  <p class="text-xs text-surface-500">Nível {topic.nivel}</p>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="p-5 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3 bg-surface-50 dark:bg-surface-900/50 rounded-b-2xl">
        <button 
          on:click={close}
          class="px-5 py-2.5 text-sm font-bold text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button 
          on:click={save}
          disabled={isSaving || isLoading}
          class="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isSaving}
            <Loader2 size={18} class="animate-spin" />
            A guardar...
          {:else}
            <Save size={18} />
            Guardar Alterações
          {/if}
        </button>
      </div>

    </div>
  </div>
{/if}

<style>
  .animate-fade-in { animation: fadeIn 0.2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>