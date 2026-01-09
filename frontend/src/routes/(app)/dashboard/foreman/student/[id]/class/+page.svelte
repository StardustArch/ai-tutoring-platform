<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  import Notification from '$lib/components/Notification.svelte';
  
  import { 
    ArrowLeft, User, School, BookOpen, 
    Play, Plus, Zap, X, Loader, CheckCircle
  } from 'lucide-svelte';

  // --- ESTADO DA PÁGINA ---
  let student: any = null;
  let isLoading = true;
  let studentId = $page.params.id || '';

  // --- ESTADO DO MODAL ---
  let showModal = false;
  let joinStep = 1; // 1: Inserir, 2: Confirmar
  let joinCode = '';
  let joinLoading = false;
  let classDetails: any = null;

  onMount(async () => {
    await loadStudent();
  });

  async function loadStudent() {
    isLoading = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
      if (res.ok) student = await res.json();
    } catch (err) { console.error(err); } 
    finally { isLoading = false; }
  }

  // --- LÓGICA DO MODAL ---

  function openModal() {
    joinStep = 1;
    joinCode = '';
    classDetails = null;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function verifyCode() {
    if (!joinCode || joinCode.length < 6) {
      notifications.send('O código deve ter 6 caracteres.', 'warning');
      return;
    }

    joinLoading = true;
    try {
      // Verifica o código na API
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/check-code`, {
        method: 'POST',
        body: JSON.stringify({ codigo: joinCode })
      });

      if (res.ok) {
        const data = await res.json();
        classDetails = data.turma; // Guarda detalhes para mostrar
        joinStep = 2; // Avança para confirmação
      } else {
        throw new Error('Turma não encontrada.');
      }
    } catch (err: any) {
      notifications.send(err.message, 'error');
    } finally {
      joinLoading = false;
    }
  }

  async function confirmJoin() {
    joinLoading = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/join`, {
        method: 'POST',
        body: JSON.stringify({ 
          codigo: classDetails.codigo,
          alunoId: parseInt(studentId) // Usa o ID da página atual
        })
      });

      if (res.ok) {
        notifications.send('Turma vinculada com sucesso!', 'success');
        closeModal();
        await loadStudent(); // Recarrega a lista para mostrar a nova turma
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao entrar.');
      }
    } catch (err: any) {
      notifications.send(err.message, 'error');
    } finally {
      joinLoading = false;
    }
  }

      const ref = $page.url.searchParams.get('ref');

    function goBack() {
        if (ref === 'home') {
            goto('/dashboard/foreman/overview'); // Volta para a Visão Geral
        } else {
            // Default (ou se vier da lista)
            goto('/dashboard/foreman/student'); 
        }
    }
</script>

<Notification />

