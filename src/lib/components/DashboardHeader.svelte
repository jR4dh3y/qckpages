<script lang="ts">
	import { LogOut } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import IconButton from './IconButton.svelte';
	import type { PublicUser } from '$lib/types/pages';

	interface Props {
		user: PublicUser;
		onsignout: () => void;
		usageLabel: string;
		children?: Snippet;
	}

	let { user, onsignout, usageLabel, children }: Props = $props();
	let displayName = $derived(user.name ?? user.email ?? 'Signed in');
	let email = $derived(user.name ? user.email : undefined);
</script>

<header class="border-b-2 border-[var(--ink)] bg-[var(--panel)]">
	<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
		<a
			href={resolve('/')}
			class="group inline-flex h-11 shrink-0 items-center border-2 border-[var(--ink)] bg-[var(--accent)] px-3 text-lg font-black text-[#171717] shadow-[4px_4px_0_var(--ink)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--ink)]"
		>
			QckPages
		</a>

		<div
			class="flex h-11 min-w-36 shrink-0 flex-col justify-center border-2 border-[var(--ink)] bg-[var(--paper)] px-3"
		>
			<p class="text-[10px] leading-3 font-black tracking-[0.18em] text-[var(--subtle)] uppercase">
				Published
			</p>
			<p class="text-sm leading-4 font-black text-[var(--ink)]">{usageLabel}</p>
		</div>

		<div class="min-w-0 flex-1"></div>

		<div class="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
			<div
				class="order-2 min-w-0 flex-1 basis-full text-left sm:order-none sm:basis-auto sm:text-right"
			>
				<p class="truncate text-sm leading-4 font-black text-[var(--ink)]">{displayName}</p>
				{#if email}
					<p class="mt-0.5 truncate text-xs leading-4 text-[var(--muted)]">{email}</p>
				{/if}
			</div>

			<div class="flex shrink-0 items-center gap-2">
				{@render children?.()}
				<IconButton label="Sign out" onclick={onsignout}>
					<LogOut size={17} />
				</IconButton>
			</div>
		</div>
	</div>
</header>
