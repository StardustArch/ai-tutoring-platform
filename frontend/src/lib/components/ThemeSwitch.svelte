<script lang="ts">
	import { Switch } from '@skeletonlabs/skeleton-svelte';
	import { Sun, Moon } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let checked = $state(false);

	onMount(() => {
		// Aplicar o tema imediatamente ao carregar
		const savedMode = localStorage.getItem('mode') || 'light';
		document.documentElement.setAttribute('data-mode', savedMode);
		checked = savedMode === 'dark';
	});

	const onCheckedChange = (event: { checked: boolean }) => {
		const newMode = event.checked ? 'dark' : 'light';
		document.documentElement.setAttribute('data-mode', newMode);
		localStorage.setItem('mode', newMode);
		checked = event.checked;
	};
</script>

<Switch {checked} {onCheckedChange}>
	<Switch.Control>
		<Switch.Thumb>
			<Switch.Context>
				{#snippet children(switch_)}
					{#if switch_().checked}
						<Sun class="size-3" />
					{:else}
						<Moon class="size-3" />
					{/if}
				{/snippet}
			</Switch.Context>
		</Switch.Thumb>
	</Switch.Control>
	<Switch.HiddenInput />
</Switch>