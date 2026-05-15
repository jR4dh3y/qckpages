<script lang="ts">
	import { LogOut, ChevronDown, Settings } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import UserAvatar from './UserAvatar.svelte';
	import type { PublicUser } from '$lib/types/pages';

	interface Props {
		user: PublicUser;
		onsignout: () => void;
		onbilling?: () => void | Promise<void>;
		children?: Snippet;
	}

	let { user, onsignout, onbilling, children }: Props = $props();
	let displayName = $derived(user.name ?? user.email ?? 'Signed in');
	let email = $derived(user.name ? user.email : undefined);

	let userMenuOpen = $state(false);

	function handleClickOutside(event: MouseEvent): void {
		if (userMenuOpen) {
			const target = event.target as HTMLElement;
			if (!target.closest('[data-user-menu]')) {
				userMenuOpen = false;
			}
		}
	}

	function handleEscape(event: KeyboardEvent): void {
		if (event.key === 'Escape' && userMenuOpen) {
			userMenuOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleEscape} />

<header class="border-b-2 border-[var(--ink)] bg-[var(--panel)]">
	<div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
		<!-- Logo -->
		<span
			class="inline-flex h-10 shrink-0 items-center border-2 border-[var(--ink)] bg-[var(--accent)] px-3 text-lg font-black text-[#171717]"
		>
			QckPages
		</span>

		<!-- Spacer -->
		<div class="min-w-0 flex-1"></div>

		<!-- Right side controls -->
		<div class="flex items-center gap-2.5">
			<!-- Upgrade / Billing (slotted from parent) -->
			{@render children?.()}

			<!-- Separator -->
			<div class="hidden h-6 w-px bg-[var(--line)] sm:block"></div>

			<!-- User menu -->
			<div class="relative" data-user-menu>
				<button
					type="button"
					class="flex items-center gap-2 border-2 border-transparent px-1 py-1 transition hover:border-[var(--soft-line)] hover:bg-[var(--paper)]"
					aria-label="User menu"
					aria-expanded={userMenuOpen}
					onclick={() => (userMenuOpen = !userMenuOpen)}
				>
					<UserAvatar name={user.name} email={user.email} picture={user.picture} />
					<span class="hidden max-w-32 truncate text-sm font-bold text-[var(--ink)] sm:block">
						{displayName}
					</span>
					<ChevronDown
						size={14}
						class="hidden text-[var(--muted)] transition sm:block {userMenuOpen
							? 'rotate-180'
							: ''}"
					/>
				</button>

				{#if userMenuOpen}
					<div
						class="absolute top-full right-0 z-40 mt-1 w-56 border-2 border-[var(--ink)] bg-[var(--panel)]"
					>
						<div class="border-b border-[var(--line)] px-4 py-3">
							<p class="truncate text-sm font-black text-[var(--ink)]">{displayName}</p>
							{#if email}
								<p class="mt-0.5 truncate text-xs text-[var(--muted)]">{email}</p>
							{/if}
						</div>
						<div class="p-1.5">
							{#if onbilling}
								<button
									type="button"
									class="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--paper)]"
									onclick={() => {
										userMenuOpen = false;
										onbilling?.();
									}}
								>
									<Settings size={15} />
									Billing
								</button>
							{/if}
							<button
								type="button"
								class="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--paper)]"
								onclick={() => {
									userMenuOpen = false;
									onsignout();
								}}
							>
								<LogOut size={15} />
								Sign out
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>
