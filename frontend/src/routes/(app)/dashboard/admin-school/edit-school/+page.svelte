<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import '../../../../../app.css';
  import { 
    Building, ArrowLeft, Save, AlertCircle, CheckCircle
  } from 'lucide-svelte';

  let escolaData: any = null;
  let isLoading = true;
  let isSaving = false;
  let error: string | null = null;
  let successMessage: string | null = null;

  // Dados do formulário
  let formData = {
    nome: '',
    localizacao: '',
    emailInstitucional: '',
    telefoneInstitucional: ''
  };

  let errors: Record<string, string> = {};

  // Buscar dados da escola quando o componente montar
  import { onMount } from 'svelte';

  onMount(async () => {
    await carregarDadosEscola();
  });

  async function carregarDadosEscola() {
    isLoading = true;
    error = null;
    
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/school/minha-escola`);
      
      if (res.ok) {
        escolaData = await res.json();
        // Preencher formulário com dados atuais
        formData.nome = escolaData.escola.nome || '';
        formData.localizacao = escolaData.escola.localizacao || '';
        formData.emailInstitucional = escolaData.escola.emailInstitucional || '';
        formData.telefoneInstitucional = escolaData.escola.telefoneInstitucional || '';
      } else {
        error = 'Erro ao carregar dados da escola';
      }
    } catch (err) {
      console.error('Erro:', err);
      error = 'Erro de conexão ao carregar dados';
    } finally {
      isLoading = false;
    }
  }

  function validateForm() {
    errors = {};
    
    if (!formData.nome.trim()) errors.nome = 'Nome da escola é obrigatório';
    if (!formData.localizacao.trim()) errors.localizacao = 'Localização é obrigatória';
    if (!formData.emailInstitucional.trim()) errors.emailInstitucional = 'Email institucional é obrigatório';
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.emailInstitucional && !emailRegex.test(formData.emailInstitucional)) {
      errors.emailInstitucional = 'Email institucional inválido';
    }

    return Object.keys(errors).length === 0;
  }

  async function salvarAlteracoes() {
    if (!validateForm()) return;

    isSaving = true;
    error = null;
    successMessage = null;

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/school/minha-escola`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const result = await res.json();
        successMessage = result.mensagem;
        // Atualizar dados locais
        escolaData.escola = result.escola;
        
        // Redirecionar após sucesso
        setTimeout(() => {
          goto('/dashboard/admin-school');
        }, 1500);
      } else {
        const errorData = await res.json();
        error = errorData.message || 'Erro ao atualizar escola';
      }
    } catch (err) {
      console.error('Erro:', err);
      error = 'Erro de conexão ao atualizar dados';
    } finally {
      isSaving = false;
    }
  }

  function cancelar() {
    goto('/dashboard/admin-school');
  }
</script>

