// src/lib/stores/confirm.ts
import { writable } from 'svelte/store';

interface ConfirmOptions {
    title?: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
}

// Estado interno
const initialState = {
    isOpen: false,
    title: 'Confirmar',
    message: '',
    type: 'info',
    confirmText: 'Sim',
    cancelText: 'Cancelar',
    resolve: (value: boolean) => {} 
};

export const confirmStore = writable(initialState);

// Função mágica para usar no código
export const confirm = (options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
        const config = typeof options === 'string' 
            ? { ...initialState, message: options } 
            : { ...initialState, ...options };

        confirmStore.set({
            ...config,
            isOpen: true,
            resolve: (val: boolean) => {
                confirmStore.update(s => ({ ...s, isOpen: false }));
                resolve(val);
            }
        });
    });
};