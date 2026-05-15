<script lang="ts">
	interface Props {
		isPro?: boolean;
		isLoading?: boolean;
		onclick: () => void | Promise<void>;
	}

	let { isPro = false, isLoading = false, onclick }: Props = $props();
</script>

{#if isPro}
	<span
		class="inline-flex items-center border-2 border-[var(--green)] px-3 py-1.5 text-sm font-black text-[var(--green)]"
	>
		Pro
	</span>
{:else}
	<button
		type="button"
		class="inline-flex items-center border-2 border-[var(--ink)] bg-[var(--green)] px-3 py-1.5 text-sm font-black text-white transition hover:bg-[var(--ink)] disabled:cursor-wait disabled:opacity-50"
		disabled={isLoading}
		onclick={() => void onclick()}
	>
		Upgrade
	</button>
{/if}
