<svelte:head>
    <title>Dashboard - KaniMente</title>
</svelte:head>
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { 
    School, BarChart3, Plus, ArrowRight, Users, GraduationCap, Home,
    BookOpen, UserCheck, Activity, Target, TrendingUp, Calendar,
    Play, Settings, ChevronRight, Award, Brain, LayoutDashboard,
    Target as TargetIcon, Zap, Clock, Star
  } from 'lucide-svelte';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { auth } from '$lib/store/auth';

  $: user = $auth.user;
  $: isEncarregado = !!user?.perfilEncarregado;
  $: isProfessor = !!user?.perfilProfessor;
  $: isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;

  let dashboardData: any = null;
  let encarregadoData: any = null;
  let professorData: any = null;
  let loading = true;

  onMount(async () => {
    await loadData();
  });

// No seu <script lang="ts"> do Svelte
async function loadData() {
  try {
    loading = true;
    const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/unified-dashboard`);
    
    if (res.ok) {
      dashboardData = await res.json();
      // Mapeia para as variáveis locais para não quebrar o resto do seu HTML
      professorData = dashboardData.professor;
      encarregadoData = dashboardData.encarregado;
    }
  } catch (e) {
    console.error("Erro ao carregar dashboard unificado:", e);
  } finally {
    loading = false;
  }
}

  // Formatar nome do usuário
  function formatarNome(user: any): string {
    if (!user?.nome) return 'Utilizador';
    const parts = user.nome.split(' ');
    return parts.length > 0 ? parts[0] : user.nome;
  }
</script>

<div class="max-w-8xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in">

  <!-- HEADER COM STATUS DE PERFIS -->
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
    <div>
      <div class="flex items-center gap-3 mb-2">
        <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-50">
          Olá, {formatarNome(user)}! 👋
        </h1>
        <div class="flex gap-1">
          <span class="badge variant-filled-primary text-xs py-1 px-3">Professor</span>
          <span class="badge variant-filled-secondary text-xs py-1 px-3">Encarregado</span>
        </div>
      </div>
      <p class="text-surface-600 dark:text-surface-400">
        Bem-vindo ao seu espaço de ensino e acompanhamento familiar
      </p>
    </div>
    
    <div class="flex items-center gap-2">
      <span class="text-sm text-surface-500 dark:text-surface-400">
        {new Date().toLocaleDateString('pt-PT', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </span>
    </div>
  </div>

  <!-- STATS EM DESTAQUE -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
    <!-- ESTATÍSTICAS DO PROFESSOR -->
    {#if isProfessorAtivo}
      <div class="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-blue-100 mb-1">Turmas Ativas</p>
            <p class="text-3xl font-bold">{dashboardData?.stats.totalTurmas || 0}</p>
          </div>
          <School size={24} class="text-white/80" />
        </div>
        <div class="mt-3 pt-3 border-t border-white/20">
          <p class="text-xs text-blue-100">
            {dashboardData?.stats.totalAlunosEnsina || 0} alunos
          </p>
        </div>
      </div>
    {:else if isProfessor}
      <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-amber-100 mb-1">Perfil Pendente</p>
            <p class="text-3xl font-bold">!</p>
          </div>
          <TargetIcon size={24} class="text-white/80" />
        </div>
        <div class="mt-3 pt-3 border-t border-white/20">
          <p class="text-xs text-amber-100">
            Complete seu perfil docente
          </p>
        </div>
      </div>
    {/if}

    <!-- ESTATÍSTICAS DO ENCARREGADO -->
    {#if isEncarregado}
      <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-emerald-100 mb-1">Meus Educandos</p>
            <p class="text-3xl font-bold">{dashboardData?.stats.totalEducandos || 0}</p>
          </div>
          <Users size={24} class="text-white/80" />
        </div>
        <div class="mt-3 pt-3 border-t border-white/20">
          <p class="text-xs text-emerald-100">
            {dashboardData?.stats.atividadesHoje || 0} atividades hoje
          </p>
        </div>
      </div>
    {/if}
  </div>

  <!-- CONTEÚDO PRINCIPAL COM DUAS COLUNAS -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    
    <!-- COLUNA DA ESQUERDA: DOCÊNCIA -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
          <School size={20} class="text-blue-500" />
          Área do Professor
        </h2>
        <span class="text-sm text-surface-500">
          {isProfessorAtivo ? 'Ativo' : 'Pendente'}
        </span>
      </div>

      {#if isProfessorAtivo}
        <!-- PROFESSOR ATIVO -->
        <div class="space-y-4">
          <!-- CARD PRINCIPAL DE TURMAS -->
          <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-surface-900 dark:text-white">Minhas Turmas</h3>
              <button 
                on:click={() => goto('/dashboard/teacher/class/create-class?ref=homef')}
                class="btn variant-soft-primary text-sm py-1 px-3"
              >
                <Plus size={14} /> Nova
              </button>
            </div>
            
            {#if professorData?.turmasRecentes?.length > 0}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="space-y-3">
                {#each professorData.turmasRecentes.slice(0, 3) as turma}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <div class="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-900/50 hover:bg-surface-100 dark:hover:bg-surface-900 transition-colors group cursor-pointer"
                       on:click={() => goto(`/dashboard/teacher/class/${turma.id}?ref=homef`)}>
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <BookOpen size={18} class="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p class="font-medium text-surface-900 dark:text-white">{turma.nome}</p>
                        <p class="text-xs text-surface-500">{turma.totalAlunos} alunos</p>
                      </div>
                    </div>
                    <ChevronRight size={16} class="text-surface-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center py-8">
                <BookOpen size={48} class="mx-auto mb-4 text-blue-400" />
                <p class="text-surface-600 dark:text-surface-400 mb-4">Ainda não tem turmas criadas</p>
                <button 
                  on:click={() => goto('/dashboard/teacher/class/create-class?ref=homef')}
                    class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Criar Primeira Turma
                </button>
              </div>
            {/if}
          </div>

          <!-- AÇÕES RÁPIDAS DOCENTES -->
          <div class="grid grid-cols-1 gap-4">

            <button 
              on:click={() => goto('/dashboard/teacher/reports')}
              class="bg-emerald-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4 text-left hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors group"
            >
              <div class="flex items-center gap-2 mb-2">
                <BarChart3 size={18}  class="text-primary-600 dark:text-primary-400" />
                <span class="font-bold text-surface-900 dark:text-white">Relatórios</span>
              </div>
              <p class="text-sm text-surface-600 dark:text-surface-400">Análises detalhadas</p>
            </button>
          </div>
        </div>
      {:else if isProfessor}
        <!-- PROFESSOR PENDENTE -->
        <div class="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl p-6 text-center border border-amber-200 dark:border-amber-800">
          <TargetIcon size={48} class="mx-auto mb-4 text-amber-500" />
          <h3 class="font-bold text-surface-900 dark:text-white mb-2">Perfil de Professor Incompleto</h3>
          <p class="text-surface-600 dark:text-surface-400 mb-6 text-sm">
            Complete seu perfil para acessar todas as funcionalidades docentes
          </p>
          <button 
            on:click={() => goto('/dashboard/teacher/become-teacher')}
            class="btn variant-filled-warning"
          >
            Concluir Perfil Professor
          </button>
        </div>
      {/if}
    </div>

    <!-- COLUNA DA DIREITA: FAMÍLIA -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
          <Users size={20} class="text-emerald-500" />
          Área do Encarregado
        </h2>
      </div>

      {#if isEncarregado}
        <!-- ENCARREGADO ATIVO -->
        <div class="space-y-4">
          <!-- LISTA DE EDUCANDOS -->
          <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700 shadow-sm">
            <h3 class="font-bold text-surface-900 dark:text-white mb-4">Meus Educandos</h3>
            
            {#if encarregadoData?.educandos?.length > 0}
              <div class="space-y-3">
                {#each encarregadoData.educandos.slice(0, 3) as educando}
                  <div class="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-900/50 hover:bg-surface-100 dark:hover:bg-surface-900 transition-colors group">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold">
                        {educando.nome.charAt(0)}
                      </div>
                      <div>
                        <p class="font-medium text-surface-900 dark:text-white">{educando.nome}</p>
                        <p class="text-xs text-surface-500">{educando.classe}ª Classe</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="text-right">
                        <div class="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {educando.desempenho || '--'}%
                        </div>
                        <div class="text-xs text-surface-500">Desempenho</div>
                      </div>
                      <button 
                        on:click={() => goto(`/dashboard/foreman/student/${educando.id}/class`)}
                        class="btn variant-soft-emerald p-2"
                        title="Estudar"
                      >
                        <Play size={14} />
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
              
              {#if encarregadoData.educandos.length > 3}
                <div class="mt-4 text-center">
                  <button 
                    on:click={() => goto('/dashboard/foreman/student')}
                    class="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Ver todos os {encarregadoData.educandos.length} educandos →
                  </button>
                </div>
              {/if}
            {:else}
              <div class="text-center py-8">
                <GraduationCap size={48} class="mx-auto mb-4 text-emerald-400" />
                <p class="text-surface-600 dark:text-surface-400 mb-4">Ainda não tem educandos registados</p>
                <button 
                  on:click={() => goto('/dashboard/foreman/student/create?ref=homef')}
                    class="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar Primeiro Educando
                </button>
              </div>
            {/if}
          </div>

          <!-- ATIVIDADES RECENTES -->
          {#if encarregadoData?.atividadesRecentes?.length > 0}
            <div class="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700 shadow-sm">
              <h3 class="font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock size={18} class="text-orange-500" />
                Atividades Recentes
              </h3>
              <div class="space-y-3">
                {#each encarregadoData.atividadesRecentes.slice(0, 2) as atividade}
                  <div class="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-900/50">
                    <div>
                      <p class="font-medium text-surface-900 dark:text-white">{atividade.titulo}</p>
                      <p class="text-xs text-surface-500">com {atividade.educandoNome}</p>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-bold text-surface-900 dark:text-white">{atividade.nota}/100</div>
                      <div class="text-xs text-surface-500">{atividade.data}</div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- AÇÕES RÁPIDAS FAMILIARES -->
          <div class="grid grid-cols-1 gap-4">

            <button 
              on:click={() => goto('/dashboard/foreman/reports')}
              class="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4 text-left hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors group"
            >
              <div class="flex items-center gap-2 mb-2">
                <BarChart3 size={18} class="text-teal-600 dark:text-teal-400" />
                <span class="font-bold text-surface-900 dark:text-white">Relatórios</span>
              </div>
              <p class="text-sm text-surface-600 dark:text-surface-400">Acompanhamento detalhado</p>
            </button>
          </div>
        </div>
      {:else}
        <!-- NÃO É ENCARREGADO -->
        <div class="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-2xl p-6 text-center border border-emerald-200 dark:border-emerald-800">
          <Home size={48} class="mx-auto mb-4 text-emerald-500" />
          <h3 class="font-bold text-surface-900 dark:text-white mb-2">Perfil Familiar Disponível</h3>
          <p class="text-surface-600 dark:text-surface-400 mb-6 text-sm">
            Ative seu perfil de encarregado para acompanhar educandos
          </p>
          <button 
            on:click={() => goto('/dashboard/foreman/become-foreman')}
            class="btn variant-filled-emerald"
          >
            Ativar Perfil Familiar
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- RODAPÉ COM DICA DO DIA -->
  <div class="pt-6 border-t border-surface-200 dark:border-surface-800">
    <div class="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 text-white">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-start gap-4">
          <Brain size={32} class="flex-shrink-0" />
          <div>
            <h3 class="font-bold text-lg mb-2">Dica do Dia para Perfis Duplos</h3>
            <p class="text-primary-100 max-w-2xl">
              Como professor e encarregado, você pode criar sinergias entre suas turmas e seus educandos. 
              Use atividades similares em ambos os contextos para reforçar o aprendizado e compare 
              desempenhos para insights valiosos sobre metodologias de ensino.
            </p>
          </div>
        </div>
        <div class="flex-shrink-0">
          <Star size={20} class="inline mr-1" />
          <span class="text-sm text-primary-200">KaniMente Pro</span>
        </div>
      </div>
    </div>
  </div>

</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>