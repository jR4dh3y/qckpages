<script lang="ts">
	import { Download, Plus, Trash2, Copy, Check, ShieldAlert } from 'lucide-svelte';
	import { useMutation, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$convex/_generated/api';
	import IconButton from './IconButton.svelte';
	import TextButton from './TextButton.svelte';
	import type { Id } from '$convex/_generated/dataModel';

	const keysQuery = useQuery(api.apiKeys.listForCurrentUser, () => ({}));
	const generateKeyMutation = useMutation(api.apiKeys.generateApiKey);
	const revokeKeyMutation = useMutation(api.apiKeys.revokeApiKey);
	const toggleKeyMutation = useMutation(api.apiKeys.toggleApiKeyStatus);

	let activeOsTab = $state<'unix' | 'windows'>('unix');
	let newKeyName = $state('');
	let newlyCreatedRawKey = $state<string | null>(null);
	let isCopiedKey = $state(false);
	let isCopiedInstall = $state(false);
	let isGenerating = $state(false);
	let errorMsg = $state<string | null>(null);

	let keys = $derived(keysQuery.data ?? []);
	let activeKeyCount = $derived(keys.filter((k) => !k.disabled).length);

	const unixInstallCmd =
		'curl -fsSL https://raw.githubusercontent.com/jR4dh3y/qckpages/main/install.sh | bash';
	const winInstallCmd =
		'iwr -useb https://raw.githubusercontent.com/jR4dh3y/qckpages/main/install.ps1 | iex';

	async function handleGenerateKey(): Promise<void> {
		if (isGenerating) return;
		isGenerating = true;
		errorMsg = null;

		try {
			const res = await generateKeyMutation({ name: newKeyName.trim() || undefined });
			newlyCreatedRawKey = res.rawKey;
			newKeyName = '';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not generate API Key';
		} finally {
			isGenerating = false;
		}
	}

	async function handleToggleKey(keyId: Id<'apiKeys'>): Promise<void> {
		errorMsg = null;
		try {
			await toggleKeyMutation({ keyId });
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not update API Key';
		}
	}

	async function handleRevokeKey(keyId: Id<'apiKeys'>): Promise<void> {
		errorMsg = null;
		try {
			await revokeKeyMutation({ keyId });
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not revoke API Key';
		}
	}

	function copyText(text: string, type: 'key' | 'install'): void {
		navigator.clipboard.writeText(text);
		if (type === 'key') {
			isCopiedKey = true;
			setTimeout(() => (isCopiedKey = false), 2000);
		} else {
			isCopiedInstall = true;
			setTimeout(() => (isCopiedInstall = false), 2000);
		}
	}
</script>

<!-- Card 1: How to install -->
<section class="self-start border-2 border-(--ink) bg-(--panel)">
	<div class="flex items-center justify-between border-b-2 border-(--ink) px-5 py-3">
		<h2 class="text-lg font-black text-(--ink)">How to install</h2>

		<!-- OS Toggle -->
		<div class="flex border-2 border-(--ink) bg-white text-xs font-bold">
			<button
				type="button"
				class="px-2.5 py-1 transition {activeOsTab === 'unix'
					? 'bg-(--ink) text-white'
					: 'text-(--ink) hover:bg-gray-100'}"
				onclick={() => (activeOsTab = 'unix')}
			>
				Linux / macOS
			</button>
			<button
				type="button"
				class="border-l-2 border-(--ink) px-2.5 py-1 transition {activeOsTab === 'windows'
					? 'bg-(--ink) text-white'
					: 'text-(--ink) hover:bg-gray-100'}"
				onclick={() => (activeOsTab = 'windows')}
			>
				Windows
			</button>
		</div>
	</div>

	<div class="space-y-4 p-5">
		<!-- Command Box -->
		<div
			class="relative flex items-center justify-between border-2 border-(--ink) bg-(--ink) px-3 py-2.5 text-(--paper)"
		>
			<code class="font-mono text-xs text-amber-300 select-all">
				{activeOsTab === 'unix' ? unixInstallCmd : winInstallCmd}
			</code>
			<button
				type="button"
				class="ml-2 flex shrink-0 items-center gap-1 text-[11px] font-bold text-gray-300 hover:text-white"
				onclick={() => copyText(activeOsTab === 'unix' ? unixInstallCmd : winInstallCmd, 'install')}
			>
				{#if isCopiedInstall}
					<Check size={12} class="text-green-400" />
					<span class="text-green-400">Copied</span>
				{:else}
					<Copy size={12} />
					<span>Copy</span>
				{/if}
			</button>
		</div>

		<!-- Quick Start -->
		<div class="space-y-2 border-2 border-(--ink) bg-white p-3.5 text-xs">
			<p class="font-bold text-(--ink)">Quick Start</p>
			<ol class="space-y-2 text-gray-700">
				<li class="flex items-start gap-2">
					<span
						class="flex h-4 w-4 shrink-0 items-center justify-center border border-(--ink) bg-amber-200 text-[10px] font-bold"
						>1</span
					>
					<span>Run install command above</span>
				</li>
				<li class="flex items-start gap-2">
					<span
						class="flex h-4 w-4 shrink-0 items-center justify-center border border-(--ink) bg-amber-200 text-[10px] font-bold"
						>2</span
					>
					<span
						>Run <code class="border border-gray-300 bg-gray-100 px-1 font-bold text-gray-900"
							>qckpage login</code
						> and enter API key</span
					>
				</li>
				<li class="flex items-start gap-2">
					<span
						class="flex h-4 w-4 shrink-0 items-center justify-center border border-(--ink) bg-amber-200 text-[10px] font-bold"
						>3</span
					>
					<span
						>Publish: <code class="border border-gray-300 bg-gray-100 px-1 font-bold text-gray-900"
							>qckpage publish file.html -s slug</code
						></span
					>
				</li>
			</ol>
		</div>
	</div>
</section>

<!-- Card 2: API Keys -->
<section
	class="flex max-h-[min(720px,calc(100dvh-9rem))] min-h-0 flex-col self-start border-2 border-(--ink) bg-(--panel)"
>
	<div class="flex shrink-0 items-center justify-between border-b-2 border-(--ink) px-5 py-3">
		<h2 class="text-lg font-black text-(--ink)">API Keys</h2>
		<p class="text-sm font-black text-(--muted)">
			Active Keys ({activeKeyCount})
		</p>
	</div>

	<div class="hidden-scrollbar flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-5">
		{#if errorMsg}
			<div
				class="flex shrink-0 items-center gap-2 border-2 border-red-500 bg-red-100 p-2.5 text-xs font-bold text-red-900"
			>
				<ShieldAlert size={14} />
				<span>{errorMsg}</span>
			</div>
		{/if}

		<!-- Single Input Field + Button (Height matched) -->
		<div class="flex shrink-0 items-center gap-2">
			<input
				id="cli-key-input"
				type="text"
				placeholder="generate new key"
				bind:value={newKeyName}
				class="h-9 flex-1 border-2 border-(--ink) bg-white px-3 text-sm font-medium placeholder:text-gray-400 focus:outline-none"
			/>
			<TextButton tone="solid" size="md" disabled={isGenerating} onclick={handleGenerateKey}>
				<Plus size={16} class="mr-1 inline" /> Generate
			</TextButton>
		</div>

		<!-- Newly Created Secret Key Banner (positioned below input) -->
		{#if newlyCreatedRawKey}
			<div class="shrink-0 border-2 border-(--ink) bg-amber-50 p-3 text-xs">
				<p class="font-black uppercase tracking-wider text-amber-900">Save your new API Key</p>
				<p class="my-1 text-amber-800">Copy this key now. You won't see it again!</p>
				<div class="mt-2 flex items-center gap-2">
					<input
						readonly
						type="text"
						value={newlyCreatedRawKey}
						class="flex-1 border-2 border-(--ink) bg-white p-1.5 font-mono text-xs font-bold select-all"
					/>
					<TextButton tone="solid" size="md" onclick={() => copyText(newlyCreatedRawKey!, 'key')}>
						{#if isCopiedKey}
							<Check size={14} class="mr-1 inline text-green-400" /> Copied!
						{:else}
							<Copy size={14} class="mr-1 inline" /> Copy
						{/if}
					</TextButton>
				</div>
				<div class="mt-2 text-right">
					<TextButton
						tone="neutral"
						size="md"
						onclick={() => {
							newlyCreatedRawKey = null;
						}}
					>
						Done
					</TextButton>
				</div>
			</div>
		{/if}

		<!-- Active Keys List -->
		{#if keysQuery.isLoading}
			<p class="py-3 text-center text-xs text-(--muted)">Loading API keys...</p>
		{:else if keys.length === 0}
			<div class="border-2 border-dashed border-(--line) p-3 text-center text-xs text-(--muted)">
				No API keys created yet. Generate one above to use with <code
					class="border border-(--ink) bg-gray-100 px-1 font-mono">qckpage login</code
				>.
			</div>
		{:else}
			<div
				class="hidden-scrollbar min-h-0 flex-1 divide-y-2 divide-(--ink) border-2 border-(--ink) bg-white overflow-y-auto"
			>
				{#each keys as key (key.id)}
					<div class="flex items-center justify-between gap-4 p-3.5 text-xs">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<p
									class="truncate text-sm font-bold {key.disabled
										? 'text-gray-400 line-through'
										: 'text-(--ink)'}"
								>
									{key.name}
								</p>
								<code
									class="border border-(--ink) bg-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-(--ink)"
								>
									{key.keyPrefix}
								</code>
							</div>
							<p class="mt-0.5 text-[11px] text-(--muted)">
								Created {new Date(key.createdAt).toLocaleDateString()}
								{#if key.lastUsedAt}
									· Last used {new Date(key.lastUsedAt).toLocaleDateString()}
								{:else}
									· Never used
								{/if}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<button
								type="button"
								class="inline-flex h-9 items-center justify-center border-2 border-(--ink) px-3 text-xs font-black transition cursor-pointer {key.disabled
									? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
									: 'bg-(--soft-green) text-(--green) hover:bg-emerald-200'}"
								onclick={() => handleToggleKey(key.id)}
							>
								{key.disabled ? 'Enable' : 'Disable'}
							</button>
							<IconButton
								label="Revoke Key"
								tone="red"
								size="sm"
								onclick={() => handleRevokeKey(key.id)}
							>
								<Trash2 size={14} />
							</IconButton>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
