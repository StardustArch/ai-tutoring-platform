<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications'; 
  import Notification from '$lib/components/Notification.svelte';
  import { 
    UserPlus, Save, Calendar, GraduationCap, ArrowLeft, User, Loader 
  } from 'lucide-svelte';
	import { page } from '$app/stores';

  // --- ESTADO ---
  let isLoading = false;
  
  let formData = {
    nome: '',
    sobrenome: '',
    dataNascimento: '',
    classe: '' // Será convertido para número no envio
  };

  const ref = $page.url.searchParams.get('ref');

  // --- SUBMISSÃO REAL ---
  async function createStudent() {
    // 1. Validação Local
    if (!formData.nome.trim() || !formData.sobrenome.trim() || !formData.classe || !formData.dataNascimento) {
        notifications.send('Por favor, preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    isLoading = true;

    try {
        // 2. Preparar Payload (Converter tipos)
        const payload = {
            nome: formData.nome,
            sobrenome: formData.sobrenome,
            dataNascimento: formData.dataNascimento, // Formato YYYY-MM-DD é aceite pelo IsDateString
            classe: parseInt(formData.classe) // Backend espera Int
        };

        // 3. Chamada à API
        const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            notifications.send(`Educando "${formData.nome}" registado com sucesso!`, 'success');
            
            // 4. Redirecionar após sucesso
            setTimeout(() => {
                // Redireciona para o hub da família
                goto('/dashboard/foreman/student'); 
            }, 1000);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar educando');
        }

    } catch (error: any) {
        console.error('Erro:', error);
        notifications.send(error.message || 'Erro de conexão. Tente novamente.', 'error');
    } finally {
        isLoading = false;
    }
  }

  function goBack() {
        if (ref === 'home') {
            goto('/dashboard/foreman/overview'); // Volta para a Visão Geral
        }else if(ref === 'homef'){
            goto('/dashboard/unified/overview'); // Volta para a Visão Geral

        }else {
            // Default (ou se vier da lista)
            goto('/dashboard/foreman/student'); 
        }
    }
</script>

<Notification />

<div class="max-w-3xl mx-auto p-4 space-y-8 animate-fade-in pb-20">

  <!-- CABEÇALHO -->
  <div class="flex items-center gap-4">
    <button 
      on:click={() => goBack()} 
      class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
    <div>
      <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
        <UserPlus class="text-primary-500" size={32} />
        Novo Educando
      </h1>
      <p class="text-surface-600 dark:text-surface-400">
        Registe quem vai usar o KaniMente.
      </p>
    </div>
  </div>

  <!-- FORMULÁRIO -->
  <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 md:p-8 space-y-6">
    
    <!-- Dica -->
    <div class="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30 rounded-lg flex gap-3">
        <div class="mt-0.5 text-primary-600 dark:text-primary-400">
            <User size={24} />
        </div>
        <div class="text-sm text-surface-600 dark:text-surface-300">
            <p>Este perfil permitirá que o aluno converse com a IA e entre em turmas virtuais usando os códigos fornecidos pelos professores.</p>
        </div>
    </div>

    <form on:submit|preventDefault={createStudent} class="space-y-6">
        
        <!-- Nome e Sobrenome -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label class="label">
                <span class="font-medium text-surface-700 dark:text-surface-300 text-sm ml-1">Nome Próprio *</span>
                <input 
                        class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                    type="text" 
                    bind:value={formData.nome} 
                    placeholder="Ex: João" 
                    disabled={isLoading}
                />
            </label>
            <label class="label">
                <span class="font-medium text-surface-700 dark:text-surface-300 text-sm ml-1">Sobrenome *</span>
                <input 
                        class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                    type="text" 
                    bind:value={formData.sobrenome} 
                    placeholder="Ex: Silva" 
                    disabled={isLoading}
                />
            </label>
        </div>

        <!-- Data Nascimento -->
        <label class="label">
            <span class="font-medium text-surface-700 dark:text-surface-300 text-sm ml-1 flex items-center gap-2">
                <Calendar size={14}/> Data de Nascimento *
            </span>
            <input 
                        class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                type="date" 
                bind:value={formData.dataNascimento} 
                disabled={isLoading}
            />
        </label>

        <!-- Classe -->
        <label class="label">
            <span class="font-medium text-surface-700 dark:text-surface-300 text-sm ml-1 flex items-center gap-2">
                <GraduationCap size={16}/> Classe Atual *
            </span>
            <select 
                        class="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-500 dark:placeholder-surface-400 transition-colors"
                bind:value={formData.classe} 
                disabled={isLoading}
            >
                <option value="" disabled selected>Selecione a classe...</option>
                                    <option value={3}>3ª Classe</option>
                                    <option value={4}>4ª Classe</option>

            </select>
        </label>

        <!-- Ações -->
        <div class="pt-6 border-t border-surface-200 dark:border-surface-700">
            <button 
                type="submit" 
                                    class="btn variant-filled-primary w-full font-bold text-lg shadow-md hover:scale-[1.01] transition-transform inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"

                disabled={isLoading}
            >
                {#if isLoading}
                    <Loader size={20} class="animate-spin mr-2"/> A Registar...
                {:else}
                    <Save size={20} class="mr-2"/> Concluir Registo
                {/if}
            </button>
        </div>

    </form>
  </div>
</div>