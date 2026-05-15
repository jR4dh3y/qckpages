<script lang="ts">
	import { Check, X } from 'lucide-svelte';
	import TextButton from './TextButton.svelte';

	interface Props {
		isLoading?: boolean;
		onupgrade: () => void | Promise<void>;
		onclose: () => void;
	}

	let { isLoading = false, onupgrade, onclose }: Props = $props();

	const features = [
		{ id: 'pages', free: '5 pages', pro: 'Unlimited', text: 'Published pages' },
		{ id: 'slugs', free: true, pro: true, text: 'Custom slugs' },
		{ id: 'upload', free: true, pro: true, text: 'Drag & drop upload' },
		{ id: 'links', free: true, pro: true, text: 'Shareable links' },
		{ id: 'support', free: false, pro: true, text: 'Priority support' }
	];

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 grid place-items-center bg-[var(--ink)]/60 p-4"
	role="presentation"
	onclick={(event: MouseEvent) => {
		if (event.target === event.currentTarget) onclose();
	}}
>
	<div
		class="w-full max-w-lg border-2 border-[var(--ink)] bg-[var(--paper)]"
		role="dialog"
		aria-modal="true"
		aria-label="Upgrade to Pro"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b-2 border-[var(--ink)] px-6 py-4">
			<h2 class="text-xl font-black text-[var(--ink)]">Upgrade to Pro</h2>
			<button
				type="button"
				class="grid size-9 place-items-center border-2 border-[var(--ink)] bg-[var(--panel)] transition hover:bg-[var(--accent)]"
				aria-label="Close"
				onclick={onclose}
			>
				<X size={16} />
			</button>
		</div>

		<div class="p-6">
			<!-- Price -->
			<div class="text-center">
				<p class="text-4xl font-black text-[var(--ink)]">&#8377;149</p>
				<p class="mt-1 text-sm text-[var(--muted)]">One-time payment, yours forever</p>
			</div>

			<!-- Comparison table -->
			<div class="mt-6 border-2 border-[var(--line)]">
				<!-- Table header -->
				<div
					class="grid grid-cols-[1fr_80px_80px] border-b-2 border-[var(--line)] bg-[var(--panel)]"
				>
					<div class="px-4 py-2.5"></div>
					<div
						class="border-l border-[var(--line)] px-3 py-2.5 text-center text-xs font-black text-[var(--muted)] uppercase"
					>
						Free
					</div>
					<div
						class="border-l border-[var(--line)] bg-[var(--soft-green)] px-3 py-2.5 text-center text-xs font-black text-[var(--green)] uppercase"
					>
						Pro
					</div>
				</div>

				<!-- Rows -->
				{#each features as feature (feature.id)}
					<div class="grid grid-cols-[1fr_80px_80px] border-b border-[var(--line)] last:border-b-0">
						<div class="px-4 py-2.5 text-sm font-bold text-[var(--ink)]">
							{feature.text}
						</div>
						<div class="grid place-items-center border-l border-[var(--line)]">
							{#if typeof feature.free === 'string'}
								<span class="text-xs font-bold text-[var(--muted)]">{feature.free}</span>
							{:else if feature.free}
								<span class="text-[var(--green)]"><Check size={14} strokeWidth={3} /></span>
							{:else}
								<span class="text-[var(--line)]"><X size={14} strokeWidth={3} /></span>
							{/if}
						</div>
						<div
							class="grid place-items-center border-l border-[var(--line)] bg-[var(--soft-green)]"
						>
							{#if typeof feature.pro === 'string'}
								<span class="text-xs font-bold text-[var(--green)]">{feature.pro}</span>
							{:else}
								<span class="text-[var(--green)]"><Check size={14} strokeWidth={3} /></span>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- CTA -->
			<div class="mt-6">
				<TextButton tone="solid" size="lg" fullWidth {isLoading} onclick={onupgrade}>
					Upgrade for &#8377;149
				</TextButton>
			</div>
		</div>
	</div>
</div>
