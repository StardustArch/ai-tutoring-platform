// src/hooks.server.ts
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // 1. Pegar o URL que o utilizador está a tentar aceder
  const path = event.url.pathname;

  // 2. Pegar o "crachá" (Token ou Cookie de sessão)
  // Nota: Substitui 'access_token' pelo nome que usaste no login
  const token = event.cookies.get('accessToken'); 

  // --- REGRAS DO PORTEIRO ---

  // REGRA 1: Proteger o Dashboard (Área Privada)
  // Se o utilizador tenta ir para "/dashboard" e NÃO tem token...
  if (path.startsWith('/dashboard') && !token) {
    // ...chuta ele de volta para o login
    throw redirect(303, '/login');
  }

  // REGRA 2: Proteger o Login (Se já está logado, não deve ver o login)
  // Se tem token e tenta ir para "/auth/login"...
  if (path.startsWith('/auth') && token) {
    // ...manda ele direto para o dashboard
    throw redirect(303, '/dashboard');
  }

  // Se passou pelas regras, deixa o utilizador entrar
  const response = await resolve(event);
  return response;
};