<script lang="ts">
	import { Key, Plus, Trash2, Copy, Check, X, ShieldAlert, Download } from 'lucide-svelte';
	import { useMutation, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$convex/_generated/api';
	import IconButton from './IconButton.svelte';
	import TextButton from './TextButton.svelte';
	import type { Id } from '$convex/_generated/dataModel';
	import { CLI_INSTALL_COMMANDS, type CliInstallPlatform } from '$lib/cli-install';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	const keysQuery = useQuery(api.apiKeys.listForCurrentUser, () => ({}));
	const generateKeyMutation = useMutation(api.apiKeys.generateApiKey);
	const revokeKeyMutation = useMutation(api.apiKeys.revokeApiKey);

	let newKeyName = $state('');
	let newlyCreatedRawKey = $state<string | null>(null);
	let isCopied = $state(false);
	let copiedInstall = $state(false);
	let isGenerating = $state(false);
	let errorMsg = $state<string | null>(null);
	let installPlatform = $state<CliInstallPlatform>('unix');

	let keys = $derived(keysQuery.data ?? []);

	async function handleGenerateKey() {
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

	async function handleRevokeKey(keyId: Id<'apiKeys'>) {
		errorMsg = null;
		try {
			await revokeKeyMutation({ keyId });
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not revoke API Key';
		}
	}

	function copyToClipboard(text: string, type: 'key' | 'install' = 'key') {
		navigator.clipboard.writeText(text);
		if (type === 'key') {
			isCopied = true;
			setTimeout(() => (isCopied = false), 2000);
		} else if (type === 'install') {
			copiedInstall = true;
			setTimeout(() => (copiedInstall = false), 2000);
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
	role="dialog"
	aria-modal="true"
>
	<div
		class="relative flex max-h-[90vh] w-full max-w-lg flex-col border-2 border-(--ink) bg-(--panel) text-(--ink) shadow-[4px_4px_0px_0px_var(--ink)]"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b-2 border-(--line) p-4 pb-3">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center border-2 border-(--ink) bg-(--accent)">
					<Key size={18} />
				</div>
				<h2 class="text-xl font-black">API Keys & CLI Access</h2>
			</div>
			<IconButton label="Close" tone="yellow" size="sm" onclick={onclose}>
				<X size={18} />
			</IconButton>
		</div>

		<!-- Scrollable content -->
		<div class="flex-1 space-y-5 overflow-y-auto p-4 pt-4">
			{#if errorMsg}
				<div
					class="flex items-center gap-2 border-2 border-red-500 bg-red-100 p-3 text-sm font-bold text-red-900"
				>
					<ShieldAlert size={16} />
					<span>{errorMsg}</span>
				</div>
			{/if}

			<!-- Show Newly Created Secret Key -->
			{#if newlyCreatedRawKey}
				<div class="border-2 border-(--ink) bg-amber-50 p-4">
					<p class="text-xs font-black tracking-wider text-amber-900 uppercase">
						Save your new API Key
					</p>
					<p class="my-1 text-xs text-amber-800">
						Copy this key now. You will not be able to see it again!
					</p>

					<div class="mt-2 flex items-center gap-2">
						<input
							readonly
							type="text"
							value={newlyCreatedRawKey}
							class="flex-1 border-2 border-(--ink) bg-white p-2 font-mono text-xs font-bold select-all"
						/>
						<TextButton
							tone="solid"
							size="md"
							onclick={() => copyToClipboard(newlyCreatedRawKey!, 'key')}
						>
							{#if isCopied}
								<Check size={14} class="mr-1 inline" /> Copied!
							{:else}
								<Copy size={14} class="mr-1 inline" /> Copy
							{/if}
						</TextButton>
					</div>
					<div class="mt-3 text-right">
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

			<!-- Create New Key Form (Single Input Field with height matching button) -->
			<div class="flex items-center gap-2">
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

			<!-- Active Keys List -->
			<div>
				<h3 class="mb-2 text-xs font-bold tracking-wider text-(--muted) uppercase">
					Active Keys ({keys.length})
				</h3>

				{#if keysQuery.isLoading}
					<p class="py-4 text-center text-xs text-(--muted)">Loading API keys...</p>
				{:else if keys.length === 0}
					<div
						class="border-2 border-dashed border-(--line) p-4 text-center text-sm text-(--muted)"
					>
						No API keys created yet. Generate one above to use with <code
							class="border border-(--ink) bg-gray-100 px-1 font-mono text-xs">qckpage login</code
						>.
					</div>
				{:else}
					<div class="max-h-40 space-y-2 overflow-y-auto pr-1">
						{#each keys as key (key.id)}
							<div
								class="flex items-center justify-between border-2 border-(--ink) bg-white p-3 text-xs"
							>
								<div>
									<p class="font-bold text-(--ink)">{key.name}</p>
									<p class="font-mono text-(--muted)">{key.keyPrefix}</p>
									<p class="text-[10px] text-gray-400">
										Created: {new Date(key.createdAt).toLocaleDateString()}
										{#if key.lastUsedAt}
											· Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
										{/if}
									</p>
								</div>
								<IconButton
									label="Revoke Key"
									tone="red"
									size="sm"
									onclick={() => handleRevokeKey(key.id)}
								>
									<Trash2 size={14} />
								</IconButton>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- How to Install CLI -->
			<div class="border-t-2 border-(--line) pt-4">
				<div class="mb-1.5 flex items-center justify-between gap-3">
					<div
						class="flex items-center gap-1.5 text-xs font-black tracking-wider text-(--ink) uppercase"
					>
						<Download size={14} class="text-(--ink)" />
						<span>How to Install CLI</span>
					</div>
					<div class="flex border-2 border-(--ink) bg-white text-[10px] font-bold">
						<button
							type="button"
							class={[
								'px-2 py-0.5',
								installPlatform === 'unix' ? 'bg-(--ink) text-white' : 'text-(--ink)'
							]}
							onclick={() => (installPlatform = 'unix')}
						>
							Linux / macOS
						</button>
						<button
							type="button"
							class={[
								'border-l-2 border-(--ink) px-2 py-0.5',
								installPlatform === 'windows' ? 'bg-(--ink) text-white' : 'text-(--ink)'
							]}
							onclick={() => (installPlatform = 'windows')}
						>
							Windows
						</button>
					</div>
				</div>
				<div
					class="relative flex items-center justify-between border-2 border-(--ink) bg-(--ink) px-3 py-2 text-(--paper)"
				>
					<code class="font-mono text-xs text-amber-300">
						{CLI_INSTALL_COMMANDS[installPlatform]}
					</code>
					<button
						type="button"
						class="ml-2 flex items-center gap-1 text-[11px] font-bold text-gray-300 hover:text-white"
						onclick={() => copyToClipboard(CLI_INSTALL_COMMANDS[installPlatform], 'install')}
					>
						{#if copiedInstall}
							<Check size={12} class="text-green-400" />
							<span class="text-green-400">Copied</span>
						{:else}
							<Copy size={12} />
							<span>Copy</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
