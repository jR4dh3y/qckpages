<script lang="ts">
	import { CheckCheck, Copy, ExternalLink, Trash2 } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import IconButton from './IconButton.svelte';
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

<section class="self-start border-2 border-[var(--ink)] bg-[var(--panel)]">
	<div class="flex items-center justify-between border-b-2 border-[var(--ink)] px-5 py-4">
		<div>
			<h2 class="text-lg font-black text-[var(--ink)]">Published</h2>
		</div>
		<p class="text-sm font-black text-[var(--muted)]">
			{pages.length} page{pages.length === 1 ? '' : 's'}
		</p>
	</div>

	<div class="divide-y-2 divide-[var(--ink)]">
		{#if isLoading}
			<div class="p-5 text-sm font-bold text-[var(--muted)]">Loading pages...</div>
		{:else if pages.length === 0}
			<div class="p-5">
				<p class="text-base font-black text-[var(--ink)]">No pages yet</p>
				<p class="mt-1 text-sm text-[var(--muted)]">
					Your first upload will appear here with a copyable link.
				</p>
			</div>
		{:else}
			{#each pages as page (page.slug)}
				<article
					class="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"
					animate:flip={{ duration: 200 }}
					transition:slide={{ duration: 200 }}
				>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="truncate text-base font-black text-[var(--ink)]">{page.title}</h3>
							<span class="bg-[var(--soft-green)] px-2 py-1 text-xs font-black text-[var(--green)]"
								>v{page.version}</span
							>
						</div>
						<a
							class="mt-2 flex min-w-0 items-center gap-3 text-sm font-bold text-[var(--link)] hover:underline"
							href={resolve('/[slug]', { slug: page.slug })}
							target="_blank"
							rel="noreferrer"
						>
							<span class="min-w-0 flex-1 truncate">{origin}/{page.slug}</span>
						</a>
						<p class="mt-2 text-xs font-bold tracking-[0.14em] text-[var(--subtle)] uppercase">
							{page.originalFilename} · {Math.max(1, Math.round(page.size / 1024)).toLocaleString()} KB
						</p>
					</div>

					<div class="flex gap-2">
						<IconButton label="Copy public link" onclick={() => copyLink(page.slug)}>
							{#if copiedSlug === page.slug}
								<CheckCheck size={17} />
							{:else}
								<Copy size={17} />
							{/if}
						</IconButton>
						<IconButton
							label="Open public page"
							tone="green"
							href={resolve('/[slug]', { slug: page.slug })}
							target="_blank"
							rel="noreferrer"
						>
							<ExternalLink size={17} />
						</IconButton>
						<IconButton label="Delete page" tone="red" onclick={() => ondelete(page.slug)}>
							<Trash2 size={17} />
						</IconButton>
					</div>
				</article>
			{/each}
		{/if}
	</div>
</section>
