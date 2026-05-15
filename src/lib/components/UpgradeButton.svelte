<script lang="ts">
	import { CreditCard, Settings } from 'lucide-svelte';
	import TextButton from './TextButton.svelte';

	interface Props {
		kind?: 'upgrade' | 'portal';
		isLoading?: boolean;
		onclick: () => void | Promise<void>;
	}

	let { kind = 'upgrade', isLoading = false, onclick }: Props = $props();
	let label = $derived(kind === 'portal' ? 'Billing' : 'Upgrade Pro');
</script>

<TextButton tone="green" {isLoading} {onclick}>
	{#if kind === 'portal'}
		<Settings size={15} />
	{:else}
		<CreditCard size={15} />
	{/if}
	{label}
</TextButton>
