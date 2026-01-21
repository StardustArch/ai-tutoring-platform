<script lang="ts">
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  import Notification from '$lib/components/Notification.svelte';
  
  import { 
    ArrowLeft, Search, School, User, CheckCircle, 
    AlertCircle, Loader, BookOpen, Users, 
	UserPlus

  } from 'lucide-svelte';

  // --- ESTADO ---
  let step = 1; // 1: Inserir Código, 2: Selecionar Aluno
  let isLoading = false;
  
  let codigo = '';
  let classDetails: any = null;
  let myStudents: any[] = [];
  let selectedStudentId: number | null = null;

  // --- PASSO 1: VERIFICAR CÓDIGO ---
  async function verifyCode() {
    if (!codigo || codigo.length < 6) {
      notifications.send('O código deve ter 6 caracteres.', 'warning');
      return;
    }

    isLoading = true;
    try {
      // Endpoint: POST /api/classes/check-code
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/check-code`, {
        method: 'POST',
        body: JSON.stringify({ codigo })
      });

      if (res.ok) {
        const data = await res.json();
        classDetails = data.turma;
        console.log(classDetails)
        myStudents = data.meusAlunos; // Lista com flag 'jaInscrito'
        step = 2;
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Turma não encontrada.');
      }
    } catch (err: any) {
      notifications.send(err.message, 'error');
    } finally {
      isLoading = false;
    }
  }

  // --- PASSO 2: CONFIRMAR MATRÍCULA ---
  async function joinClass() {
    if (!selectedStudentId) {
      notifications.send('Selecione um educando para matricular.', 'warning');
      return;
    }

    isLoading = true;
    try {
        console.log(classDetails.codigo)
      // Endpoint: POST /api/classes/join
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/join`, {
        method: 'POST',
        body: JSON.stringify({ 
          codigo: classDetails.codigo,
          alunoId: selectedStudentId
        })
      });

      if (res.ok) {
        notifications.send('Matrícula realizada com sucesso!', 'success');
        goto('/dashboard/home');
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao entrar na turma.');
      }
    } catch (err: any) {
      notifications.send(err.message, 'error');
    } finally {
      isLoading = false;
    }
  }

  function reset() {
    step = 1;
    classDetails = null;
    myStudents = [];
    selectedStudentId = null;
    codigo = '';
  }
</script>

<Notification />

<div class="max-w-2xl mx-auto p-4 space-y-8 animate-fade-in pb-20">

  <!-- CABEÇALHO -->
  <div class="flex items-center gap-4">
    <button 
      on:click={() => goto('/dashboard/home')} 
      class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Entrar numa Turma</h1>
  </div>

  {#if step === 1}
    <!-- STEP 1: INSERIR CÓDIGO -->
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-8 text-center space-y-6">
        
        <div class="mx-auto w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center text-primary-500">
            <School size={32} />
        </div>

        <div class="space-y-2">
            <h2 class="text-xl font-bold text-surface-900 dark:text-surface-50">Tem um código de turma?</h2>
            <p class="text-surface-600 dark:text-surface-400">
                Insira o código de 6 caracteres fornecido pelo professor para matricular o seu educando.
            </p>
        </div>

        <div class="max-w-xs mx-auto space-y-4">
            <input 
                type="text" 
                class="input p-4 text-center text-2xl font-mono tracking-[0.5em] uppercase font-bold border-surface-300 dark:border-surface-600 focus:ring-primary-500" 
                bind:value={codigo} 
                maxlength="6"
                placeholder="ABC123"
                disabled={isLoading}
            />
            
            <button 
                class="btn variant-filled-primary w-full font-bold py-3 shadow-lg"
                on:click={verifyCode}
                disabled={isLoading || codigo.length < 6}
            >
                {#if isLoading}
                    <Loader size={20} class="animate-spin mr-2" /> A Verificar...
                {:else}
                    Verificar Código
                {/if}
            </button>
        </div>
    </div>

  {:else}
    <!-- STEP 2: SELECIONAR ALUNO -->
    <div class="space-y-6 animate-fade-in">
        
        <!-- Card da Turma Encontrada -->
        <div class="bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 p-6 rounded-xl flex items-start gap-4">
            <div class="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <CheckCircle size={24} />
            </div>
            <div>
                <h3 class="text-lg font-bold text-surface-900 dark:text-surface-50">Turma Encontrada!</h3>
                <div class="mt-2 space-y-1 text-sm text-surface-600 dark:text-surface-300">
                    <p><span class="font-bold">Turma:</span> {classDetails.nome}</p>
                    <p><span class="font-bold">Disciplina:</span> {classDetails.disciplina}</p>
                    <p><span class="font-bold">Professor:</span> {classDetails.professor}</p>
                    <p><span class="font-bold">Escola:</span> {classDetails.escola || 'Não especificada'}</p>
                </div>
            </div>
        </div>

        <!-- Seleção de Aluno -->
        <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6 space-y-4">
            <h3 class="font-bold text-lg flex items-center gap-2">
                <Users size={20} class="text-primary-500"/> Quem vai frequentar esta turma?
            </h3>

            <div class="space-y-3">
                {#each myStudents as student}
                    <label class="flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all duration-200
                        {student.jaInscrito 
                            ? 'bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700 opacity-60 cursor-not-allowed' 
                            : selectedStudentId === student.id 
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 ring-1 ring-primary-500' 
                                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'}"
                    >
                        <div class="flex items-center gap-3">
                            <input 
                                type="radio" 
                                name="student" 
                                class="radio text-primary-500" 
                                value={student.id} 
                                bind:group={selectedStudentId}
                                disabled={student.jaInscrito}
                            />
                            <span class="font-medium text-surface-900 dark:text-surface-100">
                                {student.nome}
                            </span>
                        </div>
                        
                        {#if student.jaInscrito}
                            <span class="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                                Já Inscrito
                            </span>
                        {/if}
                    </label>
                {/each}
            </div>

            <div class="pt-4 flex gap-3">
                <button class="btn variant-ghost-surface flex-1" on:click={reset} disabled={isLoading}>
                    Cancelar
                </button>
                <button 
                    class="btn variant-filled-primary flex-[2] font-bold" 
                    on:click={joinClass}
                    disabled={isLoading || !selectedStudentId}
                >
                    {#if isLoading}
                        <Loader size={18} class="animate-spin mr-2"/> A Matricular...
                    {:else}
                        Confirmar Matrícula
                    {/if}
                </button>
            </div>
        </div>
    </div>
  {/if}

</div>