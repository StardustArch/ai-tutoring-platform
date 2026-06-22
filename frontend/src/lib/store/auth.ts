import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_API_URL_HOST } from '$env/static/public';

// --- Interfaces (Mantidas para tipagem) ---
export interface Aluno {
  id: number;
  nome: string;
  sobrenome: string;
  classe: number;
  encarregadoId: number;
}

export interface User {
  telefone: string;
  id: number;
  email: string;
  nome: string;
  sobrenome?: string;
  role?: string;
  perfilEncarregado?: { id: number; alunos: Aluno[] } | null;
  perfilProfessor?: { id: number; isVerificado: boolean } | null;
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

let isRefreshing = false;
let isInitializing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

// --- Helpers de Cookies Corrigidos (Correção do Bug de Deleção) ---
function setCookie(name: string, value: string, days = 7) {
  if (!browser) return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  if (!browser) return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

function deleteCookie(name: string) {
  if (!browser) return;
  // CRITICAL FIX: Incluir a flag Secure dinamicamente na deleção para o browser aceitar o comando
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax${secure}`;
}

const { subscribe, set, update } = writable<AuthState>({ ...initialState });

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

// --- Renovação de Token Isolada ---
const refresh = async (): Promise<string> => {
  if (!browser) throw new Error('Refresh only in browser');

  const storedRefresh = getCookie(REFRESH_TOKEN_KEY);
  if (!storedRefresh) throw new Error('No refresh token available');

  try {
    const response = await fetch(`${PUBLIC_API_URL_HOST}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedRefresh}`
      },
    });

    if (!response.ok) throw new Error('Refresh endpoint rejected token');
    const tokens = await response.json();

    setCookie(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) setCookie(REFRESH_TOKEN_KEY, tokens.refreshToken);

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

const logout = async () => {
  const currentToken = getCookie(ACCESS_TOKEN_KEY);

  if (browser) {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
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
      console.warn('Logout backend non-critical failure', e);
    }
  }

  // Evita reloads infinitos se já estivermos na tela de login
  if (browser && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

function createAuthStore() {

  const refreshUser = async () => {
    const token = get({ subscribe }).accessToken || getCookie(ACCESS_TOKEN_KEY);
    if (!token) return;

    try {
      const res = await fetch(`${PUBLIC_API_URL_HOST}/api/profile/me`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const user = await res.json();
        update(s => ({ ...s, user }));
        return user;
      }
    } catch (e) {
      console.error('[AUTH] Failed to refresh user profile:', e);
    }
  };

  // --- INTERCEPTOR INTELIGENTE COM FILA DE ESPERA ---
  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token = get({ subscribe }).accessToken || getCookie(ACCESS_TOKEN_KEY);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    } as HeadersInit;

    let response = await fetch(url, { ...options, headers });

    // DEPOIS (correcto):
    if (response.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        // Usar .then() em vez de await — subscriber é adicionado ANTES do refresh terminar
        refresh()
          .then(newToken => {
            isRefreshing = false;
            onRefreshed(newToken);
          })
          .catch(() => {
            isRefreshing = false;
            onRefreshed(null);
            logout();
          });
      }

      // Todos os pedidos (incluindo o primeiro) esperam aqui
      return new Promise((resolve, reject) => {
        addRefreshSubscriber((newToken) => {
          if (newToken) {
            const newHeaders = {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`
            } as HeadersInit;
            resolve(fetch(url, { ...options, headers: newHeaders }));
          } else {
            reject(new Error('SessionExpired'));
          }
        });
      });
    }

    return response;
  };

  // --- INICIALIZAÇÃO UNIFICADA E SEGURA ---
  async function initializeAuth() {
    if (!browser) return;

    const current = get({ subscribe });
    if (current.isAuthenticated && current.user) return;
    if (isInitializing) return;

    isInitializing = true;
    update(s => ({ ...s, isLoading: true }));

    const storedAccess = getCookie(ACCESS_TOKEN_KEY);
    const storedRefresh = getCookie(REFRESH_TOKEN_KEY);

    if (storedAccess || storedRefresh) {
      try {
        // SOLUÇÃO: Usamos o fetchWithAuth aqui dentro! 
        // Se o accessToken estiver expirado, ele vai acionar o refresh trancado de forma limpa.
        const response = await fetchWithAuth(`${PUBLIC_API_URL_HOST}/api/profile/me`);

        if (!response.ok) throw new Error('Session invalid');

        const user = await response.json();
        const finalAccess = getCookie(ACCESS_TOKEN_KEY);
        const finalRefresh = getCookie(REFRESH_TOKEN_KEY);

        set({
          isAuthenticated: true,
          accessToken: finalAccess,
          refreshToken: finalRefresh,
          user,
          isLoading: false
        });
      } catch (e) {
        set({ ...initialState, isLoading: false });
      } finally {
        isInitializing = false;
      }
    } else {
      update(s => ({ ...s, isLoading: false }));
      isInitializing = false;
    }
  }

  return {
    subscribe,
    set,
    initializeAuth,
    fetchWithAuth,
    refresh,
    logout,
    refreshUser,

    login: async (credentials: any) => {
      update(s => ({ ...s, isLoading: true }));
      try {
        let tokens;
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

        setCookie(ACCESS_TOKEN_KEY, tokens.accessToken);
        if (tokens.refreshToken) setCookie(REFRESH_TOKEN_KEY, tokens.refreshToken);

        const user = await get({ subscribe }).accessToken || tokens.accessToken;
        const resUser = await fetch(`${PUBLIC_API_URL_HOST}/api/profile/me`, {
          headers: { 'Authorization': `Bearer ${user}`, 'Content-Type': 'application/json' },
        });
        const userData = await resUser.json();

        set({
          isAuthenticated: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: userData,
          isLoading: false
        });

        return { success: true, user: userData };
      } catch (e) {
        set({ ...initialState, isLoading: false });
        throw e;
      }
    }
  };
}

export const auth = createAuthStore();