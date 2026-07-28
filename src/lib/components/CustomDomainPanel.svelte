<script lang="ts">
	import { CheckCheck, Copy, Globe2, LockKeyhole, RefreshCw, Trash2 } from 'lucide-svelte';
	import IconButton from './IconButton.svelte';
	import TextButton from './TextButton.svelte';
	import type { CustomDomain } from '$lib/types/domains';

	interface Props {
		isPro: boolean;
		domain: CustomDomain | null;
		isLoading: boolean;
		isWorking: boolean;
		error: string | null;
		oncreate: (hostname: string) => Promise<void>;
		onverify: (hostname: string) => Promise<void>;
		onremove: (hostname: string) => Promise<void>;
		onupgrade: () => void | Promise<void>;
	}

	let {
		isPro,
		domain,
		isLoading,
		isWorking,
		error,
		oncreate,
		onverify,
		onremove,
		onupgrade
	}: Props = $props();

	let hostname = $state('');
	let copiedRecord = $state<string | null>(null);
	let usesVercelNameservers = $derived(
		domain?.dnsInstructions.some((record) => record.type === 'NS') ?? false
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
			<h2 class="text-lg font-black text-(--ink)">Custom domain</h2>
		</div>
		{#if !isPro}
			<IconButton
				label="Upgrade to configure a custom domain"
				tone="yellow"
				size="sm"
				onclick={onupgrade}
			>
				<LockKeyhole size={15} />
			</IconButton>
		{/if}
	</div>

	<div class="space-y-4 p-5">
		{#if !isPro}
			<p class="text-sm font-bold text-(--muted)">
				Give every published page its own subdomain on your domain.
			</p>
		{:else if isLoading}
			<p class="text-sm font-bold text-(--muted)">Loading domain...</p>
		{:else if !domain}
			<div>
				<p class="text-sm font-bold text-(--muted)">
					Add one base domain and your page slugs become subdomains, such as
					<span class="font-black text-(--ink)">portfolio.example.com</span>.
				</p>
			</div>

			<label class="block">
				<span class="text-xs font-black tracking-[0.18em] text-(--muted) uppercase"
					>Base domain</span
				>
				<input
					class="mt-2 w-full border-2 border-(--ink) bg-(--panel) px-3 py-3 text-sm font-bold text-(--ink) focus:ring-0"
					placeholder="example.com"
					autocomplete="url"
					bind:value={hostname}
				/>
			</label>

			<p
				class="border border-(--soft-line) bg-(--paper) px-3 py-2 text-xs font-bold text-(--muted)"
			>
				Wildcard HTTPS requires Vercel nameservers. Preserve any existing email and DNS records
				before changing nameservers at your registrar.
			</p>

			<TextButton
				tone="green"
				fullWidth
				isLoading={isWorking}
				disabled={!hostname.trim()}
				onclick={() => oncreate(hostname)}
			>
				<Globe2 size={16} />
				Connect domain
			</TextButton>
		{:else}
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="truncate text-sm font-black text-(--ink)">*.{domain.hostname}</p>
					<p class="mt-1 text-xs font-black tracking-[0.14em] uppercase">
						<span
							class={domain.status === 'active' && domain.routingMode === 'subdomains'
								? 'text-(--green)'
								: 'text-(--muted)'}
						>
							{domain.routingMode !== 'subdomains'
								? 'Upgrade required'
								: domain.status === 'active'
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

			{#if domain.routingMode !== 'subdomains'}
				<div class="border border-(--soft-line) bg-(--paper) px-3 py-3">
					<p class="text-sm font-black text-(--ink)">Enable page subdomains</p>
					<p class="mt-1 text-sm font-bold text-(--muted)">
						This domain uses the previous exact-domain setup. Upgrade it to connect *.{domain.hostname}.
					</p>
				</div>
				<TextButton
					tone="green"
					fullWidth
					isLoading={isWorking}
					onclick={() => oncreate(domain.hostname)}
				>
					<Globe2 size={16} />
					Enable page subdomains
				</TextButton>
			{:else if domain.status === 'active'}
				<div class="border border-(--soft-line) bg-(--paper) px-3 py-3">
					<p class="text-xs font-black tracking-[0.14em] text-(--muted) uppercase">
						HTML link format
					</p>
					<p class="mt-1 truncate text-sm font-black text-(--ink)">
						https://your-page-slug.{domain.hostname}
					</p>
					<p class="mt-2 text-sm font-bold text-(--muted)">
						Every published page now gets its own subdomain automatically.
					</p>
				</div>
			{:else}
				{#if usesVercelNameservers}
					<p
						class="border border-(--soft-line) bg-(--paper) px-3 py-2 text-xs font-bold text-(--muted)"
					>
						Set both nameservers at your domain registrar. Copy existing MX, TXT, and other DNS
						records into Vercel first so email and other services keep working.
					</p>
				{/if}

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

				{#if domain.status === 'error' && domain.dnsInstructions.length === 0}
					<TextButton
						tone="green"
						fullWidth
						isLoading={isWorking}
						onclick={() => oncreate(domain.hostname)}
					>
						<RefreshCw size={15} />
						Retry setup
					</TextButton>
				{:else}
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
		{/if}

		{#if error || domain?.error}
			<p class="border border-(--danger-line) bg-(--danger-bg) px-3 py-2 text-sm text-(--danger)">
				{error ?? domain?.error}
			</p>
		{/if}
	</div>
</section>
