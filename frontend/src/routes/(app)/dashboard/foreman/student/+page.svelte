<svelte:head>
    <title>Gerir Educandos | KMind</title>
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { 
        UserPlus, GraduationCap, Calendar, Users, 
        Play, Settings2, ChevronRight, UserCircle2
    } from 'lucide-svelte';
    
    // --- ESTADO ---
    let students: any[] = [];
    let loading = true;

    onMount(async () => {
        await loadStudents();
    });

    async function loadStudents() {
        loading = true;
        try {
            const res = await apiFetch(`${PUBLIC_API_URL_HOST}/api/students`);
            if (res.ok) {
                students = await res.json();
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    function calculateAge(dateString: string) {
        if (!dateString) return '--';
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} anos`;
    }

    function getInitials(name: string) {
        return name ? name.substring(0, 2).toUpperCase() : '--';
    }

    // Estilos Enterprise
    const btnPrimary = "btn bg-emerald-600 hover:bg-emerald-700 text-white rounded-md py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all shadow-sm";
    const btnSecondary = "btn bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 rounded-md py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all";
</script>

<div class="container mx-auto max-w-8xl p-4 md:p-8 space-y-6 animate-fade-in pb-24">

    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-surface-200 dark:border-surface-700 pb-4">
        <div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight flex items-center gap-2">
                Gerir Educandos
            </h1>
            <p class="text-surface-500 text-sm mt-1">
                Administre os perfis e acompanhe o progresso escolar da sua família.
            </p>
        </div>

        <button 
            class={btnPrimary}
            on:click={() => goto('/dashboard/foreman/student/create')}
        >
            <UserPlus size={16} />
            <span>Adicionar Educando</span>
        </button>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {#each Array(3) as _}
                <div class="h-44 bg-surface-200 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"></div>
            {/each}
        </div>

    {:else if students.length === 0}
        <div class="flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-800/30 rounded-lg p-16 text-center border border-dashed border-surface-300 dark:border-surface-700">
            <div class="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-lg flex items-center justify-center text-surface-400 mb-4 border border-surface-200 dark:border-surface-600">
                <UserCircle2 size={24} />
            </div>
            <h3 class="font-bold text-surface-900 dark:text-white">Nenhum educando registado</h3>
            <p class="text-sm text-surface-500 max-w-xs mt-1 mb-6">
                Para começar, registe o perfil do seu primeiro educando para que ele possa utilizar a plataforma.
            </p>
            <button 
                class={btnPrimary}
                on:click={() => goto('/dashboard/foreman/student/create')}
            >
                Registar Primeiro Educando
            </button>
        </div>

    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each students as student}
                <div class="group bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col">
                    
                    <div class="p-5 flex items-start justify-between">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800/30">
                                {getInitials(student.nome)}
                            </div>
                            
                            <div class="min-w-0">
                                <h3 class="font-bold text-surface-900 dark:text-white leading-tight group-hover:text-emerald-600 transition-colors">
                                    {student.nome} {student.sobrenome}
                                </h3>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-500">
                                        {student.classe}ª Classe
                                    </span>
                                    <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-500">
                                        {calculateAge(student.dataNascimento)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button 
                            on:click={() => goto(`/dashboard/foreman/student/${student.id}/edit`)}
                            class="text-surface-400 hover:text-surface-900 dark:hover:text-white p-1 transition-colors"
                            title="Editar Perfil"
                        >
                            <Settings2 size={18} />
                        </button>
                    </div>

                    <button 
                        class="mt-auto border-t border-surface-100 dark:border-surface-700 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex items-center justify-center gap-2 rounded-b-lg uppercase tracking-widest"
                        on:click={() => goto(`/dashboard/foreman/student/${student.id}/class`)}
                    >
                        <Play size={14} class="fill-current" />
                        Iniciar Sessão
                    </button>

                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>