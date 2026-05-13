<script lang="ts">
	import { Moon, Sun } from 'lucide-svelte';
	import { theme } from '$lib/client/theme.svelte';
	import IconButton from './IconButton.svelte';
</script>

<IconButton
	label={theme.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	title={theme.mode === 'dark' ? 'Light mode' : 'Dark mode'}
	onclick={() => theme.toggle()}
>
	{#if theme.mode === 'dark'}
		<Sun size={18} />
	{:else}
		<Moon size={18} />
	{/if}
</IconButton>
