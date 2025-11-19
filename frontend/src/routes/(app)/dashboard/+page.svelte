<script lang="ts">
  import { auth } from '$lib/store/auth';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import '../../../app.css'

  import { 
    Users, School, Building, ChevronRight, Key, ShieldCheck 
  } from 'lucide-svelte';
	import { goto } from '$app/navigation';

  let isLoadingAction = false;
  let showCodigoModal = false;
  let codigoAtivacao = '';
  let errorCodigo = '';
  let successCodigo = '';

  $: user = $auth.user;

  async function tornarSeEncarregado() {
    isLoadingAction = true;
    // try {
    //   const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/encarregado`, {
    //     method: 'POST',
    //   });
    //   if (res.ok) await auth.refreshUser();
    // } catch (error) {
    //   console.error(error);
    // } finally {
    //   isLoadingAction = false;
    // }
    goto('/dashboard/foreman')

  }

  async function tornarSeAdministrador() {
    isLoadingAction = true;
    // try {
    //   const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/admin`, {
    //     method: 'POST',
    //   });
    //   if (res.ok) await auth.refreshUser();
    // } catch (error) {
    //   console.error(error);
    // } finally {
    //   isLoadingAction = false;
    // }
  goto('/dashboard/admin-school/create-school')
  }


    async function tornarSeProfessor() {
    isLoadingAction = true;
    // try {
    //   const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/admin`, {
    //     method: 'POST',
    //   });
    //   if (res.ok) await auth.refreshUser();
    // } catch (error) {
    //   console.error(error);
    // } finally {
    //   isLoadingAction = false;
    // }
  goto('/dashboard/teacher')
  }

  async function ativarComCodigo() {
    if (!codigoAtivacao.trim()) {
      errorCodigo = 'Por favor, insira o código';
      return;
    }

    isLoadingAction = true;
    errorCodigo = '';
    successCodigo = '';

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/shool-admin/professor/ativar`, {
        method: 'POST',
        body: JSON.stringify({ codigo: codigoAtivacao.toUpperCase() })
      });

      if (res.ok) {
        const result = await res.json();
        successCodigo = result.mensagem;
        await auth.refreshUser();
        setTimeout(() => showCodigoModal = false, 2000);
      } else {
        const error = await res.json();
        errorCodigo = error.message || 'Erro ao ativar código';
      }
    } catch (error) {
      errorCodigo = 'Erro de conexão. Tente novamente.';
    } finally {
      isLoadingAction = false;
    }
  }
</script>

<!-- APENAS ONBOARDING - Só aparece para usuários sem perfil -->
<div class="h-full flex flex-col items-center justify-center p-4 space-y-8 animate-fade-in">
  <div class="text-center space-y-4">
    <h2 class="h1 font-bold">Bem-vindo, {user?.nome}! 👋</h2>
    <p class="text-xl text-surface-600-300-token">Como pretende usar o KaniMente hoje?</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
    
    <!-- Opção ENCARREGADO -->
    <button 
      class="card p-8 variant-soft-primary hover:variant-filled-primary transition-all hover:scale-105 text-left space-y-4 group"
      on:click={tornarSeEncarregado}
      disabled={isLoadingAction}
    >
      <div class="p-4 bg-white/20 rounded-full w-fit">
        <Users size={32} />
      </div>
      <h3 class="h3 font-bold">Sou Encarregado</h3>
      <p class="opacity-80">Quero registar o meu educando para ele aprender com a IA e acompanhar o seu progresso.</p>
      <div class="pt-4 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
        Começar Agora <ChevronRight size={16} />
      </div>
    </button>

    <!-- Opção PROFESSOR -->
    <button 
      class="card p-8 variant-soft-secondary hover:variant-filled-secondary transition-all hover:scale-105 text-left space-y-4 group"
      on:click={tornarSeProfessor}
      disabled={isLoadingAction}
    >
      <div class="p-4 bg-white/20 rounded-full w-fit">
        <School size={32} />
      </div>
      <h3 class="h3 font-bold">Sou Professor</h3>
      <p class="opacity-80">Tenho um código de ativação da minha escola para criar turmas e acompanhar alunos.</p>
      <div class="pt-4 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
        Ativar com Código <ChevronRight size={16} />
      </div>
    </button>

    <!-- Opção ADMINISTRADOR -->
    <button 
      class="card p-8 variant-soft-surface hover:variant-filled-surface transition-all hover:scale-105 text-left space-y-4 group"
      on:click={tornarSeAdministrador}
      disabled={isLoadingAction}
    >
      <div class="p-4 bg-white/20 rounded-full w-fit">
        <Building size={32} />
      </div>
      <h3 class="h3 font-bold">Sou Administrador</h3>
      <p class="opacity-80">Sou responsável pela escola e quero gerir professores, turmas e gerar códigos de ativação.</p>
      <div class="pt-4 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
        Criar Escola <ChevronRight size={16} />
      </div>
    </button>

  </div>

  <!-- Informação adicional -->
  <div class="text-center max-w-4xl">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-surface-500">
      <p>
        💡 <strong>Professores:</strong> Contacte a administração da sua escola para obter o código de ativação.
      </p>
      <p>
        🏫 <strong>Administradores:</strong> Crie o perfil da sua escola e gere códigos para os professores.
      </p>
    </div>
  </div>
</div>
