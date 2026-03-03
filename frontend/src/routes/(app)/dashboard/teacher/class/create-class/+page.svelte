<svelte:head>
    <title>Criar Nova Turma | KMind</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { notifications } from '$lib/store/notifications'; 
  import { 
    School, ArrowLeft, Plus, Save, AlertCircle, 
    CheckCircle2, BookOpen, Copy, Loader, GraduationCap
  } from 'lucide-svelte';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { page } from '$app/stores';

  // --- ESTADO ---
  let isLoading = false;
  let isCreating = false;
  let turmaCriada: any = null;
  
  let formData = {
    nome: '',
    disciplinaId: '',
    classe: ''
  };

  let disciplinas: any[] = [];
  let loadingDisciplinas = true;

  // Estilo Padronizado
  const inputClass = "w-full px-3 py-2.5 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-1.5 ml-0.5";

  onMount(async () => {
    await carregarDisciplinas();
  });

  async function carregarDisciplinas() {
    loadingDisciplinas = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/disciplines`); 
      if (res.ok) {
        disciplinas = await res.json();
      }
    } catch (err) {
      notifications.send('Erro ao carregar disciplinas.', 'error');
    } finally {
      loadingDisciplinas = false;
    }
  }

  async function criarTurma() {
    if (!formData.nome || !formData.disciplinaId || !formData.classe) {
        notifications.send('Preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    isCreating = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes`, {
        method: 'POST',
        body: JSON.stringify({
            nome: formData.nome,
            disciplinaId: parseInt(formData.disciplinaId),
            classe: parseInt(formData.classe)
        })
      });

      if (res.ok) {
        const result = await res.json();
        turmaCriada = result.turma;
        notifications.send('Turma criada com sucesso!', 'success');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao criar turma');
      }
    } catch (err: any) {
      notifications.send(err.message || 'Erro ao criar turma.', 'error');
    } finally {
      isCreating = false;
    }
  }

  function copiarCodigo() {
    if (turmaCriada?.codigo) {
      navigator.clipboard.writeText(turmaCriada.codigo);
      notifications.send('Código copiado!', 'success');
    }
  }

  function resetForm() {
    turmaCriada = null;
    formData.nome = '';
    // Mantém disciplina e classe para facilitar criação em massa
  }

  const ref = $page.url.searchParams.get('ref');

  function goBack() {
    if (ref === 'home') goto('/dashboard/teacher/overview'); 
    else if(ref === 'homef') goto('/dashboard/unified/overview');
    else goto('/dashboard/teacher/class'); 
  }
</script>

<div class="container mx-auto max-w-2xl md:min-h-[80vh] flex flex-col justify-center p-4 animate-fade-in">
  
  <div class="mb-8 text-center">
      {#if !turmaCriada}
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Nova Sala de Aula</h1>
        <p class="text-surface-500 text-sm mt-2">Configure os detalhes da turma para gerar o código de acesso.</p>
      {:else}
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mx-auto mb-4 animate-bounce-short">
            <CheckCircle2 size={32} />
        </div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Turma Criada!</h1>
        <p class="text-surface-500 text-sm mt-2">A turma <span class="font-bold text-surface-900 dark:text-white">"{turmaCriada.nome}"</span> está pronta a receber alunos.</p>
      {/if}
  </div>

  <div class="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm overflow-hidden relative">
    
    {#if isLoading}
        <div class="absolute inset-0 bg-white/50 dark:bg-surface-800/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader size={32} class="animate-spin text-primary-500" />
        </div>
    {/if}

    {#if !turmaCriada}
        <div class="p-6 md:p-8 space-y-6">
            
            <div>
                <label for="nome" class={labelClass}>Nome da Turma <span class="text-red-500">*</span></label>
                <input
                    id="nome"
                    type="text"
                    class={inputClass}
                    bind:value={formData.nome}
                    placeholder="Ex: Matemática 10ª A - Manhã"
                    disabled={isCreating}
                />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="disciplina" class={labelClass}>Disciplina <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <select
                            id="disciplina"
                            class="{inputClass} appearance-none pr-8"
                            bind:value={formData.disciplinaId}
                            disabled={isCreating || loadingDisciplinas}
                        >
                            <option value="" disabled selected>Selecione...</option>
                            {#each disciplinas as disciplina}
                                <option value={disciplina.id}>{disciplina.nome}</option>
                            {/each}
                        </select>
                        {#if loadingDisciplinas}
                            <div class="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader size={14} class="animate-spin text-surface-400" />
                            </div>
                        {/if}
                    </div>
                </div>

                <div>
                    <label for="classe" class={labelClass}>Nível Escolar <span class="text-red-500">*</span></label>
                    <select
                        id="classe"
                        class="{inputClass} appearance-none"
                        bind:value={formData.classe}
                        disabled={isCreating}
                    >
                        <option value="" disabled selected>Selecione...</option>
                        <option value="3">3ª Classe</option>
                        <option value="4">4ª Classe</option>
                    </select>
                </div>
            </div>

            <div class="pt-4 flex flex-col-reverse sm:flex-row gap-3 border-t border-surface-100 dark:border-surface-700">
                <button
                    class="btn w-full sm:w-auto bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-600 font-medium rounded-md py-2.5 transition-colors"
                    on:click={goBack}
                    disabled={isCreating}
                >
                    Cancelar
                </button>
                <button
                    class="btn w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md py-2.5 px-6 flex items-center justify-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-70 sm:ml-auto"
                    on:click={criarTurma}
                    disabled={isCreating}
                >
                    {#if isCreating}
                        <Loader size={18} class="animate-spin" />
                        <span>A Criar...</span>
                    {:else}
                        <Save size={18} />
                        <span>Criar Turma</span>
                    {/if}
                </button>
            </div>
        </div>
    
    {:else}
        <div class="p-8 text-center space-y-8">
            
            <div class="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-6 border border-surface-200 dark:border-surface-700 max-w-sm mx-auto">
                <p class="text-xs font-bold uppercase tracking-widest text-surface-500 mb-3">Código de Acesso</p>
                
                <div class="flex items-center justify-center gap-3 mb-4">
                    <code class="text-4xl font-mono font-bold text-primary-600 dark:text-primary-400 tracking-widest select-all">
                        {turmaCriada.codigo}
                    </code>
                </div>
                
                <button
                    class="btn btn-sm w-full bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:border-primary-500 hover:text-primary-600 transition-all rounded-md flex items-center justify-center gap-2 py-2 font-medium text-surface-600 dark:text-surface-300 shadow-sm"
                    on:click={copiarCodigo}
                >
                    <Copy size={14} /> Copiar Código
                </button>
                
                <p class="text-xs text-surface-400 mt-3">Partilhe este código com os seus alunos.</p>
            </div>

            <div class="flex flex-col sm:flex-row justify-center gap-3">
                <button
                    class="btn bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 font-medium rounded-md py-2.5 px-6 transition-colors"
                    on:click={resetForm}
                >
                    <Plus size={18} class="mr-2 inline" />
                    Criar Outra
                </button>
                <button
                    class="btn bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md py-2.5 px-6 shadow-sm transition-all"
                    on:click={() => goto('/dashboard/teacher/class')}
                >
                    <School size={18} class="mr-2 inline" />
                    Ver Minhas Turmas
                </button>
            </div>
        </div>
    {/if}

  </div>
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .animate-bounce-short { animation: bounce 0.6s ease-out; }
    @keyframes bounce { 
        0%, 100% { transform: scale(1); } 
        50% { transform: scale(1.1); } 
    }
</style>