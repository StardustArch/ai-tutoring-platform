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
    let accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    
    const config: RequestInit = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        }
    };

    if (accessToken) {
        (config.headers as any)['Authorization'] = `Bearer ${accessToken}`;
    }

    console.log(`📡 [API] Chamando: ${url}`, { 
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken 
    });

    let response = await fetch(url, config);
    console.log(`📡 [API] Status: ${response.status} para ${url}`);

    // Se token expirou (401) E temos refresh token, tentar refresh
    if (response.status === 401 && refreshToken) {
        console.warn('⚠️ [API] Token expirado (401). Tentando refresh...');
        
        try {
            // Evitar múltiplos refresh simultâneos
            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = auth.refresh();
            }

            // Aguardar o refresh atual
            await refreshPromise;
            
            // Ler o NOVO token após o refresh
            const newAccessToken = getAccessToken();
            console.log('✅ [API] Refresh completado. Novo token:', !!newAccessToken);
            
            if (newAccessToken) {
                // Repetir o pedido original com o novo token
                (config.headers as any)['Authorization'] = `Bearer ${newAccessToken}`;
                console.log('🔄 [API] Repetindo pedido original...');
                response = await fetch(url, config);
                console.log(`📡 [API] Status após refresh: ${response.status}`);
                return response;
            } else {
                console.error('❌ [API] Nenhum token após refresh');
                throw new Error('Falha na autenticação - token não renovado');
            }
        } catch (error) {
            console.error('❌ [API] Falha no refresh:', error);
            // Não fazer logout automaticamente, deixe o componente lidar
            throw error;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    } else if (response.status === 401 && !refreshToken) {
        console.error('❌ [API] Não há refresh token disponível');
        throw new Error('Sessão expirada - faça login novamente');
    }

    return response;
}