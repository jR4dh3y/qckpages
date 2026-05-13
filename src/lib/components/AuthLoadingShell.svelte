<script lang="ts">
	import type { Snippet } from 'svelte';
	import AppFooter from './AppFooter.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<section class="relative flex min-h-dvh flex-col bg-[var(--paper)] text-[var(--ink)]">
	<div class="pointer-events-auto fixed top-5 right-5 z-20">
		{@render children?.()}
	</div>
	<div class="flex-1">
		<p class="sr-only" role="status">Checking session</p>
	</div>
	<AppFooter />
</section>
