<script lang="ts">
	import { LogOut, Settings } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import UserAvatar from './UserAvatar.svelte';
	import IconButton from './IconButton.svelte';
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
</script>

<header class="border-b-2 border-(--ink) bg-(--panel)">
	<div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
		<!-- Logo -->
		<span
			class="inline-flex h-10 shrink-0 items-center border-2 border-(--ink) bg-(--accent) px-3 text-lg font-black text-[#171717]"
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
			<div class="hidden h-6 w-px bg-(--line) sm:block"></div>

			<!-- User info + actions -->
			<div class="flex items-center gap-2">
				<UserAvatar name={user.name} email={user.email} picture={user.picture} />
				<div class="hidden sm:block">
					<p class="max-w-48 truncate text-sm leading-tight font-bold text-(--ink)">
						{displayName}
					</p>
					{#if email}
						<p class="max-w-48 truncate text-xs leading-tight text-(--muted)">
							{email}
						</p>
					{/if}
				</div>
			</div>

			{#if onbilling}
				<IconButton label="Billing" tone="yellow" size="sm" onclick={onbilling}>
					<Settings size={15} />
				</IconButton>
			{/if}
			<IconButton label="Sign out" tone="red" size="sm" onclick={onsignout}>
				<LogOut size={15} />
			</IconButton>
		</div>
	</div>
</header>
