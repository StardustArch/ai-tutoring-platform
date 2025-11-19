<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import '../../../../../app.css';
  import { 
    Users, ArrowLeft, Plus, Copy, CheckCircle, 
    AlertCircle, Calendar, Key
  } from 'lucide-svelte';

  let isLoading = false;
  let error: string | null = null;
  let successMessage: string | null = null;
  let codigoGerado: any = null;
  let copied = false;

  // Form data
  let validoAte = '';

  async function gerarCodigo() {
    isLoading = true;
    error = null;
    successMessage = null;
    codigoGerado = null;

    try {
      const body: any = {};
      if (validoAte) {
        body.validoAte = validoAte;
      }

      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/school/professor/gerar-codigo`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const result = await res.json();
        codigoGerado = result.codigo;
        successMessage = result.mensagem;
        validoAte = ''; // Reset form
      } else {
        const errorData = await res.json();
        error = errorData.message || 'Erro ao gerar código';
      }
    } catch (err) {
      console.error('Erro:', err);
      error = 'Erro de conexão ao gerar código';
    } finally {
      isLoading = false;
    }
  }

  function copiarCodigo() {
    if (codigoGerado?.codigo) {
      navigator.clipboard.writeText(codigoGerado.codigo);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    }
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-AO');
  }

  function calcularValidadePadrao() {
    const data = new Date();
    data.setDate(data.getDate() + 30);
    return data.toISOString().split('T')[0];
  }

  $: dataMinima = new Date().toISOString().split('T')[0];
  $: dataPadrao = calcularValidadePadrao();
</script>

<div class="max-w-4xl mx-auto space-y-8 animate-fade-in">
  <!-- Cabeçalho -->
  <div class="flex items-center gap-4 mb-8">
    <a href="/dashboard/admin-school" class="btn variant-ghost-surface">
      <ArrowLeft size={20} />
    </a>
    <div>
      <h1 class="h1 font-bold flex items-center gap-3">
        <Key size={32} class="text-primary-500" />
        Gerar Código para Professor
      </h1>
      <p class="text-surface-600 mt-2">
        Crie um código de ativação para novos professores se juntarem à sua escola
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Formulário -->
    <div class="card p-6 space-y-6">
      <h2 class="h2 font-bold">Gerar Novo Código</h2>
      
      <!-- Data de Validade -->
      <div class="space-y-2">
        <label class="block text-sm font-medium flex items-center gap-2">
          <Calendar size={16} />
          Data de Validade (Opcional)
        </label>
        <input
          type="date"
          class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
          bind:value={validoAte}
          min={dataMinima}
          placeholder={dataPadrao}
        />
        <p class="text-sm text-surface-500">
          Se não especificar, o código será válido por 30 dias.
        </p>
      </div>

      <!-- Ação -->
      <button
        class="btn variant-filled-primary w-full"
        on:click={gerarCodigo}
        disabled={isLoading}
      >
        {#if isLoading}
          <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          A Gerar...
        {:else}
          <Plus size={16} class="mr-2" />
          Gerar Código
        {/if}
      </button>

      <!-- Mensagens -->
      {#if error}
        <div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
          <AlertCircle size={20} class="mt-0.5 flex-shrink-0" />
          <div>
            <p class="font-medium">Erro</p>
            <p class="text-sm mt-1">{error}</p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Código Gerado -->
    {#if codigoGerado}
      <div class="card p-6 variant-soft-success space-y-4">
        <div class="flex items-center gap-3">
          <CheckCircle size={24} class="text-green-500" />
          <h3 class="h3 font-bold">Código Gerado!</h3>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-surface-500">Código</label>
            <div class="flex items-center gap-2 mt-1">
              <code class="text-2xl font-bold text-surface-900 bg-surface-100 px-3 py-2 rounded-lg flex-1 text-center tracking-wider">
                {codigoGerado.codigo}
              </code>
              <button
                class="btn variant-ghost-surface"
                on:click={copiarCodigo}
                title="Copiar código"
              >
                {#if copied}
                  <CheckCircle size={16} class="text-green-500" />
                {:else}
                  <Copy size={16} />
                {/if}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-surface-500">Criado em:</span>
              <p class="font-medium">{formatarData(codigoGerado.criadoEm)}</p>
            </div>
            <div>
              <span class="text-surface-500">Válido até:</span>
              <p class="font-medium">{formatarData(codigoGerado.validoAte)}</p>
            </div>
          </div>
        </div>

        <div class="p-4 bg-yellow-50 rounded-lg">
          <p class="text-sm text-yellow-700">
            <strong>Importante:</strong> Este código só pode ser usado uma vez. 
            Compartilhe-o apenas com professores da sua escola.
          </p>
        </div>
      </div>
    {/if}

    <!-- Informações -->
    <div class="card p-6 variant-soft-surface lg:col-span-2">
      <h3 class="h3 font-bold mb-4">Como funcionam os códigos?</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div class="space-y-2">
          <h4 class="font-medium text-surface-700">Para Professores</h4>
          <ul class="space-y-1 text-surface-600">
            <li>• Use o código no momento do registro</li>
            <li>• Cada código só pode ser usado uma vez</li>
            <li>• O código expira na data definida</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium text-surface-700">Para Administradores</h4>
          <ul class="space-y-1 text-surface-600">
            <li>• Você pode revogar códigos não utilizados</li>
            <li>• Códigos usados aparecem na lista de professores</li>
            <li>• Mantenha o controle de quem tem acesso</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>