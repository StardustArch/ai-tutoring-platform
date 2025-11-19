<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import '../../../../../app.css'
  import { 
    Building, Upload, FileText, CheckCircle, 
    AlertCircle, ArrowLeft, Save
  } from 'lucide-svelte';

  // Estados do formulário
  let isLoading = false;
  let escolaCriada = false;
  let escolaId: number | null = null;
  let currentStep = 1; // 1: Dados escola, 2: Documentos

  // Dados da escola
  let formData = {
    nome: '',
    codigo: '',
    localizacao: '',
    emailInstitucional: '',
    telefoneInstitucional: ''
  };

  // Documentos
  let documentos = {
    alvara: {
      file: null as File | null,
      numeroDocumento: '',
      dataEmissao: '',
      dataValidade: '',
      uploaded: false,
      loading: false
    }
  };

  let errors: Record<string, string> = {};
  let successMessage = '';

  // Validar formulário passo 1
  function validateStep1() {
    errors = {};
    
    if (!formData.nome.trim()) errors.nome = 'Nome da escola é obrigatório';
    if (!formData.codigo.trim()) errors.codigo = 'Código da escola é obrigatório';
    if (!formData.localizacao.trim()) errors.localizacao = 'Localização é obrigatória';
    if (!formData.emailInstitucional.trim()) errors.emailInstitucional = 'Email institucional é obrigatório';
    if (!formData.telefoneInstitucional.trim()) errors.telefoneInstitucional = 'Telefone institucional é obrigatório';
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.emailInstitucional && !emailRegex.test(formData.emailInstitucional)) {
      errors.emailInstitucional = 'Email institucional inválido';
    }

    return Object.keys(errors).length === 0;
  }

  // Criar escola
  async function criarEscola() {
    if (!validateStep1()) return;

    isLoading = true;
    errors = {};

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/school`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const result = await res.json();
        escolaId = result.escola.id;
        escolaCriada = true;
        currentStep = 2;
        successMessage = 'Escola criada com sucesso! Agora faça upload dos documentos.';
      } else {
        const error = await res.json();
        errors.submit = error.message || 'Erro ao criar escola';
      }
    } catch (error) {
      errors.submit = 'Erro de conexão. Tente novamente.';
    } finally {
      isLoading = false;
    }
  }

  // Upload de documento
async function uploadDocumento(tipo: 'alvara') {
    const doc = documentos[tipo];
    
    if (!doc.file) {
      errors.upload = 'Por favor, selecione um arquivo';
      return;
    }

    if (!doc.numeroDocumento.trim()) {
      errors.upload = 'Número do documento é obrigatório';
      return;
    }

    doc.loading = true;
    errors.upload = '';

    try {
      const formData = new FormData();
      formData.append('documento', doc.file);
      formData.append('tipo', tipo);
      formData.append('numeroDocumento', doc.numeroDocumento);
      
      if (doc.dataEmissao) formData.append('dataEmissao', doc.dataEmissao);
      if (doc.dataValidade) formData.append('dataValidade', doc.dataValidade);

      // CORREÇÃO: Não usar JSON.stringify com FormData
      const res = await fetch(`${PUBLIC_API_URL_HOST}/api/school/${escolaId}/documentos`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${$auth.accessToken}` // Adicionar token de autenticação
        }
      });

      if (res.ok) {
        const result = await res.json();
        doc.uploaded = true;
        successMessage = `${tipo === 'alvara'} carregado com sucesso!`;
        
        // Verificar se todos os documentos foram enviados
        if (documentos.alvara.uploaded) {
          setTimeout(() => {
            goto('/dashboard/admin-school/');
          }, 2000);
        }
      } else {
        const error = await res.json();
        errors.upload = error.message || `Erro ao carregar ${tipo}`;
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      errors.upload = 'Erro de conexão. Tente novamente.';
    } finally {
      doc.loading = false;
    }
  }

  // Manipular seleção de arquivo
  function handleFileSelect(tipo: 'alvara', event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      documentos[tipo].file = input.files[0];
    }
  }

  // Verificar se pode avançar
  $: canProceedToStep2 = escolaCriada && escolaId;
  $: allDocumentsUploaded = documentos.alvara.uploaded;
</script>

