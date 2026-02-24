<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  import { confirm } from '$lib/store/confirm';
  import { 
    ArrowLeft, Users, Settings, Copy, BookOpen, 
    Calendar, UserX, Search, School, CheckCircle,
    RefreshCw, Loader, AlertTriangle, MoreVertical,
    FileBarChart, Hash
  } from 'lucide-svelte';
  
  // Se tiveres este componente, mantém. Se não, comenta.
  import ManageTopicsModal from '$lib/components/ManageTopicsModal.svelte';

  // --- ESTADO ---
  let turma: any = null;
  let alunos: any[] = [];
  let isLoading = true;
  let isRenewing = false; 
  let classId = $page.params.id;
  let searchTerm = '';
  let showTopicsModal = false;
  
  // Estado para menu de ações de aluno (mobile)
  let activeStudentMenu: number | null = null;

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
        // Ajuste conforme a resposta da API (algumas retornam array direto, outras objeto)
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
      notifications.send('Código copiado!', 'success');
    }
  }

  async function renovarCodigo() {
    const aceitou = await confirm({
        title: 'Tem a certeza que deseja gerar um novo código?',
        message: 'O código antigo deixará de funcionar imediatamente.',
        type: "info", // Fica Laranja/Amarelo
        cancelText: 'Cancelar'
    });
if (!aceitou) return; // Se disser não, para aqui.

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
        const aceitou = await confirm({
        title: 'Tem a certeza?',
        message: `Deseja remover ${nome} desta turma?`,
        type: 'warning', // Fica Laranja/Amarelo
        confirmText: 'Sim, remover',
        cancelText: 'Cancelar'
    });
if (!aceitou) return; // Se disser não, para aqui.

    try {
      const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}/alunos/${alunoId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        notifications.send('Aluno removido com sucesso.', 'success');
        alunos = alunos.filter(a => a.id !== alunoId);
        if (turma._count) turma._count.alunos = Math.max(0, turma._count.alunos - 1);
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

  function getInitials(name: string) {
      return name ? name.substring(0, 2).toUpperCase() : '--';
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
    if (ref === 'home') goto('/dashboard/teacher/overview'); 
    else if(ref === 'homef') goto('/dashboard/unified/overview'); 
    else goto('/dashboard/teacher/class'); 
  }

  // Fecha menus ao clicar fora
  function closeMenus() {
      activeStudentMenu = null;
  }
</script>

<svelte:window on:click={closeMenus} />

<div class="container mx-auto max-w-8xl p-4 md:p-8 space-y-6 animate-fade-in pb-24">

  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="flex items-center gap-3">
        <button on:click={goBack} class="p-2 -ml-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-surface-500 hover:text-primary-600">
            <ArrowLeft size={20} />
        </button>
        
        <div class="flex items-center gap-2 text-sm text-surface-500">
            <span class="hover:text-surface-900 cursor-pointer transition-colors" on:click={goBack}>Turmas</span>
            <span class="text-surface-300">/</span>
            <span class="text-surface-900 dark:text-surface-100 font-medium truncate max-w-[200px]">{turma?.nome || 'Carregando...'}</span>
        </div>
    </div>

    {#if turma}
        <div class="flex items-center gap-2">
            <button 
                on:click={() => showTopicsModal = true}
                class="btn btn-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 shadow-sm"
            >
                Conteúdos
            </button>

            <button 
                on:click={() => goto(`/dashboard/teacher/class/${classId}/edit`)}
                class="btn btn-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 shadow-sm flex items-center gap-2"
            >
                <Settings size={14} />
                <span class="hidden sm:inline">Configurar</span>
            </button>
        </div>
    {/if}
  </div>

  <ManageTopicsModal 
    turmaId={parseInt(classId || '')} 
    isOpen={showTopicsModal} 
    on:close={() => showTopicsModal = false}
    on:saved={() => {}}
  />

  {#if isLoading}
    <div class="space-y-6 animate-pulse">
        <div class="h-40 bg-surface-200 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"></div>
        <div class="h-10 w-64 bg-surface-200 dark:bg-surface-800 rounded"></div>
        <div class="space-y-2">
             {#each Array(5) as _}
                <div class="h-14 bg-surface-200 dark:bg-surface-800 rounded border border-surface-200 dark:border-surface-700"></div>
             {/each}
        </div>
    </div>
  {:else if turma}
  
    <div class="bg-white dark:bg-surface-800 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        <div class="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6">
            
            <div class="flex gap-5">
                <div class="w-14 h-14 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-600 shrink-0">
                    <School size={28} />
                </div>
                
                <div class="space-y-1">
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-bold text-surface-900 dark:text-white tracking-tight leading-none">
                            {turma.nome}
                        </h1>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border {turma.ativa ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : 'bg-surface-100 text-surface-500 border-surface-200'}">
                            {#if turma.ativa}
                                <CheckCircle size={10} /> Ativa
                            {:else}
                                Arquivada
                            {/if}
                        </span>
                    </div>
                    
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500 dark:text-surface-400">
                        <div class="flex items-center gap-1.5">
                            <BookOpen size={14} /> 
                            <span class="font-medium">{turma.disciplina?.nome || 'Disciplina Geral'}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <Calendar size={14} /> 
                            <span>Criado a {formatarData(turma.criadoEm)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col items-start md:items-end justify-center bg-surface-50 dark:bg-surface-900/40 p-4 rounded-lg border border-surface-200 dark:border-surface-700 min-w-[240px]">
                <span class="text-[10px] font-bold uppercase text-surface-400 tracking-wider mb-1 flex items-center gap-1">
                    <Hash size={10} /> Código de Acesso
                </span>
                
                <div class="flex items-center gap-3 mb-3">
                    <code class="text-3xl font-mono font-bold text-surface-900 dark:text-white tracking-widest select-all">
                        {turma.codigo}
                    </code>
                </div>

                <div class="flex items-center gap-2 w-full">
                     <button 
                        class="flex-1 btn btn-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 shadow-sm flex items-center justify-center gap-2 py-1.5 rounded text-xs font-medium transition-all"
                        on:click={copiarCodigo}
                    >
                        <Copy size={12} /> Copiar
                    </button>
                    <button 
                        class="btn btn-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:border-red-300 hover:text-red-600 text-surface-400 shadow-sm py-1.5 px-2 rounded transition-all"
                        on:click={renovarCodigo}
                        disabled={isRenewing}
                        title="Gerar Novo Código"
                    >
                         {#if isRenewing}
                            <Loader size={12} class="animate-spin" />
                        {:else}
                            <RefreshCw size={12} />
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 class="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Users size={18} class="text-surface-500" />
                Alunos Inscritos
                <span class="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-xs font-bold border border-surface-200 dark:border-surface-700">
                    {alunos.length}
                </span>
            </h3>

            <div class="relative w-full sm:max-w-xs">
                <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder="Filtrar alunos..."
                    class="w-full pl-9 pr-4 py-2 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm transition-all shadow-sm"
                />
            </div>
        </div>

        <div class="bg-white dark:bg-surface-800 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
            {#if alunosFiltrados.length === 0}
                 <div class="py-16 px-6 text-center space-y-3">
                    <div class="mx-auto w-10 h-10 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-400 mb-2">
                        <Users size={20} />
                    </div>
                    {#if searchTerm}
                        <p class="text-surface-500 dark:text-surface-400 text-sm">Nenhum resultado para "{searchTerm}".</p>
                    {:else}
                        <h4 class="font-medium text-surface-900 dark:text-white">Ainda sem alunos</h4>
                        <p class="text-sm text-surface-500 dark:text-surface-400 max-w-xs mx-auto">
                            Partilhe o código <span class="font-mono font-bold bg-surface-100 px-1 rounded">{turma.codigo}</span> com os encarregados para eles inscreverem os educandos.
                        </p>
                    {/if}
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-surface-500 uppercase bg-surface-50 dark:bg-surface-900/50 border-b border-surface-200 dark:border-surface-700">
                            <tr>
                                <th class="px-6 py-3 font-semibold">Nome</th>
                                <th class="px-6 py-3 font-semibold hidden sm:table-cell">Data Inscrição</th>
                                <th class="px-6 py-3 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-surface-100 dark:divide-surface-700">
                            {#each alunosFiltrados as aluno}
                                <tr 
                                    class="bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors group cursor-pointer"
                                    on:click={() => verRelatorio(aluno.id)}
                                >
                                    <td class="px-6 py-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/30">
                                                {getInitials(aluno.nome)}
                                            </div>
                                            <div>
                                                <div class="font-medium text-surface-900 dark:text-white group-hover:text-primary-600 transition-colors">
                                                    {aluno.nome} {aluno.sobrenome}
                                                </div>
                                                <div class="text-[11px] text-surface-500 sm:hidden">
                                                    {formatarData(aluno.dataEntrada)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-3 text-surface-500 hidden sm:table-cell">
                                        {formatarData(aluno.dataEntrada)}
                                    </td>
                                    <td class="px-6 py-3 text-right relative">
                                        <div class="flex items-center justify-end gap-2">
                                            <button 
                                                class="btn btn-sm bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 hover:border-primary-500 hover:text-primary-600 text-surface-600 shadow-sm py-1.5 px-3 rounded text-xs font-medium transition-all hidden sm:flex items-center gap-1"
                                                on:click={(e) => { e.stopPropagation(); verRelatorio(aluno.id); }}
                                            >
                                                <FileBarChart size={14} /> Relatório
                                            </button>
                                            
                                            <button 
                                                class="p-1.5 rounded text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Remover Aluno"
                                                on:click={(e) => removerAluno(aluno.id, aluno.nome, e)}
                                            >
                                                <UserX size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    </div>

  {/if}
</div>

<style>
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>