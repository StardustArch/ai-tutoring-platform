<script lang="ts">
	import { auth } from '$lib/store/auth';
	import { goto } from '$app/navigation';
    import { LogOut } from 'lucide-svelte'; // Novo ícone

	function handleLogout() {
		auth.logout?.();
		goto('/login');
	}
</script>

<button 
    type="button" 
    class="btn btn-sm variant-soft-error gap-2" 
    on:click={handleLogout}
    title="Sair da conta"
>
    <LogOut size={16} />
    <span class="hidden md:inline">Sair</span>
</button>