import { createToaster } from '@skeletonlabs/skeleton-svelte';

export const toaster = createToaster({
    placement: 'bottom-end',
});

// Tipo permitido para evitar erros de digitação
type ToastType = 'info' | 'success' | 'warning' | 'error';

// Função centralizada para chamar em qualquer componente
export function notify(title: string, description: string, type: ToastType = 'info') {
    toaster[type]({ title, description });
}