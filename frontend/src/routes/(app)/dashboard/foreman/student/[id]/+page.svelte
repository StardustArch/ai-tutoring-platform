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
    School, BookOpen, Hash, 
	Play

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
<div class="space-y-6">
        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <Play class="text-green-500" />
            Iniciar Sessão de Estudo
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <button 
                on:click={() => goto(`/dashboard/student/${studentId}/chat`)}
                class="group relative overflow-hidden bg-white dark:bg-surface-800 rounded-xl shadow-sm border-2 border-surface-200 dark:border-surface-700 
                       hover:border-green-500 hover:shadow-lg transition-all text-left p-6"
            >
                <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <GraduationCap size={100} />
                </div>
                
                <div class="relative z-10">
                    <div class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
                        <User size={24} />
                    </div>
                    <h4 class="text-xl font-bold text-surface-900 dark:text-surface-100">Estudar em Casa</h4>
                    <p class="text-surface-500 mt-1 text-sm">
                        Praticar sem vínculo à escola. O progresso fica guardado apenas para ti.
                    </p>
                    <span class="inline-block mt-4 text-green-600 font-bold text-sm group-hover:underline">
                        Começar Agora &rarr;
                    </span>
                </div>
            </button>

            {#if student.alunoTurmas && student.alunoTurmas.length > 0}
                {#each student.alunoTurmas as inscricao}
                    <button 
                        on:click={() => goto(`/dashboard/student/${studentId}?turmaId=${inscricao.turma.id}`)}
                        class="group relative overflow-hidden bg-white dark:bg-surface-800 rounded-xl shadow-sm border-2 border-surface-200 dark:border-surface-700 
                               hover:border-blue-500 hover:shadow-lg transition-all text-left p-6"
                    >
                        <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <School size={100} />
                        </div>
                        
                        <div class="relative z-10">
                            <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                                <BookOpen size={24} />
                            </div>
                            
                            <h4 class="text-xl font-bold text-surface-900 dark:text-surface-100">
                                {inscricao.turma.nome}
                            </h4>
                            <p class="text-surface-500 mt-1 text-sm">
                                {inscricao.turma.disciplina.nome} • Prof. {inscricao.turma.professor?.usuario?.nome || 'Escola'}
                            </p>
                            
                            <div class="mt-4 flex items-center justify-between">
                                <span class="text-xs font-mono bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded text-surface-500">
                                    Cód: {inscricao.turma.codigo}
                                </span>
                                <span class="text-blue-600 font-bold text-sm group-hover:underline">
                                    Entrar na Sala &rarr;
                                </span>
                            </div>
                        </div>
                    </button>
                {/each}
            {:else}
                <div class="p-6 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-700 flex flex-col items-center justify-center text-center opacity-70">
                    <School size={48} class="text-surface-300 mb-2" />
                    <p class="text-surface-500 font-medium">Sem turmas escolares</p>
                    <p class="text-xs text-surface-400 mt-1">Pede o código ao professor para adicionar.</p>
                </div>
            {/if}

        </div>
    </div>

  {/if}
</div>