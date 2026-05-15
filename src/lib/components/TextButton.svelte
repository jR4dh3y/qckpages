<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'neutral' | 'green' | 'solid';

	interface Props {
		tone?: Tone;
		size?: 'md' | 'lg';
		fullWidth?: boolean;
		isLoading?: boolean;
		disabled?: boolean;
		onclick: () => void | Promise<void>;
		children: Snippet;
	}

	let {
		tone = 'neutral',
		size = 'md',
		fullWidth = false,
		isLoading = false,
		disabled = false,
		onclick,
		children
	}: Props = $props();
	let classes = $derived([
		'inline-flex items-center justify-center gap-2 border font-black transition',
		'disabled:cursor-wait disabled:opacity-50',
		size === 'lg' ? 'h-12 px-4 text-sm' : 'h-9 px-3 text-sm',
		fullWidth && 'w-full',
		tone === 'solid'
			? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--green)]'
			: tone === 'green'
				? 'border-[var(--soft-line)] bg-[var(--panel)] text-[var(--green)] hover:border-[var(--green)] hover:bg-[var(--soft-green)]'
				: 'border-[var(--soft-line)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--paper)]'
	]);
</script>

<button
	type="button"
	class={classes}
	disabled={disabled || isLoading}
	onclick={() => void onclick()}
>
	{@render children()}
</button>
