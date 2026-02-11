<script lang="ts">
    import { goto } from '$app/navigation';
    import { auth } from '$lib/store/auth'; 
    import { apiFetch } from '$lib/utils/api'; 
    import { notifications } from '$lib/store/notifications';
    import { PUBLIC_API_URL_HOST } from '$env/static/public';
    import { School, Check, ArrowLeft, Info, Loader } from 'lucide-svelte';
    import { page } from '$app/stores';

    let escolaNome = '';
    let isLoading = false;

    // Estilo do Input Padronizado
    const inputClass = "w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

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
                notifications.send('Bem-vindo, Professor! Perfil ativado.', 'success');
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
            goto('/dashboard/foreman/overview');
        } else {
            goto('/dashboard'); 
        }
    }
</script>

<div class="min-h-[80vh] container flex items-center justify-center p-4 animate-fade-in">
    <div class="max-w-md w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-sm overflow-hidden">
        
        <div class="p-8 text-center border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
            <div class="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4 text-primary-600 dark:text-primary-400">
                <School size={32} />
            </div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">Ativar Docência</h1>
            <p class="text-surface-500 mt-2 text-sm">
                Configure a sua sala de aula virtual para começar.
            </p>
        </div>

        <div class="p-8 space-y-6">
            <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                
                <div class="space-y-2">
                    <label for="escola" class="block text-sm font-medium text-surface-700 dark:text-surface-300">
                        Nome da Instituição *
                    </label>
                    <input 
                        id="escola"
                        type="text" 
                        class={inputClass}
                        bind:value={escolaNome} 
                        placeholder="Ex: Escola Primária Heróis Moçambicanos" 
                        disabled={isLoading}
                    />
                </div>

                <div class="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800 rounded-lg flex gap-3 items-start">
                    <Info size={18} class="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0"/>
                    <div class="text-sm text-surface-600 dark:text-surface-300">
                        <span class="font-semibold text-primary-700 dark:text-primary-300 block mb-1">Acesso Docente</span>
                        Ao confirmar, o seu perfil ganhará permissões para criar turmas e gerir alunos.
                    </div>
                </div>

                <div class="pt-2 flex flex-col gap-3">
                    
                    <button
                        type="submit"
                        class="w-full btn variant-filled-primary rounded-lg py-2.5 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                        class="w-full btn variant-outline-surface border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg py-2.5 flex items-center justify-center gap-2 focus:ring-2 focus:outline-none focus:ring-offset-white dark:focus:ring-offset-surface-800 disabled:opacity-50 disabled:cursor-not-allowed text-surface-700 dark:text-surface-300 font-medium transition-colors duration-200"
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
        animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>