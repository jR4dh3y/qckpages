<script lang="ts">
	import { CreditCard, Settings } from 'lucide-svelte';

	interface Props {
		kind?: 'upgrade' | 'portal';
		isLoading?: boolean;
		onclick: () => void | Promise<void>;
	}

	let { kind = 'upgrade', isLoading = false, onclick }: Props = $props();
	let label = $derived(kind === 'portal' ? 'Billing portal' : 'Upgrade');
</script>

<button
	type="button"
	class="inline-flex h-9 items-center justify-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-3 text-xs font-black tracking-[0.12em] text-[var(--paper)] uppercase transition hover:bg-[var(--green)] disabled:cursor-wait disabled:bg-[var(--muted)]"
	disabled={isLoading}
	onclick={() => void onclick()}
>
	{#if kind === 'portal'}
		<Settings size={15} />
	{:else}
		<CreditCard size={15} />
	{/if}
	{label}
</button>
