// src/lib/stores/auth.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_API_URL_HOST } from '$env/static/public';

// src/lib/stores/auth.ts
export interface PerfilEncarregado {
    id: number;
    usuarioId: number;
    alunos: Aluno[];
}

export interface PerfilProfessor {
    id: number;
    escola?: string;
    isVerificado: boolean;
    usuarioId: number;
    disciplinas: Disciplina[];
    alunos: Aluno[];
}

export interface Aluno {
    id: number;
    nome: string;
    sobrenome: string;
    dataNascimento?: string;
    classe: number;
    encarregadoId: number;
}

export interface Disciplina {
    id: number;
    nome: string;
}

export interface User {
    id: number;
    email: string;
    nome: string;
    role: string;
    sobrenome: string;
    telefone: string;
    oauthProvider?: string | null;
    oauthId?: string | null;
    perfilEncarregado?: PerfilEncarregado | null;
    perfilProfessor?: PerfilProfessor | null;
}

export interface AuthState {
    isAuthenticated: boolean;
    accessToken: string | null;
    refreshToken: string | null;
    user: User | null;
    isLoading: boolean;
}

const initialState: AuthState = {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    user: null,
    isLoading: true
};


    const { subscribe, set, update } = writable<AuthState>(initialState);

    // Função de debug
    const debugTokens = () => {
        if (!browser) return;

        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');


        if (accessToken) {
            // Tentar decodificar o token JWT (se for JWT)
            try {
                const payload = JSON.parse(atob(accessToken.split('.')[1]));
            } catch (e) {
            }
        }
    };

    // Função auxiliar para buscar dados do usuário
    // Função auxiliar para buscar dados do usuário
    const getCurrentUser = async (token: string): Promise<User> => {


        const response = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });



        if (!response.ok) {
            console.error('❌ [GET USER] Erro ao buscar dados do usuário:', response.status);
            const errorText = await response.text();
            console.error('❌ [GET USER] Detalhes do erro:', errorText);
            throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();


        return userData;
    };

    // Função de logout
    const logout = () => {

        if (browser) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
        set({ ...initialState, isLoading: false });
    };

    // Função de refresh
    const refresh = async (): Promise<{ accessToken: string; refreshToken?: string }> => {

        // Debug dos tokens
        debugTokens();

        const refreshTokenLocalStorage = browser ? localStorage.getItem('refreshToken') : null;

        if (!refreshTokenLocalStorage) {
            logout();
            throw new Error('No refresh token available');
        }

        try {
            const headers: any = {
                'Content-Type': 'application/json'
            };

            // Para OAuth, enviamos no header Authorization
            headers['Authorization'] = `Bearer ${refreshTokenLocalStorage}`;


            const response = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/refresh`, {
                method: 'POST',
                headers: headers,
                credentials: 'include' // Para cookies (login manual)
            });


            if (!response.ok) {
                let errorMessage = `Token refresh failed: ${response.status}`;

                // Tentar obter mais informações do erro
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    const errorText = await response.text();
                }

                throw new Error(errorMessage);
            }

            const tokens = await response.json();

            // Atualizar tokens
            if (browser) {
                localStorage.setItem('accessToken', tokens.accessToken);

                if (tokens.refreshToken) {
                    localStorage.setItem('refreshToken', tokens.refreshToken);
                }
            }

            // Buscar dados do usuário com o novo token
            const user = await getCurrentUser(tokens.accessToken);

            set({
                isAuthenticated: true,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken || refreshTokenLocalStorage,
                user,
                isLoading: false
            });

            return tokens;
        } catch (error) {
            logout();
            throw error;
        }
    };
    
function createAuthStore() {
    // InitializeAuth corrigido
    async function initializeAuth() {
        update(state => ({ ...state, isLoading: true }));

        const accessToken = browser ? localStorage.getItem('accessToken') : null;
        const refreshToken = browser ? localStorage.getItem('refreshToken') : null;


        // Se não temos access token mas temos refresh token, tentar renovar
        if (!accessToken && refreshToken) {
            try {
                await refresh();
                return;
            } catch (error) {
                // Se o refresh falhar, limpar tudo
                logout();
                return;
            }
        }

        // Se temos access token, verificar se é válido
        if (accessToken) {
            try {
                const user = await getCurrentUser(accessToken);
                set({
                    isAuthenticated: true,
                    accessToken,
                    refreshToken,
                    user,
                    isLoading: false
                });
            } catch (error) {

                // Se o access token é inválido mas temos refresh token, tentar renovar
                if (refreshToken) {
                    try {
                        await refresh();
                        return;
                    } catch (refreshError) {
                        // Se ambos falharem, limpar tudo
                        logout();
                    }
                } else {
                    // Se não temos refresh token, limpar tudo
                    logout();
                }
            }
        } else {
            // Sem tokens, estado inicial
            set({ ...initialState, isLoading: false });
        }
    }

    // Inicializar com tokens do localStorage e buscar dados do usuário
    if (browser) {
        initializeAuth();
    }

    return {
        subscribe,
        set,

        // Login unificado para ambos os métodos
        login: async (credentials: { email: string; password: string } | { accessToken: string; refreshToken: string }) => {

            if ('email' in credentials) {
            } else {
            }

            update(state => ({ ...state, isLoading: true }));

            try {
                let tokens: { accessToken: string; refreshToken: string };

                if ('email' in credentials) {
                    // Login manual

                    const response = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/token`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(credentials)
                    });


                    if (!response.ok) {
                        console.error('❌ [AUTH LOGIN] Erro na resposta do servidor');
                        const error = await response.json();
                        console.error('❌ [AUTH LOGIN] Detalhes do erro:', error);
                        throw new Error(error.message || 'Login failed');
                    }

                    tokens = await response.json();

                } else {
                    // Login OAuth
                    tokens = {
                        accessToken: credentials.accessToken,
                        refreshToken: credentials.refreshToken || ''
                    };
                }

                // PRIMEIRO: Buscar dados do usuário ANTES de salvar (para testar se o token é válido)
                try {
                    const user = await getCurrentUser(tokens.accessToken);

                    // SEGUNDO: Guardar tokens no localStorage (após confirmar que funcionam)
                    if (browser) {
                        localStorage.setItem('accessToken', tokens.accessToken);

                        if (tokens.refreshToken) {
                            localStorage.setItem('refreshToken', tokens.refreshToken);
                        } else {
                            console.warn('⚠️ [AUTH LOGIN] Nenhum refresh token recebido');
                        }
                    }

                    // TERCEIRO: Atualizar estado com todos os dados
                    set({
                        isAuthenticated: true,
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        user: user,
                        isLoading: false
                    });


                    return { success: true, user };

                } catch (userError) {

                    throw new Error('Falha ao carregar dados do usuário: ' + userError);
                }

            } catch (error) {


                // Limpar tokens em caso de erro
                if (browser) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                }

                update(state => ({ ...state, isLoading: false }));

                throw error;
            }
        },
        // Registar novo usuário
        register: async (userData: { email: string; password: string; name: string }) => {
            update(state => ({ ...state, isLoading: true }));

            try {
                const response = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Registration failed');
                }

                const result = await response.json();
                update(state => ({ ...state, isLoading: false }));

                return { success: true, message: result.message };
            } catch (error) {
                update(state => ({ ...state, isLoading: false }));
                throw error;
            }
        },

        // Refresh token (expor a função)
        refresh,

        refreshUser: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        try {
            const user = await getCurrentUser(token);
            update(s => ({ ...s, user }));
        } catch (e) {
            console.error(e);
        }
    },
        // Logout (expor a função)
        logout,

        // Atualizar dados do usuário
        updateUser: (userData: Partial<User>) => {
            update(state => ({
                ...state,
                user: state.user ? { ...state.user, ...userData } : null
            }));
        },

        // Debug function (opcional)
        debugTokens
    };
}

export const auth = createAuthStore();