<svelte:head>
    <title>Painel da Família | KaniMente</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { 
        Users, GraduationCap, Play, Settings, Plus, ArrowRight, 
        ChevronRight, UserPlus, School, BarChart3, Edit
    } from 'lucide-svelte';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { auth } from '$lib/store/auth';

    let user = { nome: 'Encarregado', isProfessor: false };
    let students: any[] = []; 
    let loading = true;

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        try {
            const resUser = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/me`);
            if (resUser.ok) {
                const data = await resUser.json();
                user = { 
                    nome: data.nome, 
                    isProfessor: !!data.perfilProfessor 
                };
            }

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

    function playAsStudent(studentId: number) {
        goto(`/dashboard/foreman/student/${studentId}/class?ref=home`); 
    }

    function getAvatarColor(name: string) {
        const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
        return colors[(name?.charCodeAt(0) || 0) % colors.length];
    }
        function getInitials(name: string) {
        return name ? name.substring(0, 2).toUpperCase() : '--';
    }

    // Estilos Enterprise
    const btnPrimary = "btn bg-emerald-600 hover:bg-emerald-700 text-white rounded-md py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all shadow-sm";
    const btnSecondary = "btn bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 rounded-md py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all";
</script>

<div class="container mx-auto max-w-8xl p-4 md:p-8 space-y-8 animate-fade-in pb-24">

    <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
                Painel da Família
            </h1>
            <p class="text-surface-500 text-sm mt-1">
                Olá, <span class="font-semibold text-surface-900 dark:text-surface-100">{user.nome.split(' ')[0]}</span>. Acompanhe a jornada dos seus educandos.
            </p>
        </div>
        
        <button 
            class="{btnSecondary} hidden md:flex"
            on:click={() => goto('/dashboard/foreman/student/create?ref=home')}
        >
            <UserPlus size={16} />
            <span>Adicionar Educando</span>
        </button>
    </header>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {#each Array(3) as _}
                <div class="h-48 bg-surface-200 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"></div>
            {/each}
        </div>
    {:else if students.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {#each students as student}
                <div class="group bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all flex flex-col h-full">
                    
                    <div class="p-6 flex-1">
                        <div class="flex items-center gap-4 mb-6">

                                                            <div class="w-10 h-10 rounded bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                    {getInitials(student.nome)}
                                </div>
                            <div class="min-w-0">
                                <h3 class="text-base font-bold text-surface-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                                    {student.nome}
                                </h3>
                                <div class="flex items-center gap-1.5 text-xs text-surface-500 font-medium uppercase tracking-wide mt-0.5">
                                    <GraduationCap size={12} class="text-emerald-500" />
                                    {student.classe}ª Classe
                                </div>
                            </div>
                        </div>

                        <button 
                            class="{btnPrimary} w-full mb-4 group-hover:bg-emerald-600"
                            on:click={() => playAsStudent(student.id)}
                        >
                            <Play size={16} class="fill-current" />
                            Iniciar Estudo
                        </button>

                        <div class="grid grid-cols-2 gap-3">
                            <button 
                                on:click={() => goto(`/dashboard/foreman/reports/${student.id}?ref=home`)} 
                                class="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-surface-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded transition-colors"
                            >
                                <BarChart3 size={14} /> Relatório
                            </button>
                            <button 
                                on:click={() => goto(`/dashboard/foreman/student/${student.id}/edit?ref=home`)} 
                                class="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-surface-500 hover:text-surface-900 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
                            >
                                <Settings size={14} /> Configurar
                            </button>
                        </div>
                    </div>
                </div>
            {/each}

            <button 
                on:click={() => goto('/dashboard/foreman/student/create?ref=home')}
                class="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-700 
                       text-surface-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all min-h-[200px] group"
            >
                <div class="p-3 bg-surface-100 dark:bg-surface-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                </div>
                <span class="font-bold text-sm">Registar Novo Educando</span>
            </button>

        </div>
    {:else}
        <div class="flex flex-col items-center justify-center py-16 px-6 bg-surface-50 dark:bg-surface-800/30 rounded-lg border border-dashed border-surface-300 dark:border-surface-700 text-center">
            <div class="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center text-surface-400 mb-4 border border-surface-200 dark:border-surface-600">
                <Users size={24} />
            </div>
            <h3 class="text-base font-bold text-surface-900 dark:text-white">Sem educandos registados</h3>
            <p class="text-surface-500 text-sm max-w-xs mt-1 mb-6">
                Adicione o seu primeiro educando para começar a acompanhar o progresso escolar.
            </p>
            <button 
                class="{btnPrimary} px-6"
                on:click={() => goto('/dashboard/foreman/student/create?ref=home')}
            >
                <Plus size={16} /> Registar Educando
            </button>
        </div>
    {/if}

    <div class="pt-8 border-t border-surface-200 dark:border-surface-700">
        <div class="bg-surface-50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-start gap-4">
                <div class="p-3 bg-white dark:bg-surface-700 rounded-md border border-surface-200 dark:border-surface-600 text-surface-500">
                    <School size={24} />
                </div>
                <div>
                    <h2 class="text-base font-bold text-surface-900 dark:text-white">Área do Professor</h2>
                    <p class="text-sm text-surface-500 mt-1 max-w-lg">
                        {user.isProfessor 
                            ? 'Também é professor? Aceda ao painel docente para gerir as suas turmas.' 
                            : 'É professor? Ative o seu perfil docente gratuitamente e comece a criar turmas.'}
                    </p>
                </div>
            </div>
            
            <button 
                class="{btnSecondary} whitespace-nowrap"
                on:click={() => user.isProfessor ? goto('/dashboard/teacher') : goto('/dashboard/teacher/become-teacher?ref=homet')}
            >
                {user.isProfessor ? 'Aceder Docência' : 'Ativar Perfil Docente'} 
                <ChevronRight size={16} />
            </button>
        </div>
    </div>

</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>