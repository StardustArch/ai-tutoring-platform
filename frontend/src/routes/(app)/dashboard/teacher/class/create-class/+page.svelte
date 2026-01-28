<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { notifications } from '$lib/store/notifications'; 
  import { 
    School, ArrowLeft, Plus, Save, AlertCircle, 
    CheckCircle, BookOpen, Hash, Copy, Loader, GraduationCap
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
            goto('/dashboard/teacher/overview'); // Volta para a Visão Geral
        }else if(ref === 'homef'){
            goto('/dashboard/unified/overview'); // Volta para a Visão Geral

        } else {
            // Default (ou se vier da lista)
            goto('/dashboard/teacher/class'); 
        }
    }
</script>

<div class="max-w-3xl mx-auto space-y-8 animate-fade-in pb-20 p-4">
  
  <!-- CABEÇALHO (Estilo Settings) -->
  <div class="space-y-2">
      <div class="flex items-center gap-3">
        <button on:click={() => goBack()} class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
            <ArrowLeft size={24} class="text-surface-600 dark:text-surface-300"/>
        </button>
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">Criar Nova Turma</h1>
      </div>
      <p class="text-lg text-surface-600 dark:text-surface-400 ml-12">
          Configure uma nova sala de aula virtual e gere o código de acesso.
      </p>
  </div>

  <!-- ESTADO 1: SUCESSO (TURMA CRIADA) -->
  {#if turmaCriada}
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-success-200 dark:border-success-800 p-8 text-center space-y-6 animate-fade-in relative overflow-hidden">
      <!-- Decoração de fundo -->
      <div class="absolute top-0 left-0 w-full h-2 bg-success-500"></div>

      <div class="flex justify-center">
        <div class="p-4 rounded-full bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-400 animate-bounce-short">
          <CheckCircle size={64} />
        </div>
      </div>
      
      <div class="space-y-2">
        <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Turma Criada!</h2>
        <p class="text-surface-600 dark:text-surface-300">
            A turma <span class="font-bold">"{turmaCriada.nome}"</span> está pronta a receber alunos.
        </p>
      </div>

      <!-- Card do Código -->
      <div class="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-6 max-w-sm mx-auto space-y-3 border border-surface-200 dark:border-surface-700">
        <span class="text-xs font-bold uppercase tracking-widest text-surface-500">Código de Acesso</span>
        
        <div class="flex items-center justify-center gap-3">
          <code class="text-4xl font-black text-primary-600 dark:text-primary-400 tracking-[0.2em] font-mono">
            {turmaCriada.codigo}
          </code>
          <button
            class="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:scale-110 transition-transform"
            on:click={copiarCodigo}
            title="Copiar código"
          >
            <Copy size={20} />
          </button>
        </div>
      </div>

      <div class="flex justify-center gap-4 pt-4">
        <button
            class="px-4 py-2 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 font-medium rounded-lg transition-colors"
            on:click={criarOutraTurma}
        >
            <Plus size={18} class="inline mr-2" />
            Criar Outra
        </button>
        <button
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            on:click={() => goto('/dashboard/teacher/class')}
        >
            <BookOpen size={18} class="inline mr-2" />
            Minhas Turmas
        </button>
      </div>
    </div>

  {:else}
    <!-- ESTADO 2: FORMULÁRIO (Estilo Settings) -->
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 space-y-6">
        
        <h2 class="text-xl font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-3 border-b border-surface-100 dark:border-surface-700 pb-4">
            <School size={24} class="text-primary-500" />
            Detalhes da Turma
        </h2>

        <div class="space-y-6">
            <!-- Nome da Turma -->
            <div class="space-y-2">
                <label for="nome" class="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    Nome da Turma *
                </label>
                <input
                    id="nome"
                    type="text"
                    class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors {errors.nome ? 'border-red-500 focus:ring-red-500' : ''}"
                    bind:value={formData.nome}
                    placeholder="Ex: Matemática 10ª Classe - Tarde"
                    disabled={isLoading}
                />
                {#if errors.nome}
                    <p class="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.nome}</p>
                {/if}
            </div>

            <!-- Disciplina -->
            <div class="space-y-2">
                <label for="disciplina" class="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    Disciplina *
                </label>
                
                {#if carregandoDisciplinas}
                    <div class="w-full h-10 bg-surface-100 dark:bg-surface-700 rounded-lg animate-pulse"></div>
                {:else}
                <div class="relative">
                        <select
                            id="disciplina"
                            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors appearance-none {errors.disciplinaId ? 'border-red-500 focus:ring-red-500' : ''}"
                            bind:value={formData.disciplinaId}
                            disabled={isLoading || disciplinas.length === 0}
                        >
                            <option value="" disabled selected>Selecione uma disciplina...</option>
                            {#each disciplinas as disciplina}
                                <option value={disciplina.id}>{disciplina.nome}</option>
                            {/each}
                        </select>
                    </div>

                    {#if errors.disciplinaId}
                        <p class="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.disciplinaId}</p>
                    {/if}

                    {#if !carregandoDisciplinas && disciplinas.length === 0}
                        <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2 mt-2">
                            <AlertCircle size={16} />
                            <span>A sua escola ainda não definiu disciplinas.</span>
                        </div>
                    {/if}
                {/if}
            </div>

                        <!-- Classe -->
            <div class="space-y-2">
                <label for="classe" class="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    Classe *
                </label>
                
                <div class="relative">
                        <select
                            id="disciplina"
                            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors appearance-none {errors.disciplinaId ? 'border-red-500 focus:ring-red-500' : ''}"
                            bind:value={formData.classe}
                            disabled={isLoading || formData.classe.toString().length === 0}
                        >
                            <option value="" disabled selected>Selecione uma classe...</option>
                                <option value={3}>3ª Classe</option>
                                <option value={4}>4ª Classe</option>
                        </select>
                    </div>

                    {#if errors.classe}
                        <p class="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.classe}</p>
                    {/if}
            </div>

            <!-- Info Box -->
            <div class="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30 rounded-lg flex gap-3">
                <div class="mt-0.5 text-primary-600 dark:text-primary-400">
                    <BookOpen size={20} />
                </div>
                <div class="text-sm text-surface-600 dark:text-surface-300">
                    <p class="font-medium text-primary-800 dark:text-primary-200 mb-1">Nota Importante:</p>
                    <p>O código da turma será gerado automaticamente após a criação. Poderá partilhá-lo imediatamente com os encarregados.</p>
                </div>
            </div>

            <!-- Ações -->
            <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
                <button
                    class="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    on:click={criarTurma}
                    disabled={isLoading || (disciplinas.length === 0 && !carregandoDisciplinas)}
                >
                    {#if isLoading}
                        <Loader size={18} class="animate-spin mr-2" />
                        <span>A criar...</span>
                    {:else}
                        <Save size={18} class="mr-2" />
                        <span>Criar Turma</span>
                    {/if}
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
</style>