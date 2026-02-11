<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { notifications } from '$lib/store/notifications'; 
  import { 
    School, ArrowLeft, Plus, Save, AlertCircle, 
    CheckCircle, BookOpen, Copy, Loader
  } from 'lucide-svelte';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import '../../../../../../app.css'
  import { page } from '$app/stores';

  // --- ESTADO ---
  let isLoading = false;
  let turmaCriada: any = null;
  
  // Dados do formulário
  let formData = {
    nome: '',
    disciplinaId: '',
    classe: 3
  };

  let disciplinas: any[] = [];
  let carregandoDisciplinas = true;
  let errors: Record<string, string> = {};

  // Estilo Padronizado para Inputs/Selects
  const inputClass = "w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5";

  // --- INICIALIZAÇÃO ---
  onMount(async () => {
    await carregarDisciplinas();
  });

  async function carregarDisciplinas() {
    carregandoDisciplinas = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/disciplines`); 
      if (res.ok) {
        disciplinas = await res.json();
      } else {
        console.warn('Não foi possível carregar as disciplinas.');
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
      notifications.send('Erro ao carregar lista de disciplinas.', 'error');
    } finally {
      carregandoDisciplinas = false;
    }
  }

  // --- VALIDAÇÃO ---
  function validateForm() {
    errors = {};
    if (!formData.nome.trim()) errors.nome = 'Dê um nome à sua turma.';
    if (formData.nome.length < 3) errors.nome = 'O nome é muito curto.';
    if (!formData.disciplinaId) errors.disciplinaId = 'Selecione a disciplina.';
    if(!formData.classe) errors.classe = 'Selecione a classe';
    
    if (Object.keys(errors).length > 0) {
      notifications.send('Por favor, corrija os erros no formulário.', 'warning');
      return false;
    }
    return true;
  }

  // --- ACÇÕES ---
  async function criarTurma() {
    if (!validateForm()) return;

    isLoading = true;
    turmaCriada = null;

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes`, {
        method: 'POST',
        body: JSON.stringify({
            nome: formData.nome,
            disciplinaId: parseInt(formData.disciplinaId),
            classe: formData.classe
        })
      });

      if (res.ok) {
        const result = await res.json();
        turmaCriada = result.turma;
        notifications.send('Turma criada com sucesso!', 'success');
        formData.nome = ''; // Limpar nome para evitar duplicatas acidentais
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao criar turma');
      }
    } catch (err: any) {
      console.error('Erro:', err);
      notifications.send(err.message || 'Erro de conexão.', 'error');
    } finally {
      isLoading = false;
    }
  }

  function copiarCodigo() {
    if (turmaCriada?.codigo) {
      navigator.clipboard.writeText(turmaCriada.codigo);
      notifications.send('Código copiado!', 'info');
    }
  }

  function criarOutraTurma() {
    turmaCriada = null;
    formData.nome = '';
    // Mantemos a disciplina selecionada pois o professor pode criar várias da mesma
  }

  const ref = $page.url.searchParams.get('ref');

  function goBack() {
    if (ref === 'home') {
        goto('/dashboard/teacher/overview'); 
    } else if(ref === 'homef'){
        goto('/dashboard/unified/overview'); 
    } else {
        goto('/dashboard/teacher/class'); 
    }
  }
</script>

