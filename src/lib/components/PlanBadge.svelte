<script lang="ts">
	interface Props {
		tier: 'free' | 'pro';
	}

	let { tier }: Props = $props();
	let label = $derived(tier === 'pro' ? 'Pro' : 'Free');
</script>

<span
	class={[
		'inline-flex h-9 items-center border-2 px-3 text-xs font-black tracking-[0.16em] uppercase',
		tier === 'pro'
			? 'border-[var(--green)] bg-[var(--soft-green)] text-[var(--green)]'
			: 'border-[var(--ink)] bg-[var(--panel)] text-[var(--ink)]'
	]}
>
	{label}
</span>
