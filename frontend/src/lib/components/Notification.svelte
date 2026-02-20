<script lang="ts">
    import { notifications } from '$lib/store/notifications';
    import { flip } from 'svelte/animate';
    import { fade, fly } from 'svelte/transition';
    import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-svelte';

    // Ícones mapeados por tipo
    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info
    };

    // Cores mapeadas por tipo (Tailwind/Skeleton classes)
    const colors = {
        success: 'bg-emerald-500 text-white',
        error: 'bg-error-500 text-white',
        warning: 'bg-warning-500 text-black',
        info: 'bg-blue-500 text-white'
    };
</script>

<div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-md pointer-events-none p-4">
    {#each $notifications as note (note.id)}
        <div
            animate:flip={{ duration: 300 }}
            in:fly={{ y: -20, duration: 300 }}
            out:fade={{ duration: 200 }}
            class="pointer-events-auto flex items-center gap-3 p-4 rounded-lg shadow-xl {colors[note.type]} transform hover:scale-[1.02] transition-transform cursor-pointer"
            on:click={() => notifications.remove(note.id)}
            role="button"
            tabindex="0"
            on:keypress={() => notifications.remove(note.id)}
        >
            <svelte:component this={icons[note.type]} size={24} />
            
            <p class="flex-1 font-medium text-sm">{note.message}</p>
            
            <button class="opacity-70 hover:opacity-100 transition-opacity">
                <X size={18} />
            </button>
        </div>
    {/each}
</div>