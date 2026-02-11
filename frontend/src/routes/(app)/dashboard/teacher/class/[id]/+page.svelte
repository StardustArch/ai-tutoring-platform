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
    RefreshCw, Loader, AlertTriangle, Settings2, MoreVertical,

	Hash

  } from 'lucide-svelte';
  
  import ManageTopicsModal from '$lib/components/ManageTopicsModal.svelte';

  // --- ESTADO ---
  let turma: any = null;
  let alunos: any[] = [];
  let isLoading = true;
  let isRenewing = false; 
  let classId = $page.params.id;
  let searchTerm = '';
  let showTopicsModal = false;

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

  async function removerAluno(alunoId: number, nome: string, event: Event) {
    event.stopPropagation();
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
      day: '2-digit', month: 'short', year: 'numeric' 
    });
  }

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
        goto('/dashboard/teacher/overview'); 
    } else if(ref === 'homef'){
        goto('/dashboard/unified/overview'); 
    } else {
        goto('/dashboard/teacher/class'); 
    }
  }

  function getAvatarColor(name: string) {
    if (!name) return 'bg-surface-500';
    const gradients = [
        'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
        'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'
    ];
    return gradients[name.charCodeAt(0) % gradients.length];
  }
</script>

<div class="container mx-auto max-w-7xl p-4 md:p-6 pb-24 space-y-6 animate-fade-in">

  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="flex items-center gap-3">
        <button on:click={() => goBack()} class="p-2 -ml-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-500 hover:text-primary-600">
            <ArrowLeft size={24} />
        </button>
        <h1 class="text-xl md:text-2xl font-bold text-surface-900 dark:text-surface-50 truncate">
            Detalhes da Turma
        </h1>
    </div>

    <div class="flex items-center gap-2 w-full md:w-auto">
        <button 
            on:click={() => showTopicsModal = true}
            class="flex-1 md:flex-none btn variant-outline-surface border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg text-sm font-medium px-4 py-2 flex items-center justify-center gap-2"
        >
            <Settings2 size={16} />
            <span>Conteúdos</span>
        </button>

        <button 
            class="flex-1 md:flex-none btn variant-filled-surface bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 rounded-lg text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 text-surface-900 dark:text-surface-100"
            on:click={() => goto(`/dashboard/teacher/class/${classId}/edit`)}
        >
            <Settings size={16} />
            <span>Editar</span>
        </button>
    </div>
  </div>

  <ManageTopicsModal 
    turmaId={parseInt(classId || '')} 
    isOpen={showTopicsModal} 
    on:close={() => showTopicsModal = false}
    on:saved={() => {}}
  />

  {#if isLoading}
    <div class="space-y-6">
        <div class="h-48 bg-surface-200 dark:bg-surface-800 rounded-xl w-full animate-pulse"></div>
        <div class="h-10 w-full md:w-64 bg-surface-200 dark:bg-surface-800 rounded-lg animate-pulse"></div>
        <div class="space-y-2">
             {#each Array(3) as _}
                <div class="h-16 bg-surface-200 dark:bg-surface-800 rounded-xl w-full animate-pulse"></div>
             {/each}
        </div>
    </div>
  {:else if turma}
  
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden relative">
        <div class="p-5 md:p-8 flex flex-col md:flex-row justify-between gap-6 md:gap-8">
            
            <div class="flex gap-4 md:gap-6">
                <div class="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 border border-primary-200 dark:border-primary-800">
                    <School class="w-6 h-6 md:w-8 md:h-8" />
                </div>
                
                <div class="space-y-1 md:space-y-2 flex-1 min-w-0">
                    <h2 class="text-lg sm:text-xl md:text-3xl font-bold text-surface-900 dark:text-white leading-tight break-words">
                        {turma.nome}
                    </h2>
                    
                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-surface-600 dark:text-surface-400">
                        <div class="flex items-center gap-1.5">
                            <BookOpen size={14} class="text-primary-500"/> 
                            <span class="font-medium truncate">{turma.disciplina?.nome || 'Disciplina Geral'}</span>
                        </div>
                        <div class="hidden sm:block w-1 h-1 bg-surface-300 dark:bg-surface-600 rounded-full"></div>
                        <div class="flex items-center gap-1.5">
                            <Calendar size={14} class="text-surface-400"/> 
                            <span>Criado a {formatarData(turma.criadoEm)}</span>
                        </div>
                    </div>

                    <div class="pt-2">
                         <span class="inline-flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wide border {turma.ativa ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : 'bg-red-50 text-red-700 border-red-200'}">
                            {#if turma.ativa}
                                <CheckCircle size={12} /> Ativa
                            {:else}
                                <AlertTriangle size={12} /> Arquivada
                            {/if}
                        </span>
                    </div>
                </div>
            </div>

            <div class="mt-2 md:mt-0 md:text-right flex flex-col items-start md:items-end justify-center bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-700 w-full md:w-auto md:min-w-[240px]">
                <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider mb-1 flex items-center gap-1">
                    <Hash size={10} /> Código de Acesso
                </span>
                
                <div class="flex items-center gap-3 w-full md:justify-end">
                    <code class="text-2xl md:text-3xl font-mono font-black text-surface-900 dark:text-white tracking-widest select-all">
                        {turma.codigo}
                    </code>
                </div>

                <div class="flex items-center gap-2 mt-3 w-full">
                     <button 
                        class="flex-1 btn btn-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 text-surface-600 dark:text-surface-300 shadow-sm flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all"
                        on:click={copiarCodigo}
                    >
                        <Copy size={14} /> <span class="md:hidden lg:inline">Copiar</span>
                    </button>
                    <button 
                        class="btn btn-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-red-500 dark:hover:border-red-500 text-surface-500 hover:text-red-500 shadow-sm py-2 px-3 rounded-lg transition-all"
                        on:click={renovarCodigo}
                        disabled={isRenewing}
                        title="Gerar Novo Código"
                    >
                         {#if isRenewing}
                            <Loader size={14} class="animate-spin" />
                        {:else}
                            <RefreshCw size={14} />
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 class="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Users size={20} class="text-primary-500" />
                Alunos
                <span class="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-xs font-bold">
                    {alunos.length}
                </span>
            </h3>

            <div class="relative w-full sm:max-w-xs">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder="Procurar aluno..."
                    class="w-full pl-9 pr-4 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all shadow-sm"
                />
            </div>
        </div>

        {#if alunosFiltrados.length === 0}
             <div class="py-12 px-6 rounded-xl bg-surface-50 dark:bg-surface-800/50 border-2 border-dashed border-surface-200 dark:border-surface-700 text-center space-y-3">
                <div class="mx-auto w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-400">
                    <Users size={24} />
                </div>
                {#if searchTerm}
                    <p class="text-surface-500 dark:text-surface-400 text-sm">Nenhum aluno encontrado para "{searchTerm}".</p>
                {:else}
                    <h4 class="font-medium text-surface-900 dark:text-white">Ainda sem alunos</h4>
                    <p class="text-sm text-surface-500 dark:text-surface-400">
                        Partilhe o código acima com os encarregados.
                    </p>
                {/if}
            </div>
        {:else}
            <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
                <div class="divide-y divide-surface-100 dark:divide-surface-700">
                    {#each alunosFiltrados as aluno}
                        <div 
                            class="p-4 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition-colors cursor-pointer flex items-center justify-between group"
                            on:click={() => verRelatorio(aluno.id)}
                            on:keydown={(e) => e.key === 'Enter' && verRelatorio(aluno.id)}
                            role="button"
                            tabindex="0"
                        >
                            <div class="flex items-center gap-3 md:gap-4 overflow-hidden">
                                <div class={`w-9 h-9 md:w-10 md:h-10 rounded-full ${getAvatarColor(aluno.nome)} flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm ring-2 ring-white dark:ring-surface-800 shrink-0`}>
                                    {aluno.nome.charAt(0)}
                                </div>
                                
                                <div class="min-w-0">
                                    <div class="font-semibold text-surface-900 dark:text-surface-100 text-sm truncate">
                                        {aluno.nome} {aluno.sobrenome}
                                    </div>
                                    <div class="text-xs text-surface-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                        <span>{aluno.classe ? `${aluno.classe}ª Classe` : 'N/A'}</span>
                                        <span class="hidden sm:inline w-1 h-1 bg-surface-300 dark:bg-surface-600 rounded-full"></span>
                                        <span class="hidden sm:inline">{formatarData(aluno.dataEntrada)}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 pl-2">
                                <div class="md:hidden text-surface-300">
                                    <MoreVertical size={16} />
                                </div>

                                <button 
                                    class="hidden md:flex p-2 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus:outline-none"
                                    title="Remover Aluno"
                                    on:click={(e) => removerAluno(aluno.id, aluno.nome, e)}
                                >
                                    <UserX size={18} />
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

  {/if}
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>