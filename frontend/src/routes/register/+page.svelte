<script lang="ts">
  import axios from 'axios';
  import { goto } from '$app/navigation';
  import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-svelte';
  import '../../app.css'
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
	import ThemeSwitch from '$lib/components/ThemeSwitch.svelte';

  let nome = '';
  let sobrenome = '';
  let telefone = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let isLoading = false;
  let error = '';
  let success = '';
  let showPassword = false;
  let showConfirmPassword = false;

  // Validações em tempo real
  $: passwordStrength = calculatePasswordStrength(password);
  $: passwordsMatch = password && confirmPassword && password === confirmPassword;
  $: isFormValid = nome && sobrenome && telefone && email && password && passwordsMatch && passwordStrength.score >= 2;

  function calculatePasswordStrength(pwd: string) {
    if (!pwd) return { score: 0, feedback: [] };

    const feedback = [];
    let score = 0;

    // Critérios de força
    if (pwd.length >= 8) score += 1;
    else feedback.push('Pelo menos 8 caracteres');

    if (/[A-Z]/.test(pwd)) score += 1;
    else feedback.push('Uma letra maiúscula');

    if (/[a-z]/.test(pwd)) score += 1;
    else feedback.push('Uma letra minúscula');

    if (/[0-9]/.test(pwd)) score += 1;
    else feedback.push('Um número');

    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    else feedback.push('Um caractere especial');

    return { score, feedback };
  }

  function getStrengthColor(score: number) {
    if (score === 0) return 'bg-surface-300';
    if (score === 1) return 'bg-red-500';
    if (score === 2) return 'bg-orange-500';
    if (score === 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-blue-500';
    return 'bg-green-500';
  }

  function getStrengthText(score: number) {
    if (score === 0) return 'Muito fraca';
    if (score === 1) return 'Fraca';
    if (score === 2) return 'Razoável';
    if (score === 3) return 'Boa';
    if (score === 4) return 'Forte';
    return 'Muito forte';
  }

  async function handleRegister() {
    isLoading = true;
    error = '';
    success = '';

    // Validação final
    if (!passwordsMatch) {
      error = 'As passwords não coincidem';
      isLoading = false;
      return;
    }

    if (passwordStrength.score < 2) {
      error = 'A password é muito fraca. Por favor, escolha uma password mais segura.';
      isLoading = false;
      return;
    }

    try {
      await axios.post(`${PUBLIC_API_URL_HOST}/api/auth/register`, {
        nome,
        sobrenome,
        telefone,
        email,
        password
      });

      success = 'Conta criada com sucesso! A redirecionar...';
      setTimeout(() => goto('/login'), 2000);

    } catch (err: any) {
      error = err.response?.data?.message || 'Erro ao criar conta';
    } finally {
      isLoading = false;
    }
  }

  function handleGoogleLogin() {
    // Redirecionar para o endpoint de OAuth do Google
    window.location.href = `${PUBLIC_API_URL_HOST}/api/auth/google`;
  }

  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  function toggleConfirmPasswordVisibility() {
    showConfirmPassword = !showConfirmPassword;
  }
</script>

<div class="min-h-screen w-full flex items-center justify-center bg-surface-50-900-token py-10 px-4">
    <div class="absolute top-4 right-4">
    <ThemeSwitch />
  </div>
  
  <div class="card p-8 w-full max-w-md shadow-xl space-y-6 bg-surface-100-800-token border border-surface-200-700-token">
    
    <div class="text-center space-y-2">
      <h2 class="h2 font-bold text-primary-500">Criar Conta</h2>
      <p class="text-surface-600-300-token">Junte-se ao KaniMente</p>
    </div>

    <!-- Alertas -->
    {#if error}
      <div class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
        <AlertCircle size={18} class="flex-shrink-0 mt-0.5" />
        <p class="text-sm">{error}</p>
      </div>
    {/if}
    
    {#if success}
      <div class="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-start gap-2">
        <Check size={18} class="flex-shrink-0 mt-0.5" />
        <p class="text-sm">{success}</p>
      </div>
    {/if}

    <!-- Botão Google -->
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
      <span class="font-medium">Registar com Google</span>
    </button>

    <!-- Divisor -->
    <div class="relative flex py-2 items-center">
      <div class="flex-grow border-t border-surface-500/30"></div>
      <span class="flex-shrink mx-4 text-surface-500">OU</span>
      <div class="flex-grow border-t border-surface-500/30"></div>
    </div>

    <form class="space-y-4" on:submit|preventDefault={handleRegister}>
      
      <!-- Nome e Sobrenome -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300">
            Nome *
          </label>
          <input 
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors"
            type="text" 
            bind:value={nome} 
            required 
            placeholder="Seu nome"
          />
        </div>
        
        <div class="space-y-2">
          <label class="block text-sm font-medium text-surface-700 dark:text-surface-300">
            Sobrenome *
          </label>
          <input 
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors"
            type="text" 
            bind:value={sobrenome} 
            required 
            placeholder="Seu sobrenome"
          />
        </div>
      </div>

      <!-- Telefone -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300">
          Telefone *
        </label>
        <input 
          class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors"
          type="tel" 
          bind:value={telefone} 
          required 
          placeholder="+258 8X XXX XXXX"
        />
      </div>

      <!-- Email -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300">
          Email *
        </label>
        <input 
          class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors"
          type="email" 
          bind:value={email} 
          required 
          placeholder="seu@email.com"
        />
      </div>

      <!-- Password -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300">
          Password *
        </label>
        <div class="relative">
          <input 
            class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors pr-10"
            type={showPassword ? 'text' : 'password'} 
            bind:value={password} 
            required 
            placeholder="Crie uma password segura"
          />
          <button 
            type="button"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            on:click={togglePasswordVisibility}
          >
            {#if showPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>

        <!-- Indicador de Força da Password -->
        {#if password}
          <div class="space-y-2">
            <div class="flex justify-between items-center text-xs">
              <span class="text-surface-600 dark:text-surface-400">Força da password:</span>
              <span class="font-medium {passwordStrength.score >= 3 ? 'text-green-600' : passwordStrength.score >= 2 ? 'text-yellow-600' : 'text-red-600'}">
                {getStrengthText(passwordStrength.score)}
              </span>
            </div>
            
            <!-- Barra de progresso -->
            <div class="w-full bg-surface-200 dark:bg-surface-600 rounded-full h-2">
              <div 
                class="h-2 rounded-full transition-all duration-300 {getStrengthColor(passwordStrength.score)}"
                style="width: {passwordStrength.score * 20}%"
              ></div>
            </div>

            <!-- Feedback -->
            {#if passwordStrength.feedback.length > 0}
              <div class="text-xs text-surface-500 dark:text-surface-400 space-y-1">
                <p class="font-medium">Requisitos:</p>
                {#each passwordStrength.feedback as requirement}
                  <div class="flex items-center gap-2">
                    <X size={12} class="text-red-500 flex-shrink-0" />
                    <span>{requirement}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="flex items-center gap-2 text-xs text-green-600">
                <Check size={12} class="flex-shrink-0" />
                <span>Password forte! Todos os requisitos atendidos.</span>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Confirmar Password -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300">
          Confirmar Password *
        </label>
        <div class="relative">
          <input 
            class="w-full px-3 py-2 border {passwordsMatch && confirmPassword ? 'border-green-500' : confirmPassword ? 'border-red-500' : 'border-surface-300 dark:border-surface-600'} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 transition-colors pr-10"
            type={showConfirmPassword ? 'text' : 'password'} 
            bind:value={confirmPassword} 
            required 
            placeholder="Confirme a password"
          />
          <button 
            type="button"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            on:click={toggleConfirmPasswordVisibility}
          >
            {#if showConfirmPassword}
              <EyeOff size={18} />
            {:else}
              <Eye size={18} />
            {/if}
          </button>
        </div>

        <!-- Feedback da confirmação -->
        {#if confirmPassword}
          <div class="flex items-center gap-2 text-xs {passwordsMatch ? 'text-green-600' : 'text-red-600'}">
            {#if passwordsMatch}
              <Check size={12} class="flex-shrink-0" />
              <span>As passwords coincidem</span>
            {:else}
              <X size={12} class="flex-shrink-0" />
              <span>As passwords não coincidem</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Botão de Registo -->
      <button 
        type="submit" 
        class="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed mt-6"
        disabled={isLoading || !isFormValid}
      >
        {#if isLoading}
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>A processar...</span>
          </div>
        {:else}
          Criar Conta
        {/if}
      </button>

    </form>

    <div class="text-center pt-4 border-t border-surface-200 dark:border-surface-600">
      <p class="text-sm text-surface-600 dark:text-surface-400">
        Já tem conta? 
        <a href="/login" class="text-primary-500 hover:text-primary-600 font-medium transition-colors ml-1">
          Entrar
        </a>
      </p>
    </div>

  </div>
</div>