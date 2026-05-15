<script lang="ts">
	import { Check, X } from 'lucide-svelte';
	import TextButton from './TextButton.svelte';

	interface Props {
		isLoading?: boolean;
		onupgrade: () => void | Promise<void>;
		onclose: () => void;
	}

	let { isLoading = false, onupgrade, onclose }: Props = $props();

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
		class="w-full max-w-sm border-2 border-[var(--ink)] bg-[var(--paper)]"
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
			<!-- Price + CTA -->
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="text-4xl font-black text-[var(--ink)]">&#8377;149</p>
					<p class="mt-1 text-sm font-bold text-[var(--muted)]">one-time payment</p>
				</div>
				<TextButton tone="solid" {isLoading} onclick={onupgrade}>Upgrade</TextButton>
			</div>

			<!-- Pro benefits -->
			<ul class="mt-6 space-y-3">
				<li class="flex items-center gap-3">
					<span
						class="grid size-6 shrink-0 place-items-center border-2 border-[var(--green)] bg-[var(--soft-green)] text-[var(--green)]"
					>
						<Check size={14} strokeWidth={3} />
					</span>
					<span class="text-sm font-bold text-[var(--ink)]">Unlimited published pages</span>
				</li>
				<li class="flex items-center gap-3">
					<span
						class="grid size-6 shrink-0 place-items-center border-2 border-[var(--green)] bg-[var(--soft-green)] text-[var(--green)]"
					>
						<Check size={14} strokeWidth={3} />
					</span>
					<span class="text-sm font-bold text-[var(--ink)]">Priority support</span>
				</li>
			</ul>
		</div>
	</div>
</div>
