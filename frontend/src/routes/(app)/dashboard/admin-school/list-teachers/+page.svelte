<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { goto } from '$app/navigation';
  import '../../../../../app.css';
  import { 
    Users, Plus, Search, Filter, Eye, Mail, Phone,
    BookOpen, Calendar, AlertCircle, CheckCircle
  } from 'lucide-svelte';
	import { onMount } from 'svelte';

  let professoresData: any = null;
  let isLoading = true;
  let error: string | null = null;
  
  // Filtros e busca
  let searchTerm = '';
  let filtroStatus = 'todos'; // todos, ativos, pendentes

  onMount(async () => {
    await carregarProfessores();
  });

  async function carregarProfessores() {
    isLoading = true;
    error = null;
    
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/school/professores`);
      
      if (res.ok) {
        professoresData = await res.json();
      } else {
        error = 'Erro ao carregar lista de professores';
      }
    } catch (err) {
      console.error('Erro:', err);
      error = 'Erro de conexão ao carregar dados';
    } finally {
      isLoading = false;
    }
  }

  function verDetalhes(professorId: number) {
    goto(`/dashboard/admin/professores/${professorId}`);
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-AO');
  }

  // Filtros
  $: professoresFiltrados = professoresData?.professores?.filter((professor: { usuario: { nome: string; sobrenome: string; email: string; }; isVerificado: any; }) => {
    // Filtro de busca
    const matchSearch = !searchTerm || 
      professor.usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professor.usuario.sobrenome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professor.usuario.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de status
    const matchStatus = filtroStatus === 'todos' || 
      (filtroStatus === 'ativos' && professor.isVerificado) ||
      (filtroStatus === 'pendentes' && !professor.isVerificado);

    return matchSearch && matchStatus;
  }) || [];
</script>

<div class="max-w-6xl mx-auto space-y-8 animate-fade-in">
  <!-- Cabeçalho -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Users size={32} class="text-primary-500" />
      <div>
        <h1 class="h1 font-bold">Professores</h1>
        <p class="text-surface-600 mt-1">
          Gerencie os professores da sua escola
        </p>
      </div>
    </div>

    <button 
      class="btn variant-filled-primary"
      on:click={() => goto('/dashboard/admin-school/generate-code')}
    >
      <Plus size={16} class="mr-2" />
      Gerar Código
    </button>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="card p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
      <p class="mt-4 text-surface-600">Carregando lista de professores...</p>
    </div>

  <!-- Error State -->
  {:else if error}
    <div class="card p-6 variant-soft-error text-center">
      <AlertCircle size={48} class="mx-auto text-red-500 mb-4" />
      <h3 class="h3 font-bold text-red-800 mb-2">Erro ao carregar</h3>
      <p class="text-red-700 mb-4">{error}</p>
      <button class="btn variant-filled-error" on:click={carregarProfessores}>
        Tentar Novamente
      </button>
    </div>

  {:else}
    <!-- Estatísticas -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card p-6 text-center">
        <div class="text-2xl font-bold text-primary-600">{professoresData?.total || 0}</div>
        <div class="text-sm text-surface-500">Total</div>
      </div>
      <div class="card p-6 text-center variant-soft-success">
        <div class="text-2xl font-bold text-green-600">
          {professoresData?.professores?.filter((p: { isVerificado: any; }) => p.isVerificado).length || 0}
        </div>
        <div class="text-sm text-surface-500">Ativos</div>
      </div>
      <div class="card p-6 text-center variant-soft-warning">
        <div class="text-2xl font-bold text-yellow-600">
          {professoresData?.professores?.filter((p: { isVerificado: any; }) => !p.isVerificado).length || 0}
        </div>
        <div class="text-sm text-surface-500">Pendentes</div>
      </div>
      <div class="card p-6 text-center variant-soft-primary">
        <div class="text-2xl font-bold text-blue-600">
          {professoresFiltrados.length}
        </div>
        <div class="text-sm text-surface-500">Filtrados</div>
      </div>
    </div>

    <!-- Filtros e Busca -->
    <div class="card p-6">
      <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div class="flex gap-4 flex-1 w-full md:w-auto">
          <!-- Busca -->
          <div class="relative flex-1 md:flex-initial">
            <Search size={16} class="absolute left-3 top-1/2 transform -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              class="w-full md:w-64 pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
              placeholder="Buscar professores..."
              bind:value={searchTerm}
            />
          </div>

          <!-- Filtro Status -->
          <select
            class="px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors"
            bind:value={filtroStatus}
          >
            <option value="todos">Todos os Status</option>
            <option value="ativos">Ativos</option>
            <option value="pendentes">Pendentes</option>
          </select>
        </div>

        <div class="text-sm text-surface-500">
          {professoresFiltrados.length} de {professoresData?.total} professores
        </div>
      </div>
    </div>

    <!-- Lista de Professores -->
    <div class="space-y-4">
      {#if professoresFiltrados.length === 0}
        <div class="card p-8 text-center">
          <Users size={48} class="mx-auto text-surface-300 mb-4" />
          <h3 class="h3 font-bold text-surface-700 mb-2">
            {searchTerm || filtroStatus !== 'todos' ? 'Nenhum professor encontrado' : 'Nenhum professor cadastrado'}
          </h3>
          <p class="text-surface-600 mb-4">
            {searchTerm || filtroStatus !== 'todos' 
              ? 'Tente ajustar os filtros de busca' 
              : 'Gere códigos para professores se juntarem à sua escola'}
          </p>
          {#if !searchTerm && filtroStatus === 'todos'}
            <button 
              class="btn variant-filled-primary"
              on:click={() => goto('/dashboard/admin-school/generate-code')}
            >
              <Plus size={16} class="mr-2" />
              Gerar Primeiro Código
            </button>
          {/if}
        </div>
      {:else}
        {#each professoresFiltrados as professor}
          <div class="card p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between">
              <div class="flex items-start gap-4 flex-1">
                <!-- Avatar -->
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-lg">
                  {professor.usuario.nome.charAt(0)}{professor.usuario.sobrenome.charAt(0)}
                </div>

                <!-- Informações -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="h3 font-bold truncate">
                      {professor.usuario.nome} {professor.usuario.sobrenome}
                    </h3>
                    {#if professor.isVerificado}
                      <span class="badge variant-filled-success text-xs">
                        <CheckCircle size={12} class="mr-1" />
                        Ativo
                      </span>
                    {:else}
                      <span class="badge variant-filled-warning text-xs">
                        <AlertCircle size={12} class="mr-1" />
                        Pendente
                      </span>
                    {/if}
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div class="flex items-center gap-2 text-surface-600">
                      <Mail size={14} />
                      <span class="truncate">{professor.usuario.email}</span>
                    </div>
                    <div class="flex items-center gap-2 text-surface-600">
                      <Phone size={14} />
                      <span>{professor.usuario.telefone || 'Não informado'}</span>
                    </div>
                    <div class="flex items-center gap-2 text-surface-600">
                      <BookOpen size={14} />
                      <span>
                        {professor.disciplinas.length > 0 
                          ? `${professor.disciplinas.length} disciplina(s)` 
                          : 'Sem disciplinas'}
                      </span>
                    </div>
                    <div class="flex items-center gap-2 text-surface-600">
                      <Calendar size={14} />
                      <span>Desde {formatarData(professor.usuario.criadoEm)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Ações -->
              <div class="flex gap-2 ml-4">
                <button
                  class="btn variant-ghost-primary"
                  on:click={() => verDetalhes(professor.id)}
                  title="Ver detalhes"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>