<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notify } from '$lib/store/toaster';
  import { confirm } from '$lib/store/confirm';
  import { 
    ArrowLeft, Save, Trash2, AlertTriangle, 
    School, Loader, Ban, CheckCircle2, Archive
  } from 'lucide-svelte';

  // --- ESTADO ---
  let classId = $page.params.id;
  let isLoading = true;
  let isSaving = false;
  let isDeleting = false;
  
  let formData = {
    nome: '',
    ativa: true
  };
  let disciplinaNome = ''; 

  // Ajuste nos Inputs: py-3 no mobile para toque, py-2.5 no desktop
  const inputClass = "w-full px-3 py-3 md:py-2.5 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-1.5 ml-0.5";

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
      notify('Erro','Erro ao carregar dados.', 'error');
      goBack();
    } finally {
      isLoading = false;
    }
  }

  // --- ACÇÕES ---
  async function guardarAlteracoes() {
    if (!formData.nome.trim()) {
        notify('Atenção','O nome da turma não pode estar vazio.', 'warning');
        return;
    }

    isSaving = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        notify('Salvo','Turma atualizada com sucesso!', 'success');
        goBack();
      } else {
        throw new Error('Falha ao atualizar');
      }
    } catch (err) {
      notify('Erro','Erro ao guardar alterações.', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function arquivarTurma() {
        const aceitou = await confirm({
        title: `Arquivar a turma "${formData.nome}"?`,
        message: 'Isto irá remover o acesso dos alunos, mas manterá o histórico.',
        type: "danger",
        cancelText: 'Cancelar'
    });
    if (!aceitou) return;

    isDeleting = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}`, {
        method: 'DELETE' 
      });

      if (res.ok) {
        notify('Salvo','Turma arquivada com sucesso.', 'success');
        goto('/dashboard/teacher/class');
      } else {
        throw new Error('Falha ao arquivar');
      }
    } catch (err) {
      notify('Erro','Erro ao arquivar turma.', 'error');
    } finally {
      isDeleting = false;
    }
  }

  const ref = $page.url.searchParams.get('ref');

  function goBack() {
    if (ref === 'home') goto('/dashboard/teacher/overview'); 
    else goto(`/dashboard/teacher/class/${classId}`); 
  }
</script>

<div class="container mx-auto max-w-4xl w-full p-4 md:p-6 pb-40 md:pb-24 space-y-6 animate-fade-in">

  <div class="flex items-center gap-3 border-b border-surface-200 dark:border-surface-700 pb-4">
    <button 
      on:click={goBack} 
      class="p-2 -ml-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 hover:text-primary-600 transition-colors"
    >
      <ArrowLeft size={20} />
    </button>
    <div>
        <h1 class="text-lg md:text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Configurações da Turma</h1>
    </div>
  </div>

  {#if isLoading}
    <div class="bg-white dark:bg-surface-800 rounded-lg p-6 space-y-4 animate-pulse border border-surface-200 dark:border-surface-700">
        <div class="h-4 w-1/4 bg-surface-200 dark:bg-surface-700 rounded"></div>
        <div class="h-10 w-full bg-surface-200 dark:bg-surface-700 rounded"></div>
    </div>
  {:else}
  
    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        
        <div class="p-5 md:p-6 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex justify-between items-center">
             <h2 class="text-xs md:text-sm font-bold uppercase tracking-wide text-surface-600 dark:text-surface-300 flex items-center gap-2">
                <School size={16} />
                Dados Gerais
            </h2>
        </div>

        <div class="p-5 md:p-6 space-y-6">
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
                    class="{inputClass} bg-surface-50 dark:bg-surface-900/40 text-surface-500 cursor-not-allowed border-surface-200 dark:border-surface-700 opacity-70" 
                    value={disciplinaNome} 
                    disabled
                />
            </div>
            
            <div class="flex items-center justify-between p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/20 gap-4">
                <div class="flex-1 space-y-0.5">
                    <label class="text-sm font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                        {#if formData.ativa}
                            <CheckCircle2 size={16} class="text-green-600 shrink-0" /> 
                            <span>Turma Activa</span>
                        {:else}
                            <Ban size={16} class="text-surface-400 shrink-0" /> 
                            <span>Turma Oculta</span>
                        {/if}
                    </label>
                    <p class="text-[11px] text-surface-500 leading-tight">
                        Se ocultar, os alunos deixam de ver esta turma no painel deles.
                    </p>
                </div>
                
                <button 
                    class="shrink-0 relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 {formData.ativa ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}"
                    on:click={() => formData.ativa = !formData.ativa}
                    role="switch"
                    aria-checked={formData.ativa}
                >
                    <span class="sr-only">Ativar turma</span>
                    <span class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm {formData.ativa ? 'translate-x-6' : 'translate-x-1'}"></span>
                </button>
            </div>

            <div class="pt-4 flex flex-col md:flex-row justify-end gap-3 border-t border-surface-100 dark:border-surface-700">
                <button 
                    class="w-full md:w-auto btn bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-600 font-medium rounded-md py-3 md:py-2 px-4 transition-colors text-sm order-2 md:order-1" 
                    on:click={goBack}
                    disabled={isSaving}
                >
                    Cancelar
                </button>
                <button 
                    class="w-full md:w-auto btn bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md py-3 md:py-2 px-6 flex items-center justify-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-70 text-sm order-1 md:order-2" 
                    on:click={guardarAlteracoes}
                    disabled={isSaving}
                >
                    {#if isSaving}
                        <Loader size={16} class="animate-spin" /> 
                        <span>A Guardar...</span>
                    {:else}
                        <Save size={16} /> 
                        <span>Guardar Alterações</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <div class="rounded-lg border border-red-200 dark:border-red-900/30 bg-white dark:bg-surface-800 overflow-hidden">
        <div class="p-5 md:p-6">
            <h3 class="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle size={16}/> Zona de Perigo
            </h3>
            
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <p class="text-sm text-surface-600 dark:text-surface-300 max-w-md">
                    Arquivar remove o acesso de todos os alunos. Só faça isto no fim do ano lectivo.
                </p>
                
                <button 
                    class="w-full md:w-auto btn bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-md flex items-center justify-center gap-2 px-4 py-3 md:py-2 text-sm font-medium transition-colors shadow-sm" 
                    on:click={arquivarTurma}
                    disabled={isDeleting}
                >
                    {#if isDeleting}
                        <Loader size={16} class="animate-spin" />
                    {:else}
                        <Archive size={16} /> 
                    {/if}
                    <span>Arquivar Turma</span>
                </button>
            </div>
        </div>
    </div>

  {/if}
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