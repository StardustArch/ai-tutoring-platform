<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  
  import { ArrowLeft, Save, Trash2, AlertTriangle, School, Loader } from 'lucide-svelte';

  // --- ESTADO ---
  let classId = $page.params.id;
  let isLoading = false;
  let isSaving = false;
  
  let formData = {
    nome: '',
    ativa: true
  };
  let disciplinaNome = ''; // Apenas para exibição (não editável por segurança dos dados)

  onMount(async () => {
    await carregarTurma();
  });

  async function carregarTurma() {
    isLoading = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}`);
      if (res.ok) {
        const data = await res.json();
        formData.nome = data.nome;
        formData.ativa = data.ativa;
        disciplinaNome = data.disciplina?.nome || 'Desconhecida';
      } else {
        throw new Error('Erro ao carregar turma');
      }
    } catch (err) {
      notifications.send('Erro ao carregar dados.', 'error');
      goto(`/dashboard/teacher/class/${classId}`); // Volta se der erro
    } finally {
      isLoading = false;
    }
  }

  // --- ACÇÕES ---

  async function guardarAlteracoes() {
    if (!formData.nome.trim()) {
        notifications.send('O nome da turma não pode estar vazio.', 'warning');
        return;
    }

    isSaving = true;
    try {
      // Endpoint: PUT /api/classes/:id
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        notifications.send('Turma atualizada com sucesso!', 'success');
        goto(`/dashboard/teacher/class/${classId}`);
      } else {
        throw new Error('Falha ao atualizar');
      }
    } catch (err) {
      notifications.send('Erro ao guardar alterações.', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function desativarTurma() {
    // Confirmação dupla para segurança
    const confirmacao = prompt(`ATENÇÃO: Desativar a turma impede o acesso dos alunos.\n\nPara confirmar, digite "DESATIVAR":`);
    
    if (confirmacao !== 'DESATIVAR') {
        if (confirmacao !== null) notifications.send('Ação cancelada. O texto não corresponde.', 'info');
        return;
    }

    isSaving = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}`, {
        method: 'DELETE' // O backend trata DELETE como "desativar" (soft delete)
      });

      if (res.ok) {
        notifications.send('Turma desativada e arquivada.', 'success');
        goto('/dashboard/teacher/class');
      } else {
        throw new Error('Falha ao desativar');
      }
    } catch (err) {
      notifications.send('Erro ao desativar turma.', 'error');
    } finally {
      isSaving = false;
    }
  }

          const ref = $page.url.searchParams.get('ref');

    function goBack() {
        if (ref === 'home') {
            goto('/dashboard/teacher/class/'); // Volta para a Visão Geral
        } else {
            // Default (ou se vier da lista)
            goto(`/dashboard/teacher/class/${classId}`); 
        }
    }
</script>

<div class="max-w-4xl mx-auto p-4 pb-20 space-y-8 animate-fade-in">

  <!-- CABEÇALHO -->
  <div class="flex items-center gap-4">
    <button 
      on:click={() => goBack()} 
      class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
    <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Editar Turma</h1>
        <p class="text-surface-500 text-sm">Atualize as informações ou encerre a turma.</p>
    </div>
  </div>

  {#if isLoading}
    <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-xl animate-pulse"></div>
  {:else}
  
    <!-- FORMULÁRIO PRINCIPAL -->
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 space-y-6">
        <h2 class="text-lg font-bold flex items-center gap-2 border-b border-surface-100 dark:border-surface-700 pb-4">
            <School class="text-primary-500"/> Informações Básicas
        </h2>

        <div class="space-y-4">
            <label class="label">
                <span class="font-medium text-surface-700 dark:text-surface-300">Nome da Turma</span>
                <input 
                    type="text" 
                    class="input p-3" 
                    bind:value={formData.nome} 
                    placeholder="Ex: Matemática 10ª B"
                />
            </label>

            <!-- Disciplina (Read Only) -->
            <div class="opacity-70">
                <label class="label">
                    <span class="font-medium text-surface-700 dark:text-surface-300">Disciplina</span>
                    <input 
                        type="text" 
                        class="input p-3 bg-surface-100 dark:bg-surface-900" 
                        value={disciplinaNome} 
                        disabled
                        title="A disciplina não pode ser alterada após a criação."
                    />
                    <span class="text-xs text-surface-500">Para mudar a disciplina, crie uma nova turma.</span>
                </label>
            </div>
            
            <label class="flex items-center space-x-2 p-4 border border-surface-200 dark:border-surface-700 rounded-lg">
                <input class="checkbox" type="checkbox" bind:checked={formData.ativa} />
                <span class="font-medium">Turma Ativa (Visível para alunos)</span>
            </label>
        </div>

        <div class="pt-4 flex justify-end">
            <button 
                class="btn variant-filled-primary font-bold w-full md:w-auto" 
                on:click={guardarAlteracoes}
                disabled={isSaving}
            >
                {#if isSaving}
                    <Loader size={18} class="animate-spin mr-2"/> A Guardar...
                {:else}
                    <Save size={18} class="mr-2"/> Guardar Alterações
                {/if}
            </button>
        </div>
    </div>

    <!-- DANGER ZONE -->
    <div class="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30 p-6 space-y-4">
        <h2 class="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle size={20}/> Zona de Perigo
        </h2>
        
        <p class="text-sm text-red-800 dark:text-red-300">
            Desativar a turma irá remover o acesso de todos os alunos e arquivar o histórico. 
            Esta ação pode ser revertida editando a turma novamente, mas recomenda-se cautela.
        </p>

        <button 
            class="btn variant-filled-error font-bold w-full md:w-auto" 
            on:click={desativarTurma}
            disabled={isSaving}
        >
            <Trash2 size={18} class="mr-2"/> Desativar Turma
        </button>
    </div>

  {/if}
</div>