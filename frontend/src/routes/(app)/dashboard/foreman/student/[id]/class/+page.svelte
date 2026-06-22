<svelte:head>
    <title>Painel de Estudo | KMind</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notify } from '$lib/store/toaster';
  
  import { 
    ArrowLeft, User, School, BookOpen, 
    Play, Plus, Zap, X, Loader, CheckCircle2, Hash,
    Info, GraduationCap
  } from 'lucide-svelte';

  // --- ESTADO ---
  let student: any = null;
  let isLoading = true;
  let studentId = $page.params.id || '';

  // --- ESTADO DO MODAL ---
  let showModal = false;
  let joinStep = 1; 
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
      console.log(student)
    } catch (err) { 
      notify('Erro','Erro ao carregar dados do aluno.', 'error');
    } finally { 
      isLoading = false; 
    }
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
      notify('Atenção','O código deve ter 6 caracteres.', 'warning');
      return;
    }

    joinLoading = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/check-code`, {
        method: 'POST',
        body: JSON.stringify({ codigo: joinCode.toUpperCase() })
      });

      if (res.ok) {
        const data = await res.json();
        classDetails = data.turma;
        joinStep = 2;
      } else {
        throw new Error('Código inválido ou turma não encontrada.');
      }
    } catch (err: any) {
      notify('Erro',err.message, 'error');
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
          alunoId: parseInt(studentId)
        })
      });

      if (res.ok) {
        notify('Salvo','Vínculo escolar realizado com sucesso!', 'success');
        closeModal();
        await loadStudent();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao entrar na turma.');
      }
    } catch (err: any) {
      notify('Erro',err.message, 'error');
    } finally {
      joinLoading = false;
    }
  }

  const ref = $page.url.searchParams.get('ref');
  function goBack() {
    if (ref === 'home') goto('/dashboard/foreman/overview');
    else goto('/dashboard/foreman/student'); 
  }

  // Estilos Comuns
  const cardBase = "bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm transition-all text-left flex flex-col h-full";
  const btnPrimary = "btn bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md py-2 px-4 flex items-center justify-center gap-2 text-sm shadow-sm transition-all disabled:opacity-70";
  const btnSecondary = "btn bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 rounded-md py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all";
</script>

<div class="container mx-auto max-w-7xl p-4 md:p-8 space-y-8 animate-fade-in pb-24">

  <header class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
    <div class="flex items-center gap-3">
        <button on:click={goBack} class="p-2 -ml-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 transition-colors">
            <ArrowLeft size={20} />
        </button>
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Painel de Estudo</h1>
            {#if student}
                <p class="text-sm text-surface-500 mt-1">
                    Configurando sessão para <span class="font-bold text-surface-900 dark:text-surface-100">{student.nome}</span>.
                </p>
            {/if}
        </div>
    </div>
  </header>

  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {#each Array(3) as _}
            <div class="h-48 bg-surface-200 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"></div>
        {/each}
    </div>
  
  {:else if student}
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {#if student.alunoTurmas && student.alunoTurmas.length > 0}
                {#each student.alunoTurmas as inscricao}
                    <button 
                        on:click={() => goto(`/dashboard/foreman/student/${studentId}/session-config/?turmaId=${inscricao.turma.id}`)}
                        class="{cardBase} p-6 border-l-4 border-l-primary-500 hover:border-primary-500 hover:shadow-md group"
                    >
                        <div class="flex-1">
                            <div class="flex justify-between items-start mb-4">
                                <div class="p-2 bg-surface-100 dark:bg-surface-700 rounded-md text-primary-600 border border-surface-200 dark:border-surface-600">
                                    <BookOpen size={18} />
                                </div>
                                <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">Turma Escolar</span>
                            </div>
                            <h3 class="text-lg font-bold text-surface-900 dark:text-white truncate">
                                {inscricao.turma.nome}
                            </h3>
                            <p class="text-xs text-surface-500 mt-1">
                                Disciplina: <span class="font-medium text-surface-700 dark:text-surface-300">{inscricao.turma.disciplina.nome}</span>
                            </p>
                            <p class="text-[10px] font-semibold text-surface-400 mt-3 flex items-center gap-1 uppercase">
                                <GraduationCap size={12} /> Prof. {inscricao.turma.professor?.usuario?.nome || 'Escola'}
                            </p>
                        </div>
                        
                        <div class="mt-6 flex items-center text-primary-600 dark:text-primary-400 font-bold text-xs uppercase tracking-widest">
                            <Zap size={14} class="mr-2 fill-current" /> Entrar na Sala
                        </div>
                    </button>
                {/each}
            {/if}
        <button 
            on:click={() => goto(`/dashboard/foreman/student/${studentId}/session-config/`)}
            class="{cardBase} p-6 border-l-4 border-l-emerald-500 hover:border-emerald-500 hover:shadow-md group"
        >
            <div class="flex-1">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-2 bg-surface-100 dark:bg-surface-700 rounded-md text-emerald-600 border border-surface-200 dark:border-surface-600">
                        <User size={18} />
                    </div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-surface-400">Modo Livre</span>
                </div>
                <h3 class="text-lg font-bold text-surface-900 dark:text-white">Estudo Autónomo</h3>
                <p class="text-xs text-surface-500 mt-2 leading-relaxed">
                    Ideal para reforço geral. O aluno escolhe o que quer estudar sem depender de tarefas escolares.
                </p>
            </div>
            
            <div class="mt-6 flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest">
                <Play size={14} class="mr-2 fill-current" /> Iniciar Sessão
            </div>
        </button>


        <button 
            on:click={openModal}
            class="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-700 
                   text-surface-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all min-h-[200px] group"
        >
            <div class="p-3 bg-surface-100 dark:bg-surface-700 rounded-full mb-3 group-hover:scale-110 transition-transform border border-surface-200 dark:border-surface-600">
                <Plus size={20} />
            </div>
            <span class="font-bold text-sm">Vincular Turma</span>
            <span class="text-[10px] uppercase tracking-wide font-bold mt-1 text-surface-400">Usar código escolar</span>
        </button>

    </div>
  {/if}

  {#if showModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
        
        <div class="bg-white dark:bg-surface-800 w-full max-w-md rounded-lg shadow-xl overflow-hidden border border-surface-200 dark:border-surface-700">
            
            <div class="flex justify-between items-center p-4 border-b border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <h3 class="font-bold text-sm uppercase tracking-wider text-surface-600 dark:text-surface-300">Vincular Turma Escolar</h3>
                <button on:click={closeModal} class="text-surface-400 hover:text-red-500 transition-colors">
                    <X size={20}/>
                </button>
            </div>

            <div class="p-8">
                
                {#if joinStep === 1}
                    <div class="space-y-6">
                        <div class="text-center">
                            <div class="mx-auto w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-lg flex items-center justify-center text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-600 mb-4">
                                <Hash size={20}/>
                            </div>
                            <p class="text-sm text-surface-500 leading-relaxed">
                                Insira o código de 6 caracteres fornecido pelo professor para vincular o educando à turma.
                            </p>
                        </div>
                        
                        <div class="space-y-1.5">
                            <!-- svelte-ignore a11y_label_has_associated_control -->
                            <label class="text-[10px] font-bold uppercase tracking-widest text-surface-400 ml-1">Código da Turma</label>
                            <input 
                                type="text" 
                                class="w-full px-4 py-3 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-surface-700 text-center text-2xl font-mono uppercase tracking-[0.3em] font-black text-surface-900 dark:text-white transition-all shadow-sm"
                                bind:value={joinCode} 
                                maxlength="6"
                                placeholder="------"
                                disabled={joinLoading}
                            />
                        </div>

                        <button 
                            class="{btnPrimary} w-full py-3"
                            on:click={verifyCode}
                            disabled={joinLoading || joinCode.length < 6}
                        >
                            {#if joinLoading} <Loader size={18} class="animate-spin"/> {:else} Verificar Turma {/if}
                        </button>
                    </div>

                {:else}
                    <div class="space-y-6">
                        <div class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-5 rounded-lg flex items-start gap-4">
                            <div class="shrink-0 mt-1 text-emerald-600">
                                <CheckCircle2 size={24}/>
                            </div>
                            <div>
                                <h4 class="font-bold text-surface-900 dark:text-white text-lg leading-tight">{classDetails.nome}</h4>
                                <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">{classDetails.disciplina}</p>
                                <div class="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-800/50 flex items-center gap-2">
                                    <School size={14} class="text-emerald-500"/>
                                    <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                        {classDetails.escola || 'Instituição Vinculada'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="p-3 bg-surface-50 dark:bg-surface-900/40 rounded border border-surface-200 dark:border-surface-700 flex items-start gap-2">
                            <Info size={14} class="text-surface-400 mt-0.5" />
                            <p class="text-[11px] text-surface-500 leading-tight">
                                Ao confirmar, o histórico de estudo do <strong>{student.nome}</strong> nesta turma será visível para o professor responsável.
                            </p>
                        </div>

                        <div class="flex flex-col sm:flex-row gap-3 pt-2">
                            <button 
                                class="{btnSecondary} flex-1" 
                                on:click={() => joinStep = 1}
                                disabled={joinLoading}
                            >
                                Voltar
                            </button>
                            <button 
                                class="{btnPrimary} flex-1"
                                on:click={confirmJoin}
                                disabled={joinLoading}
                            >
                                {#if joinLoading} <Loader size={18} class="animate-spin"/> {:else} Confirmar Vínculo {/if}
                            </button>
                        </div>
                    </div>
                {/if}

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
    
    /* Chrome, Safari, Edge, Opera */
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>