<script lang="ts">
	import { LogIn } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import AppFooter from './AppFooter.svelte';
	import TileField from './TileField.svelte';

	interface Props {
		isLoading: boolean;
		error: string | null;
		onsignin: () => void | Promise<void>;
		children?: Snippet;
	}

	let { isLoading, error, onsignin, children }: Props = $props();
</script>

<section class="relative isolate flex min-h-dvh flex-col overflow-hidden">
	<TileField />

	<div class="pointer-events-auto fixed top-5 right-5 z-20">
		{@render children?.()}
	</div>

	<div
		class="pointer-events-none relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center px-5 py-10"
	>
		<div class="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
			<div
				class="pointer-events-auto border-2 border-[var(--ink)] bg-[var(--panel)] p-6 shadow-[10px_10px_0_var(--ink)]"
			>
				<p class="text-xs font-black tracking-[0.3em] text-[var(--hot)] uppercase">QckPages</p>
				<h1 class="mt-5 max-w-3xl text-5xl leading-[0.95] font-black text-[var(--ink)] md:text-7xl">
					Share an HTML page in seconds.
				</h1>
				<p class="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
					Upload your file, choose a link, and send it to anyone.
				</p>
			</div>

			<div
				class="pointer-events-auto border-2 border-[var(--ink)] bg-[var(--panel)] p-5 shadow-[10px_10px_0_var(--ink)]"
			>
				<div class="border-b border-[var(--line)] pb-5">
					<div>
						<h2 class="text-xl font-black text-[var(--ink)]">Sign in</h2>
						<p class="mt-1 text-sm text-[var(--muted)]">
							Get back to your pages and publish new ones.
						</p>
					</div>
				</div>

				<button
					type="button"
					class="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-[var(--ink)] px-4 text-sm font-black text-[var(--paper)] transition hover:bg-[var(--green)] disabled:cursor-wait disabled:bg-[var(--muted)]"
					disabled={isLoading}
					onclick={() => void onsignin()}
				>
					<LogIn size={18} />
					{isLoading ? 'Checking session' : 'Continue with Shoo'}
				</button>

				{#if error}
					<p
						class="mt-4 border border-[var(--danger-line)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]"
					>
						{error}
					</p>
				{/if}
			</div>
		</div>
	</div>

	<AppFooter />
</section>
