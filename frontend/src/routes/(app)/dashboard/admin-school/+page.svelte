<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import '../../../../app.css';
  import { 
    Building, Clock, CheckCircle, AlertCircle, 
    FileText, Users, ArrowRight, Plus,
    BookOpen, Settings, Download
  } from 'lucide-svelte';

  let escolaData: any = null;
  let isLoading = true;
  let error: string | null = null;

  $: user = $auth.user;
  $: isAdmin = !!user?.administradorEscola;
  
  // Buscar dados da escola quando o componente montar
  import { onMount } from 'svelte';

  onMount(async () => {
    auth.refreshUser();
    if (isAdmin) {
      await carregarDadosEscola();
    }

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

  $: administrador = escolaData?.administrador;
  $: escola = escolaData?.escola;
  $: documentos = escolaData?.documentos || [];
  $: isAdminValidado = administrador?.isVerificado;

  function voltarParaOnboarding() {
    goto('/dashboard');
  }

  function criarNovaEscola() {
    goto('/dashboard/admin/escola/criar');
  }

  function verDocumento(documento: any) {
    // Abrir documento em nova aba
    if (documento.url) {
      window.open(`${PUBLIC_API_URL_HOST}${documento.url}`, '_blank');
    }
  }
</script>

<div class="max-w-6xl mx-auto space-y-8 animate-fade-in">
  <!-- Cabeçalho -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Building size={32} class="text-primary-500" />
      <div>
        <h1 class="h1 font-bold">Minha Escola</h1>
        <p class="text-surface mt-1">
          {#if isLoading}
            Carregando...
          {:else if !isAdminValidado}
            Aguardando verificação da escola
          {:else}
            {escola?.nome || 'Minha Escola'}
          {/if}
        </p>
      </div>
    </div>

    {#if !isLoading && !isAdminValidado}
      <button class="btn variant-ghost-surface" on:click={voltarParaOnboarding}>
        <ArrowRight size={16} class="mr-2" />
        Voltar ao Início
      </button>
    {/if}
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="card p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
      <p class="mt-4 text-surface-600">Carregando dados da escola...</p>
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

  <!-- Estados de Verificação -->
  {:else if !isAdminValidado}
    <div class="space-y-6">
      <!-- Card de Status -->
      <div class="card p-8 text-center space-y-6">
        <div class="flex justify-center">
          <div class="p-4 rounded-full bg-yellow-50 border border-yellow-200">
            <Clock size={48} class="text-yellow-500" />
          </div>
        </div>
        
        <div class="space-y-3">
          <h2 class="h2 font-bold">Administrador em Verificação</h2>
          <p class="text-surface-600 text-lg max-w-2xl mx-auto">
            O seu perfil de administrador escolar está aguardando verificação pela nossa equipa. 
            Este processo pode levar até 48 horas.
          </p>
        </div>

        <!-- Informações da Escola (se já criada) -->
        {#if escola}
          <div class="bg-surface-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 class="h3 font-bold mb-4">Informações da Escola</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <span class="text-sm text-surface-500">Nome:</span>
                <p class="font-medium">{escola.nome}</p>
              </div>
              <div>
                <span class="text-sm text-surface-500">Email:</span>
                <p class="font-medium">{escola.emailInstitucional}</p>
              </div>
              <div>
                <span class="text-sm text-surface-500">Localização:</span>
                <p class="font-medium">{escola.localizacao}</p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Status de Documentos -->
        {#if documentos.length > 0}
          <div class="card p-6 max-w-2xl mx-auto">
            <h3 class="h3 font-bold mb-4 flex items-center gap-2">
              <FileText size={24} class="text-primary-500" />
              Status dos Documentos
            </h3>
            
            <div class="space-y-3">
              {#each documentos as documento}
                <div class="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                  <div class="flex items-center gap-3">
                    <FileText size={16} class="text-surface-400" />
                    <div>
                      <p class="font-medium capitalize">{documento.tipo.replace('_', ' ')}</p>
                      <p class="text-sm text-surface-500">{documento.numeroDocumento}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    {#if documento.aprovado === true}
                      <CheckCircle size={16} class="text-green-500" />
                      <span class="text-sm text-green-600">Aprovado</span>
                    {:else if documento.aprovado === false}
                      <AlertCircle size={16} class="text-red-500" />
                      <span class="text-sm text-red-600">Rejeitado</span>
                    {:else}
                      <Clock size={16} class="text-yellow-500" />
                      <span class="text-sm text-yellow-600">Em análise</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Ações Alternativas -->
        <div class="pt-6 space-y-4">
          <p class="text-surface-500 text-sm">
            💡 Enquanto aguarda a verificação, pode:
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button 
              class="card p-4 variant-ghost-primary hover:variant-soft-primary transition-all text-left group"
              on:click={voltarParaOnboarding}
            >
              <div class="flex items-center gap-3">
                <Users size={20} class="text-primary-500" />
                <div>
                  <h4 class="font-bold">Tornar-se Encarregado</h4>
                  <p class="text-sm text-surface-600">Registrar educandos e acompanhar progresso</p>
                </div>
              </div>
            </button>

            <button 
              class="card p-4 variant-ghost-secondary hover:variant-soft-secondary transition-all text-left group"
              on:click={voltarParaOnboarding}
            >
              <div class="flex items-center gap-3">
                <BookOpen size={20} class="text-secondary-500" />
                <div>
                  <h4 class="font-bold">Tornar-se Professor</h4>
                  <p class="text-sm text-surface-600">Usar código de ativação para lecionar</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

  {:else}
    <!-- DASHBOARD QUANDO VERIFICADO -->
    <div class="space-y-8">
      <!-- Cards de Visão Geral -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Status da Escola -->
        <div class="card p-6 variant-soft-success">
          <div class="flex items-center gap-3 mb-4">
            <CheckCircle size={24} class="text-green-500" />
            <h3 class="h3 font-bold">Escola Verificada</h3>
          </div>
          <p class="text-surface text-sm">
            Sua escola foi aprovada e está ativa no sistema.
          </p>
        </div>

        <!-- Professores -->
        <div class="card p-6 variant-soft-primary">
          <div class="flex items-center gap-3 mb-4">
            <Users size={24} class="text-primary-500" />
            <h3 class="h3 font-bold">Professores</h3>
          </div>
          <p class="text-surface text-sm">
            Gerencie professores e gere códigos de ativação.
          </p>
          <button class="btn variant-outline-primary w-full mt-4" on:click={() => goto('/dashboard/admin-school/list-teachers')}>
            Gerenciar Professores
          </button>
        </div>

      </div>

      <!-- Informações da Escola -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Detalhes da Escola -->
        {#if escola}
          <div class="card p-6">
            <h3 class="h3 font-bold mb-4">Informações da Escola</h3>
            <div class="space-y-4">
              <div class="flex justify-between items-center py-2 border-b border-surface-200">
                <span class="text-surface">Nome</span>
                <span class="font-medium">{escola.nome}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-surface-200">
                <span class="text-surface">Email</span>
                <span class="font-medium">{escola.emailInstitucional}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-surface-200">
                <span class="text-surface">Telefone</span>
                <span class="font-medium">{escola.telefoneInstitucional}</span>
              </div>
              <div class="flex justify-between items-start py-2">
                <span class="text-surface">Localização</span>
                <span class="font-medium text-right">{escola.localizacao}</span>
              </div>
            </div>
            <button class="btn variant-outline-surface w-full mt-4" on:click={() => goto('/dashboard/admin-school/edit-school')}>
              <Settings size={16} class="mr-2" />
              Editar Informações
            </button>
          </div>
        {/if}

        <!-- Ações Rápidas -->
        <div class="card p-6">
          <h3 class="h3 font-bold mb-4">Ações Rápidas</h3>
          <div class="space-y-3">
            <button class="btn variant-ghost-primary w-full justify-start" on:click={() => goto('/dashboard/admin-school/generate-code')}>
              <Plus size={16} class="mr-2" />
              Gerar Código para Professor
            </button>
            <button class="btn variant-ghost-surface w-full justify-start">
              <FileText size={16} class="mr-2" />
              Relatórios da Escola
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>