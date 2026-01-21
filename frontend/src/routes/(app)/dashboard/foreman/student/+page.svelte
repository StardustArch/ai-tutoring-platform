<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { apiFetch } from '$lib/utils/api';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { 
        UserPlus, Settings, School, Trash2, Edit, 
        MoreVertical, GraduationCap, Calendar, Users, 
		Play

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
        if (!dateString) return 'Idade n/d';
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} anos`;
    }

    // Gerar cor de fundo baseada na inicial do nome (Estética consistente)

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

    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-surface-200 dark:border-surface-700 pb-6">
        <div>
            <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3">
                <Users class="text-primary-500" />
                Gerir Educandos
            </h1>
            <p class="text-surface-600 dark:text-surface-400 mt-1">
                Adicione, edite ou configure os perfis dos seus filhos.
            </p>
        </div>

        <button 
                                class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"

            on:click={() => goto('/dashboard/foreman/student/create')}
        >
            <UserPlus size={20} />
            <span>Adicionar Novo</span>
        </button>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each Array(3) as _}
                <div class="h-64 bg-surface-200 dark:bg-surface-800 rounded-2xl animate-pulse"></div>
            {/each}
        </div>

    {:else if students.length === 0}
                           <div class=" flex flex-col items-center justify-center bg-gradient-to-br from-surface-50 to-white dark:from-surface-900 dark:to-surface-800 rounded-2xl p-8 text-center border-2 border-dashed border-surface-300 dark:border-surface-700">

            <div class="p-4 bg-surface-200 dark:bg-surface-700 rounded-full mb-4 text-surface-500">
                <GraduationCap size={48} />
            </div>
            <h3 class="text-xl font-bold text-surface-900 dark:text-white">Nenhum educando encontrado</h3>
            <p class="text-surface-500 max-w-sm mt-2 mb-6">
                Para começar a usar o KaniMente, precisa de registar o perfil do seu primeiro educando.
            </p>
            <button 
                    class="inline-flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
                on:click={() => goto('/dashboard/foreman/student/create')}
            >
                Registar Educando
            </button>
        </div>

    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each students as student}
                <div class="group bg-white dark:bg-surface-800 rounded-2xl shadow-sm hover:shadow-md border border-surface-200 dark:border-surface-700 overflow-hidden transition-all duration-300">
                    
                    <div class="p-6 flex items-start justify-between">
                        <div class="flex items-center gap-4">
                            <div class={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${getAvatarColor(student.nome)}`}>
                                {student.nome.charAt(0)}
                            </div>
                            
                            <div>
                                <h3 class="font-bold text-lg text-surface-900 dark:text-white leading-tight">
                                    {student.nome}
                                </h3>
                                <p class="text-sm text-surface-500">{student.sobrenome}</p>
                            </div>
                        </div>

                        <button 
                            on:click={() => goto(`/dashboard/foreman/student/${student.id}/edit`)}
                            class="text-surface-400 hover:text-primary-500 transition-colors p-2"
                            title="Editar Perfil"
                        >
                            <Edit size={18} />
                        </button>
                    </div>

                    <div class="px-6 pb-6 space-y-3">
                        <div class="flex items-center gap-3 text-sm text-surface-600 dark:text-surface-300 bg-surface-50 dark:bg-surface-700/50 p-3 rounded-xl">
                            <GraduationCap size={18} class="text-primary-500" />
                            <span class="font-medium">{student.classe}ª Classe</span>
                        </div>
                        
                        <div class="flex items-center gap-3 text-sm text-surface-600 dark:text-surface-300 bg-surface-50 dark:bg-surface-700/50 p-3 rounded-xl">
                            <Calendar size={18} class="text-primary-500" />
                            <span>{calculateAge(student.dataNascimento)}</span>
                        </div>
                    </div>

<div class="border-t border-surface-100 dark:border-surface-700 grid grid-cols-1 divide-x divide-surface-100 dark:divide-surface-700">
                        
                        
                        <button 
                            class="p-3 text-sm font-bold text-surface-500 hover:text-blue-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors flex items-center justify-center gap-2"
                            on:click={() => goto(`/dashboard/foreman/student/${student.id}/class`)}
                        >
                            <Play size={16} />
                            Iniciar Sessão
                        </button>
                    </div>

                </div>
            {/each}
        </div>
    {/if}
</div>