<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    School, BarChart3, Plus, ArrowRight, Users, GraduationCap, Home
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
</script>

<div class="max-w-8xl mx-auto p-6 space-y-8 animate-fade-in">

  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
        Olá, Professor {user?.nome?.split(' ')[0]}!
      </h1>
      <p class="text-surface-600 dark:text-surface-400">Pronto para ensinar hoje?</p>
    </div>
  </div>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-3xl animate-pulse"></div>
      <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-3xl animate-pulse"></div>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
      <div class="group relative bg-white dark:bg-surface-800 rounded-3xl p-6 border-2 border-surface-100 dark:border-surface-700 shadow-sm hover:shadow-xl hover:border-primary-500 transition-all duration-300">
        
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
            <School size={32} />
          </div>
          <div>
            <h3 class="text-xl font-bold text-surface-900 dark:text-white leading-tight">
              Minhas Turmas
            </h3>
            <p class="text-sm text-surface-500">
              {dashboardData?.totalTurmas || 0} {dashboardData?.totalTurmas === 1 ? 'Turma ativa' : 'Turmas ativas'}
            </p>
          </div>
        </div>

        <button 
          class="w-full py-3 rounded-xl bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-bold text-lg shadow-lg 
                 group-hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          on:click={() => goto('/dashboard/teacher/class')}
        >
          Gerir Salas
          <ArrowRight size={20} />
        </button>

        <div class="mt-4 flex justify-center text-xs font-medium text-surface-400">
          <span class="hover:text-primary-500 transition-colors cursor-pointer">Ver códigos de acesso</span>
        </div>
      </div>

      <div class="group relative bg-white dark:bg-surface-800 rounded-3xl p-6 border-2 border-surface-100 dark:border-surface-700 shadow-sm hover:shadow-xl hover:border-warning-500 transition-all duration-300">
        
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white shadow-lg">
            <BarChart3 size={32} />
          </div>
          <div>
            <h3 class="text-xl font-bold text-surface-900 dark:text-white leading-tight">
              Desempenho
            </h3>
            <p class="text-sm text-surface-500">
              {dashboardData?.totalAlunos || 0} {dashboardData?.totalAlunos === 1 ? 'Aluno monitorado' : 'Alunos monitorados'}
            </p>
          </div>
        </div>

        <button 
          class="w-full py-3 rounded-xl bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-bold text-lg shadow-lg 
                 group-hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          on:click={() => goto('/dashboard/teacher/reports')}
        >
          <BarChart3 size={20} />
          Ver Relatórios
        </button>

        <div class="mt-4 flex justify-center text-xs font-medium text-surface-400">
          <span class="hover:text-warning-500 transition-colors cursor-pointer">Analítico Detalhado</span>
        </div>
      </div>

      <button 
        on:click={() => goto('/dashboard/teacher/class/create-class?ref=home')}
        class="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-surface-300 dark:border-surface-700 
               text-surface-400 hover:text-primary-500 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-surface-800 transition-all min-h-[200px]"
      >
        <div class="p-4 bg-surface-100 dark:bg-surface-900 rounded-full mb-3 shadow-inner">
          <Plus size={32} />
        </div>
        <span class="font-bold text-lg">Criar Nova Turma</span>
        <span class="text-sm opacity-70 mt-1">Gerar código para alunos</span>
      </button>

    </div>
  {/if}

  <div class="pt-6 border-t border-surface-200 dark:border-surface-800">
    <h3 class="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4">Outros Perfis</h3>
    
    <div class="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-lg gap-4">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-white/20 rounded-xl backdrop-blur-md">
          <Home size={32} />
        </div>
        <div>
          <h2 class="text-lg font-bold">Área da Família</h2>
          <p class="text-emerald-100 text-sm">
            {!dashboardData?.isEncarregado 
              ? 'Ative o perfil de encarregado para acompanhar seus filhos.' 
              : 'Voltar para a gestão dos seus educandos.'}
          </p>
        </div>
      </div>
      <button 
        class="btn bg-white text-emerald-800 font-bold hover:brightness-110 border-none shadow-md w-full md:w-auto"
        on:click={() => !dashboardData?.isEncarregado ? goto('/dashboard/foreman/become-foreman?ref=homer') : goto('/dashboard/foreman/overview')}
      >
        {!dashboardData?.isEncarregado ? 'Ativar Perfil' : 'Acessar'} <ArrowRight size={18} class="ml-2"/>
      </button>
    </div>
  </div>

</div>