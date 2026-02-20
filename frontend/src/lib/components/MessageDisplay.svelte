<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    export let text: string = '';
    export let delay: number = 20;                // tempo entre letras
    export let onComplete: () => void = () => {};

    let displayed = '';
    let index = 0;
    let timeoutId: any;
    let prevText = '';

    function type() {
        if (index < text.length) {
            const char = text[index];

            // Emojis e pontuação aceleram um pouco
            const isSpecial = /[\s\.,!?:-]|\p{Extended_Pictographic}/u.test(char);

            displayed += char;
            index++;

            timeoutId = setTimeout(type, isSpecial ? delay / 2 : delay);
        } else {
            onComplete();
        }
    }

    onMount(() => {
        startTyping();
    });

    onDestroy(() => {
        clearTimeout(timeoutId);
    });

    function startTyping() {
        clearTimeout(timeoutId);
        displayed = '';
        index = 0;
        type();
    }

    // Quando o texto mudar, reinicia o efeito
    $: if (text !== prevText) {
        prevText = text;
        startTyping();
    }
</script>

<div class="whitespace-pre-wrap inline-block">{displayed}</div>

{#if index < text.length}
    <span class="font-bold animate-pulse">|</span>
{/if}
