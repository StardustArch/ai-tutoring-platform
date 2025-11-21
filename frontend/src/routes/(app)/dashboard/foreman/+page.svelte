<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications'; 
  import Notification from '$lib/components/Notification.svelte';
  
  import { 
    UserPlus, Users, GraduationCap, Calendar, 
    ChevronRight, FileText, Settings, Baby, School
  } from 'lucide-svelte';

  // --- ESTADO ---
  let students: any[] = [];
  let isLoading = true;
  let error: string | null = null;

  onMount(async () => {
    // Verificar se viemos de um registo bem-sucedido
    const isNew = $page.url.searchParams.get('new_student');
    if (isNew) {
        notifications.send('Educando adicionado ao seu portal!', 'success');
        // Limpar URL para não mostrar novamente ao recarregar
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    await loadStudents();
  });

  async function loadStudents() {
    isLoading = true;
    error = null;
    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students`);
      if (res.ok) {
        students = await res.json();
      } else {
        throw new Error('Falha ao carregar lista de educandos');
      }
    } catch (err) {
      console.error(err);
      error = 'Não foi possível carregar os seus educandos.';
      notifications.send(error, 'error');
    } finally {
      isLoading = false;
    }
  }

  // --- AUXILIARES ---
  function calcularIdade(dataNascimento: string) {
    if (!dataNascimento) return '--';
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idade--;
    }
    return idade;
  }

  function verRelatorio(alunoId: number) {
    goto(`/dashboard/educandos/${alunoId}/relatorio`); // Futura rota
  }
</script>

<Notification />

<div class="max-w-5xl mx-auto p-4 pb-20 space-y-8 animate-fade-in">

  <!-- CABEÇALHO -->
<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div class="space-y-1">
    <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3">
      <Users class="text-primary-500" size={32} />
      Portal do Encarregado
    </h1>
    <p class="text-surface-600 dark:text-surface-400 text-lg">
      Acompanhe o progresso escolar da sua família.
    </p>
  </div>

  <div class="flex gap-3">
      <!-- Botão de Entrar na Turma (NOVO) -->
      <button 
        class="btn variant-outline-primary font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20"
        on:click={() => goto('/dashboard/foreman/class/join')}
      >
        <School size={20} class="mr-2" />
        Entrar na Turma
      </button>

      <!-- Botão Novo Educando (Existente) -->
      <button 
        class="btn variant-filled-primary font-bold shadow-lg hover:scale-105 transition-transform"
        on:click={() => goto('/dashboard/foreman/student/create')}
      >
        <UserPlus size={20} class="mr-2" />
        Novo Educando
      </button>
  </div>
</div>
  <!-- ESTATÍSTICAS RÁPIDAS -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-4 bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex items-center gap-4">
          <div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-full text-primary-600 dark:text-primary-400">
              <GraduationCap size={24} />
          </div>
          <div>
              <p class="text-2xl font-bold text-surface-900 dark:text-surface-50">{students.length}</p>
              <p class="text-xs font-bold uppercase text-surface-500">Educandos</p>
          </div>
      </div>
      <!-- Placeholders para métricas futuras -->
      <div class="p-4 bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex items-center gap-4 opacity-60">
          <div class="p-3 bg-secondary-50 dark:bg-secondary-900/20 rounded-full text-secondary-600 dark:text-secondary-400">
              <FileText size={24} />
          </div>
          <div>
              <p class="text-2xl font-bold text-surface-900 dark:text-surface-50">--</p>
              <p class="text-xs font-bold uppercase text-surface-500">Relatórios</p>
          </div>
      </div>
      <div class="p-4 bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 flex items-center gap-4 opacity-60">
          <div class="p-3 bg-surface-100 dark:bg-surface-700 rounded-full text-surface-600 dark:text-surface-300">
              <School size={24} />
          </div>
          <div>
              <p class="text-2xl font-bold text-surface-900 dark:text-surface-50">--</p>
              <p class="text-xs font-bold uppercase text-surface-500">Turmas</p>
          </div>
      </div>
  </div>

  <!-- LISTA DE EDUCANDOS -->
  <div class="space-y-4">
    <h2 class="text-xl font-bold text-surface-900 dark:text-surface-50">Os Meus Educandos</h2>

    {#if isLoading}
        <!-- Skeleton Loading -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each Array(2) as _}
                <div class="h-40 bg-surface-200 dark:bg-surface-800 rounded-xl animate-pulse"></div>
            {/each}
        </div>

    {:else if error}
        <!-- Erro -->
        <div class="p-8 bg-red-50 dark:bg-red-900/10 rounded-xl text-center border border-red-200 dark:border-red-900/30">
            <p class="text-red-600 dark:text-red-400 font-medium">{error}</p>
            <button class="btn btn-sm variant-outline-error mt-4" on:click={loadStudents}>Tentar Novamente</button>
        </div>

    {:else if students.length === 0}
        <!-- Estado Vazio -->
        <div class="p-12 bg-surface-100 dark:bg-surface-800/50 border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl text-center space-y-4">
            <div class="mx-auto w-16 h-16 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-500">
                <Baby size={32} />
            </div>
            <div>
                <h3 class="text-xl font-bold text-surface-900 dark:text-surface-50">Nenhum educando registado</h3>
                <p class="text-surface-600 dark:text-surface-400">Adicione os seus filhos para começarem a aprender com a IA.</p>
            </div>
            <button 
                class="btn variant-filled-primary font-bold"
                on:click={() => goto('/dashboard/foreman/student/create')}
            >
                Registar Agora
            </button>
        </div>

    {:else}
        <!-- Grid de Cartões -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each students as student}
                <div class="group bg-white dark:bg-surface-800 rounded-xl shadow-sm hover:shadow-md border border-surface-200 dark:border-surface-700 transition-all duration-200 overflow-hidden flex flex-col">
                    
                    <!-- Topo Colorido -->
                    <div class="h-2 bg-gradient-to-r from-blue-400 to-indigo-500"></div>

                    <div class="p-6 flex-1 flex items-start gap-4">
                        <!-- Avatar (Iniciais) -->
                        <div class="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-2xl font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">
                            {student.nome.charAt(0)}{student.sobrenome.charAt(0)}
                        </div>

                        <div class="flex-1 min-w-0">
                            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-50 truncate">
                                {student.nome} {student.sobrenome}
                            </h3>
                            
                            <div class="flex flex-wrap gap-3 mt-2 text-sm text-surface-600 dark:text-surface-400">
                                <div class="flex items-center gap-1 bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded">
                                    <GraduationCap size={14} />
                                    <span>{student.classe}ª Classe</span>
                                </div>
                                <div class="flex items-center gap-1 bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded">
                                    <Calendar size={14} />
                                    <span>{calcularIdade(student.dataNascimento)} anos</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Rodapé de Ações -->
                    <div class="bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-700 p-4 flex gap-3">
                        <button 
                            class="flex-1 btn btn-sm variant-filled-surface border border-surface-300 dark:border-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700 font-medium"
                            on:click={() => goto(`/dashboard/foreman/student/${student.id}/edit`)}
                        >
                            <Settings size={16} class="mr-2"/> Gerir
                        </button>
                        <button 
                            class="flex-[2] btn btn-sm variant-filled-primary font-bold"
                            disabled
                            title="Em breve"
                        >
                            <FileText size={16} class="mr-2"/> Ver Relatório
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
  </div>

</div>