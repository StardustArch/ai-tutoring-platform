<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { 
        Users, GraduationCap, Play, Settings, Plus, ArrowRight 
    } from 'lucide-svelte';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';

    let user = { nome: 'Encarregado', isProfessor: false };
    let students: any[] = []; // Lista de filhos
    let loading = true;

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        try {
            // 1. Dados do User
            const resUser = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/me`);
            if (resUser.ok) {
                const data = await resUser.json();
                console.log(data)
                user = { nome: data.nome, isProfessor: !!data.perfilProfessor };
            }

            // 2. Dados dos Filhos (Para os cartões de jogo)
            const resStudents = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students`);
            if (resStudents.ok) {
                students = await resStudents.json();
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    // AÇÃO MÁGICA: É aqui que ele vai jogar!
    function playAsStudent(studentId: number) {
        // Leva para aquela tela bonita de "Como queres aprender hoje?" (Tutor vs Rush)
        goto(`/dashboard/foreman/student/${studentId}/class?ref=home`); 
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
</script>

<div class="max-w-8xl mx-auto p-6 space-y-8 animate-fade-in">

    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
                Olá, {user.nome}! 👋
            </h1>
            <p class="text-surface-600 dark:text-surface-400">Quem vai aprender hoje?</p>
        </div>
        
        <button 
            class="btn variant-ghost-primary md:hidden"
            on:click={() => goto('/dashboard/foreman/student/create?ref=home')}
        >
            <Plus size={24} />
        </button>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="h-48 bg-surface-200 dark:bg-surface-800 rounded-3xl animate-pulse"></div>
        </div>
    {:else if students.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {#each students as student}
                <div class="group relative bg-white dark:bg-surface-800 rounded-3xl p-6 border-2 border-surface-100 dark:border-surface-700 shadow-sm hover:shadow-xl hover:border-primary-500 transition-all duration-300">
                    
                    <div class="flex items-center gap-4 mb-6">
                            <div class={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${getAvatarColor(student.nome)}`}>
                                {student.nome.charAt(0)}
                            </div>
                        <div>
                            <h3 class="text-xl font-bold text-surface-900 dark:text-white leading-tight">
                                {student.nome}
                            </h3>
                            <p class="text-sm text-surface-500">{student.classe}ª Classe</p>
                        </div>
                    </div>

                    <button 
                        class="w-full py-3 rounded-xl bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-bold text-lg shadow-lg 
                               group-hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        on:click={() => playAsStudent(student.id)}
                    >
                        <Play size={20} fill="currentColor" />
                        Estudar Agora
                    </button>

                    <div class="mt-4 flex justify-between items-center text-xs font-medium text-surface-400">
                        <button on:click={() => goto(`/dashboard/foreman/reports/${student.id}?ref=home`)} class="hover:text-primary-500 transition-colors">
                            Ver Relatório
                        </button>
                        <button on:click={() => goto(`/dashboard/foreman/student/${student.id}/edit?ref=home`)} class="hover:text-primary-500 transition-colors">
                            Configurar
                        </button>
                    </div>
                </div>
            {/each}

            <button 
                on:click={() => goto('/dashboard/foreman/student/create?ref=home')}
                class="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-surface-300 dark:border-surface-700 
                       text-surface-400 hover:text-primary-500 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-surface-800 transition-all min-h-[200px]"
            >
                <div class="p-4 bg-surface-100 dark:bg-surface-900 rounded-full mb-3">
                    <Plus size={32} />
                </div>
                <span class="font-bold">Adicionar Educando</span>
            </button>

        </div>
    {:else}
        <div class="text-center py-12">
            <p class="text-surface-500 mb-4">Ainda não tens educandos registados.</p>
            <button                     class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
 on:click={() => goto('/dashboard/foreman/student/create?ref=home')}>
                Começar
            </button>
        </div>
    {/if}

    <div class="pt-6 border-t border-surface-200 dark:border-surface-800">
        <h3 class="text-sm font-bold text-surface-400 uppercase tracking-widest mb-4">Outros Perfis</h3>
        
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
            <div class="flex items-center gap-4">
                <div class="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                    <GraduationCap size={32} />
                </div>
                <div>
                    <h2 class="text-lg font-bold">Área do Professor</h2>
                    <p class="text-blue-100 text-sm">
                        {user.isProfessor ? 'Gerir as tuas turmas e alunos.' : 'Ativa o teu perfil para ensinar.'}
                    </p>
                </div>
            </div>
            <button 
                class="btn bg-white text-blue-700 font-bold hover:brightness-110 border-none shadow-md"
                on:click={() => user.isProfessor ? goto('/dashboard/teacher') : goto('/dashboard/teacher/become-teacher?ref=homet')}
            >
                {user.isProfessor ? 'Entrar' : 'Ativar'} <ArrowRight size={18} class="ml-2"/>
            </button>
        </div>
    </div>

</div>