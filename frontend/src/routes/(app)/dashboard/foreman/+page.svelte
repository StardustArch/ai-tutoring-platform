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
    Settings, School, MessageCircle, Play
  } from 'lucide-svelte';

  // --- ESTADO ---
  let students: any[] = [];
  let isLoading = true;
  let error: string | null = null;

  onMount(async () => {
    const isNew = $page.url.searchParams.get('new_student');
    if (isNew) {
        notifications.send('Educando adicionado ao seu portal!', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    await loadStudents();
  });

  async function loadStudents() {
    isLoading = true;
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

  // Navegar para o Chat
function verPerfil(studentId: number) {
    goto(`/dashboard/foreman/student/${studentId}`);
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
        Gerir educandos e iniciar sessões de aprendizagem.
      </p>
    </div>

    <div class="flex gap-3">
      <button 
        class="btn variant-outline-primary font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20"
        on:click={() => goto('/dashboard/foreman/class/join')}
      >
        <School size={20} class="mr-2" />
        Entrar na Turma
      </button>

      <button 
        class="btn variant-filled-primary font-bold shadow-lg hover:scale-105 transition-transform"
        on:click={() => goto('/dashboard/foreman/student/create')}
      >
        <UserPlus size={20} class="mr-2" />
        Novo Educando
      </button>
    </div>
  </div>

  <!-- LISTA DE EDUCANDOS -->
  <div class="space-y-4">
    <h2 class="text-xl font-bold text-surface-900 dark:text-surface-50">Os Meus Educandos</h2>

    {#if isLoading}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each Array(2) as _}
                <div class="h-40 bg-surface-200 dark:bg-surface-800 rounded-xl animate-pulse"></div>
            {/each}
        </div>
    {:else if students.length === 0}
        <div class="p-12 bg-surface-100 dark:bg-surface-800/50 border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl text-center space-y-4">
            <p class="text-surface-600 dark:text-surface-400">Nenhum educando registado.</p>
            <button class="btn variant-filled-primary font-bold" on:click={() => goto('/dashboard/foreman/student/create')}>Registar Agora</button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each students as student}
                <div class="group bg-white dark:bg-surface-800 rounded-xl shadow-sm hover:shadow-xl border border-surface-200 dark:border-surface-700 transition-all duration-300 overflow-hidden flex flex-col h-full">
                    
                    <!-- Topo Colorido -->
                    <div class="h-3 bg-gradient-to-r from-secondary-400 to-primary-500"></div>

                    <div class="p-6 flex-1 flex flex-col items-center text-center gap-4">
                        <!-- Avatar -->
                        <div class="w-20 h-20 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-3xl font-bold text-primary-600 dark:text-primary-400 shadow-inner">
                            {student.nome.charAt(0)}{student.sobrenome.charAt(0)}
                        </div>

                        <div>
                            <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-50">
                                {student.nome}
                            </h3>
                            <p class="text-surface-500 text-sm">{student.classe}ª Classe • {calcularIdade(student.dataNascimento)} anos</p>
                        </div>
                        
                        <!-- Botão Principal: ENTRAR NA SALA -->
<button 
                            class="btn variant-filled-secondary w-full font-bold text-lg py-3 shadow-md hover:scale-105 transition-transform mt-2"
                            on:click={() => verPerfil(student.id)}
                        >
                            <Play size={20} class="mr-2" /> Estudar Agora
                        </button>
                    </div>

                    <!-- Rodapé de Ações -->
                    <div class="bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-700 p-3 flex justify-between text-sm">
                        <button 
                            class="text-surface-500 hover:text-primary-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                            on:click={() => goto(`/dashboard/foreman/student/${student.id}/edit`)}
                        >
                            <Settings size={14}/> Configurar
                        </button>
                        <button 
                            class="text-surface-500 hover:text-primary-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                            on:click={() => goto(`/dashboard/foreman/student/${student.id}`)}
                        >
                            <School size={14}/> Turmas
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
  </div>
</div>