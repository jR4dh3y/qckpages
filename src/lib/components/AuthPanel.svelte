<script lang="ts">
	import { LogIn } from 'lucide-svelte';
	import TileField from './TileField.svelte';

	interface Props {
		isLoading: boolean;
		error: string | null;
		onsignin: () => void;
	}

	let { isLoading, error, onsignin }: Props = $props();
</script>

<section class="relative isolate min-h-dvh overflow-hidden">
	<TileField />

	<div
		class="pointer-events-none relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl items-center px-5 py-10"
	>
		<div class="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
			<div
				class="pointer-events-auto border-2 border-[#171717] bg-[#fffdf7] p-6 shadow-[10px_10px_0_#171717]"
			>
				<p class="text-xs font-black tracking-[0.3em] text-[#d45c2c] uppercase">QckPages</p>
				<h1 class="mt-5 max-w-3xl text-5xl leading-[0.95] font-black text-[#171717] md:text-7xl">
					Share an HTML page in seconds.
				</h1>
				<p class="mt-6 max-w-2xl text-lg leading-8 text-[#504d45]">
					Upload your file, choose a link, and send it to anyone. That is the whole thing.
				</p>
			</div>

			<div
				class="pointer-events-auto border-2 border-[#171717] bg-white p-5 shadow-[10px_10px_0_#171717]"
			>
				<div class="border-b border-[#d7d0c3] pb-5">
					<div>
						<h2 class="text-xl font-black">Sign in</h2>
						<p class="mt-1 text-sm text-[#5f5a50]">Get back to your pages and publish new ones.</p>
					</div>
				</div>

				<button
					type="button"
					class="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-[#171717] px-4 text-sm font-black text-white transition hover:bg-[#2c6e63] disabled:cursor-wait disabled:bg-[#777267]"
					disabled={isLoading}
					onclick={onsignin}
				>
					<LogIn size={18} />
					{isLoading ? 'Checking session' : 'Continue with Shoo'}
				</button>

				{#if error}
					<p class="mt-4 border border-[#ef9b82] bg-[#fff0ea] px-3 py-2 text-sm text-[#9a3412]">
						{error}
					</p>
				{/if}
			</div>
		</div>
	</div>
</section>
