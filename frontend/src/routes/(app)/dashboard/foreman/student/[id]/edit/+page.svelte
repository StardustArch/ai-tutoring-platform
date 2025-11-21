<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  import Notification from '$lib/components/Notification.svelte';
  
  import { 
    ArrowLeft, Save, Trash2, AlertTriangle, User, 
    Loader, Calendar, GraduationCap 
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

  onMount(async () => {
    await loadStudent();
  });

  async function loadStudent() {
    isLoading = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        // Preencher o form
        formData.nome = data.nome;
        formData.sobrenome = data.sobrenome;
        // Formatar data para o input type="date" (YYYY-MM-DD)
        if (data.dataNascimento) {
            formData.dataNascimento = new Date(data.dataNascimento).toISOString().split('T')[0];
        }
        formData.classe = data.classe;
      } else {
        throw new Error('Erro ao carregar dados.');
      }
    } catch (err: any) {
      notifications.send(err.message, 'error');
      goto('/dashboard/home');
    } finally {
      isLoading = false;
    }
  }

  // --- ACÇÕES ---

  async function saveChanges() {
    if (!formData.nome || !formData.sobrenome || !formData.dataNascimento) {
        notifications.send('Preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    isSaving = true;
    try {
        // Endpoint PATCH
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                ...formData,
                classe: parseInt(String(formData.classe))
            })
        });

        if (res.ok) {
            notifications.send('Dados atualizados com sucesso!', 'success');
            goto(`/dashboard/foreman/student/${studentId}`); // Volta aos detalhes
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
    const confirmacao = confirm('Tem a certeza? Isto irá apagar todo o histórico escolar deste aluno. Esta ação é irreversível.');
    if (!confirmacao) return;

    isDeleting = true;
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            notifications.send('Educando removido com sucesso.', 'success');
            goto('/dashboard/home');
        } else {
            throw new Error('Falha ao remover.');
        }
    } catch (err: any) {
        notifications.send(err.message || 'Erro ao remover.', 'error');
    } finally {
        isDeleting = false;
    }
  }
</script>

<Notification />

<div class="max-w-2xl mx-auto p-4 pb-20 space-y-8 animate-fade-in">

  <!-- CABEÇALHO -->
  <div class="flex items-center gap-4">
    <button 
      on:click={() => goto(`/dashboard/foreman/student/${studentId}`)} 
      class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Gerir Educando</h1>
  </div>

  {#if isLoading}
    <div class="h-96 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"></div>
  {:else}

    <!-- FORMULÁRIO DE EDIÇÃO -->
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 md:p-8 space-y-6">
        
        <div class="flex items-center gap-3 border-b border-surface-100 dark:border-surface-700 pb-4 mb-4">
            <User class="text-primary-500" size={24} />
            <h2 class="text-lg font-bold text-surface-900 dark:text-surface-50">Dados Pessoais</h2>
        </div>

        <div class="space-y-4">
            <!-- Nome e Sobrenome -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="label">
                    <span class="font-medium text-sm">Nome</span>
                    <input type="text" class="input p-3" bind:value={formData.nome} />
                </label>
                <label class="label">
                    <span class="font-medium text-sm">Sobrenome</span>
                    <input type="text" class="input p-3" bind:value={formData.sobrenome} />
                </label>
            </div>

            <!-- Data Nascimento -->
            <label class="label">
                <span class="font-medium text-sm flex items-center gap-2"><Calendar size={14}/> Data de Nascimento</span>
                <input type="date" class="input p-3" bind:value={formData.dataNascimento} />
            </label>

            <!-- Classe -->
            <label class="label">
                <span class="font-medium text-sm flex items-center gap-2"><GraduationCap size={16}/> Classe</span>
                <select class="select p-3" bind:value={formData.classe}>
                    {#each Array(12) as _, i}
                        <option value={i + 1}>{i + 1}ª Classe</option>
                    {/each}
                </select>
            </label>
        </div>

        <!-- Ações -->
        <div class="pt-4 flex justify-end gap-3">
            <button class="btn variant-ghost-surface" on:click={() => goto(`/dashboard/foreman/student/${studentId}`)}>
                Cancelar
            </button>
            <button class="btn variant-filled-primary font-bold" on:click={saveChanges} disabled={isSaving}>
                {#if isSaving}
                    <Loader size={18} class="animate-spin mr-2"/> A Guardar...
                {:else}
                    <Save size={18} class="mr-2"/> Guardar Alterações
                {/if}
            </button>
        </div>
    </div>

    <!-- ZONA DE PERIGO -->
    <div class="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="text-red-800 dark:text-red-300">
            <h3 class="font-bold flex items-center gap-2"><AlertTriangle size={20}/> Remover Educando</h3>
            <p class="text-sm opacity-80 mt-1">Esta ação irá apagar permanentemente o perfil e histórico escolar.</p>
        </div>
        <button class="btn variant-filled-error font-bold whitespace-nowrap" on:click={deleteStudent} disabled={isDeleting}>
            <Trash2 size={18} class="mr-2"/> Remover
        </button>
    </div>

  {/if}
</div>