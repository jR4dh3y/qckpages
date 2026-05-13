<script lang="ts">
	import { FileUp, Send, X } from 'lucide-svelte';
	import { normalizeSlug, titleFromFilename } from '$lib/utils/slug';

	interface Props {
		isUploading: boolean;
		error: string | null;
		onpublish: (payload: { file: File; slug: string; title: string }) => Promise<void>;
	}

	let { isUploading, error, onpublish }: Props = $props();

	let selectedFile = $state<File | null>(null);
	let slug = $state('');
	let title = $state('');
	let isDragging = $state(false);

	let fileSize = $derived(
		selectedFile ? `${Math.max(1, Math.round(selectedFile.size / 1024)).toLocaleString()} KB` : ''
	);

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

	async function publish(): Promise<void> {
		if (!selectedFile) {
			return;
		}

		await onpublish({ file: selectedFile, slug: normalizeSlug(slug), title: title.trim() });
	}
</script>

<section class="border-2 border-[#171717] bg-[#fffdf7] shadow-[8px_8px_0_#171717]">
	<div class="flex items-center justify-between border-b-2 border-[#171717] px-5 py-4">
		<div>
			<h2 class="text-lg font-black text-[#171717]">New page</h2>
			<p class="text-sm text-[#655f55]">Upload the file and pick the link.</p>
		</div>
		<div class="grid size-10 place-items-center bg-[#4f8cff] text-white">
			<FileUp size={20} />
		</div>
	</div>

	<div class="space-y-5 p-5">
		<label
			class={[
				'grid min-h-44 cursor-pointer place-items-center border-2 border-dashed p-5 text-center transition',
				isDragging ? 'border-[#2c6e63] bg-[#e7fff8]' : 'border-[#b7ad9c] bg-white'
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
			<input
				class="sr-only"
				type="file"
				accept=".html,.htm,text/html"
				onchange={(event) => pickFile(event.currentTarget.files)}
			/>

			{#if selectedFile}
				<div class="w-full text-left">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="truncate text-base font-black text-[#171717]">{selectedFile.name}</p>
							<p class="mt-1 text-sm text-[#655f55]">{fileSize} · text/html</p>
						</div>
						<button
							type="button"
							class="grid size-8 shrink-0 place-items-center border border-[#171717] bg-white hover:bg-[#ffe15a]"
							aria-label="Remove selected file"
							onclick={(event) => {
								event.preventDefault();
								clearFile();
							}}
						>
							<X size={16} />
						</button>
					</div>
				</div>
			{:else}
				<div>
					<FileUp class="mx-auto text-[#d45c2c]" size={34} />
					<p class="mt-3 text-base font-black text-[#171717]">Drop your HTML file here</p>
					<p class="mt-1 text-sm text-[#655f55]">Works with one .html file up to 2 MB.</p>
				</div>
			{/if}
		</label>

		<div class="grid gap-4 md:grid-cols-[1fr_1fr]">
			<label class="block">
				<span class="text-xs font-black tracking-[0.18em] text-[#655f55] uppercase">Link</span>
				<div class="mt-2 flex border-2 border-[#171717] bg-white">
					<span
						class="grid place-items-center border-r-2 border-[#171717] px-3 text-sm text-[#655f55]"
						>/</span
					>
					<input
						class="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm font-bold text-[#171717] focus:ring-0"
						placeholder="my-page"
						bind:value={slug}
						onblur={() => (slug = normalizeSlug(slug))}
					/>
				</div>
			</label>

			<label class="block">
				<span class="text-xs font-black tracking-[0.18em] text-[#655f55] uppercase">Title</span>
				<input
					class="mt-2 w-full border-2 border-[#171717] bg-white px-3 py-3 text-sm font-bold text-[#171717] focus:ring-0"
					placeholder="Project homepage"
					bind:value={title}
				/>
			</label>
		</div>

		<button
			type="button"
			class="flex h-12 w-full items-center justify-center gap-2 bg-[#171717] px-4 text-sm font-black text-white transition hover:bg-[#2c6e63] disabled:cursor-not-allowed disabled:bg-[#8c877d]"
			disabled={!selectedFile || isUploading}
			onclick={publish}
		>
			<Send size={17} />
			{isUploading ? 'Publishing' : 'Publish page'}
		</button>

		{#if error}
			<p class="border border-[#ef9b82] bg-[#fff0ea] px-3 py-2 text-sm text-[#9a3412]">{error}</p>
		{/if}
	</div>
</section>
