<svelte:head>
    <title>Ativar Perfil Docente | KaniMente</title>
    <meta name="description" content="Crie a sua sala de aula virtual e comece a gerir os seus alunos." />
</svelte:head>

<script lang="ts">
    import { goto } from '$app/navigation';
    import { auth } from '$lib/store/auth'; 
    import { apiFetch } from '$lib/utils/api'; 
    import { notifications } from '$lib/store/notifications';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { School, Check, ArrowLeft, Info, Loader, Building2 } from 'lucide-svelte';
    import { page } from '$app/stores';

    let escolaNome = '';
    let isLoading = false;

    // Estilo do Input Enterprise (Focado, Sombra Suave, Borda Fina)
    const inputClass = "w-full px-3 py-2.5 border border-surface-300 dark:border-surface-600 rounded-md focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm";

    async function handleSubmit() {
        if (!escolaNome || escolaNome.trim() === "") {
            notifications.send('O nome da escola é obrigatório.', "error");
            return;
        }
        if (escolaNome.length > 0 && escolaNome.length < 3) {
            notifications.send('O nome da escola é muito curto.', 'warning');
            return;
        }

        isLoading = true;

        try {
            const response = await apiFetch(`${PUBLIC_API_URL_HOST}/api/profile/professor`, {
                method: 'POST',
                body: JSON.stringify({
                    escolaNome: escolaNome.trim() || undefined 
                })
            });

            if (response.ok) {
                await auth.refreshUser();
                notifications.send('Perfil docente ativado com sucesso.', 'success');
                setTimeout(() => {
                    goto('/dashboard/unified/overview');
                }, 1000);
            } else {
                const err = await response.json();
                throw new Error(err.message || 'Falha ao criar perfil');
            }
        } catch (error: any) {
            console.error(error);
            notifications.send(error.message || 'Erro de conexão.', 'error');
        } finally {
            isLoading = false;
        }
    }

    const ref = $page.url.searchParams.get('ref');

    function goBack() {
        if (ref === 'homef') {
            goto('/dashboard/unified/overview');
        } else {
            goto('/dashboard'); 
        }
    }
</script>

<div class="md:min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
    <div class="max-w-md w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm overflow-hidden">
        
        <div class="p-8 pb-6 text-center">
            <div class="mx-auto w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-lg flex items-center justify-center mb-4 border border-surface-200 dark:border-surface-600">
                <School size={24} class="text-surface-600 dark:text-surface-300" />
            </div>
            <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Ativar Docência</h1>
            <p class="text-surface-500 mt-2 text-sm">
                Para começar, identifique a instituição de ensino onde leciona.
            </p>
        </div>

        <div class="px-8 pb-8 space-y-6">
            <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                
                <div class="space-y-1.5">
                    <label for="escola" class="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 ml-0.5">
                        Instituição de Ensino <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                        <input 
                            id="escola"
                            type="text" 
                            class="{inputClass} pl-9"
                            bind:value={escolaNome} 
                            placeholder="Ex: Escola Primária Heróis Moçambicanos" 
                            disabled={isLoading}
                        />
                        <Building2 size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                    </div>
                </div>

                <div class="p-3 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-surface-700 rounded-md flex gap-3 items-start">
                    <Info size={16} class="text-surface-500 mt-0.5 flex-shrink-0"/>
                    <div class="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                        <span class="font-semibold text-surface-900 dark:text-surface-100 block mb-0.5">Permissões de Acesso</span>
                        Este perfil permitirá criar turmas, adicionar alunos e gerar relatórios pedagógicos detalhados.
                    </div>
                </div>

                <div class="pt-2 flex flex-col gap-3">
                    
                    <button
                        type="submit"
                        class="w-full btn bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md py-2.5 flex items-center justify-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-70"
                        disabled={isLoading}
                    >
                        {#if isLoading}
                            <Loader size={18} class="animate-spin" />
                            <span>A Configurar...</span>
                        {:else}
                            <Check size={18} />
                            <span>Confirmar e Começar</span>
                        {/if}
                    </button>
                    
                    <button
                        type="button"
                        class="w-full btn bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 font-medium rounded-md py-2.5 flex items-center justify-center gap-2 transition-all"
                        on:click={goBack}
                        disabled={isLoading}
                    >
                        <ArrowLeft size={18} />
                        Cancelar
                    </button>
                </div>

            </form>
        </div>
    </div>
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