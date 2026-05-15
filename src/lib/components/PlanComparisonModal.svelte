<script lang="ts">
	import { Check, X, Zap, Infinity as InfinityIcon } from 'lucide-svelte';
	import TextButton from './TextButton.svelte';

	interface Props {
		isLoading?: boolean;
		onupgrade: () => void | Promise<void>;
		onclose: () => void;
	}

	let { isLoading = false, onupgrade, onclose }: Props = $props();

	const freeFeatures = [
		{ id: 'free-pages', text: '5 published pages', included: true },
		{ id: 'free-slugs', text: 'Custom slugs', included: true },
		{ id: 'free-upload', text: 'Drag & drop upload', included: true },
		{ id: 'free-links', text: 'Shareable links', included: true },
		{ id: 'free-unlimited', text: 'Unlimited pages', included: false },
		{ id: 'free-support', text: 'Priority support', included: false }
	];

	const proFeatures = [
		{ id: 'pro-pages', text: 'Unlimited published pages', included: true },
		{ id: 'pro-slugs', text: 'Custom slugs', included: true },
		{ id: 'pro-upload', text: 'Drag & drop upload', included: true },
		{ id: 'pro-links', text: 'Shareable links', included: true },
		{ id: 'pro-support', text: 'Priority support', included: true },
		{ id: 'pro-free', text: 'Everything in Free', included: true }
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
		class="w-full max-w-2xl border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[8px_8px_0_var(--ink)]"
		role="dialog"
		aria-modal="true"
		aria-label="Choose your plan"
	>
		<!-- Modal header -->
		<div class="flex items-center justify-between border-b-2 border-[var(--ink)] px-6 py-4">
			<div>
				<h2 class="text-xl font-black text-[var(--ink)]">Choose your plan</h2>
				<p class="mt-0.5 text-sm text-[var(--muted)]">Unlock unlimited pages with QckPages Pro</p>
			</div>
			<button
				type="button"
				class="grid size-9 place-items-center border-2 border-[var(--ink)] bg-[var(--panel)] transition hover:bg-[var(--accent)]"
				aria-label="Close"
				onclick={onclose}
			>
				<X size={16} />
			</button>
		</div>

		<!-- Plan cards -->
		<div class="grid gap-4 p-6 sm:grid-cols-2">
			<!-- Free plan -->
			<div class="border-2 border-[var(--line)] bg-[var(--panel)] p-5">
				<p class="text-xs font-black tracking-[0.18em] text-[var(--muted)] uppercase">Free</p>
				<p class="mt-2 text-3xl font-black text-[var(--ink)]">
					&#8377;0
					<span class="text-sm font-bold text-[var(--muted)]">forever</span>
				</p>
				<p class="mt-1 text-sm text-[var(--muted)]">For trying things out</p>

				<hr class="my-4 border-[var(--line)]" />

				<ul class="space-y-2.5">
					{#each freeFeatures as feature (feature.id)}
						<li class="flex items-start gap-2 text-sm">
							{#if feature.included}
								<span class="mt-0.5 text-[var(--green)]"><Check size={14} strokeWidth={3} /></span>
								<span class="font-bold text-[var(--ink)]">{feature.text}</span>
							{:else}
								<span class="mt-0.5 text-[var(--line)]"><X size={14} strokeWidth={3} /></span>
								<span class="text-[var(--muted)] line-through">{feature.text}</span>
							{/if}
						</li>
					{/each}
				</ul>

				<div class="mt-5">
					<TextButton tone="neutral" fullWidth onclick={onclose}>Current plan</TextButton>
				</div>
			</div>

			<!-- Pro plan -->
			<div
				class="border-2 border-[var(--ink)] bg-[var(--soft-green)] p-5 shadow-[4px_4px_0_var(--ink)]"
			>
				<div class="flex items-center justify-between">
					<p class="text-xs font-black tracking-[0.18em] text-[var(--green)] uppercase">Pro</p>
				</div>
				<p class="mt-2 text-3xl font-black text-[var(--ink)]">
					&#8377;149
					<span class="text-sm font-bold text-[var(--muted)]">one-time</span>
				</p>
				<p class="mt-1 text-sm text-[var(--muted)]">Pay once, use forever</p>

				<hr class="my-4 border-[var(--green)]/30" />

				<ul class="space-y-2.5">
					{#each proFeatures as feature (feature.id)}
						<li class="flex items-start gap-2 text-sm">
							<span class="mt-0.5 text-[var(--green)]"><Check size={14} strokeWidth={3} /></span>
							<span class="font-bold text-[var(--ink)]">{feature.text}</span>
						</li>
					{/each}
				</ul>

				<div class="mt-5">
					<TextButton tone="solid" fullWidth {isLoading} onclick={onupgrade}>
						<InfinityIcon size={16} />
						Upgrade to Pro
					</TextButton>
				</div>
			</div>
		</div>
	</div>
</div>
