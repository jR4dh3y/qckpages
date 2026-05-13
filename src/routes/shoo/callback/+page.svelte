<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/client/theme.svelte';

	onMount(() => {
		theme.init();

		const timeout = window.setTimeout(() => {
			window.location.replace('/');
		}, 1200);

		return () => window.clearTimeout(timeout);
	});
</script>

<svelte:head>
	<title>Signing in | QckPages</title>
</svelte:head>

<main class="grid min-h-dvh place-items-center bg-[var(--paper)] px-6 text-[var(--ink)]">
	<section
		class="w-full max-w-sm border-2 border-[var(--ink)] bg-[var(--panel)] p-6 shadow-[8px_8px_0_var(--ink)]"
	>
		<p class="text-xs font-black tracking-[0.24em] text-[var(--hot)] uppercase">QckPages</p>
		<h1 class="mt-3 text-2xl font-black">Signing in</h1>
		<p class="mt-2 text-sm text-[var(--muted)]">Taking you back.</p>
	</section>
</main>
