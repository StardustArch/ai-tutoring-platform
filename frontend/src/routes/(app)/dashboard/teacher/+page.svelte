<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import '../../../../app.css';
  import { 
    School, Users, BookOpen, BarChart3, Plus,
    QrCode, Eye, ClipboardList, TrendingUp,
    Bell, Settings, CheckCircle, AlertCircle
  } from 'lucide-svelte';

  let escolaData: any = null;
  let isLoading = true;
  let error: string | null = null;

  $: user = $auth.user;
  $: professor = user?.perfilProfessor;
  $: temEscolaAssociada = !!professor?.escolaNome;

  import { onMount } from 'svelte';

  onMount(async () => {
    // Só buscar dados da escola se o professor tiver uma escola associada
    if (temEscolaAssociada) {
      await carregarDadosEscola();
    } else {
      isLoading = false;
    }
  });

  async function carregarDadosEscola() {
    isLoading = true;
    error = null;
    
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/teacher/minha-escola`);
      
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

  // Dados mockados para demonstração - serão substituídos pelas funcionalidades reais
  const funcionalidades = [
    {
      titulo: 'Criar Turma',
      descricao: 'Crie uma nova turma virtual e gere um código único para os alunos se juntarem',
      icone: Plus,
      cor: 'primary',
      rota: '/dashboard/teacher/class/create-class'
    },
    {
      titulo: 'Minhas Turmas',
      descricao: 'Visualize e gerencie todas as suas turmas, alunos e códigos de acesso',
      icone: School,
      cor: 'secondary',
      rota: '/dashboard/teacher/class'
    },

    {
      titulo: 'Relatórios',
      descricao: 'Acesse relatórios detalhados de desempenho e proficiencia dos alunos',
      icone: BarChart3,
      cor: 'warning',
      rota: '/dashboard/professor/relatorios'
    },
  ];
</script>

<div class="max-w-6xl mx-auto space-y-8 animate-fade-in">
  <!-- Cabeçalho -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <School size={32} class="text-primary-500" />
      <div>
        <h1 class="h1 font-bold">Olá, {user?.nome}! 👋</h1>
        <p class="text-surface-600 mt-1">
          {#if isLoading && temEscolaAssociada}
            Carregando informações...
          {:else if temEscolaAssociada && escolaData}
            Professor na {escolaData.escola.nome} - Gerencie suas turmas e alunos
          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  {#if isLoading && temEscolaAssociada}
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

  <!-- Professor com Escola Associada -->
  {:else}
    <div class="space-y-8">
      <!-- Cards de Funcionalidades Principais -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each funcionalidades as funcionalidade}
          <div 
            class="card p-6 variant-soft-{funcionalidade.cor} hover:variant-filled-{funcionalidade.cor} transition-all cursor-pointer group"
            on:click={() => goto(funcionalidade.rota)}
          >
            <div class="flex items-center gap-3 mb-4">
              <svelte:component 
                this={funcionalidade.icone} 
                size={24} 
                class="text-{funcionalidade.cor}-500 group-hover:text-{funcionalidade.cor}-200" 
              />
              <h3 class="h3 font-bold group-hover:text-surface-900">{funcionalidade.titulo}</h3>
            </div>
            <p class="text-surface-600 group-hover:text-surface-500 text-sm mb-4">
              {funcionalidade.descricao}
            </p>
            <div class="flex items-center gap-2 text-{funcionalidade.cor}-600 group-hover:text-{funcionalidade.cor}-500 font-medium">
              Acessar
              <div class="group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Informações da Escola -->
      {#if escolaData}
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="h3 font-bold flex items-center gap-3">
              <School size={24} class="text-primary-500" />
              Sua Escola
            </h3>
            <div class="flex items-center gap-2 text-sm text-surface-500">
              <CheckCircle size={16} class="text-green-500" />
              Associada e ativa
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="space-y-2">
              <span class="text-sm text-surface-500">Nome</span>
              <p class="font-medium text-lg">{escolaData.escola.nome}</p>
            </div>
            <div class="space-y-2">
              <span class="text-sm text-surface-500">Localização</span>
              <p class="font-medium">{escolaData.escola.localizacao}</p>
            </div>
          </div>
        </div>
      {/if}

    </div>
  {/if}
</div>