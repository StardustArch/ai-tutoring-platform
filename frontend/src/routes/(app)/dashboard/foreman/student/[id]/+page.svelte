<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  import Notification from '$lib/components/Notification.svelte';
  
  import { 
    ArrowLeft, User, Calendar, GraduationCap, Settings, 
    School, BookOpen, Hash 
  } from 'lucide-svelte';

  // --- ESTADO ---
  let student: any = null;
  let isLoading = true;
  let studentId = $page.params.id;

  onMount(async () => {
    await loadStudent();
  });

  async function loadStudent() {
    isLoading = true;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students/${studentId}`);
      
      if (res.ok) {
        student = await res.json();
      } else {
        throw new Error('Não foi possível carregar os dados do educando.');
      }
    } catch (err: any) {
      console.error(err);
      notifications.send(err.message, 'error');
      // Se falhar, volta para a lista após um breve momento
      setTimeout(() => goto('/dashboard/home'), 2000);
    } finally {
      isLoading = false;
    }
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return '--';
    return new Date(dataISO).toLocaleDateString('pt-PT', { 
      day: '2-digit', month: 'long', year: 'numeric' 
    });
  }

  function calcularIdade(dataISO: string) {
    if (!dataISO) return 0;
    const hoje = new Date();
    const nasc = new Date(dataISO);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idade--;
    }
    return idade;
  }
</script>

<Notification />

<div class="max-w-4xl mx-auto p-4 pb-20 space-y-8 animate-fade-in">

  <!-- CABEÇALHO -->
  <div class="flex items-center gap-4">
    <button 
      on:click={() => goto('/dashboard/home')} 
      class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Perfil do Educando</h1>
  </div>

  {#if isLoading}
    <!-- SKELETON -->
    <div class="bg-white dark:bg-surface-800 p-8 rounded-xl h-64 animate-pulse"></div>
  
  {:else if student}
    
    <!-- CARTÃO PRINCIPAL -->
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        
        <!-- Header Colorido -->
        <div class="h-32 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
            <!-- Botão Editar (Flutuante) -->
            <button 
                class="absolute top-4 right-4 btn btn-sm variant-filled-surface shadow-lg font-bold"
                on:click={() => goto(`/dashboard/foreman/student/${studentId}/edit`)}
            >
                <Settings size={16} class="mr-2" /> Editar
            </button>
        </div>

        <div class="px-8 pb-8">
            <!-- Avatar Sobreposto -->
            <div class="-mt-12 mb-6">
                <div class="w-24 h-24 rounded-2xl bg-white dark:bg-surface-800 p-1 shadow-md inline-block">
                    <div class="w-full h-full bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-3xl font-bold text-primary-600 dark:text-primary-400">
                        {student.nome.charAt(0)}{student.sobrenome.charAt(0)}
                    </div>
                </div>
            </div>

            <!-- Informações Pessoais -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
                        {student.nome} {student.sobrenome}
                    </h2>
                    <div class="flex flex-wrap gap-4 mt-2 text-surface-600 dark:text-surface-400">
                        <div class="flex items-center gap-2 bg-surface-100 dark:bg-surface-700 px-3 py-1 rounded-full text-sm">
                            <GraduationCap size={16} />
                            <span>{student.classe}ª Classe</span>
                        </div>
                        <div class="flex items-center gap-2 bg-surface-100 dark:bg-surface-700 px-3 py-1 rounded-full text-sm">
                            <Calendar size={16} />
                            <span>{formatarData(student.dataNascimento)} ({calcularIdade(student.dataNascimento)} anos)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- SECÇÃO DE TURMAS -->
    <div class="space-y-4">
        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <School class="text-primary-500" />
            Turmas Inscritas
        </h3>

        {#if student.alunoTurmas && student.alunoTurmas.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each student.alunoTurmas as inscricao}
                    <div class="p-4 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 flex items-start justify-between">
                        <div class="flex items-start gap-3">
                            <div class="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h4 class="font-bold text-surface-900 dark:text-surface-100">{inscricao.turma.nome}</h4>
                                <p class="text-sm text-surface-500">{inscricao.turma.disciplina.nome}</p>
                                <p class="text-xs text-surface-400 mt-1">Escola: {inscricao.turma.escolaNome || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="text-xs font-mono bg-surface-100 dark:bg-surface-900 px-2 py-1 rounded text-surface-500">
                            {inscricao.turma.codigo}
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="p-8 rounded-xl bg-surface-100 dark:bg-surface-800/50 border-2 border-dashed border-surface-300 dark:border-surface-700 text-center">
                <p class="text-surface-600 dark:text-surface-400">
                    Este aluno ainda não está inscrito em nenhuma turma.
                </p>
                <button class="btn btn-sm variant-ghost-primary mt-3">
                    <Hash size={14} class="mr-1"/> Entrar numa Turma (Em breve)
                </button>
            </div>
        {/if}
    </div>

  {/if}
</div>