<script lang="ts">
	import { Copy, ExternalLink, Trash2 } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import type { PublishedPage } from '$lib/types/pages';

	interface Props {
		pages: PublishedPage[];
		origin: string;
		isLoading: boolean;
		ondelete: (slug: string) => Promise<void>;
	}

	let { pages, origin, isLoading, ondelete }: Props = $props();
	let copiedSlug = $state<string | null>(null);

	async function copyLink(slug: string): Promise<void> {
		await navigator.clipboard.writeText(`${origin}/${slug}`);
		copiedSlug = slug;
		window.setTimeout(() => {
			if (copiedSlug === slug) {
				copiedSlug = null;
			}
		}, 1400);
	}
</script>

<section class="border-2 border-[#171717] bg-white">
	<div class="flex items-center justify-between border-b-2 border-[#171717] px-5 py-4">
		<div>
			<h2 class="text-lg font-black text-[#171717]">Published</h2>
			<p class="text-sm text-[#655f55]">{pages.length} page{pages.length === 1 ? '' : 's'}</p>
		</div>
		<div
			class="bg-[#ffe15a] px-3 py-1 text-xs font-black tracking-[0.18em] text-[#171717] uppercase"
		>
			Live
		</div>
	</div>

	<div class="divide-y-2 divide-[#171717]">
		{#if isLoading}
			<div class="p-5 text-sm font-bold text-[#655f55]">Loading pages...</div>
		{:else if pages.length === 0}
			<div class="p-5">
				<p class="text-base font-black text-[#171717]">No pages yet</p>
				<p class="mt-1 text-sm text-[#655f55]">
					Your first upload will appear here with a copyable link.
				</p>
			</div>
		{:else}
			{#each pages as page (page.slug)}
				<article class="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="truncate text-base font-black text-[#171717]">{page.title}</h3>
							<span class="bg-[#e8f7f1] px-2 py-1 text-xs font-black text-[#2c6e63]"
								>v{page.version}</span
							>
						</div>
						<a
							class="mt-2 block truncate text-sm font-bold text-[#2357c6] hover:underline"
							href={resolve('/[slug]', { slug: page.slug })}
							target="_blank"
							rel="noreferrer"
						>
							{origin}/{page.slug}
						</a>
						<p class="mt-2 text-xs font-bold tracking-[0.14em] text-[#7b7468] uppercase">
							{page.originalFilename} · {Math.max(1, Math.round(page.size / 1024)).toLocaleString()} KB
						</p>
					</div>

					<div class="flex gap-2">
						<button
							type="button"
							class="grid size-10 place-items-center border-2 border-[#171717] bg-white hover:bg-[#ffe15a]"
							aria-label="Copy public link"
							title="Copy public link"
							onclick={() => copyLink(page.slug)}
						>
							<Copy size={17} />
						</button>
						<a
							class="grid size-10 place-items-center border-2 border-[#171717] bg-white hover:bg-[#e8f7f1]"
							aria-label="Open public page"
							title="Open public page"
							href={resolve('/[slug]', { slug: page.slug })}
							target="_blank"
							rel="noreferrer"
						>
							<ExternalLink size={17} />
						</a>
						<button
							type="button"
							class="grid size-10 place-items-center border-2 border-[#171717] bg-white hover:bg-[#fff0ea]"
							aria-label="Delete page"
							title="Delete page"
							onclick={() => ondelete(page.slug)}
						>
							<Trash2 size={17} />
						</button>
					</div>

					{#if copiedSlug === page.slug}
						<p class="text-sm font-black text-[#2c6e63] md:col-span-2">Copied</p>
					{/if}
				</article>
			{/each}
		{/if}
	</div>
</section>