<div class="max-w-4xl mx-auto space-y-8 animate-fade-in">
  <!-- Cabeçalho -->
  <div class="flex items-center gap-4 mb-8">
    <a href="/dashboard/admin-school" class="btn variant-ghost-surface">
      <ArrowLeft size={20} />
    </a>
    <div>
      <h1 class="h1 font-bold flex items-center gap-3">
        <Building size={32} class="text-primary-500" />
        Editar Informações da Escola
      </h1>
      <p class="text-surface-600 mt-2">
        Atualize os dados da sua instituição de ensino
      </p>
    </div>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="card p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
      <p class="mt-4 text-surface-600">Carregando dados da escola...</p>
    </div>

  <!-- Error State -->
  {:else if error && !escolaData}
    <div class="card p-6 variant-soft-error text-center">
      <AlertCircle size={48} class="mx-auto text-red-500 mb-4" />
      <h3 class="h3 font-bold text-red-800 mb-2">Erro ao carregar</h3>
      <p class="text-red-700 mb-4">{error}</p>
      <button class="btn variant-filled-error" on:click={carregarDadosEscola}>
        Tentar Novamente
      </button>
    </div>

  {:else}
    <!-- Formulário de Edição -->
    <div class="card p-8 space-y-6">
      <!-- Mensagens -->
      {#if successMessage}
        <div class="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-start gap-3">
          <CheckCircle size={20} class="mt-0.5 flex-shrink-0" />
          <div>
            <p class="font-medium">Sucesso!</p>
            <p class="text-sm mt-1">{successMessage}</p>
          </div>
        </div>
      {/if}

      {#if error}
        <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
          <AlertCircle size={20} class="mt-0.5 flex-shrink-0" />
          <div>
            <p class="font-medium">Erro</p>
            <p class="text-sm mt-1">{error}</p>
          </div>
        </div>
      {/if}

      <h2 class="h2 font-bold">Informações da Escola</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Nome da Escola -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium">Nome da Escola *</label>
          <input
            type="text"
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors {errors.nome ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
            bind:value={formData.nome}
            placeholder="Ex: Escola Secundária do Município"
          />
          {#if errors.nome}
            <p class="text-red-600 text-sm">{errors.nome}</p>
          {/if}
        </div>

        <!-- Localização -->
        <div class="space-y-2 md:col-span-2">
          <label class="block text-sm font-medium">Localização *</label>
          <input
            type="text"
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors {errors.localizacao ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
            bind:value={formData.localizacao}
            placeholder="Ex: Av. Principal, nº 123 - Cidade, Província"
          />
          {#if errors.localizacao}
            <p class="text-red-600 text-sm">{errors.localizacao}</p>
          {/if}
        </div>

        <!-- Email Institucional -->
        <div class="space-y-2">
          <label class="block text-sm font-medium">Email Institucional *</label>
          <input
            type="email"
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors {errors.emailInstitucional ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
            bind:value={formData.emailInstitucional}
            placeholder="Ex: contacto@escola.edu.ao"
          />
          {#if errors.emailInstitucional}
            <p class="text-red-600 text-sm">{errors.emailInstitucional}</p>
          {/if}
        </div>

        <!-- Telefone Institucional -->
        <div class="space-y-2">
          <label class="block text-sm font-medium">Telefone Institucional</label>
          <input
            type="tel"
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
            bind:value={formData.telefoneInstitucional}
            placeholder="Ex: +244 123 456 789"
          />
        </div>

        <!-- Código da Escola (apenas leitura) -->
        {#if escolaData?.escola?.codigo}
          <div class="space-y-2 md:col-span-2">
            <label class="block text-sm font-medium">Código da Escola</label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-100 dark:bg-surface-600 text-surface-500 dark:text-surface-400"
              value={escolaData.escola.codigo}
              disabled
              readonly
            />
            <p class="text-sm text-surface-500">
              O código da escola não pode ser alterado por questões de segurança.
            </p>
          </div>
        {/if}
      </div>

      <!-- Informações de Status -->
      <div class="p-4 bg-surface-50 rounded-lg space-y-2">
        <h4 class="font-medium text-surface-700">Status da Escola</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-surface-500">Verificação:</span>
            <span class="ml-2 font-medium {escolaData?.escola?.isVerificada ? 'text-green-600' : 'text-yellow-600'}">
              {escolaData?.escola?.isVerificada ? 'Verificada' : 'Em análise'}
            </span>
          </div>
          <div>
            <span class="text-surface-500">Status:</span>
            <span class="ml-2 font-medium {escolaData?.escola?.ativa ? 'text-green-600' : 'text-red-600'}">
              {escolaData?.escola?.ativa ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        </div>
      </div>

      <!-- Ações -->
      <div class="flex gap-3 justify-end pt-6">
        <button
          type="button"
          class="btn variant-ghost-surface"
          on:click={cancelar}
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          class="btn variant-filled-primary"
          on:click={salvarAlteracoes}
          disabled={isSaving}
        >
          {#if isSaving}
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
            A Salvar...
          {:else}
            <Save size={16} class="mr-2" />
            Salvar Alterações
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>