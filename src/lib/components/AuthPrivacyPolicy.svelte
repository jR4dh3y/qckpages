<script lang="ts">
	import { X } from 'lucide-svelte';

	const policyItems = [
		'QckPages runs on Vercel for the web app and Convex for authentication, account data, and app data.',
		'Uploaded page files are stored through FBS, which is hosted on the owner-operated home server in India.',
		'When you continue with Google, QckPages uses your Google account details to create or access your account.',
		'Your uploaded files and page metadata are used only to provide the publishing and sharing features of QckPages.',
		'Do not upload private, sensitive, illegal, or third-party content that you do not have permission to share.'
	] as const;

	let isOpen = $state(false);

	function openPolicy(): void {
		isOpen = true;
	}

	function closePolicy(): void {
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (isOpen && event.key === 'Escape') {
			closePolicy();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<p class="mt-3 text-center text-[11px] leading-5 text-(--muted)">
	By continuing, you agree to the
	<button
		type="button"
		class="font-bold text-(--ink) underline decoration-(--soft-line) underline-offset-2 hover:decoration-(--ink)"
		onclick={openPolicy}>Privacy Policy</button
	>.
</p>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 grid place-items-center bg-(--ink)/60 p-4"
		role="presentation"
		onclick={(event: MouseEvent) => {
			if (event.target === event.currentTarget) closePolicy();
		}}
	>
		<div
			class="max-h-[min(640px,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto border-2 border-(--ink) bg-(--paper)"
			role="dialog"
			aria-modal="true"
			aria-labelledby="privacy-policy-title"
		>
			<header class="flex items-center justify-between border-b-2 border-(--ink) px-5 py-4">
				<h3 id="privacy-policy-title" class="text-lg font-black text-(--ink)">Privacy Policy</h3>
				<button
					type="button"
					class="grid size-9 place-items-center border-2 border-(--ink) bg-(--panel) transition hover:bg-(--accent)"
					aria-label="Close privacy policy"
					onclick={closePolicy}
				>
					<X size={16} />
				</button>
			</header>

			<div class="px-5 py-4 text-sm text-(--muted)">
				<p class="leading-6">
					By signing up or logging in, you agree that QckPages may process the data needed to run
					your account and hosted pages.
				</p>

				<ul class="mt-4 space-y-3 leading-6">
					{#each policyItems as item (item)}
						<li class="flex gap-2">
							<span class="mt-2 size-1.5 shrink-0 bg-(--green)" aria-hidden="true"></span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
{/if}
