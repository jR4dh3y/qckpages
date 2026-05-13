<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		const timeout = window.setTimeout(() => {
			window.location.replace('/');
		}, 1200);

		return () => window.clearTimeout(timeout);
	});
</script>

<svelte:head>
	<title>Signing in | QckPages</title>
</svelte:head>

<main class="grid min-h-dvh place-items-center bg-[#f7f3ea] px-6 text-[#171717]">
	<section class="w-full max-w-sm border border-[#171717] bg-white p-6 shadow-[8px_8px_0_#171717]">
		<p class="text-xs font-bold tracking-[0.24em] text-[#d45c2c] uppercase">Shoo handshake</p>
		<h1 class="mt-3 text-2xl font-black">Finishing sign in</h1>
		<p class="mt-2 text-sm text-[#4a4a42]">You will return to the publisher in a moment.</p>
	</section>
</main>
