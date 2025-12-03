<script lang="ts">
  import axios from 'axios';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { auth } from '$lib/store/auth';
  import '../../app.css'
  import { notifications } from '$lib/store/notifications';
  import Notification from '$lib/components/Notification.svelte'; 
  import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-svelte';
  
  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';
  let showPassword = false;

  $: {
    const errorParam = $page.url.searchParams.get('error');
    if (errorParam) {
      if (errorParam === "processing_failed") {
        notifications.send("Falha ao processar o login. Tente novamente.", "error")
      } else {
        error = "Ocorreu um erro durante o login.";
      }
    }
  }

  async function handleLogin() {
    isLoading = true;
    error = '';
    try {
      const result = await auth.login({ email, password });
    let user = result.user;
    let isEncarregado = !!user?.perfilEncarregado;
    let isProfessor = !!user?.perfilProfessor;
    let isProfessorAtivo = isProfessor && !!user?.perfilProfessor?.escolaNome;
     
    if(result.success){
        if(isEncarregado){
          goto('/dashboard/foreman/overview')
        }else if(isProfessorAtivo){
          goto('/dashboard/teacher')
        }else{
          
          goto('/dashboard');
        }
      }
    } catch (err: any) {
      error = err.message || 'Email ou password inválidos';
    } finally {
      isLoading = false;
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${PUBLIC_API_URL_HOST}/api/auth/google`;
  }
</script>

<Notification/>

<div class="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface-50 via-primary-50/20 to-surface-50 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 p-4 relative overflow-hidden">
  
  <!-- Elementos decorativos de fundo -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="absolute top-0 -left-4 w-72 h-72 bg-primary-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
    <div class="absolute top-0 -right-4 w-72 h-72 bg-secondary-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
    <div class="absolute -bottom-8 left-20 w-72 h-72 bg-tertiary-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
  </div>

  <!-- Botão de Tema -->
  <div class="fixed top-4 right-4 z-50">
    <ThemeSwitch />
  </div>

  <!-- Cartão de Login -->
  <div class="relative w-full max-w-md z-10">
    <div class="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-surface-200/50 dark:border-surface-700/50 p-8 md:p-10 space-y-8">
      
      <!-- Logo e Título -->
      <div class="text-center space-y-4">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 text-white shadow-lg shadow-primary-500/30 mb-2">
          <span class="text-4xl font-black">K</span>
        </div>
        <div>
          <h1 class="text-3xl md:text-4xl font-black text-surface-900 dark:text-white tracking-tight">
            Bem-vindo de volta
          </h1>
          <p class="text-surface-600 dark:text-surface-400 mt-2">
            Aceda ao seu tutor inteligente KaniMente
          </p>
        </div>
      </div>

      <!-- Alerta de Erro -->
      {#if error}
        <div class="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-sm animate-shake">
          <p class="font-medium">{error}</p>
        </div>
      {/if}

      <!-- Formulário -->
      <form class="space-y-5" on:submit|preventDefault={handleLogin}>
        
        <!-- Input Email -->
        <div class="space-y-2">
          <label for="email" class="block text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
            Email
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail size={18} class="text-surface-400" />
            </div>
            <input 
              id="email"
              type="email" 
              bind:value={email} 
              placeholder="seu@email.com"
              required
              class="w-full pl-11 pr-4 py-3.5 bg-surface-50 dark:bg-surface-900/50 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-surface-900 dark:text-white placeholder:text-surface-400"
            />
          </div>
        </div>

        <!-- Input Password -->
        <div class="space-y-2">
          <label for="password" class="block text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
            Palavra-passe
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={18} class="text-surface-400" />
            </div>
            <input 
              id="password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password} 
              placeholder="••••••••"
              required
              class="w-full pl-11 pr-12 py-3.5 bg-surface-50 dark:bg-surface-900/50 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-surface-900 dark:text-white placeholder:text-surface-400"
            />
            <button
              type="button"
              on:click={() => showPassword = !showPassword}
              class="absolute inset-y-0 right-0 pr-4 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              {#if showPassword}
                <EyeOff size={18} />
              {:else}
                <Eye size={18} />
              {/if}
            </button>
          </div>
        </div>

        <!-- Link Esqueceu Senha -->
        <div class="flex justify-end">
          <a 
            href="/reset-password" 
            class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Esqueceu a senha?
          </a>
        </div>

        <!-- Botão Entrar -->
        <button 
          type="submit" 
          class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
          disabled={isLoading}
        >
          {#if isLoading}
            <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>A entrar...</span>
          {:else}
            <span>Entrar</span>
            <LogIn size={18} />
          {/if}
        </button>
      </form>

      <!-- Divisor -->
      <div class="relative flex items-center py-2">
        <div class="flex-grow border-t border-surface-300 dark:border-surface-600"></div>
        <span class="flex-shrink mx-4 text-sm font-medium text-surface-500 dark:text-surface-400">OU</span>
        <div class="flex-grow border-t border-surface-300 dark:border-surface-600"></div>
      </div>

      <!-- Botão Google -->
      <button 
        on:click={handleGoogleLogin} 
        type="button"
        class="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-surface-900 border-2 border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-surface-800 transition-all duration-200 group"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" class="flex-shrink-0">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span class="font-semibold text-surface-700 dark:text-surface-200 group-hover:text-surface-900 dark:group-hover:text-white transition-colors">
          Entrar com Google
        </span>
      </button>

      <!-- Link Registar -->
      <div class="text-center pt-4">
        <p class="text-sm text-surface-600 dark:text-surface-400">
          Não tem conta? 
          <a 
            href="/register" 
            class="font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors ml-1"
          >
            Registe-se aqui
          </a>
        </p>
      </div>

    </div>
  </div>
</div>

<style>
  @keyframes blob {
    0%, 100% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  
  .animation-delay-4000 {
    animation-delay: 4s;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  .animate-shake {
    animation: shake 0.3s ease-in-out;
  }
</style>