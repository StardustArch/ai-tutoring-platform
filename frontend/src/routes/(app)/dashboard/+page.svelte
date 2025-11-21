<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { goto } from '$app/navigation';
  import { 
    Users, School, ChevronRight, BookOpen, GraduationCap, 
    LayoutDashboard, AlertTriangle, Plus 
  } from 'lucide-svelte';
  import '../../../app.css'

  // Estado Reativo
  $: user = $auth.user;
  $: isEncarregado = !!user?.perfilEncarregado;
  
  // Lógica de Professor
  $: isProfessor = !!user?.perfilProfessor;
  $: isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;
  
  // Estado Global
  $: hasAnyRole = isEncarregado || isProfessor;

  // Navegação Rápida
  function goTeacher() { goto('/dashboard/teacher/home'); }
  function goParent() { goto('/dashboard/home'); } // Ou /dashboard/educandos
  
  function becomeTeacher() { goto('/dashboard/teacher/become-teacher'); }
  function becomeParent() { goto('/dashboard/foreman/become-foreman'); } // Ou fluxo de criação de encarregado
</script>

<div class="space-y-8 animate-fade-in max-w-5xl mx-auto pb-20">

  <!-- CABEÇALHO DE BOAS-VINDAS -->
  <header class="space-y-2">
    <h1 class="h2 font-bold text-surface-900 dark:text-surface-50">
      Olá, <span class="bg-gradient-to-br from-primary-500 to-secondary-500 bg-clip-text text-transparent">{user?.nome || 'Utilizador'}</span>! 👋
    </h1>
    <p class="text-surface-600 dark:text-surface-400 text-lg">
      {#if !hasAnyRole}
        Vamos configurar o seu perfil para começar.
      {:else}
        Aqui está o resumo das suas atividades hoje.
      {/if}
    </p>
  </header>

  <!-- CENÁRIO 1: UTILIZADOR NOVO (ONBOARDING) -->
  {#if !hasAnyRole}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      
      <!-- Card Professor -->
      <button 
        class="card p-8 variant-soft-secondary hover:variant-filled-secondary transition-all hover:scale-[1.02] text-left space-y-4 group relative overflow-hidden"
        on:click={becomeTeacher}
      >
        <div class="absolute -right-6 -bottom-6 opacity-10 rotate-12 group-hover:scale-150 transition-transform duration-500">
          <School size={120} />
        </div>
        <div class="p-4 bg-white/20 dark:bg-black/20 rounded-2xl w-fit backdrop-blur-sm">
          <School size={32} />
        </div>
        <div>
          <h3 class="h3 font-bold">Sou Professor</h3>
          <p class="opacity-80 mt-2">Crie turmas, gere códigos para alunos e acompanhe o progresso com IA.</p>
        </div>
        <div class="pt-4 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
          Configurar Perfil <ChevronRight size={16} />
        </div>
      </button>

      <!-- Card Encarregado -->
      <button 
        class="card p-8 variant-soft-primary hover:variant-filled-primary transition-all hover:scale-[1.02] text-left space-y-4 group relative overflow-hidden"
        on:click={becomeParent}
      >
        <div class="absolute -right-6 -bottom-6 opacity-10 rotate-12 group-hover:scale-150 transition-transform duration-500">
          <Users size={120} />
        </div>
        <div class="p-4 bg-white/20 dark:bg-black/20 rounded-2xl w-fit backdrop-blur-sm">
          <Users size={32} />
        </div>
        <div>
          <h3 class="h3 font-bold">Sou Encarregado</h3>
          <p class="opacity-80 mt-2">Registe os seus educandos e acompanhe a evolução deles na escola.</p>
        </div>
        <div class="pt-4 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
          Registar Educando <ChevronRight size={16} />
        </div>
      </button>

    </div>
  
  {:else}
    <!-- CENÁRIO 2: UTILIZADOR COM PAPÉIS (DASHBOARD HÍBRIDO) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- SECÇÃO DO PROFESSOR (Se tiver o perfil) -->
      {#if isProfessor}
        <div class="card p-0 overflow-hidden border-t-4 border-secondary-500 shadow-lg flex flex-col h-full">
          <div class="p-6 bg-secondary-500/5 border-b border-surface-500/10 flex justify-between items-start">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-secondary-500 text-white rounded-lg"><School size={24}/></div>
              <div>
                <h3 class="h3 font-bold text-surface-900 dark:text-surface-50">Área do Professor</h3>
                {#if isProfessorAtivo}
                  <p class="text-xs text-surface-500">{user?.perfilProfessor?.escolaNome}</p>
                {:else}
                  <span class="badge variant-filled-warning">Configuração Pendente</span>
                {/if}
              </div>
            </div>
          </div>

          <div class="p-6 flex-1 flex flex-col justify-center space-y-4">
             {#if isProfessorAtivo}
                <div class="grid grid-cols-2 gap-4">
                   <div class="p-4 rounded-container bg-surface-100 dark:bg-surface-700 text-center">
                      <span class="block text-3xl font-bold text-secondary-600">--</span>
                      <span class="text-xs uppercase tracking-wide opacity-70">Turmas</span>
                   </div>
                   <div class="p-4 rounded-container bg-surface-100 dark:bg-surface-700 text-center">
                      <span class="block text-3xl font-bold text-secondary-600">--</span>
                      <span class="text-xs uppercase tracking-wide opacity-70">Alunos</span>
                   </div>
                </div>
                <button class="btn variant-filled-secondary w-full" on:click={goTeacher}>
                   <LayoutDashboard size={18} class="mr-2"/> Ir para Sala dos Professores
                </button>
             {:else}
                <div class="alert variant-soft-warning">
                   <AlertTriangle size={24} />
                   <p>Você precisa indicar a sua escola para criar turmas.</p>
                </div>
                <button class="btn variant-filled-warning w-full" on:click={becomeTeacher}>
                   Concluir Cadastro
                </button>
             {/if}
          </div>
        </div>
      {/if}

      <!-- SECÇÃO DO ENCARREGADO (Se tiver o perfil) -->
      {#if isEncarregado}
        <div class="card p-0 overflow-hidden border-t-4 border-primary-500 shadow-lg flex flex-col h-full">
          <div class="p-6 bg-primary-500/5 border-b border-surface-500/10 flex justify-between items-start">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary-500 text-white rounded-lg"><Users size={24}/></div>
              <div>
                <h3 class="h3 font-bold text-surface-900 dark:text-surface-50">Área Familiar</h3>
                <p class="text-xs text-surface-500">Gestão de Educandos</p>
              </div>
            </div>
          </div>

          <div class="p-6 flex-1 flex flex-col justify-center space-y-4">
             <div class="p-4 rounded-container bg-surface-100 dark:bg-surface-700 flex items-center gap-4">
                <div class="p-3 bg-primary-500/10 text-primary-600 rounded-full">
                   <GraduationCap size={24} />
                </div>
                <div>
                   <p class="font-bold">Acompanhamento Escolar</p>
                   <p class="text-sm opacity-70">Verifique o progresso dos seus filhos.</p>
                </div>
             </div>
             
             <button class="btn variant-filled-primary w-full" on:click={goParent}>
                <LayoutDashboard size={18} class="mr-2"/> Aceder ao Portal
             </button>
          </div>
        </div>
      {/if}

    </div>

    <!-- BOTÕES PARA ADICIONAR NOVO PAPEL (Caso tenha só um) -->
    <div class="mt-8 pt-8 border-t border-surface-500/20">
       <h4 class="h4 font-bold mb-4 opacity-80">Outras Ações</h4>
       <div class="flex gap-4 flex-wrap">
          {#if !isProfessor}
             <button class="btn variant-ghost-secondary" on:click={becomeTeacher}>
                <Plus size={18} class="mr-2"/> Ativar Perfil de Professor
             </button>
          {/if}
          {#if !isEncarregado}
             <button class="btn variant-ghost-primary" on:click={becomeParent}>
                <Plus size={18} class="mr-2"/> Ativar Perfil de Encarregado
             </button>
          {/if}
       </div>
    </div>
  {/if}

</div>