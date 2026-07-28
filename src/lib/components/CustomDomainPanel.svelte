<script lang="ts">
	import { CheckCheck, Copy, Globe2, RefreshCw, Trash2 } from 'lucide-svelte';
	import TextButton from './TextButton.svelte';
	import UpgradeButton from './UpgradeButton.svelte';
	import type { CustomDomain } from '$lib/types/domains';
	import type { PublishedPage } from '$lib/types/pages';

	interface Props {
		isPro: boolean;
		pages: PublishedPage[];
		domain: CustomDomain | null;
		isLoading: boolean;
		isWorking: boolean;
		error: string | null;
		oncreate: (hostname: string, pageId: string) => Promise<void>;
		onreassign: (hostname: string, pageId: string) => Promise<void>;
		onverify: (hostname: string) => Promise<void>;
		onremove: (hostname: string) => Promise<void>;
		onupgrade: () => void | Promise<void>;
	}

	let {
		isPro,
		pages,
		domain,
		isLoading,
		isWorking,
		error,
		oncreate,
		onreassign,
		onverify,
		onremove,
		onupgrade
	}: Props = $props();

	let hostname = $state('');
	let selectedPageId = $state('');
	let copiedRecord = $state<string | null>(null);

	let publishedPages = $derived(pages.filter((page) => page.published && !page.lockedReason));
	let effectivePageId = $derived(
		selectedPageId || domain?.pageId || publishedPages[0]?.pageId || ''
	);

	async function copyRecord(key: string, value: string): Promise<void> {
		await navigator.clipboard.writeText(value);
		copiedRecord = key;
		window.setTimeout(() => {
			if (copiedRecord === key) copiedRecord = null;
		}, 1400);
	}
</script>

<section class="border-2 border-(--ink) bg-(--panel)">
	<div class="flex items-center justify-between border-b-2 border-(--ink) px-5 py-3">
		<div class="flex items-center gap-2">
			<Globe2 size={18} />
			<h2 class="text-lg font-black text-(--ink)">Custom redirect</h2>
		</div>
		<span class="text-xs font-black tracking-[0.14em] text-(--muted) uppercase">Pro · 1</span>
	</div>

	<div class="space-y-4 p-5">
		{#if !isPro}
			<div class="flex items-center justify-between gap-4">
				<p class="text-sm font-bold text-(--muted)">
					Use your own subdomain for one published page.
				</p>
				<UpgradeButton onclick={onupgrade} />
			</div>
		{:else if isLoading}
			<p class="text-sm font-bold text-(--muted)">Loading domain...</p>
		{:else if publishedPages.length === 0}
			<p class="text-sm font-bold text-(--muted)">
				Publish a page before configuring your subdomain.
			</p>
		{:else if !domain}
			<label class="block">
				<span class="text-xs font-black tracking-[0.18em] text-(--muted) uppercase">Subdomain</span>
				<input
					class="mt-2 w-full border-2 border-(--ink) bg-(--panel) px-3 py-3 text-sm font-bold text-(--ink) focus:ring-0"
					placeholder="portfolio.example.com"
					autocomplete="url"
					bind:value={hostname}
				/>
			</label>

			<label class="block">
				<span class="text-xs font-black tracking-[0.18em] text-(--muted) uppercase"
					>Redirect to</span
				>
				<select
					class="mt-2 w-full border-2 border-(--ink) bg-(--panel) px-3 py-3 text-sm font-bold text-(--ink) focus:ring-0"
					value={effectivePageId}
					onchange={(event) => (selectedPageId = event.currentTarget.value)}
				>
					{#each publishedPages as page (page.pageId)}
						<option value={page.pageId}>{page.title} · /{page.slug}</option>
					{/each}
				</select>
			</label>

			<TextButton
				tone="green"
				fullWidth
				isLoading={isWorking}
				disabled={!hostname.trim() || !effectivePageId}
				onclick={() => oncreate(hostname, effectivePageId)}
			>
				<Globe2 size={16} />
				Connect subdomain
			</TextButton>
		{:else}
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="truncate text-sm font-black text-(--ink)">https://{domain.hostname}</p>
					<p class="mt-1 text-xs font-black tracking-[0.14em] uppercase">
						<span class={domain.status === 'active' ? 'text-(--green)' : 'text-(--muted)'}>
							{domain.status === 'active'
								? 'Active'
								: domain.status === 'error'
									? 'Needs attention'
									: 'Waiting for DNS'}
						</span>
					</p>
				</div>
				<TextButton isLoading={isWorking} onclick={() => onremove(domain.hostname)}>
					<Trash2 size={15} />
					Remove
				</TextButton>
			</div>

			<label class="block">
				<span class="text-xs font-black tracking-[0.18em] text-(--muted) uppercase"
					>Redirect to</span
				>
				<div class="mt-2 flex gap-2">
					<select
						class="min-w-0 flex-1 border-2 border-(--ink) bg-(--panel) px-3 py-2 text-sm font-bold text-(--ink) focus:ring-0"
						value={effectivePageId}
						onchange={(event) => (selectedPageId = event.currentTarget.value)}
					>
						{#each publishedPages as page (page.pageId)}
							<option value={page.pageId}>{page.title} · /{page.slug}</option>
						{/each}
					</select>
					<TextButton
						disabled={effectivePageId === domain.pageId}
						isLoading={isWorking}
						onclick={() => onreassign(domain.hostname, effectivePageId)}
					>
						Save
					</TextButton>
				</div>
			</label>

			{#if domain.status !== 'active'}
				<div class="space-y-2">
					{#each domain.dnsInstructions as record, index (`${record.type}-${record.name}-${index}`)}
						<div
							class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border border-(--soft-line) p-2"
						>
							<span class="text-xs font-black text-(--ink)">{record.type}</span>
							<div class="min-w-0">
								<p class="truncate text-xs font-bold text-(--muted)">{record.name}</p>
								<p class="truncate text-xs font-black text-(--ink)">{record.value}</p>
							</div>
							<button
								type="button"
								class="grid size-8 place-items-center border border-(--ink) hover:bg-(--accent)"
								aria-label={`Copy ${record.type} value`}
								onclick={() => copyRecord(`${record.type}-${index}`, record.value)}
							>
								{#if copiedRecord === `${record.type}-${index}`}
									<CheckCheck size={14} />
								{:else}
									<Copy size={14} />
								{/if}
							</button>
						</div>
					{/each}
				</div>

				<TextButton
					tone="green"
					fullWidth
					isLoading={isWorking}
					onclick={() => onverify(domain.hostname)}
				>
					<RefreshCw size={15} />
					Check DNS
				</TextButton>
			{/if}
		{/if}

		{#if error || domain?.error}
			<p class="border border-(--danger-line) bg-(--danger-bg) px-3 py-2 text-sm text-(--danger)">
				{error ?? domain?.error}
			</p>
		{/if}
	</div>
</section>
