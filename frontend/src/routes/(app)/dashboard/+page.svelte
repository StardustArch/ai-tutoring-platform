<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { goto } from '$app/navigation';
  import { 
    Users, School, ChevronRight, BookOpen, GraduationCap, 
    LayoutDashboard, AlertTriangle, Plus, Sparkles, Target,
    Brain, Zap, Award, ArrowRight
  } from 'lucide-svelte';
  import '../../../app.css'

  // Estado Reativo
  $: user = $auth.user;
  $: isEncarregado = !!user?.perfilEncarregado;
  $: isProfessor = !!user?.perfilProfessor;
  $: isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;
  $: hasAnyRole = isEncarregado || isProfessor;

  function getFirstName() {
    if (!user?.nome) return 'Utilizador';
    return user.nome.split(' ')[0];
  }
</script>

<div class="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in">

  <!-- HEADER -->
  <div class="space-y-3">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg shadow-lg">
        <Brain size={24} class="text-white" />
      </div>
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-surface-900 dark:text-surface-50">
          Olá, <span class="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">{getFirstName()}</span>! 👋
        </h1>
        <p class="text-surface-600 dark:text-surface-400">
          {#if !hasAnyRole}
            Escolha como vai usar a KaniMente
          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- CENÁRIO 1: UTILIZADOR NOVO -->
  {#if !hasAnyRole}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      
      <!-- CARD PROFESSOR -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div 
        on:click={() => goto('/dashboard/teacher/become-teacher')}
        class="group relative bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        <!-- BACKGROUND EFFECTS -->
        <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/5 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div class="relative z-10">
          <div class="flex items-start justify-between mb-6">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <School size={28} class="text-white" />
            </div>
            <div class="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={20} class="group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
          
          <h3 class="text-xl font-bold text-surface-900 dark:text-white mb-2">
            Sou Professor
          </h3>
          <p class="text-surface-600 dark:text-surface-400 mb-6">
            Crie turmas, gere atividades com IA e acompanhe o progresso dos seus alunos.
          </p>
          
          <div class="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
            <span>Começar a ensinar</span>
            <ChevronRight size={16} class="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      <!-- CARD ENCARREGADO -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div 
        on:click={() => goto('/dashboard/foreman/become-foreman')}
        class="group relative bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        <!-- BACKGROUND EFFECTS -->
        <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/5 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div class="relative z-10">
          <div class="flex items-start justify-between mb-6">
            <div class="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
              <Users size={28} class="text-white" />
            </div>
            <div class="text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={20} class="group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
          
          <h3 class="text-xl font-bold text-surface-900 dark:text-white mb-2">
            Sou Encarregado
          </h3>
          <p class="text-surface-600 dark:text-surface-400 mb-6">
            Acompanhe o progresso escolar dos seus educandos com relatórios detalhados.
          </p>
          
          <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Registar educandos</span>
            <ChevronRight size={16} class="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>

    <!-- DICA -->
    <div class="mt-8 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
      <div class="flex items-start gap-3">
        <Sparkles size={20} class="text-primary-600 dark:text-primary-400 mt-0.5" />
        <div>
          <p class="text-sm text-surface-700 dark:text-surface-300">
            <strong class="text-primary-700 dark:text-primary-300">Dica:</strong> 
            Você pode ativar ambos os perfis posteriormente. Comece com o que mais usa.
          </p>
        </div>
      </div>
    </div>
{/if}
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