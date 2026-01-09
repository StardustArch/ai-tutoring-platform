<script lang="ts">
  import axios from 'axios';
  import { goto } from '$app/navigation';
  import { Eye, EyeOff, Check, X, AlertCircle, User, Phone, Mail, Lock } from 'lucide-svelte';
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

  $: passwordStrength = calculatePasswordStrength(password);
  $: passwordsMatch = password && confirmPassword && password === confirmPassword;
  $: isFormValid = nome && sobrenome && telefone && email && password && passwordsMatch && passwordStrength.score >= 2;

  function calculatePasswordStrength(pwd: string) {
    if (!pwd) return { score: 0, feedback: [] };

    const feedback = [];
    let score = 0;

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
        nome, sobrenome, telefone, email, password
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
    window.location.href = `${PUBLIC_API_URL_HOST}/api/auth/google`;
  }
</script>

<div class="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface-50 via-primary-50/20 to-surface-50 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 py-6 px-4 ">
  
  <!-- Elementos decorativos -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="absolute top-0 -left-4 w-96 h-96 bg-primary-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
    <div class="absolute top-0 -right-4 w-96 h-96 bg-secondary-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
    <div class="absolute -bottom-8 left-20 w-96 h-96 bg-tertiary-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
  </div>

  <!-- Botão Tema -->
  <!-- <div class="fixed top-4 right-4 z-50">
    <ThemeSwitch />
  </div> -->
  
  <!-- Cartão de Registo -->
  <!-- <div class="relative w-full max-w-lg z-10 max-h-[90vh] md:max-h-[95vh] overflow-y-auto custom-scrollbar"> -->
    <div class="bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-surface-200/50 dark:border-surface-700/50 p-6 md:p-8 space-y-5 mt-2 md:mt-0 ">
      
      <!-- Cabeçalho -->
      <div class="text-center space-y-2">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 text-white shadow-lg shadow-primary-500/30">
          <span class="text-2xl font-black">K</span>
        </div>
        <div>
          <h2 class="text-2xl md:text-3xl font-black text-surface-900 dark:text-white tracking-tight">
            Criar Conta
          </h2>
          <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
            Junte-se ao KaniMente
          </p>
        </div>
      </div>

      <!-- Alertas -->
      {#if error}
        <div class="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3 animate-shake">
          <AlertCircle size={20} class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-red-800 dark:text-red-300 font-medium">{error}</p>
        </div>
      {/if}
      
      {#if success}
        <div class="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 flex items-start gap-3">
          <Check size={20} class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-green-800 dark:text-green-300 font-medium">{success}</p>
        </div>
      {/if}

      <!-- Botão Google -->
      <button 
        on:click={handleGoogleLogin}
        type="button"
        class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-surface-900 border-2 border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600 transition-all duration-200 group"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" class="flex-shrink-0">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span class="font-semibold text-surface-700 dark:text-surface-200 group-hover:text-surface-900 dark:group-hover:text-white transition-colors">
          Registar com Google
        </span>
      </button>

      <!-- Divisor -->
      <div class="relative flex items-center py-1">
        <div class="flex-grow border-t border-surface-300 dark:border-surface-600"></div>
        <span class="flex-shrink mx-4 text-sm font-medium text-surface-500 dark:text-surface-400">OU</span>
        <div class="flex-grow border-t border-surface-300 dark:border-surface-600"></div>
      </div>

      <form class="space-y-3.5" on:submit|preventDefault={handleRegister}>
        
        <!-- Nome e Sobrenome -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="space-y-1.5">
            <label for="nome" class="block text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
              Nome *
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} class="text-surface-400" />
              </div>
              <input 
                id="nome"
                type="text" 
                bind:value={nome} 
                required 
                placeholder="Seu nome"
                class="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-surface-900/50 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-surface-900 dark:text-white placeholder:text-surface-400"
              />
            </div>
          </div>
          
          <div class="space-y-1.5">
            <label for="sobrenome" class="block text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
              Sobrenome *
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} class="text-surface-400" />
              </div>
              <input 
                id="sobrenome"
                type="text" 
                bind:value={sobrenome} 
                required 
                placeholder="Seu sobrenome"
                class="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-surface-900/50 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-surface-900 dark:text-white placeholder:text-surface-400"
              />
            </div>
          </div>
        </div>

        <!-- Telefone -->
        <div class="space-y-1.5">
          <label for="telefone" class="block text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
            Telefone *
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone size={16} class="text-surface-400" />
            </div>
            <input 
              id="telefone"
              type="tel" 
              bind:value={telefone} 
              required 
              placeholder="+258 8X XXX XXXX"
              class="w-full pl-10 pr-4 py-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-surface-900 dark:text-white placeholder:text-surface-400"
            />
          </div>
        </div>

        <!-- Email -->
        <div class="space-y-1.5">
          <label for="email" class="block text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
            Email *
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} class="text-surface-400" />
            </div>
            <input 
              id="email"
              type="email" 
              bind:value={email} 
              required 
              placeholder="seu@email.com"
              class="w-full pl-10 pr-4 py-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-surface-900 dark:text-white placeholder:text-surface-400"
            />
          </div>
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <label for="password" class="block text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
            Password *
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} class="text-surface-400" />
            </div>
            <input 
              id="password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password} 
              required 
              placeholder="Crie uma password segura"
              class="w-full pl-10 pr-12 py-2.5 bg-surface-50 dark:bg-surface-900/50 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-surface-900 dark:text-white placeholder:text-surface-400"
            />
            <button 
              type="button"
              on:click={() => showPassword = !showPassword}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              {#if showPassword}
                <EyeOff size={16} />
              {:else}
                <Eye size={16} />
              {/if}
            </button>
          </div>

          <!-- Indicador de Força -->
          {#if password}
            <div class="space-y-1.5 mt-1.5">
              <div class="flex justify-between items-center text-xs">
                <span class="text-surface-600 dark:text-surface-400 font-medium">Força:</span>
                <span class="font-bold {passwordStrength.score >= 3 ? 'text-green-600' : passwordStrength.score >= 2 ? 'text-yellow-600' : 'text-red-600'}">
                  {getStrengthText(passwordStrength.score)}
                </span>
              </div>
              
              <div class="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5">
                <div 
                  class="h-1.5 rounded-full transition-all duration-300 {getStrengthColor(passwordStrength.score)}"
                  style="width: {passwordStrength.score * 20}%"
                ></div>
              </div>

              {#if passwordStrength.feedback.length > 0}
                <div class="text-xs space-y-1">
                  {#each passwordStrength.feedback as requirement}
                    <div class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400">
                      <X size={10} class="text-red-500 flex-shrink-0" />
                      <span>{requirement}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Confirmar Password -->
        <div class="space-y-1.5">
          <label for="confirmPassword" class="block text-sm font-semibold text-surface-700 dark:text-surface-300 ml-1">
            Confirmar Password *
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} class="text-surface-400" />
            </div>
            <input 
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              bind:value={confirmPassword} 
              required 
              placeholder="Confirme a password"
              class="w-full pl-10 pr-12 py-2.5 bg-surface-50 dark:bg-surface-900/50 border {passwordsMatch && confirmPassword ? 'border-green-500' : confirmPassword ? 'border-red-500' : 'border-surface-300 dark:border-surface-600'} rounded-xl focus:ring-2 focus:ring-primary-500 transition-all text-surface-900 dark:text-white placeholder:text-surface-400"
            />
            <button 
              type="button"
              on:click={() => showConfirmPassword = !showConfirmPassword}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              {#if showConfirmPassword}
                <EyeOff size={16} />
              {:else}
                <Eye size={16} />
              {/if}
            </button>
          </div>

          {#if confirmPassword}
            <div class="flex items-center gap-2 text-xs {passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
              {#if passwordsMatch}
                <Check size={12} class="flex-shrink-0" />
                <span class="font-medium">As passwords coincidem</span>
              {:else}
                <X size={12} class="flex-shrink-0" />
                <span class="font-medium">As passwords não coincidem</span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Botão Criar Conta -->
        <button 
          type="submit" 
          class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 mt-4"
          disabled={isLoading || !isFormValid}
        >
          {#if isLoading}
            <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>A processar...</span>
          {:else}
            Criar Conta
          {/if}
        </button>

      </form>

      <!-- Link Login -->
      <div class="text-center pt-3 border-t border-surface-200 dark:border-surface-700">
        <p class="text-sm text-surface-600 dark:text-surface-400">
          Já tem conta? 
          <a href="/login" class="font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors ml-1">
            Entrar
          </a>
        </p>
      </div>

    </div>
  </div>
<!-- </div> -->

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