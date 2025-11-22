<script lang="ts">
    import { onMount } from 'svelte';
    export let content: string;

    let htmlContent: string;

    // Função simples para converter Markdown para HTML, mantendo equações LaTeX ($$...$$)
    function renderMarkdown(markdown: string) {
        // 1. Negrito: **texto** -> <strong>texto</strong>
        let html = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 2. Itálico: *texto* -> <em>texto</em>
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // 3. Quebras de Linha (necessário para o whitespace-pre-wrap funcionar bem com markdown)
        html = html.replace(/\n/g, '<br>');

        // 4. Equações (Isolamento de LaTeX para display block)
        // Usa $$...$$ para blocos
        html = html.replace(/\$\$(.*?)\$\$/g, '<div class="math-block">$1</div>');
        
        return html;
    }

    // Usamos um bloco reativo para que a renderização ocorra sempre que o 'content' mudar
    $: htmlContent = renderMarkdown(content);
</script>

<style>
    /* Estilos para a formatação de Matemática */
    .math-block {
        display: block;
        margin: 10px 0;
        padding: 8px;
        background-color: var(--color-surface-100);
        border-left: 4px solid var(--color-primary-500);
        font-family: monospace;
        overflow-x: auto;
    }
    :global(.dark) .math-block {
        background-color: var(--color-surface-700);
        border-left: 4px solid var(--color-primary-400);
    }
</style>

<!-- Usamos @html para injetar o conteúdo HTML renderizado -->
{@html htmlContent}