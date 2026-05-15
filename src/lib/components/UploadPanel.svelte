<script lang="ts">
	import { FileUp, Send, X } from 'lucide-svelte';
	import IconButton from './IconButton.svelte';
	import TextButton from './TextButton.svelte';
	import UpgradeButton from './UpgradeButton.svelte';
	import { normalizeSlug, titleFromFilename } from '$lib/utils/slug';

	interface Props {
		isUploading: boolean;
		isQuotaBlocked: boolean;
		publishedSlugs: string[];
		error: string | null;
		onpublish: (payload: { file: File; slug: string; title: string }) => Promise<boolean>;
		onupgrade: () => void | Promise<void>;
	}

	let { isUploading, isQuotaBlocked, publishedSlugs, error, onpublish, onupgrade }: Props =
		$props();
	const fileInputId = $props.id();

	let selectedFile = $state<File | null>(null);
	let slug = $state('');
	let title = $state('');
	let isDragging = $state(false);

	let fileSize = $derived(
		selectedFile ? `${Math.max(1, Math.round(selectedFile.size / 1024)).toLocaleString()} KB` : ''
	);
	let isExistingPublishedSlug = $derived(publishedSlugs.includes(normalizeSlug(slug)));
	let isPublishBlocked = $derived(isQuotaBlocked && !isExistingPublishedSlug);

	function pickFile(files: FileList | null): void {
		const file = files?.item(0);
		if (!file) {
			return;
		}

		selectedFile = file;
		if (!title) {
			title = titleFromFilename(file.name);
		}
		if (!slug) {
			slug = normalizeSlug(file.name.replace(/\.[^.]+$/, ''));
		}
	}

	function clearFile(): void {
		selectedFile = null;
	}

	function resetForm(): void {
		selectedFile = null;
		slug = '';
		title = '';
	}

	async function publish(): Promise<void> {
		if (!selectedFile) {
			return;
		}

		const ok = await onpublish({
			file: selectedFile,
			slug: normalizeSlug(slug),
			title: title.trim()
		});
		if (ok) {
			resetForm();
		}
	}
</script>

<section class="border-2 border-(--ink) bg-(--panel)">
	<div class="flex items-center justify-between border-b-2 border-(--ink) px-5 py-3">
		<div>
			<h2 class="text-lg font-black text-(--ink)">New page</h2>
		</div>
	</div>

	<div class="space-y-4 p-5">
		<input
			id={fileInputId}
			class="sr-only"
			type="file"
			accept=".html,.htm,text/html"
			onchange={(event) => pickFile(event.currentTarget.files)}
		/>

		<div
			role="group"
			aria-label="HTML file upload"
			class={[
				'grid min-h-36 place-items-center border-2 border-dashed p-5 text-center transition',
				!selectedFile && 'cursor-pointer',
				isDragging ? 'border-(--green) bg-(--soft-green)' : 'border-(--soft-line) bg-(--panel)'
			]}
			ondragenter={() => (isDragging = true)}
			ondragleave={() => (isDragging = false)}
			ondragover={(event) => event.preventDefault()}
			ondrop={(event) => {
				event.preventDefault();
				isDragging = false;
				pickFile(event.dataTransfer?.files ?? null);
			}}
		>
			{#if selectedFile}
				<div class="w-full text-left">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="truncate text-base font-black text-(--ink)">{selectedFile.name}</p>
							<p class="mt-1 text-sm text-(--muted)">{fileSize} · text/html</p>
						</div>
						<IconButton
							label="Remove selected file"
							size="sm"
							onclick={(event) => {
								event.preventDefault();
								clearFile();
							}}
						>
							<X size={16} />
						</IconButton>
					</div>
				</div>
			{:else}
				<label for={fileInputId} class="block cursor-pointer">
					<FileUp class="mx-auto text-(--hot)" size={34} />
					<p class="mt-3 text-base font-black text-(--ink)">Drop your HTML file here</p>
					<p class="mt-1 text-sm text-(--muted)">Works with one .html file up to 2 MB.</p>
				</label>
			{/if}
		</div>

		<div class="grid gap-4 md:grid-cols-[1fr_1fr]">
			<label class="block">
				<span class="text-xs font-black tracking-[0.18em] text-(--muted) uppercase">Link</span>
				<div class="mt-2 flex border-2 border-(--ink) bg-(--panel)">
					<span
						class="grid place-items-center border-r-2 border-(--ink) px-3 text-sm text-(--muted)"
						>/</span
					>
					<input
						class="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm font-bold text-(--ink) focus:ring-0"
						placeholder="my-page"
						bind:value={slug}
						onblur={() => (slug = normalizeSlug(slug))}
					/>
				</div>
			</label>

			<label class="block">
				<span class="text-xs font-black tracking-[0.18em] text-(--muted) uppercase">Title</span>
				<input
					class="mt-2 w-full border-2 border-(--ink) bg-(--panel) px-3 py-3 text-sm font-bold text-(--ink) focus:ring-0"
					placeholder="Project homepage"
					bind:value={title}
				/>
			</label>
		</div>

		<TextButton
			tone="solid"
			size="lg"
			fullWidth
			disabled={!selectedFile || isUploading || isPublishBlocked}
			onclick={publish}
		>
			<Send size={17} />
			{isUploading ? 'Publishing' : 'Publish page'}
		</TextButton>

		{#if isPublishBlocked}
			<div
				class="flex items-center justify-between gap-3 border-2 border-(--ink) bg-(--soft-green) px-3 py-3"
			>
				<p class="text-sm font-bold text-(--ink)">Free plan limit reached.</p>
				<UpgradeButton onclick={onupgrade} />
			</div>
		{/if}

		{#if error}
			<p class="border border-(--danger-line) bg-(--danger-bg) px-3 py-2 text-sm text-(--danger)">
				{error}
			</p>
		{/if}
	</div>
</section>
