<script lang="ts">
  import axios from 'axios';
  import { goto } from '$app/navigation';
  import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { auth } from '$lib/store/auth'; // ✅ IMPORTAR A STORE
  import '../../app.css';
  
  let email = '';
  let password = '';
  let isLoading = false;
  let error = '';

  async function handleLogin() {
    isLoading = true;
    error = '';
    try {
      console.log('🖱️ [LOGIN PAGE] Iniciando login manual...');
      
      // ✅ USAR A STORE AUTH EM VEZ DE AXIOS DIRETO
      const result = await auth.login({ email, password });
      
      console.log('✅ [LOGIN PAGE] Login bem-sucedido via store auth:', result);
      goto('/dashboard');
      
    } catch (err: any) {
      console.error('❌ [LOGIN PAGE] Erro no login:', err);
      error = err.message || 'Email ou password inválidos';
    } finally {
      isLoading = false;
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${PUBLIC_API_URL_HOST}/api/auth/google`;
  }
</script>

<!-- O resto do código permanece igual -->

<!-- Fundo da página já é definido no app.css (surface-50-900) -->
<div class="h-full w-full flex flex-col items-center justify-center p-4">
  
  <!-- Botão de Tema no canto superior direito -->
  <div class="absolute top-4 right-4">
    <ThemeSwitch />
  </div>

  <!-- 
    CARTÃO DE LOGIN 
    bg-surface-100-800-token: Branco no claro, Azul Escuro no escuro
  -->
  <div class="card p-10 w-full max-w-md shadow-xl space-y-8 bg-surface-100-800-token border border-surface-200-700-token">
    
    <div class="text-center">
      <!-- Título com a cor primária do tema -->
      <h2 class="h2 font-bold text-primary-500">KaniMente</h2>
      <p class="mt-2 opacity-75">O seu tutor com IA</p>
    </div>

    {#if error}
      <aside class="alert variant-filled-error">
        <div class="alert-message"><p>{error}</p></div>
      </aside>
    {/if}

    <form class="space-y-6" on:submit|preventDefault={handleLogin}>
      <label class="label">
        <span>Email</span>
        <input class="input p-3" type="email" bind:value={email} required placeholder="email@exemplo.com" />
      </label>

      <label class="label">
        <span>Password</span>
        <input class="input p-3" type="password" bind:value={password} required placeholder="••••••••" />
      </label>

      <!-- Botão Primário (Azul Wintry) -->
      <button type="submit" class="btn variant-filled-primary w-full font-bold py-3" disabled={isLoading}>
        {#if isLoading}A entrar...{:else}Entrar{/if}
      </button>
    </form>

    <div class="relative flex py-2 items-center">
      <div class="flex-grow border-t border-surface-500/30"></div>
      <span class="flex-shrink mx-4 text-surface-500">OU</span>
      <div class="flex-grow border-t border-surface-500/30"></div>
    </div>

    <!-- Botão Secundário -->
<button 
  on:click={handleGoogleLogin} 
  class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800"
>
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  <span class="font-medium">Entrar com Google</span>
</button>

    <div class="text-center text-sm">
      <p>Não tem conta? <a href="/register" class="anchor">Registe-se aqui</a></p>
    </div>

  </div>
</div>