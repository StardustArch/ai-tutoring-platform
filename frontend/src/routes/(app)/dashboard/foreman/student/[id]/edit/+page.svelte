<svelte:head>
    <title>Configurar Educando | KaniMente</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  
  import { 
    ArrowLeft, Save, Trash2, AlertTriangle, User, 
    Loader, Calendar, GraduationCap, X, User2
  } from 'lucide-svelte';

  // --- ESTADO ---
  let studentId = $page.params.id;
  let isLoading = true;
  let isSaving = false;
  let isDeleting = false;

  let formData = {
    nome: '',
    sobrenome: '',
    dataNascimento: '',
    classe: 1
  };

  // Estilos Padronizados Enterprise
  const inputClass = "w-full px-3 py-2.5 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm transition-all disabled:opacity-60 shadow-sm";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-surface-500 dark:text-surface-400 mb-1.5 ml-0.5";

  onMount(async () => {
    await loadStudent();
  });

  async function loadStudent() {
    isLoading = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        formData.nome = data.nome;
        formData.sobrenome = data.sobrenome;
        if (data.dataNascimento) {
            formData.dataNascimento = new Date(data.dataNascimento).toISOString().split('T')[0];
        }
        formData.classe = data.classe;
      } else {
        throw new Error('Erro ao carregar dados.');
      }
    } catch (err: any) {
      notifications.send(err.message, 'error');
      goBack();
    } finally {
      isLoading = false;
    }
  }

  async function saveChanges() {
    if (!formData.nome || !formData.sobrenome || !formData.dataNascimento) {
        notifications.send('Preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    isSaving = true;
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                ...formData,
                classe: parseInt(String(formData.classe))
            })
        });

        if (res.ok) {
            notifications.send('Dados atualizados com sucesso!', 'success');
            goBack();
        } else {
            throw new Error('Falha ao atualizar.');
        }
    } catch (err: any) {
        notifications.send(err.message || 'Erro ao guardar.', 'error');
    } finally {
        isSaving = false;
    }
  }

  async function deleteStudent() {
    if (!confirm('Tem a certeza que deseja remover este perfil? Todos os dados e o histórico escolar serão apagados permanentemente.')) return;

    isDeleting = true;
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            notifications.send('Educando removido com sucesso.', 'success');
            goto('/dashboard/foreman/student');
        } else {
            throw new Error('Falha ao remover.');
        }
    } catch (err: any) {
        notifications.send(err.message || 'Erro ao remover.', 'error');
    } finally {
        isDeleting = false;
    }
  }

  const ref = $page.url.searchParams.get('ref');

  function goBack() {
    if (ref === 'home') goto('/dashboard/foreman/overview'); 
    else goto('/dashboard/foreman/student'); 
  }
</script>

<div class="container mx-auto max-w-2xl p-4 md:p-8 space-y-6 animate-fade-in pb-24">

  <div class="flex items-center gap-3 border-b border-surface-200 dark:border-surface-700 pb-4">
    <button on:click={goBack} class="p-2 -ml-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 hover:text-emerald-600 transition-colors">
      <ArrowLeft size={20} />
    </button>
    <div>
        <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Configurar Educando</h1>
    </div>
  </div>

  {#if isLoading}
    <div class="bg-white dark:bg-surface-800 rounded-lg p-8 space-y-4 animate-pulse border border-surface-200 dark:border-surface-700">
        <div class="h-4 w-1/4 bg-surface-200 dark:bg-surface-700 rounded"></div>
        <div class="h-10 w-full bg-surface-200 dark:bg-surface-700 rounded"></div>
        <div class="h-20 w-full bg-surface-200 dark:bg-surface-700 rounded mt-4"></div>
    </div>
  {:else}

    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        
        <div class="p-6 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
             <h2 class="text-xs font-bold uppercase tracking-wide text-surface-600 dark:text-surface-300 flex items-center gap-2">
                <User2 size={16} />
                Perfil do Aluno
            </h2>
        </div>

        <div class="p-6 md:p-8 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="nome" class={labelClass}>Nome</label>
                    <input id="nome" type="text" class={inputClass} bind:value={formData.nome} disabled={isSaving} />
                </div>
                <div>
                    <label for="sobrenome" class={labelClass}>Sobrenome</label>
                    <input id="sobrenome" type="text" class={inputClass} bind:value={formData.sobrenome} disabled={isSaving} />
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="nascimento" class={labelClass}>Data de Nascimento</label>
                    <div class="relative">
                        <input id="nascimento" type="date" class="{inputClass} pl-10" bind:value={formData.dataNascimento} disabled={isSaving} />
                        <Calendar size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    </div>
                </div>

                <div>
                    <label for="classe" class={labelClass}>Nível Escolar</label>
                    <div class="relative">
                        <select id="classe" class="{inputClass} appearance-none pl-10" bind:value={formData.classe} disabled={isSaving}>
                            {#each [3,4,5,6] as c}
                                <option value={c}>{c}ª Classe</option>
                            {/each}
                        </select>
                        <GraduationCap size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    </div>
                </div>
            </div>

            <div class="pt-4 flex justify-end gap-3 border-t border-surface-100 dark:border-surface-700">
                <button 
                    class="btn bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 px-4 py-2 rounded-md text-sm font-medium transition-colors" 
                    on:click={goBack}
                    disabled={isSaving}
                >
                    Cancelar
                </button>
                <button 
                    class="btn bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md py-2 px-6 flex items-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 disabled:opacity-70 text-sm" 
                    on:click={saveChanges} 
                    disabled={isSaving}
                >
                    {#if isSaving}
                        <Loader size={16} class="animate-spin" />
                        <span>A Guardar...</span>
                    {:else}
                        <Save size={16} />
                        <span>Guardar Alterações</span>
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <div class="rounded-lg border border-red-200 dark:border-red-900/30 bg-white dark:bg-surface-800 overflow-hidden">
        <div class="p-6">
            <h3 class="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <AlertTriangle size={16}/> Zona de Perigo
            </h3>
            
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <p class="text-sm text-surface-600 dark:text-surface-300 max-w-md">
                    Ao remover este educando, todos os dados de progresso escolar, XP e interações com a IA serão apagados permanentemente.
                </p>
                
                <button 
                    class="btn bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-md flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shadow-sm" 
                    on:click={deleteStudent} 
                    disabled={isDeleting}
                >
                    {#if isDeleting}
                        <Loader size={16} class="animate-spin" />
                    {:else}
                        <Trash2 size={16} />
                    {/if}
                    <span>Remover Perfil</span>
                </button>
            </div>
        </div>
    </div>

  {/if}
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>