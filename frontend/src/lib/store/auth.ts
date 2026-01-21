// src/lib/stores/auth.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_API_URL_HOST } from '$env/static/public';

/**
 * Tipagens do domínio (ajusta conforme o teu prisma / resposta do backend)
 */
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

export interface PerfilEncarregado {
  id: number;
  usuarioId: number;
  alunos: Aluno[];
}

export interface PerfilProfessor {
  id: number;
  escolaNome?: string;
  isVerificado: boolean;
  usuarioId: number;
}



export interface User {
  id: number;
  email: string;
  nome: string;
  sobrenome?: string;
  telefone?: string;
  role?: string;
  oauthProvider?: string | null;
  oauthId?: string | null;
  perfilEncarregado?: PerfilEncarregado | null;
  perfilProfessor?: PerfilProfessor | null;
}

/**
 * Estado do auth store
 */
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

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

/**
 * Cria o store base (writable)
 */
const { subscribe, set, update } = writable<AuthState>({ ...initialState });

/**
 * Função de debug: tenta decodificar o JWT (apenas para debugging)
 */
const debugTokens = () => {
  if (!browser) return;
  const raw = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!raw) return;
  try {
    const payload = JSON.parse(atob(raw.split('.')[1]));
    console.debug('[AUTH DEBUG] accessToken payload:', payload);
  } catch (e) {
    console.debug('[AUTH DEBUG] Não foi possível decodificar access token');
  }
};

/**
 * Função que obtém o utilizador atual usando o endpoint /api/auth/me
 * Lança exceção se falhar (o chamador decide como tratar)
 */
const getCurrentUser = async (token: string): Promise<User> => {
  const res = await fetch(`${PUBLIC_API_URL_HOST}/api/profile/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('❌ [AUTH] Falha ao buscar /api/profile/me:', res.status, text);
    throw new Error(`Failed to fetch user data: ${res.status}`);
  }

  const user = await res.json();
  return user;
};

/**
 * Função de logout: limpa localStorage e reseta o store
 */
const logout = () => {
  if (browser) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  set({
    user: null, isAuthenticated: false, isLoading: false,
    accessToken: null,
    refreshToken: null
  });
};

/**
 * Função de refresh: usa o refresh token para obter novos tokens e user
 * Retorna os tokens em caso de sucesso
 */
const refresh = async (): Promise<{ accessToken: string; refreshToken?: string }> => {
  // debug opcional
  debugTokens();

  if (!browser) throw new Error('Refresh só disponível no browser');

  const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!storedRefresh) {
    logout();
    throw new Error('No refresh token available');
  }

  try {
    // Envia request para refresh (a rota espera Authorization: Bearer <refreshToken> conforme teu backend)
    const response = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedRefresh}`
      },
      credentials: 'include'
    });

    if (!response.ok) {
      // tenta ler mensagem de erro para melhor debug
      let message = `Refresh failed: ${response.status}`;
      try {
        const err = await response.json();
        message = err?.message || message;
      } catch {
        // fallback
      }
      throw new Error(message);
    }

    const tokens = await response.json();

    // Gravar tokens no localStorage
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }

    // Buscar user com o novo access token
    const user = await getCurrentUser(tokens.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    // Atualizar state
    set({
      isAuthenticated: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || storedRefresh,
      user,
      isLoading: false
    });

    return tokens;
  } catch (error) {
    console.error('❌ [AUTH REFRESH] Falha ao refrescar tokens:', error);
    logout();
    throw error;
  }
};

/**
 * Factory do store com funções públicas
 */
