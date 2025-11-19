<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import '../../../../../app.css';
  import { 
    Building, ArrowLeft, FileText, CheckCircle, 
    Clock, AlertCircle, Users, Calendar,
    MapPin, Phone, Mail, Shield, Download,

	Settings

  } from 'lucide-svelte';

  let escolaData: any = null;
  let isLoading = true;
  let error: string | null = null;

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

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatarDataSimples(data: string) {
    return new Date(data).toLocaleDateString('pt-AO');
  }

  function getStatusDocumento(documento: any) {
    if (documento.aprovado === true) return { texto: 'Aprovado', cor: 'success', icone: CheckCircle };
    if (documento.aprovado === false) return { texto: 'Rejeitado', cor: 'error', icone: AlertCircle };
    return { texto: 'Em análise', cor: 'warning', icone: Clock };
  }

  function verDocumento(url: string) {
    if (url) {
      window.open(`${PUBLIC_API_URL_HOST}${url}`, '_blank');
    }
  }

  function getStatusEscola() {
    if (!escolaData?.escola) return null;
    
    if (escolaData.escola.isVerificada && escolaData.escola.ativa) {
      return { texto: 'Ativa e Verificada', cor: 'success', icone: CheckCircle };
    } else if (!escolaData.escola.isVerificada && escolaData.escola.ativa) {
      return { texto: 'Ativa - Em Verificação', cor: 'warning', icone: Clock };
    } else {
      return { texto: 'Inativa', cor: 'error', icone: AlertCircle };
    }
  }

  $: statusEscola = getStatusEscola();
</script>

