// api.ts - Com melhor tratamento
import { auth } from '$lib/store/auth';
import { browser } from '$app/environment';

function getAccessToken(): string | null {
    if (!browser) return null;
    return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
    if (!browser) return null;
    return localStorage.getItem('refreshToken');
}

let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

export async function apiFetch(url: string, options: RequestInit = {}) {
  return auth.fetchWithAuth(url, options);;
}