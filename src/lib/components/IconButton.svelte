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
		disabled?: boolean;
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
		disabled = false,
		onclick,
		children
	}: Props = $props();

	let classes = $derived([
		'grid place-items-center border-2 border-(--ink) bg-(--panel) text-(--ink) transition',
		'hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-(--panel)',
		size === 'sm' ? 'size-9' : 'size-10',
		tone === 'green'
			? 'hover:bg-(--green)'
			: tone === 'red'
				? 'hover:bg-(--hot)'
				: 'hover:bg-(--accent)'
	]);
	let anchorAttributes = $derived({ href, target, rel });
</script>

{#if href}
	<a class={classes} aria-label={label} {title} {...anchorAttributes}>
		{@render children()}
	</a>
{:else}
	<button type="button" class={classes} aria-label={label} {title} {disabled} {onclick}>
		{@render children()}
	</button>
{/if}
