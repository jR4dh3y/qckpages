<script lang="ts">
	import { LogOut } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import type { PublicUser } from '$lib/types/pages';

	interface Props {
		user: PublicUser;
		onsignout: () => void;
	}

	let { user, onsignout }: Props = $props();
</script>

<header class="border-b-2 border-[#171717] bg-[#fffdf7]">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
		<a href={resolve('/')} class="text-xl font-black tracking-[-0.02em] text-[#171717]">QckPages</a>
		<div class="flex min-w-0 items-center gap-3">
			<div class="hidden min-w-0 text-right sm:block">
				<p class="truncate text-sm font-black text-[#171717]">
					{user.name ?? user.email ?? 'Shoo user'}
				</p>
				<p class="truncate text-xs text-[#655f55]">{user.userId}</p>
			</div>
			<button
				type="button"
				class="grid size-10 place-items-center border-2 border-[#171717] bg-white hover:bg-[#ffe15a]"
				aria-label="Sign out"
				title="Sign out"
				onclick={onsignout}
			>
				<LogOut size={17} />
			</button>
		</div>
	</div>
</header>
