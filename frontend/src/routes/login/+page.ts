// src/routes/login/+page.ts
/** @type {import('./$types').PageLoad} */
export function load({ url }) {
	// 1. Ler o parâmetro 'error' do URL (ex: /login?error=invalid_domain)
	const error = url.searchParams.get('error');
	return { error }; // Retorna o erro para o +page.svelte
}