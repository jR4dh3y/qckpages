<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'yellow' | 'green' | 'red';

	interface Props {
		label: string;
		title?: string;
		tone?: Tone;
		size?: 'sm' | 'md';
		href?: string;
		target?: string;
		rel?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	}

	let {
		label,
		title = label,
		tone = 'yellow',
		size = 'md',
		href,
		target,
		rel,
		onclick,
		children
	}: Props = $props();

	let classes = $derived([
		'grid place-items-center border-2 border-[var(--ink)] bg-[var(--panel)] text-[var(--ink)] transition',
		'hover:text-[#171717]',
		size === 'sm' ? 'size-8' : 'size-10',
		tone === 'green'
			? 'hover:bg-[var(--green)]'
			: tone === 'red'
				? 'hover:bg-[var(--hot)]'
				: 'hover:bg-[var(--accent)]'
	]);
	let anchorAttributes = $derived({ href, target, rel });
</script>

{#if href}
	<a class={classes} aria-label={label} {title} {...anchorAttributes}>
		{@render children()}
	</a>
{:else}
	<button type="button" class={classes} aria-label={label} {title} {onclick}>
		{@render children()}
	</button>
{/if}
