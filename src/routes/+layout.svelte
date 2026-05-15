<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { createSvelteAuthClient } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { authClient } from '$lib/auth-client';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();

	createSvelteAuthClient({
		authClient,
		convexUrl: env.PUBLIC_CONVEX_URL,
		getServerState: () => data.authState
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
