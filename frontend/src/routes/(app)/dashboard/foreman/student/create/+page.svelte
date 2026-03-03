<svelte:head>
    <title>Novo Educando | KMind</title>
</svelte:head>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications'; 
  import { 
    UserPlus, Save, Calendar, GraduationCap, ArrowLeft, Loader, BookOpen
  } from 'lucide-svelte';
  import { page } from '$app/stores';

  let isLoading = false;
  
  let formData = {
    nome: '',
    sobrenome: '',
    dataNascimento: '',
    classe: '' 
  };

  const ref = $page.url.searchParams.get('ref');

  // Ajuste nos Inputs: py-3 no mobile para toque, py-2.5 no desktop
  const inputClass = "w-full px-3 py-3 md:py-2.5 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm transition-all disabled:opacity-60 shadow-sm";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-surface-500 dark:text-surface-400 mb-1.5 ml-0.5";

  async function createStudent() {
    if (!formData.nome.trim() || !formData.sobrenome.trim() || !formData.classe || !formData.dataNascimento) {
        notifications.send('Preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    isLoading = true;

    try {
        const payload = {
            nome: formData.nome.trim(),
            sobrenome: formData.sobrenome.trim(),
            dataNascimento: formData.dataNascimento,
            classe: parseInt(formData.classe)
        };

        const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            notifications.send(`Educando registado com sucesso!`, 'success');
            setTimeout(() => {
                goto('/dashboard/foreman/student'); 
            }, 1000);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar perfil');
        }
    } catch (error: any) {
        notifications.send(error.message || 'Erro de rede.', 'error');
    } finally {
        isLoading = false;
    }
  }

  function goBack() {
    if (ref === 'home') goto('/dashboard/foreman/overview');
    else if(ref === 'homef') goto('/dashboard/unified/overview');
    else goto('/dashboard/foreman/student'); 
  }
</script>

<div class="w-full h-auto min-h-screen block md:flex md:flex-col md:justify-center md:min-h-[85vh] p-3 pb-40 md:pb-4 md:p-4 animate-fade-in overflow-y-auto md:overflow-visible">

  <div class="w-full max-w-2xl mx-auto mb-4 md:mb-6">
    <button 
      on:click={goBack} 
      class="flex items-center gap-2 text-xs font-bold text-surface-500 hover:text-emerald-600 transition-colors uppercase tracking-wider p-1"
    >
      <ArrowLeft size={14} />
      <span class="hidden md:inline">Voltar para a gestão</span>
      <span class="md:hidden">Voltar</span>
    </button>
  </div>

  <div class="w-full max-w-2xl mx-auto bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
    
    <div class="p-5 md:p-6 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
      <h1 class="text-lg md:text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2">
        <UserPlus class="text-emerald-600" size={20} />
        Novo Educando
      </h1>
      <p class="text-[11px] md:text-xs text-surface-500 mt-1">Crie o perfil individual para acesso à plataforma.</p>
    </div>

    <div class="px-5 pt-5 md:px-8 md:pt-6">
        <div class="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-md flex gap-3 items-center">
            <BookOpen size={16} class="text-emerald-600 shrink-0" />
            <p class="text-[10px] md:text-[11px] text-surface-600 dark:text-surface-300 leading-tight">
                Após o registo, o educando poderá entrar em turmas utilizando códigos.
            </p>
        </div>
    </div>

    <form on:submit|preventDefault={createStudent} class="p-5 md:p-8 space-y-5 md:space-y-6">
        
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="nome" class={labelClass}>Nome Próprio</label>
                    <input id="nome" class={inputClass} type="text" bind:value={formData.nome} placeholder="Ex: João" disabled={isLoading} />
                </div>
                <div>
                    <label for="sobrenome" class={labelClass}>Sobrenome</label>
                    <input id="sobrenome" class={inputClass} type="text" bind:value={formData.sobrenome} placeholder="Ex: Silva" disabled={isLoading} />
                </div>
            </div>

            <div>
                <label for="nascimento" class={labelClass}>Data de Nascimento</label>
                <div class="relative">
                    <input id="nascimento" class="{inputClass} pl-10" type="date" bind:value={formData.dataNascimento} disabled={isLoading} />
                    <Calendar size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                </div>
            </div>
        </div>

        <hr class="border-surface-100 dark:border-surface-700" />

        <div>
            <label for="classe" class={labelClass}>Nível Escolar</label>
            <div class="relative">
                <select id="classe" class="{inputClass} appearance-none pl-10" bind:value={formData.classe} disabled={isLoading}>
                    <option value="" disabled selected>Selecione a classe...</option>
                    <option value="3">3ª Classe</option>
                    <option value="4">4ª Classe</option>
                </select>
                <GraduationCap size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            </div>
        </div>

        <div class="pt-2 md:pt-4">
            <button 
                type="submit" 
                class="w-full btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 md:py-3 rounded-md transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                disabled={isLoading}
            >
                {#if isLoading}
                    <Loader size={18} class="animate-spin" />
                    <span>A Processar...</span>
                {:else}
                    <Save size={18} />
                    <span>Concluir Registo</span>
                {/if}
            </button>
        </div>

    </form>
  </div>
  
  <div class="h-32 w-full md:hidden"></div>

</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>