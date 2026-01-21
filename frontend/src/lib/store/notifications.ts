import { writable } from 'svelte/store';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    timeout?: number;
}

function createNotificationStore() {
    const { subscribe, update } = writable<Notification[]>([]);

    return {
        subscribe,
        send: (message: string, type: NotificationType = 'info', timeout = 4000) => {
            const id = crypto.randomUUID();
            const notification: Notification = { id, message, type, timeout };
            
            update((n) => [...n, notification]);

            if (timeout > 0) {
                setTimeout(() => {
                    update((n) => n.filter((item) => item.id !== id));
                }, timeout);
            }
        },
        remove: (id: string) => {
            update((n) => n.filter((item) => item.id !== id));
        }
    };
}

export const notifications = createNotificationStore();