<div class="max-w-6xl mx-auto space-y-8 animate-fade-in">
  <!-- Cabeçalho -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">

      <div>
        <h1 class="h1 font-bold flex items-center gap-3">
          <Building size={32} class="text-primary-500" />
          Informações Completas da Escola
        </h1>
        <p class="text-surface-600 mt-2">
          Visualize todos os dados e documentos da sua instituição
        </p>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="card p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
      <p class="mt-4 text-surface-600">Carregando informações da escola...</p>
    </div>

  <!-- Error State -->
  {:else if error}
    <div class="card p-6 variant-soft-error text-center">
      <AlertCircle size={48} class="mx-auto text-red-500 mb-4" />
      <h3 class="h3 font-bold text-red-800 mb-2">Erro ao carregar</h3>
      <p class="text-red-700 mb-4">{error}</p>
      <button class="btn variant-filled-error" on:click={carregarDadosEscola}>
        Tentar Novamente
      </button>
    </div>

  {:else if escolaData}
    <div class="space-y-8">
      <!-- Status Geral -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Status da Escola -->
        <div class="card p-6 {statusEscola?.cor === 'success' ? 'variant-soft-success' : statusEscola?.cor === 'warning' ? 'variant-soft-warning' : 'variant-soft-error'}">
          <div class="flex items-center gap-3 mb-4">
            <svelte:component this={statusEscola?.icone} size={24} class="{statusEscola?.cor === 'success' ? 'text-green-500' : statusEscola?.cor === 'warning' ? 'text-yellow-500' : 'text-red-500'}" />
            <h3 class="h3 font-bold">Status da Escola</h3>
          </div>
          <p class="text-surface-600 text-sm mb-2">{statusEscola?.texto}</p>
          <div class="text-xs text-surface-500">
            {#if escolaData.administrador.isVerificado}
              Administrador verificado
            {:else}
              Administrador em verificação
            {/if}
          </div>
        </div>

        <!-- Informações Básicas -->
        <div class="card p-6 variant-soft-primary">
          <div class="flex items-center gap-3 mb-4">
            <Building size={24} class="text-primary-500" />
            <h3 class="h3 font-bold">Informações Básicas</h3>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-surface-500">Código:</span>
              <span class="font-medium">{escolaData.escola.codigo || 'Não definido'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-500">Registro:</span>
              <span class="font-medium">{formatarDataSimples(escolaData.escola.criadoEm)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-500">Atualização:</span>
              <span class="font-medium">{formatarDataSimples(escolaData.escola.atualizadoEm)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalhes da Escola -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Informações de Contato -->
        <div class="card p-6">
          <h3 class="h3 font-bold mb-6 flex items-center gap-3">
            <Building size={24} class="text-primary-500" />
            Informações da Escola
          </h3>
          
          <div class="space-y-6">
            <!-- Nome e Código -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-surface-500">Nome da Escola</label>
              <p class="text-lg font-semibold text-surface-900">{escolaData.escola.nome}</p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-surface-500">Código da Escola</label>
              <p class="text-lg font-mono font-semibold text-primary-600">{escolaData.escola.codigo || 'Não definido'}</p>
            </div>

            <!-- Localização -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-surface-500 flex items-center gap-2">
                <MapPin size={16} />
                Localização
              </label>
              <p class="text-surface-700">{escolaData.escola.localizacao || 'Não informada'}</p>
            </div>

            <!-- Contato -->
            <div class="grid grid-cols-1 gap-4">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-surface-500 flex items-center gap-2">
                  <Mail size={16} />
                  Email Institucional
                </label>
                <p class="text-surface-700">{escolaData.escola.emailInstitucional || 'Não informado'}</p>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-surface-500 flex items-center gap-2">
                  <Phone size={16} />
                  Telefone Institucional
                </label>
                <p class="text-surface-700">{escolaData.escola.telefoneInstitucional || 'Não informado'}</p>
              </div>
            </div>
          </div>
                      <button class="btn variant-outline-surface w-full mt-4" on:click={() => goto('/dashboard/admin-school/edit-school')}>
              <Settings size={16} class="mr-2" />
              Editar Informações
            </button>
        </div>

        <!-- Informações do Administrador -->
        <div class="card p-6">
          <h3 class="h3 font-bold mb-6 flex items-center gap-3">
            <Shield size={24} class="text-primary-500" />
            Informações do Administrador
          </h3>
          
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-surface-500">Status do Administrador</label>
              <div class="flex items-center gap-2">
                {#if escolaData.administrador.isVerificado}
                  <CheckCircle size={16} class="text-green-500" />
                  <span class="font-medium text-green-600">Verificado</span>
                {:else}
                  <Clock size={16} class="text-yellow-500" />
                  <span class="font-medium text-yellow-600">Em Verificação</span>
                {/if}
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-surface-500 flex items-center gap-2">
                <Calendar size={16} />
                Registrado em
              </label>
              <p class="text-surface-700">{formatarData(escolaData.administrador.criadoEm)}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Documentos da Escola -->
      <div class="card p-6">
        <h3 class="h3 font-bold mb-6 flex items-center gap-3">
          <FileText size={24} class="text-primary-500" />
          Documentos de Verificação
        </h3>

        {#if escolaData.documentos.length === 0}
          <div class="text-center py-8">
            <FileText size={48} class="mx-auto text-surface-300 mb-4" />
            <p class="text-surface-600">Nenhum documento carregado</p>
            <p class="text-sm text-surface-500 mt-1">
              Faça upload dos documentos necessários para verificação da escola
            </p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each escolaData.documentos as documento}
              <div class="border border-surface-200 rounded-lg p-4 hover:bg-surface-50 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex items-start gap-4 flex-1">
                    <div class="p-2 rounded-lg bg-surface-100">
                      <FileText size={20} class="text-surface-600" />
                    </div>
                    
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3 mb-2">
                            <h4 class="font-bold text-surface-900 capitalize">
                              {documento.tipo.replace('_', ' ')}
                            </h4>
                            <span class="badge {getStatusDocumento(documento).cor === 'success' ? 'variant-filled-success' : getStatusDocumento(documento).cor === 'warning' ? 'variant-filled-warning' : 'variant-filled-error'} text-xs">
                              <svelte:component this={getStatusDocumento(documento).icone} size={12} class="mr-1" />
                              {getStatusDocumento(documento).texto}
                            </span>
                        </div>

                      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-surface-600">
                        <div>
                          <span class="font-medium">Número:</span>
                          <p>{documento.numeroDocumento || 'Não informado'}</p>
                        </div>
                        <div>
                          <span class="font-medium">Arquivo:</span>
                          <p class="truncate">{documento.nomeArquivo}</p>
                        </div>
                        <div>
                          <span class="font-medium">Carregado em:</span>
                          <p>{formatarDataSimples(documento.criadoEm)}</p>
                        </div>
                      </div>

                      {#if documento.observacoes}
                        <div class="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                          <strong>Observações:</strong> {documento.observacoes}
                        </div>
                      {/if}
                    </div>
                  </div>

                  <div class="flex gap-2 ml-4">
                    <button
                      class="btn variant-ghost-primary"
                      on:click={() => verDocumento(documento.url)}
                      title="Ver documento"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Histórico e Metadados -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Timeline de Eventos -->
        <div class="card p-6">
          <h3 class="h3 font-bold mb-6">Linha do Tempo</h3>
          
          <div class="space-y-4">
            <div class="flex items-start gap-4">
              <div class="w-3 h-3 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
              <div>
                <p class="font-medium">Escola criada</p>
                <p class="text-sm text-surface-500">{formatarData(escolaData.escola.criadoEm)}</p>
              </div>
            </div>

            {#if escolaData.administrador.isVerificado}
              <div class="flex items-start gap-4">
                <div class="w-3 h-3 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                <div>
                  <p class="font-medium">Administrador verificado</p>
                  <p class="text-sm text-surface-500">Sistema de verificação</p>
                </div>
              </div>
            {/if}

            {#if escolaData.escola.isVerificada}
              <div class="flex items-start gap-4">
                <div class="w-3 h-3 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                <div>
                  <p class="font-medium">Escola verificada</p>
                  <p class="text-sm text-surface-500">Documentos aprovados</p>
                </div>
              </div>
            {/if}

            <div class="flex items-start gap-4">
              <div class="w-3 h-3 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <div>
                <p class="font-medium">Última atualização</p>
                <p class="text-sm text-surface-500">{formatarData(escolaData.escola.atualizadoEm)}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  {/if}
</div>