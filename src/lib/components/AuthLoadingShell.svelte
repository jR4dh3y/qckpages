<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<section class="relative min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
	<div class="pointer-events-auto fixed top-5 right-5 z-20">
		{@render children?.()}
	</div>
	<p class="sr-only" role="status">Checking session</p>
</section>
