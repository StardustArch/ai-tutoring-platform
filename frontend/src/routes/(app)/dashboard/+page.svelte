<script lang="ts">
    import { auth } from '$lib/store/auth';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import '../../../app.css'
    
    // Importações dos ícones Lucide
    import { UserPlus, School, Clock, Users, BookOpen, ChevronRight } from 'lucide-svelte';

    let isLoadingAction = false;

    // Lógica para determinar o estado do utilizador
    $: user = $auth.user;
    $: isEncarregado = !!user?.perfilEncarregado;
    $: isProfessor = !!user?.perfilProfessor;
    $: isNeutral = !isEncarregado && !isProfessor;
    
    // Se for professor, verificar se está aprovado (assumindo que o backend envia isso)
    $: isProfessorPendente = isProfessor && user?.perfilProfessor?.isVerificado === false;

    // --- AÇÕES DE ONBOARDING ---

    async function tornarSeEncarregado() {
        isLoadingAction = true;
        try {
            // 1. Cria o perfil de encarregado
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/encarregado`, {
                method: 'POST',
            });

            if (res.ok) {
                // 2. Atualiza os dados do utilizador localmente para refletir a mudança
                await auth.refreshUser(); 
                alert({ message: 'Perfil de Encarregado ativado!', background: 'variant-filled-success' });
            }
        } catch (error) {
            console.error(error);
            alert({ message: 'Erro ao ativar perfil.', background: 'variant-filled-error' });
        } finally {
            isLoadingAction = false;
        }
    }

    async function tornarSeProfessor() {
        isLoadingAction = true;
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/professor`, {
                method: 'POST',
                body: JSON.stringify({ escola: 'Escola Primária da Beira' }) // Exemplo
            });

            if (res.ok) {
                await auth.refreshUser();
                alert({ message: 'Perfil de Professor criado! Aguarde aprovação.', background: 'variant-filled-success' });
            }
        } catch (error) {
            console.error(error);
            alert({ message: 'Erro ao criar perfil.', background: 'variant-filled-error' });
        } finally {
            isLoadingAction = false;
        }
    }
</script>

<!-- LÓGICA DE EXIBIÇÃO -->

{#if isNeutral}
    <!-- TELA 1: UTILIZADOR NEUTRO (ONBOARDING) -->
    <div class="h-full flex flex-col items-center justify-center p-4 space-y-8 animate-fade-in">
        <div class="text-center space-y-4">
            <h2 class="h1 font-bold">Bem-vindo, {user?.nome}! 👋</h2>
            <p class="text-xl text-surface-600-300-token">Como pretende usar o KaniMente hoje?</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
            
            <!-- Opção ENCARREGADO -->
            <button 
                class="card p-8 variant-soft-primary hover:variant-filled-primary transition-all hover:scale-105 text-left space-y-4 group"
                on:click={tornarSeEncarregado}
                disabled={isLoadingAction}
            >
                <div class="p-4 bg-white/20 rounded-full w-fit">
                    <Users size={32} />
                </div>
                <h3 class="h3 font-bold">Sou Encarregado</h3>
                <p class="opacity-80">Quero registar o meu educando para ele aprender com a IA e acompanhar o seu progresso.</p>
                <div class="pt-4 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                    Começar Agora <ChevronRight size={16} />
                </div>
            </button>

            <!-- Opção PROFESSOR -->
            <button 
                class="card p-8 variant-soft-secondary hover:variant-filled-secondary transition-all hover:scale-105 text-left space-y-4 group"
                on:click={tornarSeProfessor}
                disabled={isLoadingAction}
            >
                <div class="p-4 bg-white/20 rounded-full w-fit">
                    <School size={32} />
                </div>
                <h3 class="h3 font-bold">Sou Professor</h3>
                <p class="opacity-80">Quero criar turmas, adicionar alunos e monitorizar o desempenho da classe.</p>
                <div class="pt-4 font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                    Pedir Acesso <ChevronRight size={16} />
                </div>
            </button>

        </div>
    </div>

{:else if isProfessorPendente}
    <!-- TELA 2: PROFESSOR À ESPERA -->
    <div class="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div class="p-4 bg-surface-100 rounded-full">
            <Clock size={48} class="text-surface-600" />
        </div>
        <h2 class="h2 font-bold">Aprovação Pendente</h2>
        <p class="text-surface-600-300-token max-w-md">
            O seu pedido para ser Professor foi registado. Um administrador irá verificar as suas credenciais em breve.
        </p>
        <button class="btn variant-ghost-surface">Contactar Suporte</button>
    </div>

{:else if isEncarregado}
    <!-- TELA 3: DASHBOARD DO ENCARREGADO -->
    <div class="space-y-8 animate-fade-in">
        <header class="flex justify-between items-center">
            <div>
                <h2 class="h2 font-bold">Meus Educandos</h2>
                <p class="text-surface-500-400-token">Acompanhe o progresso escolar.</p>
            </div>
            <!-- Botão que abre o modal de registo de aluno -->
            <button class="btn variant-filled-primary shadow-lg flex items-center gap-2">
                <UserPlus size={20} />
                <span>Registar Novo Aluno</span>
            </button>
        </header>

        <!-- Aqui entraria a lista de alunos do Encarregado -->
        <div class="alert variant-ghost-surface">
            <div class="alert-message">
                <p>Você ainda não registou nenhum aluno. Clique no botão acima para começar.</p>
            </div>
        </div>
    </div>

{:else if isProfessor}
    <!-- TELA 4: DASHBOARD DO PROFESSOR (A que fizemos antes) -->
    <div class="space-y-8 animate-fade-in">
        <header class="flex justify-between items-center">
            <div>
                <h2 class="h2 font-bold">Painel do Professor</h2>
                <p class="text-surface-500-400-token">Gerir turmas e acompanhar alunos.</p>
            </div>
            <button class="btn variant-filled-primary shadow-lg flex items-center gap-2">
                <BookOpen size={20} />
                <span>Criar Nova Turma</span>
            </button>
        </header>
        
        <!-- Conteúdo do dashboard do professor -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Estatísticas podem ser adicionadas aqui -->
        </div>
    </div>
{/if}