<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { 
    Users, School, Building, BookOpen, 
    BarChart3, Settings, Bell, UserPlus
  } from 'lucide-svelte';
import '../../../../app.css'
  $: user = $auth.user;
  $: hasEncarregado = !!user?.perfilEncarregado;
  $: hasProfessor = !!user?.perfilProfessor;
</script>

<div class="space-y-8">
  <!-- Cabeçalho -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="h1 font-bold">Olá, {user?.nome}! 👋</h1>
      <p class="text-surface-600">Bem-vindo ao seu dashboard personalizado</p>
    </div>
    <div class="flex gap-3">
      <button class="btn variant-ghost-surface">
        <Bell size={20} />
      </button>
    </div>
  </div>

  <!-- Cards de Perfis Ativos -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Encarregado -->
    {#if hasEncarregado}
      <div class="card p-6 variant-soft-primary space-y-4">
        <div class="flex items-center gap-3">
          <Users size={24} class="text-primary-600" />
          <h3 class="h3 font-bold">Encarregado</h3>
        </div>
        <p class="text-surface-600 text-sm">
          Gerencie seus educandos e acompanhe o progresso.
        </p>
        <div class="flex gap-2">
          <a href="/dashboard/educandos" class="btn variant-outline-primary flex-1">
            Meus Educandos
          </a>
          <button class="btn variant-ghost-primary">
            <BarChart3 size={16} />
          </button>
        </div>
      </div>
    {/if}

    <!-- Professor -->
    {#if hasProfessor}
      <div class="card p-6 variant-soft-secondary space-y-4">
        <div class="flex items-center gap-3">
          <School size={24} class="text-secondary-600" />
          <h3 class="h3 font-bold">Professor</h3>
        </div>
        <p class="text-surface-600 text-sm">
          Gerencie turmas e atividades educacionais.
        </p>
        <div class="flex gap-2">
          <a href="/dashboard/turmas" class="btn variant-outline-secondary flex-1">
            Minhas Turmas
          </a>
          <button class="btn variant-ghost-secondary">
            <BookOpen size={16} />
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Conteúdo específico por perfil -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Seção para Encarregado -->
    {#if hasEncarregado}
      <div class="card p-6">
        <h3 class="h3 font-bold mb-4">Seus Educandos Recentes</h3>
        <p class="text-surface-500">Aqui vai o conteúdo dos seus educandos...</p>
      </div>
    {/if}

    <!-- Seção para Professor -->
    {#if hasProfessor}
      <div class="card p-6">
        <h3 class="h3 font-bold mb-4">Suas Turmas Ativas</h3>
        <p class="text-surface-500">Aqui vai o conteúdo das suas turmas...</p>
      </div>
    {/if}
  </div>
</div>