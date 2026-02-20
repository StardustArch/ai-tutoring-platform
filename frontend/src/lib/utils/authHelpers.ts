// src/lib/utils/authHelpers.ts
import type { User } from '$lib/store/auth';

export const userRoles = {
    ADMIN: 'ADMIN',
    USER: 'USER'
} as const;

export function isAdmin(user: User | null): boolean {
    return user?.role === userRoles.ADMIN;
}

export function isEncarregado(user: User | null): boolean {
    return !!user?.perfilEncarregado;
}

export function isProfessor(user: User | null): boolean {
    return !!user?.perfilProfessor;
}

export function getUserRoleDisplay(user: User | null): string {
    if (!user) return 'Visitante';
    
    if (isAdmin(user)) return 'Administrador';
    if (isEncarregado(user) && isProfessor(user)) return 'Encarregado & Professor';
    if (isEncarregado(user)) return 'Encarregado';
    if (isProfessor(user)) return 'Professor';
    
    return 'Utilizador';
}

export function hasMultipleRoles(user: User | null): boolean {
    if (!user) return false;
    return [isEncarregado(user), isProfessor(user)].filter(Boolean).length > 1;
}

// Helper para professor verificado
export function isProfessorVerificado(user: User | null): boolean {
    return !!user?.perfilProfessor?.isVerificado;
}