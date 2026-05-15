<script lang="ts">
	interface Props {
		tier: 'free' | 'pro';
	}

	let { tier }: Props = $props();
	let label = $derived(tier === 'pro' ? 'Pro' : 'Free');
</script>

<span class="inline-flex h-9 items-center gap-2 px-1 text-sm font-bold text-(--muted)">
	<span class={['size-2 border border-(--ink)', tier === 'pro' ? 'bg-(--green)' : 'bg-(--line)']}
	></span>
	{label} plan
</span>
