// src/lib/stores/auth.ts
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_API_URL_HOST } from '$env/static/public';
import { goto } from '$app/navigation';

// --- Interfaces (Mantidas iguais) ---
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

// Variável para controlar se já estamos a fazer refresh (evita race conditions)
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

// --- Helpers de Cookies ---

function setCookie(name: string, value: string, days = 7) {
  if (!browser) return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  if (!browser) return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
}

// --- Store ---
const { subscribe, set, update } = writable<AuthState>({ ...initialState });

// --- Funções Auxiliares Internas ---
// 2. onRefreshed a aceitar string ou null
const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = []; 
};

// 3. addRefreshSubscriber com a mesma tipagem
const addRefreshSubscriber = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const getCurrentUser = async (token: string): Promise<User> => {
  const res = await fetch(`${PUBLIC_API_URL_HOST}/api/profile/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user data: ${res.status}`);
  }
  return await res.json();
};

// --- Funções Públicas ---

const logout = async () => {
  const currentToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (browser) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    deleteCookie(ACCESS_TOKEN_KEY);
  }

  set({ ...initialState, isLoading: false });

  if (currentToken) {
    try {
      await fetch(`${PUBLIC_API_URL_HOST}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
      });
    } catch (e) {
      console.warn('Logout backend failed (non-critical)', e);
    }
  }

  if (browser) window.location.href = '/login';
};

const refresh = async (): Promise<string> => {
  if (!browser) throw new Error('Refresh only in browser');
  
  const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!storedRefresh) {
    throw new Error('No refresh token');
  }

  try {
    const response = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedRefresh}`
      },
    });

    if (!response.ok) throw new Error('Refresh failed');

    const tokens = await response.json();

    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    setCookie(ACCESS_TOKEN_KEY, tokens.accessToken);
    
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }

    update(s => ({
      ...s,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || storedRefresh,
      isAuthenticated: true
    }));

    return tokens.accessToken;
  } catch (error) {
    console.error('[AUTH] Refresh fatal error:', error);
    logout();
    throw error;
  }
};

// --- Factory ---

function createAuthStore() {
  
  // --- NOVA FUNÇÃO QUE FALTAVA ---
  // Atualiza apenas os dados do utilizador (Profile) sem mudar o token
  const refreshUser = async () => {
    if (!browser) return;
    
    // Tenta pegar o token do estado ou do localStorage
    const token = get({ subscribe }).accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    
    if (!token) return;

    try {
        const user = await getCurrentUser(token);
        // Atualiza persistência e estado
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        update(s => ({ ...s, user }));
        return user;
    } catch (e) {
        console.error('[AUTH] Failed to refresh user profile:', e);
    }
  };

  async function initializeAuth() {
    if (!browser) return;
    
    const current = get({ subscribe });
    if(current.user && current.isAuthenticated) return;

    update(s => ({ ...s, isLoading: true }));

    const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedUserRaw = localStorage.getItem(USER_KEY);

    if (storedUserRaw && storedAccess) {
      update(s => ({
        ...s,
        user: JSON.parse(storedUserRaw),
        accessToken: storedAccess,
        refreshToken: storedRefresh,
        isAuthenticated: true
      }));
    }

    if (storedAccess) {
      try {
        const user = await getCurrentUser(storedAccess);
        setCookie(ACCESS_TOKEN_KEY, storedAccess);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        
        update(s => ({ 
          ...s, 
          user, 
          isAuthenticated: true, 
          accessToken: storedAccess,
          refreshToken: storedRefresh,
          isLoading: false 
        }));
      } catch (e) {
        if (storedRefresh) {
            try {
                await refresh();
                const newToken = localStorage.getItem(ACCESS_TOKEN_KEY);
                if(newToken) {
                    const user = await getCurrentUser(newToken);
                    update(s => ({ ...s, user, isLoading: false }));
                }
            } catch {
                logout();
            }
        } else {
            logout();
        }
      }
    } else {
      update(s => ({ ...s, isLoading: false }));
    }
  }

  // Wrapper para fetch que lida com 401
const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token = get({ subscribe }).accessToken;

    if (!token && browser) {
      token = localStorage.getItem(ACCESS_TOKEN_KEY); // ou a tua constante ACCESS_TOKEN_KEY
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    } as HeadersInit;

    let response = await fetch(url, { ...options, headers });

    // Se bater no 401 (Não Autorizado)
if (response.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refresh(); // Como o teu refresh() está perfeito, vai estourar aqui se falhar!
          isRefreshing = false;
          onRefreshed(newToken); // Sucesso: avisa a malta!
        } catch (e) {
          isRefreshing = false;
          onRefreshed(null); // Avisa a malta que o barco afundou

          if (browser) {
            // Um chuto tradicional que nunca falha (ignora o router do SvelteKit que pode estar bloqueado)
            window.location.href = '/login';
          }
          
          // 👇 A MUDANÇA DRÁSTICA: Em vez de "return response;", lançamos um ERRO 👇
          throw new Error('SessionExpired');
        }
      }

      // ── A Fila de Espera ──
      // Repara que agora também passamos o "reject" para matar as Promises presas!
      return new Promise((resolve, reject) => { 
        addRefreshSubscriber((newToken) => {
          if (newToken) {
            const newHeaders = {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`
            } as HeadersInit;
            resolve(fetch(url, { ...options, headers: newHeaders }));
          } else {
            // 👇 E AQUI TAMBÉM: Rejeitamos em vez de devolver a resposta 401 👇
            reject(new Error('SessionExpired'));
          }
        });
      });
    }

    return response;
  };

  return {
    subscribe,
    set,
    initializeAuth,
    fetchWithAuth,
    refresh,
    logout,
    refreshUser, // <--- EXPORTADA AQUI
    
    login: async (credentials: any) => {
      update(s => ({ ...s, isLoading: true }));
      try {
        let tokens;
        
        // Suporta login normal (email/pass) ou login direto (tokens oauth)
        if (credentials.email) {
            const res = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Login falhou');
            }
            tokens = await res.json();
        } else {
            tokens = credentials;
        }

        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        setCookie(ACCESS_TOKEN_KEY, tokens.accessToken);
        if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

        const user = await getCurrentUser(tokens.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        set({
          isAuthenticated: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
          isLoading: false
        });

        return { success: true, user: user };
      } catch (e) {
        set({ ...initialState, isLoading: false });
        throw e;
      }
    }
  };
}

export const auth = createAuthStore();