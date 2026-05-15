<script lang="ts">
	interface Props {
		name?: string;
		email?: string;
		picture?: string;
		size?: 'sm' | 'md';
	}

	let { name, email, picture, size = 'md' }: Props = $props();

	let initials = $derived(getInitials(name, email));
	let dimensions = $derived(size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm');

	function getInitials(userName?: string, userEmail?: string): string {
		if (userName) {
			const parts = userName.trim().split(/\s+/);
			if (parts.length >= 2) {
				return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
			}
			return userName[0].toUpperCase();
		}
		if (userEmail) {
			return userEmail[0].toUpperCase();
		}
		return '?';
	}
</script>

{#if picture}
	<img
		src={picture}
		alt={name ?? email ?? 'User avatar'}
		class="{dimensions} border-2 border-[var(--ink)] object-cover"
	/>
{:else}
	<span
		class="{dimensions} grid place-items-center border-2 border-[var(--ink)] bg-[var(--accent)] font-black text-[var(--ink)]"
	>
		{initials}
	</span>
{/if}
