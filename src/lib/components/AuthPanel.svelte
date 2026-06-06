<script lang="ts">
	import { LogIn } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import AppFooter from './AppFooter.svelte';
	import AuthPrivacyPolicy from './AuthPrivacyPolicy.svelte';
	import TextButton from './TextButton.svelte';
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
				class="pointer-events-auto relative isolate overflow-hidden border-2 border-(--ink) bg-(--panel) p-6"
			>
				<div
					class="absolute -inset-2 -z-10 bg-[url('/auth-panel-background-20260515-112709.png')] bg-cover bg-center opacity-90 blur-[1px]"
					aria-hidden="true"
				></div>
				<div class="absolute inset-0 -z-10 bg-(--panel)/55" aria-hidden="true"></div>

				<div class="relative">
					<p class="text-xs font-black tracking-[0.3em] text-(--hot) uppercase">QckPages</p>
					<h1 class="mt-5 max-w-3xl text-5xl leading-[0.95] font-black text-(--ink) md:text-7xl">
						Share an HTML page in seconds.
					</h1>
					<p class="mt-6 max-w-2xl text-lg leading-8 text-(--muted)">
						Upload your file, choose a link, and send it to anyone.
					</p>
				</div>
			</div>

			<div
				class="pointer-events-auto relative isolate overflow-hidden border-2 border-(--ink) bg-(--panel) p-5"
			>
				<div
					class="absolute -inset-2 -z-10 bg-[url('/auth-panel-background-20260515-112709.png')] bg-cover bg-center opacity-90 blur-[1px]"
					aria-hidden="true"
				></div>
				<div class="absolute inset-0 -z-10 bg-(--panel)/55" aria-hidden="true"></div>

				<div class="relative">
					<div class="border-b border-(--line) pb-5">
						<div>
							<h2 class="text-xl font-black text-(--ink)">Sign in</h2>
							<p class="mt-1 text-sm text-(--muted)">
								Get back to your pages and publish new ones.
							</p>
						</div>
					</div>

					<div class="mt-5">
						<TextButton tone="solid" size="lg" fullWidth {isLoading} onclick={onsignin}>
							<LogIn size={18} />
							{isLoading ? 'Checking session' : 'Continue with Google'}
						</TextButton>
					</div>

					<AuthPrivacyPolicy />

					{#if error}
						<p
							class="mt-4 border border-(--danger-line) bg-(--danger-bg) px-3 py-2 text-sm text-(--danger)"
						>
							{error}
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<AppFooter />
</section>
