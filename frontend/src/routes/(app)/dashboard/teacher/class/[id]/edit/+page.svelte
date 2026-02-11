<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  
  import { 
    ArrowLeft, Save, Trash2, AlertTriangle, 
    School, Loader, Ban, CheckCircle
  } from 'lucide-svelte';

  // --- ESTADO ---
  let classId = $page.params.id;
  let isLoading = true;
  let isSaving = false;
  
  let formData = {
    nome: '',
    ativa: true
  };
  let disciplinaNome = ''; 

  // Estilo Padronizado
  const inputClass = "w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5";

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
      goBack();
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
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        notifications.send('Turma atualizada com sucesso!', 'success');
        goBack();
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
    const confirmacao = prompt(`ATENÇÃO: Desativar a turma impede o acesso dos alunos.\n\nPara confirmar, digite "DESATIVAR":`);
    
    if (confirmacao !== 'DESATIVAR') {
        if (confirmacao !== null) notifications.send('Ação cancelada.', 'info');
        return;
    }

    isSaving = true;
    try {
      // Nota: Dependendo da API, pode ser um DELETE ou um PUT { ativa: false }
      // Assumindo DELETE como soft-delete baseado no teu código anterior
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}`, {
        method: 'DELETE' 
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
        goto('/dashboard/teacher/class/'); 
    } else {
        goto(`/dashboard/teacher/class/${classId}`); 
    }
  }
</script>

<div class="container mx-auto max-w-4xl p-4 pb-24 space-y-6 animate-fade-in">

  <div class="flex items-center gap-3 border-b border-surface-200 dark:border-surface-700 pb-4">
    <button 
      on:click={() => goBack()} 
      class="p-2 -ml-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 hover:text-primary-600 transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
    <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Editar Turma</h1>
        <p class="text-surface-500 text-sm">Atualize as informações ou encerre a turma.</p>
    </div>
  </div>

  {#if isLoading}
    <div class="bg-white dark:bg-surface-800 rounded-xl p-6 space-y-4 animate-pulse">
        <div class="h-8 w-1/3 bg-surface-200 dark:bg-surface-700 rounded"></div>
        <div class="h-10 w-full bg-surface-200 dark:bg-surface-700 rounded"></div>
        <div class="h-10 w-full bg-surface-200 dark:bg-surface-700 rounded"></div>
    </div>
  {:else}
  
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        
        <div class="p-6 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
             <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <School size={20} class="text-primary-500" />
                Informações Básicas
            </h2>
        </div>

        <div class="p-6 space-y-6">
            <div>
                <label for="nome" class={labelClass}>Nome da Turma</label>
                <input 
                    id="nome"
                    type="text" 
                    class={inputClass} 
                    bind:value={formData.nome} 
                    placeholder="Ex: Matemática 10ª B"
                    disabled={isSaving}
                />
            </div>

            <div>
                <label for="disciplina" class={labelClass}>Disciplina</label>
                <input 
                    id="disciplina"
                    type="text" 
                    class="{inputClass} bg-surface-50 dark:bg-surface-900/50 opacity-70 cursor-not-allowed" 
                    value={disciplinaNome} 
                    disabled
                    title="A disciplina não pode ser alterada após a criação."
                />
                <p class="text-xs text-surface-500 mt-1.5">
                    Para mudar a disciplina, terá de criar uma nova turma.
                </p>
            </div>
            
            <div class="p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/30 flex items-start gap-3">
                <div class="mt-0.5">
                    {#if formData.ativa}
                        <CheckCircle size={20} class="text-green-600 dark:text-green-500" />
                    {:else}
                        <Ban size={20} class="text-surface-400" />
                    {/if}
                </div>
                <div class="flex-1">
                    <label class="flex items-center justify-between cursor-pointer">
                        <span class="font-medium text-surface-900 dark:text-surface-100">Turma Ativa</span>
                        <input 
                            type="checkbox" 
                            class="w-5 h-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            bind:checked={formData.ativa} 
                            disabled={isSaving}
                        />
                    </label>
                    <p class="text-sm text-surface-500 mt-1">
                        Se desmarcado, a turma ficará oculta para os alunos, mas os dados serão mantidos.
                    </p>
                </div>
            </div>

            <div class="pt-2 flex justify-end">
                <button 
                    class="btn variant-filled-primary rounded-lg flex items-center gap-2 px-6 py-2.5 font-medium min-w-[140px] justify-center  bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800" 
                    on:click={guardarAlteracoes}
                    disabled={isSaving}
                >
                    {#if isSaving}
                        <Loader size={18} class="animate-spin" /> 
                        <span>A Guardar...</span>
                    {:else}
                        <Save size={18} /> 
                        <span>Guardar</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <div class="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 overflow-hidden">
        <div class="p-6">
            <h2 class="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                <AlertTriangle size={20}/> Zona de Perigo
            </h2>
            
            <p class="text-sm text-red-800 dark:text-red-300 mb-6">
                Esta ação irá arquivar permanentemente a turma e remover o acesso de todos os alunos. O histórico poderá ser consultado, mas não alterado.
            </p>

            <button 
                class="btn variant-filled-error rounded-lg flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 font-medium bg-red-600 hover:bg-red-700 text-white transition-colors" 
                on:click={desativarTurma}
                disabled={isSaving}
            >
                <Trash2 size={18} /> 
                <span>Desativar Turma</span>
            </button>
        </div>
    </div>

  {/if}
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>