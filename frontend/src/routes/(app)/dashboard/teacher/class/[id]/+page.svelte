<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  
  import { 
    ArrowLeft, Users, Settings, Copy, BookOpen, 
    Calendar, UserX, Search, School, CheckCircle,
    RefreshCw, Loader, AlertTriangle, Hash,

	Settings2

  } from 'lucide-svelte';
	import ManageTopicsModal from '$lib/components/ManageTopicsModal.svelte';

  // --- ESTADO ---
  let turma: any = null;
  let alunos: any[] = [];
  let isLoading = true;
  let isRenewing = false; 
  let classId = $page.params.id;
  let searchTerm = '';

  onMount(async () => {
    await carregarDados();
  });

  async function carregarDados() {
    isLoading = true;
    try {
      const resTurma = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}`);
      if (!resTurma.ok) throw new Error('Erro ao carregar turma');
      turma = await resTurma.json();

      const resAlunos = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}/alunos`);
      if (resAlunos.ok) {
        const data = await resAlunos.json();
        alunos = Array.isArray(data) ? data : (data.alunos || []);
      }

    } catch (err: any) {
      console.error(err);
      notifications.send('Não foi possível carregar os dados da turma.', 'error');
    } finally {
      isLoading = false;
    }
  }

  // --- ACÇÕES ---
  
  function copiarCodigo() {
    if (turma?.codigo) {
      navigator.clipboard.writeText(turma.codigo);
      notifications.send('Código copiado!', 'info');
    }
  }

  async function renovarCodigo() {
    if (!confirm('Tem a certeza? O código antigo deixará de funcionar imediatamente.')) return;

    isRenewing = true;
    try {
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}/codigo/renovar`, {
            method: 'PUT'
        });

        if (res.ok) {
            const data = await res.json();
            turma.codigo = data.codigo; 
            notifications.send('Novo código gerado com sucesso!', 'success');
        } else {
            throw new Error('Falha ao renovar código');
        }
    } catch (error) {
        notifications.send('Erro ao renovar o código.', 'error');
    } finally {
        isRenewing = false;
    }
  }

  async function removerAluno(alunoId: number, nome: string) {
    if (!confirm(`Tem a certeza que deseja remover ${nome} desta turma?`)) return;

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}/alunos/${alunoId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        notifications.send('Aluno removido com sucesso.', 'success');
        alunos = alunos.filter(a => a.id !== alunoId);
        if (turma._count) turma._count.alunos--;
      } else {
        throw new Error('Falha ao remover aluno');
      }
    } catch (error) {
      notifications.send('Erro ao remover aluno.', 'error');
    }
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return '--';
    return new Date(dataISO).toLocaleDateString('pt-PT', { 
      day: '2-digit', month: 'long', year: 'numeric' 
    });
  }

  // Helper para iniciais
  function getInitials(name: string) {
      return name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
  }

  // Filtro de Alunos
  $: alunosFiltrados = alunos.filter(a => 
      searchTerm === '' || 
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.sobrenome.toLowerCase().includes(searchTerm.toLowerCase())
  );
  function verRelatorio(alunoId: number) {
    goto(`/dashboard/teacher/reports/${alunoId}`); 
  }

            const ref = $page.url.searchParams.get('ref');

      function goBack() {
        if (ref === 'home') {
            goto('/dashboard/teacher/overview'); // Volta para a Visão Geral
        }else if(ref === 'homef'){
            goto('/dashboard/unified/overview'); // Volta para a Visão Geral

        } else {
            // Default (ou se vier da lista)
            goto('/dashboard/teacher/class'); 
        }
    }

        function getAvatarColor(name: string) {
        const gradients = [
            'bg-gradient-to-br from-blue-500 to-cyan-500',
            'bg-gradient-to-br from-emerald-500 to-teal-500',
            'bg-gradient-to-br from-purple-500 to-pink-500',
            'bg-gradient-to-br from-amber-500 to-orange-500',
            'bg-gradient-to-br from-rose-500 to-red-500'
        ];
        return gradients[name.charCodeAt(0) % gradients.length];
    }

    export let data; // Dados da página

  let showTopicsModal = false;
</script>


<div class="max-w-8xl mx-auto p-6 pb-20 space-y-8 animate-fade-in">

  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
                <button on:click={() => goBack()} class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
            <ArrowLeft size={24} class="text-surface-600 dark:text-surface-300"/>
        </button>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Detalhes da Turma</h1>
    </div>

    <button 
        class="hidden md:flex btn variant-filled-surface gap-2 rounded-xl font-bold"
        on:click={() => goto(`/dashboard/teacher/class/${classId}/edit`)}
    >
        <Settings size={18} /> Editar
    </button>

    <button 
  on:click={() => showTopicsModal = true}
  class="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 text-surface-700 font-bold rounded-xl hover:bg-surface-50 transition-colors shadow-sm"
>
  <Settings2 size={18} />
  <span>Gerir Conteúdos</span>
</button>

<ManageTopicsModal 
  turmaId={data.turma?.id} 
  isOpen={showTopicsModal} 
  on:close={() => showTopicsModal = false}
  on:saved={() => {
     // Opcional: Recarregar a página ou mostrar notificação
     // invalidateAll(); 
  }}/>
  </div>

  {#if isLoading}
    <div class="space-y-6">
        <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-3xl w-full animate-pulse"></div>
        <div class="h-20 bg-surface-200 dark:bg-surface-800 rounded-2xl w-full animate-pulse"></div>
        <div class="space-y-2">
             {#each Array(3) as _}
                <div class="h-16 bg-surface-200 dark:bg-surface-800 rounded-2xl w-full animate-pulse"></div>
             {/each}
        </div>
    </div>
  {:else if turma}
  
    <div class="bg-white dark:bg-surface-800 rounded-3xl p-6 md:p-8 shadow-sm border-2 border-surface-100 dark:border-surface-700 relative overflow-hidden">
        
        <div class="flex flex-col md:flex-row justify-between gap-8 relative z-10">
            
            <div class="flex items-start gap-6">
                <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
                    <School size={40} />
                </div>
                
                <div class="space-y-3">
                    <div>
                        <h2 class="text-3xl font-bold text-surface-900 dark:text-white leading-tight">{turma.nome}</h2>
                        <div class="flex items-center gap-2 text-surface-500 font-medium">
                            <BookOpen size={16} class="text-primary-500"/> 
                            {turma.disciplina?.nome || 'Disciplina Geral'}
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-3">
                        <div class="px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-900/50 text-surface-600 dark:text-surface-300 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                            <Calendar size={14}/> {formatarData(turma.criadoEm)}
                        </div>
                        <div class="px-3 py-1 rounded-lg {turma.ativa ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'} text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                            {#if turma.ativa}
                                <CheckCircle size={14} /> Ativa
                            {:else}
                                <AlertTriangle size={14} /> Arquivada
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-2 md:items-end">
                <span class="text-xs font-bold uppercase text-surface-500 tracking-wider md:mr-1">Código de Acesso</span>
                
                <div class="p-4 bg-surface-50 dark:bg-surface-900 rounded-2xl border-2 border-dashed border-primary-200 dark:border-primary-800 flex items-center gap-4">
                    <div class="flex flex-col">
                        <span class="text-[10px] text-surface-400 font-mono mb-1">PARTILHAR</span>
                        <code class="text-3xl font-black text-surface-900 dark:text-white font-mono tracking-widest select-all">
                            {turma.codigo}
                        </code>
                    </div>

                    <div class="w-px h-10 bg-surface-200 dark:bg-surface-700"></div>

                    <div class="flex flex-col gap-1">
                        <button 
                            class="p-2 hover:bg-white dark:hover:bg-surface-800 rounded-lg text-primary-600 transition-colors shadow-sm" 
                            on:click={copiarCodigo} 
                            title="Copiar Código"
                        >
                            <Copy size={18} />
                        </button>
                        <button 
                            class="p-2 hover:bg-white dark:hover:bg-surface-800 rounded-lg text-surface-400 hover:text-red-500 transition-colors shadow-sm"
                            on:click={renovarCodigo}
                            disabled={isRenewing}
                            title="Gerar Novo"
                        >
                            {#if isRenewing}
                                <Loader size={18} class="animate-spin" />
                            {:else}
                                <RefreshCw size={18} />
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="space-y-4">
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 class="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Users class="text-primary-500" />
                Alunos <span class="text-surface-400 text-sm font-normal">({alunos.length})</span>
            </h3>

            <div class="relative w-full md:max-w-xs">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder="Procurar aluno..."
                    class="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all"
                />
            </div>
        </div>

        {#if alunosFiltrados.length === 0}
             <div class="p-12 rounded-3xl bg-surface-100 dark:bg-surface-800/50 border-2 border-dashed border-surface-300 dark:border-surface-700 text-center space-y-4">
                <div class="mx-auto w-12 h-12 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-500">
                    <Users size={24} />
                </div>
                {#if searchTerm}
                    <p class="text-surface-600 dark:text-surface-400">Nenhum aluno encontrado para "{searchTerm}".</p>
                {:else}
                    <p class="text-surface-600 dark:text-surface-400">
                        Ainda não há alunos nesta turma.<br>
                        Partilhe o código <span class="font-bold font-mono text-primary-500">{turma.codigo}</span>.
                    </p>
                {/if}
            </div>
        {:else}
            <div class="bg-white dark:bg-surface-800 rounded-3xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden hover:border-primary-500 dark:hover:border-primary-500">
                <div class="divide-y divide-surface-100 dark:divide-surface-700">
                    {#each alunosFiltrados as aluno}
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="p-4  hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors cursor-pointer flex items-center justify-between group"
                                    on:click={() => verRelatorio(aluno.id)}
            on:keydown={(e) => e.key === 'Enter' && verRelatorio(aluno.id)}>
                            
                            <div class="flex items-center gap-4">
                                <div class={`w-12 h-12 rounded-xl ${getAvatarColor(aluno.nome)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                            {aluno.nome.charAt(0)}
                                        </div>
                                <div>
                                    <div class="font-bold text-surface-900 dark:text-surface-100">
                                        {aluno.nome} {aluno.sobrenome}
                                    </div>
                                    <div class="text-xs text-surface-500 flex items-center gap-2">
                                        <span>{aluno.classe ? `${aluno.classe}ª Classe` : 'Classe N/A'}</span>
                                        <span class="w-1 h-1 bg-surface-300 rounded-full"></span>
                                        <span>Entrou a {formatarData(aluno.dataEntrada)}</span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                class="p-2 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Remover Aluno"
                                on:click={() => removerAluno(aluno.id, aluno.nome)}
                            >
                                <UserX size={18} />
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

  {/if}
</div>