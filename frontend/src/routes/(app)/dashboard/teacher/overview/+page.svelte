<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    School, BarChart3, Plus, ArrowRight, Users, GraduationCap, Home,
    ChevronRight, LayoutDashboard, ClipboardList
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

  const btnClass = "btn rounded-lg py-2.5 flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-surface-800 disabled:opacity-50";
</script>

<div class="container mx-auto max-w-7xl p-4 md:p-8 space-y-8 animate-fade-in pb-24">

  <header class="border-b border-surface-200 dark:border-surface-700 pb-6">
    <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-50">
      Olá, Professor <span class="text-primary-600 dark:text-primary-400">{user?.nome?.split(' ')[0]}</span>!
    </h1>
    <p class="text-surface-500 mt-1">Bem-vindo ao seu painel de controlo pedagógico.</p>
  </header>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each Array(3) as _}
        <div class="h-48 bg-surface-200 dark:bg-surface-800 rounded-xl animate-pulse border border-surface-200 dark:border-surface-700"></div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
      <div class="bg-white dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col border-l-4 border-l-primary-500">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
            <School size={24} />
          </div>
          <div>
            <h3 class="text-lg font-bold text-surface-900 dark:text-white">Minhas Turmas</h3>
            <p class="text-xs font-semibold text-surface-500 uppercase tracking-wider">
              {dashboardData?.totalTurmas || 0} {dashboardData?.totalTurmas === 1 ? 'Ativa' : 'Ativas'}
            </p>
          </div>
        </div>

        <button 
          class="{btnClass} bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500"
          on:click={() => goto('/dashboard/teacher/class')}
        >
          Gerir Salas
          <ArrowRight size={18} />
        </button>
      </div>

      <div class="bg-white dark:bg-surface-800 rounded-xl p-6 border border-surface-200 dark:border-surface-700 shadow-sm flex flex-col border-l-4 border-l-secondary-500">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center text-secondary-600 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-800">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 class="text-lg font-bold text-surface-900 dark:text-white">Desempenho</h3>
            <p class="text-xs font-semibold text-surface-500 uppercase tracking-wider">
              {dashboardData?.totalAlunos || 0} {dashboardData?.totalAlunos === 1 ? 'Aluno' : 'Alunos'}
            </p>
          </div>
        </div>

        <button 
          class="{btnClass} bg-surface-800 dark:bg-white text-white dark:text-surface-900 hover:bg-surface-700 dark:hover:bg-surface-100 focus:ring-surface-500"
          on:click={() => goto('/dashboard/teacher/reports')}
        >
          Ver Relatórios
          <ClipboardList size={18} />
        </button>
      </div>

      <button 
        on:click={() => goto('/dashboard/teacher/class/create-class?ref=home')}
        class="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-700 
               text-surface-500 hover:text-primary-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all min-h-[160px] group"
      >
        <div class="p-3 bg-surface-100 dark:bg-surface-800 rounded-full mb-2 group-hover:scale-110 transition-transform">
          <Plus size={24} />
        </div>
        <span class="font-bold">Criar Nova Turma</span>
      </button>

    </div>
  {/if}

  <div class="pt-10">
    <div class="bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-4 text-center md:text-left">
        <div class="w-14 h-14 bg-white dark:bg-surface-700 rounded-lg shadow-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-surface-200 dark:border-surface-600">
          <Home size={28} />
        </div>
        <div>
          <h2 class="text-lg font-bold text-surface-900 dark:text-white">Área da Família</h2>
          <p class="text-sm text-surface-500">
            {!dashboardData?.isEncarregado 
              ? 'Deseja também acompanhar educandos como encarregado?' 
              : 'Gira os seus educandos e acompanhe o progresso escolar da família.'}
          </p>
        </div>
      </div>
      
      <button 
        class="{btnClass} w-full md:w-auto px-8 bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-100 hover:bg-surface-50 dark:hover:bg-surface-600 focus:ring-surface-300"
        on:click={() => !dashboardData?.isEncarregado ? goto('/dashboard/foreman/become-foreman?ref=homer') : goto('/dashboard/foreman/overview')}
      >
        {!dashboardData?.isEncarregado ? 'Ativar Perfil' : 'Aceder'} 
        <ChevronRight size={18} />
      </button>
    </div>
  </div>

</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>