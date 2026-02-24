<script lang="ts">
    import { confirmStore } from '$lib/store/confirm';
    import { fade, scale } from 'svelte/transition';
    import { AlertTriangle, Info, CheckCircle2, X, HelpCircle, Trash2 } from 'lucide-svelte';

    // Subscrição ao store
    $: state = $confirmStore;

    function handleClose(value: boolean) {
        state.resolve(value);
    }

    // Configuração visual alinhada ao Enterprise Dashboard
    const styles = {
        danger: {
            icon: Trash2,
            color: 'text-rose-600 dark:text-rose-400',
            bgIcon: 'bg-rose-50 dark:bg-rose-900/20',
            btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white',
            border: 'border-rose-200 dark:border-rose-800'
        },
        warning: {
            icon: AlertTriangle,
            color: 'text-amber-600 dark:text-amber-400',
            bgIcon: 'bg-amber-50 dark:bg-amber-900/20',
            btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white',
            border: 'border-amber-200 dark:border-amber-800'
        },
        success: {
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgIcon: 'bg-emerald-50 dark:bg-emerald-900/20',
            btnConfirm: 'bg-emerald-600 hover:bg-emerald-700 text-white',
            border: 'border-emerald-200 dark:border-emerald-800'
        },
        info: {
            icon: Info,
            color: 'text-primary-600 dark:text-primary-400',
            bgIcon: 'bg-primary-50 dark:bg-primary-900/20',
            btnConfirm: 'bg-primary-600 hover:bg-primary-700 text-white',
            border: 'border-primary-200 dark:border-primary-800'
        }
    };

    $: currentStyle = styles[state.type as keyof typeof styles] || styles.info;
</script>

{#if state.isOpen}
    <div 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-[2px]"
        transition:fade={{ duration: 150 }}
    >
        <div 
            class="bg-white dark:bg-surface-800 w-full max-w-sm rounded-lg shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden"
            transition:scale={{ start: 0.95, duration: 150, opacity: 0 }}
        >
            
            <div class="p-6">
                <div class="flex items-start gap-4">
                    <div class="shrink-0 w-10 h-10 rounded-lg {currentStyle.bgIcon} {currentStyle.color} flex items-center justify-center">
                        <svelte:component this={currentStyle.icon} size={20} />
                    </div>

                    <div class="flex-1">
                        <h2 class="text-lg font-bold text-surface-900 dark:text-surface-50 tracking-tight leading-none mb-2">
                            {state.title}
                        </h2>

                        <p class="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                            {state.message}
                        </p>
                    </div>
                </div>
            </div>

            <div class="px-6 py-4 bg-surface-50/50 dark:bg-surface-900/40 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3">
                <button 
                    on:click={() => handleClose(false)}
                    class="px-4 py-2 text-xs font-semibold text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-md transition-colors"
                >
                    {state.cancelText}
                </button>
                
                <button 
                    on:click={() => handleClose(true)}
                    class="px-4 py-2 text-xs font-semibold rounded-md shadow-sm transition-colors {currentStyle.btnConfirm}"
                >
                    {state.confirmText}
                </button>
            </div>

        </div>
    </div>
{/if}

<style>
    /* Removidas animações de bounce para manter o tom sério/enterprise */
</style>