<div class="container mx-auto max-w-3xl space-y-6 animate-fade-in p-4 pb-24 md:pt-10">
  
  {#if !turmaCriada}
      <div class="space-y-3 border-b border-surface-200 dark:border-surface-700 pb-4 md:pb-6">
          <div class="flex items-center gap-3">
            <button on:click={() => goBack()} class="p-2 -ml-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-500 hover:text-primary-600">
                <ArrowLeft size={24} />
            </button>
            <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-50">Nova Turma</h1>
          </div>
          <p class="text-base md:text-lg text-surface-600 dark:text-surface-400 md:ml-12">
              Configure uma sala de aula virtual e gere o código de acesso.
          </p>
      </div>
  {/if}

  {#if turmaCriada}
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-success-200 dark:border-success-900/50 p-6 md:p-8 text-center space-y-8 animate-fade-in relative overflow-hidden max-w-lg mx-auto mt-4">
      
      <div class="absolute top-0 left-0 w-full h-1.5 bg-success-500"></div>

      <div class="flex justify-center pt-4">
        <div class="p-4 rounded-full bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 animate-bounce-short ring-8 ring-success-50/50 dark:ring-success-900/10">
          <CheckCircle size={64} />
        </div>
      </div>
      
      <div class="space-y-2">
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Turma Criada!</h2>
        <p class="text-surface-600 dark:text-surface-300">
            A turma <span class="font-bold text-surface-900 dark:text-white">"{turmaCriada.nome}"</span> está pronta.
        </p>
      </div>

      <div class="bg-surface-50 dark:bg-surface-900 rounded-xl p-6 border border-surface-200 dark:border-surface-700 relative group">
        <span class="text-[10px] font-bold uppercase tracking-widest text-surface-500 mb-2 block">Código de Acesso</span>
        
        <div class="flex items-center justify-center gap-3">
          <code class="text-3xl md:text-4xl font-black text-primary-600 dark:text-primary-400 tracking-widest font-mono select-all break-all">
            {turmaCriada.codigo}
          </code>
        </div>
        
        <button
            class="mt-4 w-full btn btn-sm variant-filled-secondary rounded-lg font-bold flex items-center justify-center gap-2 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors py-2"
            on:click={copiarCodigo}
        >
            <Copy size={16} /> Copiar Código
        </button>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <button
            class="btn variant-outline-surface border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed py-2 font-medium w-full"
            on:click={criarOutraTurma}
        >
            <Plus size={18} class="mr-2" />
            Criar Outra
        </button>
        <button
            class="btn variant-filled-primary rounded-lg flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 w-full"
            on:click={() => goto('/dashboard/teacher/class')}
        >
            <BookOpen size={18} class="mr-2" />
            Minhas Turmas
        </button>
      </div>
    </div>

  {:else}
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden mt-2">
        
        <div class="p-4 md:p-6 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
             <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <School size={20} class="text-primary-500" />
                Dados da Sala
            </h2>
        </div>

        <div class="p-4 md:p-6 space-y-6">
            <div>
                <label for="nome" class={labelClass}>Nome da Turma *</label>
                <input
                    id="nome"
                    type="text"
                    class="{inputClass} {errors.nome ? 'border-red-500 focus:ring-red-500' : ''}"
                    bind:value={formData.nome}
                    placeholder="Ex: Matemática 10ª Classe - Tarde"
                    disabled={isLoading}
                />
                {#if errors.nome}
                    <p class="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={12}/> {errors.nome}</p>
                {/if}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="disciplina" class={labelClass}>Disciplina *</label>
                    
                    {#if carregandoDisciplinas}
                        <div class="w-full h-[42px] bg-surface-100 dark:bg-surface-700 rounded-lg animate-pulse"></div>
                    {:else}
                        <select
                            id="disciplina"
                            class="{inputClass} appearance-none {errors.disciplinaId ? 'border-red-500 focus:ring-red-500' : ''}"
                            bind:value={formData.disciplinaId}
                            disabled={isLoading || disciplinas.length === 0}
                        >
                            <option value="" disabled selected>Selecione...</option>
                            {#each disciplinas as disciplina}
                                <option value={disciplina.id}>{disciplina.nome}</option>
                            {/each}
                        </select>

                        {#if errors.disciplinaId}
                            <p class="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={12}/> {errors.disciplinaId}</p>
                        {/if}

                        {#if !carregandoDisciplinas && disciplinas.length === 0}
                            <p class="text-xs text-warning-600 mt-1.5 flex items-center gap-1">
                                <AlertCircle size={12} /> Nenhuma disciplina disponível.
                            </p>
                        {/if}
                    {/if}
                </div>

                <div>
                    <label for="classe" class={labelClass}>Nível Escolar *</label>
                    <select
                        id="classe"
                        class="{inputClass} appearance-none {errors.classe ? 'border-red-500 focus:ring-red-500' : ''}"
                        bind:value={formData.classe}
                        disabled={isLoading}
                    >
                        <option value="" disabled>Selecione...</option>
                        <option value={3}>3ª Classe</option>
                        <option value={4}>4ª Classe</option>
                        <option value={5}>5ª Classe</option>
                        <option value={6}>6ª Classe</option>
                    </select>

                    {#if errors.classe}
                        <p class="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={12}/> {errors.classe}</p>
                    {/if}
                </div>
            </div>

            <div class="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30 rounded-lg flex gap-3">
                <BookOpen size={20} class="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                <div class="text-sm text-surface-600 dark:text-surface-300">
                    <span class="font-semibold text-primary-800 dark:text-primary-200 block mb-1">Como funciona?</span>
                    O código da turma será gerado automaticamente após a criação. Poderá partilhá-lo imediatamente com os encarregados.
                </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                    class="order-1 sm:order-1 btn variant-filled-primary rounded-lg min-w-[140px] flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed py-2.5"
                    on:click={criarTurma}
                    disabled={isLoading || (disciplinas.length === 0 && !carregandoDisciplinas)}
                >
                    {#if isLoading}
                        <Loader size={18} class="animate-spin mr-2" />
                        <span>A Criar...</span>
                    {:else}
                        <Save size={18} />
                        <span>Criar Turma</span>
                    {/if}
                </button>
                
                <button
                    class="order-2 sm:order-2 btn variant-outline-surface border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed flex-1 text-surface-700 dark:text-surface-300 font-medium py-2.5"
                    on:click={() => goBack()}
                    disabled={isLoading}
                >
                    Cancelar
                </button>
            </div>

        </div>
    </div>
  {/if}
</div>

<style>
    @keyframes bounce-short {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    .animate-bounce-short {
        animation: bounce-short 0.5s ease-in-out 1;
    }
    
    .animate-fade-in {
        animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>