<div class="max-w-7xl mx-auto p-6 animate-fade-in space-y-8 relative">

  <div class="flex items-center gap-4">
    <button 
      on:click={() => goBack()} 
      class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
    <div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">
            Painel de Estudo
        </h1>
        {#if student}
            <p class="text-surface-500 text-sm">
                A preparar sessão para: <strong class="text-primary-500">{student.nome}</strong>
            </p>
        {/if}
    </div>
  </div>

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="h-48 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
        <div class="h-48 bg-surface-100 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
    </div>
  
  {:else if student}
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <button 
            on:click={() => goto(`/dashboard/foreman/student/${studentId}/session-config/`)}
            class="group relative overflow-hidden bg-white dark:bg-surface-800 p-6 rounded-3xl border-2 border-surface-200 dark:border-surface-700 
                   hover:border-green-500 hover:shadow-xl transition-all text-left flex flex-col justify-between h-full"
        >
            <div>
                <div class="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
                    <User size={28} />
                </div>
                <h3 class="text-xl font-bold text-surface-900 dark:text-white">Estudo Autónomo</h3>
                <p class="text-surface-500 text-sm mt-2 leading-relaxed">
                    Praticar sem vínculo à escola. Evolui o teu nível pessoal.
                </p>
            </div>
            
            <div class="mt-6 flex items-center text-green-600 font-bold text-sm">
                <Play size={18} class="mr-2 fill-current" /> COMEÇAR AGORA
            </div>
        </button>

        {#if student.alunoTurmas && student.alunoTurmas.length > 0}
            {#each student.alunoTurmas as inscricao}
                <button 
                    on:click={() => goto(`/dashboard/foreman/student/${studentId}/session-config/?turmaId=${inscricao.turma.id}`)}
                    class="group relative overflow-hidden bg-white dark:bg-surface-800 p-6 rounded-3xl border-2 border-surface-200 dark:border-surface-700 
                           hover:border-blue-500 hover:shadow-xl transition-all text-left flex flex-col justify-between h-full"
                >
                    <div>
                        <div class="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                            <BookOpen size={28} />
                        </div>
                        <h3 class="text-xl font-bold text-surface-900 dark:text-white truncate">
                            {inscricao.turma.nome}
                        </h3>
                        <p class="text-surface-500 text-sm mt-2">
                            {inscricao.turma.disciplina.nome}
                        </p>
                        <p class="text-xs text-surface-400 mt-1">
                            Prof. {inscricao.turma.professor?.usuario?.nome || 'Escola'}
                        </p>
                    </div>
                    
                    <div class="mt-6 flex items-center text-blue-600 font-bold text-sm">
                        <Zap size={18} class="mr-2 fill-current" /> ENTRAR NA TURMA
                    </div>
                </button>
            {/each}
        {/if}

        <button 
            on:click={openModal}
            class="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-surface-300 dark:border-surface-700 
                   text-surface-400 hover:text-primary-500 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-surface-800/50 transition-all min-h-[200px]"
        >
            <div class="p-4 bg-surface-100 dark:bg-surface-900 rounded-full mb-3 shadow-inner">
                <Plus size={32} />
            </div>
            <span class="font-bold">Vincular Nova Turma</span>
            <span class="text-xs mt-1">Tens um código?</span>
        </button>

    </div>
  {/if}

  {#if showModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        
        <div class="bg-white dark:bg-surface-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-surface-200 dark:border-surface-700">
            
            <div class="flex justify-between items-center p-4 border-b border-surface-100 dark:border-surface-700">
                <h3 class="font-bold text-lg text-surface-900 dark:text-white">Adicionar Turma</h3>
                <button on:click={closeModal} class="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                    <X size={20} class="text-surface-500"/>
                </button>
            </div>

            <div class="p-6">
                
                {#if joinStep === 1}
                    <div class="text-center space-y-4">
                        <div class="mx-auto w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600">
                            <School size={24}/>
                        </div>
                        <p class="text-surface-600 dark:text-surface-300 text-sm">
                            Insira o código de 6 caracteres fornecido pelo professor para matricular o <strong>{student.nome}</strong>.
                        </p>
                        
                        <input 
                            type="text" 
                            class="input p-3 text-center text-xl font-mono uppercase tracking-widest font-bold w-full border-2 focus:ring-0 focus:border-primary-500" 
                            bind:value={joinCode} 
                            maxlength="6"
                            placeholder="CÓDIGO"
                            disabled={joinLoading}
                        />

                        <button 
                            class="btn variant-filled-primary w-full font-bold py-3"
                            on:click={verifyCode}
                            disabled={joinLoading || joinCode.length < 6}
                        >
                            {#if joinLoading} <Loader size={18} class="animate-spin"/> {:else} Verificar Código {/if}
                        </button>
                    </div>

                {:else}
                    <div class="space-y-4">
                        <div class="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-4 rounded-xl flex items-start gap-3">
                            <CheckCircle class="text-green-500 mt-1" size={20}/>
                            <div>
                                <h4 class="font-bold text-surface-900 dark:text-white">{classDetails.nome}</h4>
                                <p class="text-sm text-surface-500">{classDetails.disciplina}</p>
                                <p class="text-xs text-surface-400 mt-1">{classDetails.escola || 'Escola Virtual'}</p>
                            </div>
                        </div>

                        <p class="text-center text-sm text-surface-500">
                            Pretende matricular <strong>{student.nome}</strong> nesta turma?
                        </p>

                        <div class="flex gap-3 pt-2">
                            <button class="btn variant-ghost-surface flex-1" on:click={() => joinStep = 1}>
                                Voltar
                            </button>
                            <button 
                                class="btn variant-filled-primary flex-1 font-bold"
                                on:click={confirmJoin}
                                disabled={joinLoading}
                            >
                                {#if joinLoading} <Loader size={18} class="animate-spin"/> {:else} Confirmar {/if}
                            </button>
                        </div>
                    </div>
                {/if}

            </div>
        </div>
    </div>
  {/if}

</div>