<script lang="ts">
	import { CheckCheck, Copy, ExternalLink, Trash2 } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import IconButton from './IconButton.svelte';
	import type { CustomDomain } from '$lib/types/domains';
	import type { PublishedPage } from '$lib/types/pages';

	interface Props {
		pages: PublishedPage[];
		origin: string;
		isLoading: boolean;
		usageLabel: string;
		customDomain: CustomDomain | null;
		ondelete: (slug: string) => Promise<void>;
	}

	let { pages, origin, isLoading, usageLabel, customDomain, ondelete }: Props = $props();
	let copiedSlug = $state<string | null>(null);

	async function copyLink(page: PublishedPage): Promise<void> {
		await navigator.clipboard.writeText(publicUrl(page));
		copiedSlug = page.slug;
		window.setTimeout(() => {
			if (copiedSlug === page.slug) {
				copiedSlug = null;
			}
		}, 1400);
	}

	function publicUrl(page: PublishedPage): string {
		return customDomain?.status === 'active' && customDomain.pageId === page.pageId
			? `https://${customDomain.hostname}`
			: `${origin}/${page.slug}`;
	}

	function publicLinkAttributes(page: PublishedPage): { href: string } {
		return { href: publicUrl(page) };
	}
</script>

<section
	class="flex max-h-[min(720px,calc(100dvh-9rem))] min-h-0 flex-col self-start border-2 border-(--ink) bg-(--panel)"
>
	<div class="flex shrink-0 items-center justify-between border-b-2 border-(--ink) px-5 py-3">
		<div>
			<h2 class="text-lg font-black text-(--ink)">Published</h2>
		</div>
		<p class="text-sm font-black text-(--muted)">
			{usageLabel}
		</p>
	</div>

	<div class="hidden-scrollbar min-h-0 divide-y-2 divide-(--ink) overflow-y-auto">
		{#if isLoading}
			<div class="p-5 text-sm font-bold text-(--muted)">Loading pages...</div>
		{:else if pages.length === 0}
			<div class="p-5">
				<p class="text-base font-black text-(--ink)">No pages yet</p>
				<p class="mt-1 text-sm text-(--muted)">Upload an HTML file to publish your first link.</p>
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
							<h3 class="truncate text-base font-black text-(--ink)">{page.title}</h3>
							<span class="bg-(--soft-green) px-2 py-1 text-xs font-black text-(--green)"
								>v{page.version}</span
							>
							{#if !page.published || page.lockedReason}
								<span class="bg-(--danger-bg) px-2 py-1 text-xs font-black text-(--danger)">
									Locked
								</span>
							{/if}
						</div>
						{#if page.published && !page.lockedReason}
							<a
								class="mt-2 flex min-w-0 items-center gap-3 text-sm font-bold text-(--link) hover:underline"
								{...publicLinkAttributes(page)}
								target="_blank"
								rel="noreferrer"
							>
								<span class="min-w-0 flex-1 truncate">{publicUrl(page)}</span>
							</a>
						{:else}
							<p class="mt-2 text-sm font-bold text-(--muted)">{publicUrl(page)}</p>
						{/if}
						<p class="mt-2 text-xs font-bold tracking-[0.14em] text-(--subtle) uppercase">
							{page.originalFilename} · {Math.max(1, Math.round(page.size / 1024)).toLocaleString()} KB
						</p>
					</div>

					<div class="flex gap-2">
						<IconButton
							label="Copy public link"
							onclick={() => copyLink(page)}
							disabled={!page.published || Boolean(page.lockedReason)}
						>
							{#if copiedSlug === page.slug}
								<CheckCheck size={17} />
							{:else}
								<Copy size={17} />
							{/if}
						</IconButton>
						{#if page.published && !page.lockedReason}
							<IconButton
								label="Open public page"
								tone="green"
								href={publicUrl(page)}
								target="_blank"
								rel="noreferrer"
							>
								<ExternalLink size={17} />
							</IconButton>
						{/if}
						<IconButton label="Delete page" tone="red" onclick={() => ondelete(page.slug)}>
							<Trash2 size={17} />
						</IconButton>
					</div>
				</article>
			{/each}
		{/if}
	</div>
</section>

<style>
	.hidden-scrollbar {
		scrollbar-width: none;
	}

	.hidden-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