<div class="max-w-4xl mx-auto space-y-8 animate-fade-in">
  <!-- Cabeçalho -->
  <div class="flex items-center gap-4 mb-8">
    <a href="/dashboard/home" class="btn variant-ghost-surface">
      <ArrowLeft size={20} />
    </a>
    <div>
      <h1 class="h1 font-bold flex items-center gap-3">
        <Building size={32} class="text-primary-500" />
        Criar Nova Escola
      </h1>
      <p class="text-surface-600 mt-2">
        {#if currentStep === 1}
          Preencha os dados básicos da sua instituição de ensino
        {:else}
          Faça upload dos documentos de verificação da escola
        {/if}
      </p>
    </div>
  </div>

  <!-- Progresso -->
  <div class="flex items-center justify-center mb-8">
    <div class="flex items-center">
      <!-- Passo 1 -->
      <div class="flex flex-col items-center">
        <div class="w-10 h-10 rounded-full flex items-center justify-center 
          {currentStep >= 1 ? 'bg-primary-500 text-white' : 'bg-surface-200 text-surface-400'}">
          {#if currentStep > 1}
            <CheckCircle size={20} />
          {:else}
            1
          {/if}
        </div>
        <span class="text-sm mt-2 {currentStep >= 1 ? 'text-primary-600 font-medium' : 'text-surface-400'}">
          Dados da Escola
        </span>
      </div>
      
      <!-- Linha -->
      <div class="w-20 h-1 mx-4 {currentStep >= 2 ? 'bg-primary-500' : 'bg-surface-200'}"></div>
      
      <!-- Passo 2 -->
      <div class="flex flex-col items-center">
        <div class="w-10 h-10 rounded-full flex items-center justify-center 
          {currentStep >= 2 ? 'bg-primary-500 text-white' : 'bg-surface-200 text-surface-400'}">
          {#if currentStep > 2 || allDocumentsUploaded}
            <CheckCircle size={20} />
          {:else}
            2
          {/if}
        </div>
        <span class="text-sm mt-2 {currentStep >= 2 ? 'text-primary-600 font-medium' : 'text-surface-400'}">
          Documentos
        </span>
      </div>
    </div>
  </div>

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

  {#if errors.submit}
    <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
      <AlertCircle size={20} class="mt-0.5 flex-shrink-0" />
      <div>
        <p class="font-medium">Erro</p>
        <p class="text-sm mt-1">{errors.submit}</p>
      </div>
    </div>
  {/if}

  <!-- Conteúdo dos Passos -->
  {#if currentStep === 1}
    <!-- PASSO 1: Dados da Escola -->
    <div class="card p-8 space-y-6">
      <h2 class="h2 font-bold">Informações da Escola</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Nome da Escola -->
        <div class="space-y-2">
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

        <!-- Código da Escola -->
        <div class="space-y-2">
          <label class="block text-sm font-medium">Código da Escola *</label>
          <input
            type="text"
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors {errors.codigo ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
            bind:value={formData.codigo}
            placeholder="Ex: ESC001"
          />
          {#if errors.codigo}
            <p class="text-red-600 text-sm">{errors.codigo}</p>
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
          <label class="block text-sm font-medium">Telefone Institucional *</label>
          <input
            type="tel"
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors {errors.telefoneInstitucional ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}"
            bind:value={formData.telefoneInstitucional}
            placeholder="Ex: +244 123 456 789"
          />
          {#if errors.telefoneInstitucional}
            <p class="text-red-600 text-sm">{errors.telefoneInstitucional}</p>
          {/if}
        </div>
      </div>

      <!-- Ações -->
      <div class="flex justify-end pt-6">
        <button
          class="btn variant-filled-primary"
          on:click={criarEscola}
          disabled={isLoading}
        >
          {#if isLoading}
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
            A Criar...
          {:else}
            <Save size={16} class="mr-2" />
            Criar Escola
          {/if}
        </button>
      </div>
    </div>

  {:else if currentStep === 2}
    <!-- PASSO 2: Upload de Documentos -->
    <div class="space-y-6">
      <!-- Alvará -->
      <div class="card p-6 space-y-4">
        <div class="flex items-center gap-3">
          <FileText size={24} class="text-primary-500" />
          <h3 class="h3 font-bold">Alvará de Funcionamento</h3>
          {#if documentos.alvara.uploaded}
            <CheckCircle size={20} class="text-green-500" />
          {/if}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium">Número do Alvará *</label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors disabled:bg-surface-100 disabled:text-surface-500"
              bind:value={documentos.alvara.numeroDocumento}
              disabled={documentos.alvara.uploaded}
              placeholder="Número do documento"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium">Data de Emissão</label>
            <input
              type="date"
              class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors disabled:bg-surface-100 disabled:text-surface-500"
              bind:value={documentos.alvara.dataEmissao}
              disabled={documentos.alvara.uploaded}
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium">Data de Validade</label>
            <input
              type="date"
              class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors disabled:bg-surface-100 disabled:text-surface-500"
              bind:value={documentos.alvara.dataValidade}
              disabled={documentos.alvara.uploaded}
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium">Arquivo (PDF, JPG, PNG) *</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors disabled:bg-surface-100 disabled:text-surface-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              on:change={(e) => handleFileSelect('alvara', e)}
              disabled={documentos.alvara.uploaded || documentos.alvara.loading}
            />
          </div>
        </div>

        {#if documentos.alvara.file}
          <div class="p-3 bg-surface-100 rounded-lg flex items-center justify-between">
            <span class="text-sm font-medium">{documentos.alvara.file.name}</span>
            <span class="text-xs text-surface-500">
              {(documentos.alvara.file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        {/if}

        {#if !documentos.alvara.uploaded}
          <div class="flex justify-end">
            <button
              class="btn variant-filled-primary"
              on:click={() => uploadDocumento('alvara')}
              disabled={documentos.alvara.loading || !documentos.alvara.file || !documentos.alvara.numeroDocumento}
            >
              {#if documentos.alvara.loading}
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                A Carregar...
              {:else}
                <Upload size={16} class="mr-2" />
                Carregar Alvará
              {/if}
            </button>
          </div>
        {/if}
      </div>


      {#if errors.upload}
        <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {errors.upload}
        </div>
      {/if}

      {#if allDocumentsUploaded}
        <div class="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-center">
          <p class="font-medium">Todos os documentos foram carregados com sucesso!</p>
          <p class="text-sm mt-1">A sua escola será verificada pela nossa equipa. Será redirecionado automaticamente...</p>
        </div>
      {/if}
    </div>
  {/if}
</div>