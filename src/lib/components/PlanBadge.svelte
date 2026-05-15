<script lang="ts">
	interface Props {
		tier: 'free' | 'pro';
	}

	let { tier }: Props = $props();
	let label = $derived(tier === 'pro' ? 'Pro' : 'Free');
</script>

<span class="inline-flex h-9 items-center gap-2 px-1 text-sm font-bold text-[var(--muted)]">
	<span
		class={[
			'size-2 border border-[var(--ink)]',
			tier === 'pro' ? 'bg-[var(--green)]' : 'bg-[var(--line)]'
		]}
	></span>
	{label} plan
</span>
