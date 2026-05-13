<script lang="ts">
	import { LogOut } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import IconButton from './IconButton.svelte';
	import type { PublicUser } from '$lib/types/pages';

	interface Props {
		user: PublicUser;
		onsignout: () => void;
		children?: Snippet;
	}

	let { user, onsignout, children }: Props = $props();
	let displayName = $derived(user.name ?? user.email ?? 'Signed in');
	let email = $derived(user.name ? user.email : undefined);
</script>

<header class="border-b-2 border-[var(--ink)] bg-[var(--panel)]">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
		<a href={resolve('/')} class="text-xl font-black tracking-[-0.02em] text-[var(--ink)]"
			>QckPages</a
		>
		<div class="flex min-w-0 items-center gap-3">
			<div class="hidden max-w-56 min-w-0 text-right sm:block">
				<p class="truncate text-sm leading-4 font-black text-[var(--ink)]">{displayName}</p>
				{#if email}
					<p class="mt-0.5 truncate text-xs leading-4 text-[var(--muted)]">{email}</p>
				{/if}
			</div>
			{@render children?.()}
			<IconButton label="Sign out" onclick={onsignout}>
				<LogOut size={17} />
			</IconButton>
		</div>
	</div>
</header>
