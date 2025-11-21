<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/utils/api';
  import { PUBLIC_API_URL_HOST } from '$env/static/public';
  import { notifications } from '$lib/store/notifications';
  
  import { 
    ArrowLeft, Users, Settings, Copy, BookOpen, 
    Calendar, UserX, MoreVertical, Hash, School, CheckCircle,
    RefreshCw, Loader, AlertTriangle
  } from 'lucide-svelte';

  // --- ESTADO ---
  let turma: any = null;
  let alunos: any[] = [];
  let isLoading = true;
  let isRenewing = false; // Estado para o botão de renovar
  let classId = $page.params.id;

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
        // Endpoint: PUT /api/classes/:id/codigo/renovar
        const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/classes/${classId}/codigo/renovar`, {
            method: 'PUT'
        });

        if (res.ok) {
            const data = await res.json();
            console.log(data.codigo)
            // Atualizar o código localmente para refletir a mudança na UI
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
</script>


<div class="max-w-5xl mx-auto p-4 pb-20 space-y-8 animate-fade-in">

  <!-- CABEÇALHO DE NAVEGAÇÃO -->
  <div class="flex items-center gap-4">
    <button 
      on:click={() => goto('/dashboard/teacher/class')} 
      class="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 transition-colors"
    >
      <ArrowLeft size={24} />
    </button>
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Detalhes da Turma</h1>
  </div>

  {#if isLoading}
    <div class="space-y-6 animate-pulse">
        <div class="h-48 bg-surface-200 dark:bg-surface-800 rounded-xl w-full"></div>
        <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-xl w-full"></div>
    </div>
  {:else if turma}
  
    <!-- HERO CARD DA TURMA -->
    <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
        <!-- Barra de Cor -->
        <div class="h-3 w-full bg-gradient-to-r from-primary-500 to-secondary-500"></div>
        
        <div class="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6">
            
            <!-- Info Esquerda -->
            <div class="space-y-4 flex-1">
                <div class="flex items-start justify-between md:justify-start gap-4">
                    <div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
                        <School size={32} />
                    </div>
                    <!-- Mobile Edit Button -->
                    <button class="md:hidden btn btn-icon variant-ghost-surface" on:click={() => goto(`/dashboard/teacher/class/${classId}/edit`)}>
                        <Settings size={20} />
                    </button>
                </div>
                
                <div>
                    <h2 class="text-3xl font-bold text-surface-900 dark:text-surface-50">{turma.nome}</h2>
                    <div class="flex items-center gap-4 mt-2 text-surface-600 dark:text-surface-400">
                        <span class="flex items-center gap-1"><BookOpen size={16}/> {turma.disciplina?.nome || 'Disciplina Geral'}</span>
                        <span class="flex items-center gap-1"><Calendar size={16}/> Criada em {formatarData(turma.criadoEm)}</span>
                    </div>
                </div>
            </div>

            <!-- Info Direita (Código e Ações) -->
            <div class="flex flex-col items-end gap-4">
                 <button 
                    class="hidden md:flex btn variant-outline-surface gap-2"
                    on:click={() => goto(`/dashboard/teacher/class/${classId}/edit`)}
                >
                    <Settings size={16} /> Editar Turma
                </button>

                <!-- Box do Código (ATUALIZADO COM RENOVAÇÃO) -->
                <div class="bg-surface-50 dark:bg-surface-900/50 p-4 rounded-xl border border-surface-200 dark:border-surface-700 flex flex-col items-center gap-2 w-full md:w-auto">
                    <span class="text-xs font-bold uppercase text-surface-500 tracking-wider">Código de Acesso</span>
                    
                    <div class="flex items-center gap-2">
                        <code class="text-3xl font-black text-primary-600 dark:text-primary-400 font-mono tracking-widest px-2">
                            {turma.codigo}
                        </code>
                        
                        <!-- Botão Copiar -->
                        <button 
                            class="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors text-surface-600 dark:text-surface-300" 
                            on:click={copiarCodigo} 
                            title="Copiar"
                        >
                            <Copy size={20} />
                        </button>

                        <!-- Botão Renovar -->
                        <div class="w-px h-6 bg-surface-300 dark:bg-surface-600 mx-1"></div>
                        
                        <button 
                            class="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors text-surface-600 dark:text-surface-300"
                            on:click={renovarCodigo}
                            disabled={isRenewing}
                            title="Gerar novo código"
                        >
                            {#if isRenewing}
                                <Loader size={20} class="animate-spin text-primary-500" />
                            {:else}
                                <RefreshCw size={20} />
                            {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Barra de Estatísticas Rápidas -->
        <div class="px-8 py-4 bg-surface-50 dark:bg-surface-900/30 border-t border-surface-200 dark:border-surface-700 flex gap-8">
            <div class="flex items-center gap-2">
                <Users size={20} class="text-surface-500"/>
                <span class="font-bold text-surface-900 dark:text-surface-100">{alunos.length}</span>
                <span class="text-surface-500 text-sm">Alunos</span>
            </div>
             <div class="flex items-center gap-2">
                {#if turma.ativa}
                 <CheckCircle size={20} class="text-green-500" />
                {:else}
                 <AlertTriangle size={20} class="text-red-500" />
                 {/if}
                <span class="text-surface-500 text-sm">{turma.ativa ? 'Turma Ativa' : 'Turma Arquivada'}</span>
            </div>
        </div>
    </div>

    <!-- LISTA DE ALUNOS -->
    <div class="space-y-4">
        <h3 class="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <Users class="text-primary-500" />
            Alunos Matriculados
        </h3>

        {#if alunos.length === 0}
             <div class="p-12 rounded-xl bg-surface-100 dark:bg-surface-800/50 border-2 border-dashed border-surface-300 dark:border-surface-700 text-center space-y-4">
                <div class="mx-auto w-12 h-12 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-500">
                    <Users size={24} />
                </div>
                <p class="text-surface-600 dark:text-surface-400">
                    Ainda não há alunos nesta turma.<br>
                    Partilhe o código <span class="font-bold font-mono text-primary-500">{turma.codigo}</span> com os encarregados.
                </p>
            </div>
        {:else}
            <div class="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-200 dark:border-surface-700 text-xs uppercase text-surface-500 font-bold">
                            <tr>
                                <th class="p-4">Nome</th>
                                <th class="p-4">Data Entrada</th>
                                <th class="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-surface-200 dark:divide-surface-700">
                            {#each alunos as aluno}
                                <tr class="hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
                                    <td class="p-4">
                                        <div class="font-bold text-surface-900 dark:text-surface-100">
                                            {aluno.nome} {aluno.sobrenome}
                                        </div>
                                        {#if aluno.classe}
                                            <div class="text-xs text-surface-500">{aluno.classe}ª Classe</div>
                                        {/if}
                                    </td>
                                    <td class="p-4 text-sm text-surface-600 dark:text-surface-400">
                                        {formatarData(aluno.dataEntrada)}
                                    </td>
                                    <td class="p-4 text-right">
                                        <button 
                                            class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Remover Aluno"
                                            on:click={() => removerAluno(aluno.id, aluno.nome)}
                                        >
                                            <UserX size={18} />
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}
    </div>

  {/if}
</div>