function createAuthStore() {
  /**
   * initializeAuth:
   * - Restaura user do localStorage (se existir) para evitar flash de logout
   * - Tenta validar accessToken (se existir)
   * - Se o accessToken falhar, tenta refresh
   * - Se nada funcionar, faz logout
   */
  async function initializeAuth() {
    update(s => ({ ...s, isLoading: true }));

    if (!browser) {
      // SSR: manter estado como não autenticado (mas não desligar isLoading para SSR)
      set({ ...initialState, isLoading: false });
      return;
    }

    const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedUserRaw = localStorage.getItem(USER_KEY);

    // 1) Restaura user localmente (melhora UX: evita piscar)
    let parsedUser: User | null = null;
    if (storedUserRaw) {
      try {
        parsedUser = JSON.parse(storedUserRaw);
        // Atualiza estado imediatamente com o user armazenado
        update(s => ({
          ...s,
          user: parsedUser,
          isAuthenticated: !!storedAccess,
        }));
      } catch (e) {
        console.warn('[AUTH] Falha ao parsear user do localStorage:', e);
      }
    }

    // 2) Se temos access token, tenta validar /me (faz em background)
    if (storedAccess) {
      try {
        const freshUser = await getCurrentUser(storedAccess);
        // Atualiza localStorage e state com user mais recente
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        set({
          isAuthenticated: true,
          accessToken: storedAccess,
          refreshToken: storedRefresh,
          user: freshUser,
          isLoading: false
        });
        return;
      } catch (err) {
        console.info('[AUTH] Access token inválido ou expirado, tentando refresh se possível');
        // cairá para a parte de refresh abaixo
      }
    }

    // 3) Se chegámos aqui e temos refresh token, tentar refresh
    if (storedRefresh) {
      try {
        await refresh();
        return;
      } catch (err) {
        console.warn('[AUTH] Refresh falhou:', err);
        logout();
        return;
      }
    }

    // 4) Não há tokens válidos -> estado inicial limpo
    set({ ...initialState, isLoading: false });
  }

  // Inicia só no browser
  if (browser) {
    // Não await aqui; chama e deixamos correr (mas initializeAuth já gere isLoading)
    initializeAuth();
  }

  return {
    subscribe,
    set,

    /**
     * login: unificado para login por credenciais (email/password) e OAuth (tokens)
     * - Se receber { email, password } faz POST /api/auth/token
     * - Se receber { accessToken, refreshToken } usa diretamente (OAuth)
     * - Garante que user seja buscado antes de salvar no localStorage
     */
    login: async (credentials: { email: string; password: string } | { accessToken: string; refreshToken?: string }) => {
      update(s => ({ ...s, isLoading: true }));

      try {
        let tokens: { accessToken: string; refreshToken?: string } | null = null;

        if ('email' in credentials) {
          // Login com email/password
          const res = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
          });

          if (!res.ok) {
            let errMsg = `Login failed: ${res.status}`;
            try {
              const err = await res.json();
              errMsg = err?.message || errMsg;
            } catch {}
            throw new Error(errMsg);
          }

          tokens = await res.json();
        } else {
          // Login via OAuth (tokens já fornecidos)
          tokens = {
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken || ''
          };
        }

        if (!tokens || !tokens.accessToken) {
          throw new Error('No access token returned from login');
        }

        // PRIMEIRO: Testar /me com o token antes de persistir (garante token válido)
        const user = await getCurrentUser(tokens.accessToken);

        // SEGUNDO: Persistir tokens e user
        if (browser) {
          localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
          if (tokens.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
          }
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        }

        // TERCEIRO: Atualizar store
        set({
          isAuthenticated: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || null,
          user,
          isLoading: false
        });

        return { success: true, user };
      } catch (error) {
        console.error('❌ [AUTH LOGIN] erro:', error);
        // limpeza em caso de falha
        if (browser) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
        update(s => ({ ...s, isLoading: false }));
        throw error;
      }
    },

    /**
     * register: registar novo utilizador (chama o endpoint /api/auth/register)
     * Ajusta payload conforme teu DTO do backend.
     */
    register: async (userData: { email: string; password: string; nome?: string; sobrenome?: string; telefone?: string }) => {
      update(s => ({ ...s, isLoading: true }));
      try {
        const res = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });

        if (!res.ok) {
          let message = `Registration failed: ${res.status}`;
          try {
            const err = await res.json();
            message = err?.message || message;
          } catch {}
          throw new Error(message);
        }

        const result = await res.json();

        update(s => ({ ...s, isLoading: false }));
        return { success: true, message: result.message || 'Registered' };
      } catch (error) {
        console.error('❌ [AUTH REGISTER] erro:', error);
        update(s => ({ ...s, isLoading: false }));
        throw error;
      }
    },

    // expor refresh para uso manual
    refresh,

    /**
     * refreshUser: reconsulta /api/auth/me com o token atual e atualiza user no store e localStorage
     */
    refreshUser: async () => {
      if (!browser) return;
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;
      try {
        const user = await getCurrentUser(token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        update(s => ({ ...s, user }));
      } catch (err) {
        console.error('❌ [AUTH refreshUser] falha ao atualizar user:', err);
      }
    },

    // logout público
    logout,

    /**
     * updateUser: atualiza o objecto user no store e persiste no localStorage
     */
    updateUser: (userData: Partial<User>) => {
      update(state => {
        const newUser = state.user ? { ...state.user, ...userData } : null;
        if (browser && newUser) {
          try {
            localStorage.setItem(USER_KEY, JSON.stringify(newUser));
          } catch (e) {
            console.warn('[AUTH] Falha ao salvar user no localStorage:', e);
          }
        }
        return {
          ...state,
          user: newUser
        };
      });
    },

    // debug
    debugTokens,

    // função auxiliar para obter o user síncrono (poderás não precisar)
    getUserSync: () => {
      let current: AuthState;
      const unsub = subscribe(s => (current = s));
      unsub();
      // @ts-ignore
      return current!.user as User | null;
    }
  };
}

export const auth = createAuthStore();
