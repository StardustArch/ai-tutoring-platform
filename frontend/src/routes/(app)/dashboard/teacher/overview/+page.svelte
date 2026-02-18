<svelte:head>
    <title>Painel do Professor | KaniMente</title>
    <meta name="description" content="Gestão de turmas, alunos e relatórios de desempenho escolar no KaniMente." />
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    School, BarChart3, Plus, ArrowRight, Home,
    ChevronRight, ClipboardList
  } from 'lucide-svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { auth } from '$lib/store/auth';

  $: user = $auth.user;

  let dashboardData: any = null;
  let loading = true;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/teacher/dashboard-overview`);
      if (res.ok) {
        dashboardData = await res.json();
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  // Estilo de botão "Enterprise"
  const btnClass = "btn rounded-lg py-2 flex items-center justify-center gap-2 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-surface-800 disabled:opacity-50";
  // Estilo de cartão base
  const cardClass = "bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col justify-between";
</script>

<div class="container mx-auto max-w-8xl p-4 md:p-8 space-y-8 animate-fade-in pb-24">

  <header class="border-b border-surface-200 dark:border-surface-700 pb-4 flex justify-between items-end">
    <div>
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
        Painel Professor
      </h1>
      <p class="text-surface-500 text-sm mt-1">
        Bem-vindo, Prof. <span class="font-semibold text-surface-900 dark:text-surface-100">{user?.nome?.split(' ')[0]}</span>.
      </p>
    </div>
    <div class="hidden md:block text-xs text-surface-400 font-mono">
        {new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </header>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      {#each Array(3) as _}
        <div class="h-40 bg-surface-200 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"></div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
      <div class="{cardClass} p-5 border-l-4 border-l-primary-500">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Minhas Turmas</p>
            <h3 class="text-3xl font-bold text-surface-900 dark:text-white mt-1">
                {dashboardData?.totalTurmas || 0}
            </h3>
          </div>
          <div class="p-2 bg-surface-50 dark:bg-surface-700 rounded-md text-primary-600 dark:text-primary-400 border border-surface-100 dark:border-surface-600">
            <School size={20} />
          </div>
        </div>

        <button 
          class="{btnClass} bg-primary-600 hover:bg-primary-700 text-white w-full"
          on:click={() => goto('/dashboard/teacher/class')}
        >
          Gerir Salas <ArrowRight size={16} />
        </button>
      </div>

      <div class="{cardClass} p-5 border-l-4 border-l-secondary-500">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="text-xs font-semibold text-surface-500 uppercase tracking-wider">Total Alunos</p>
            <h3 class="text-3xl font-bold text-surface-900 dark:text-white mt-1">
                {dashboardData?.totalAlunos || 0}
            </h3>
          </div>
          <div class="p-2 bg-surface-50 dark:bg-surface-700 rounded-md text-secondary-600 dark:text-secondary-400 border border-surface-100 dark:border-surface-600">
            <BarChart3 size={20} />
          </div>
        </div>

        <button 
          class="{btnClass} variant-outline-surface border-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 w-full"
          on:click={() => goto('/dashboard/teacher/reports')}
        >
          Ver Relatórios <ClipboardList size={16} />
        </button>
      </div>

      <button 
        on:click={() => goto('/dashboard/teacher/class/create-class?ref=home')}
        class="group flex flex-col items-center justify-center p-5 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-700 
               text-surface-500 hover:text-primary-600 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all min-h-[180px]"
      >
        <div class="p-3 bg-surface-100 dark:bg-surface-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
          <Plus size={24} />
        </div>
        <span class="font-semibold text-sm">Criar Nova Turma</span>
      </button>

    </div>
  {/if}

  <div class="pt-8 border-t border-surface-200 dark:border-surface-700">
    <div class="bg-surface-50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6">
      
      <div class="flex items-start gap-4">
        <div class="p-3 bg-white dark:bg-surface-700 rounded-md border border-surface-200 dark:border-surface-600 text-surface-500">
          <Home size={24} />
        </div>
        <div>
          <h2 class="text-base font-bold text-surface-900 dark:text-white">Área da Família</h2>
          <p class="text-sm text-surface-500 mt-1 max-w-lg">
            {!dashboardData?.isEncarregado 
              ? 'Também é encarregado de educação? Ative o seu perfil familiar para acompanhar os seus educandos.' 
              : 'Aceda ao perfil de Encarregado para gerir os seus educandos e ver relatórios familiares.'}
          </p>
        </div>
      </div>
      
      <button 
        class="{btnClass} px-6 bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-100 hover:bg-surface-50 dark:hover:bg-surface-600 whitespace-nowrap"
        on:click={() => !dashboardData?.isEncarregado ? goto('/dashboard/foreman/become-foreman?ref=homer') : goto('/dashboard/foreman/overview')}
      >
        {!dashboardData?.isEncarregado ? 'Ativar Perfil' : 'Aceder à Família'} 
        <ChevronRight size={16} />
      </button>
    </div>
  </div>

</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>