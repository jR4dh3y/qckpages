<script lang="ts">
	import { onMount } from 'svelte';
	import AuthLoadingShell from '$lib/components/AuthLoadingShell.svelte';
	import AuthPanel from '$lib/components/AuthPanel.svelte';
	import DashboardHeader from '$lib/components/DashboardHeader.svelte';
	import PageList from '$lib/components/PageList.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import UploadPanel from '$lib/components/UploadPanel.svelte';
	import { theme } from '$lib/client/theme.svelte';
	import {
		clearShooIdentity,
		readCachedShooSession,
		readShooIdentityWhenReady,
		ShooSessionError,
		startShooSignIn,
		verifyShooIdentity,
		writeCachedShooSession
	} from '$lib/client/shoo';
	import type { PublicUser, PublishedPage, UploadResponse } from '$lib/types/pages';

	type AuthStatus = 'checking' | 'signed-in' | 'signed-out';

	let user = $state<PublicUser | null>(null);
	let token = $state<string | null>(null);
	let pages = $state<PublishedPage[]>([]);
	let authStatus = $state<AuthStatus>('checking');
	let isLoadingPages = $state(false);
	let isUploading = $state(false);
	let authError = $state<string | null>(null);
	let pageError = $state<string | null>(null);
	let origin = $state('');
	let isCheckingAuth = $derived(authStatus === 'checking');

	onMount(() => {
		theme.init();
		origin = window.location.origin;
		const cached = readCachedShooSession();
		if (cached) {
			token = cached.token;
			user = cached.user;
			authStatus = 'signed-in';
			isLoadingPages = true;
		}
		void hydrateShooSession();
	});

	async function hydrateShooSession(): Promise<void> {
		if (!user) {
			authStatus = 'checking';
		}
		authError = null;

		try {
			const identity = await readShooIdentityWhenReady();
			if (!identity?.token) {
				if (!user) {
					authStatus = 'signed-out';
				}
				return;
			}

			token = identity.token;
			user = await verifyShooIdentity(identity.token);
			authStatus = 'signed-in';
			writeCachedShooSession({ token: identity.token, user });
			await loadPages();
		} catch (error) {
			if (error instanceof ShooSessionError && error.code === 'session_expired') {
				clearShooIdentity();
				token = null;
				user = null;
				authStatus = 'signed-out';
				startShooSignIn();
				return;
			}

			authError = error instanceof Error ? error.message : 'Could not verify Shoo session';
			if (!user) {
				clearShooIdentity();
				token = null;
				authStatus = 'signed-out';
			}
		} finally {
			if (authStatus === 'checking') {
				authStatus = user ? 'signed-in' : 'signed-out';
			}
		}
	}

	async function loadPages(): Promise<void> {
		if (!token) {
			return;
		}

		isLoadingPages = true;
		pageError = null;

		try {
			const response = await fetch('/api/pages', {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				throw new Error(await readApiError(response, 'Could not load pages'));
			}

			const body = (await response.json()) as { pages: PublishedPage[] };
			pages = body.pages;
		} catch (error) {
			pageError = error instanceof Error ? error.message : 'Could not load pages';
		} finally {
			isLoadingPages = false;
		}
	}

	async function publishPage(payload: {
		file: File;
		slug: string;
		title: string;
	}): Promise<boolean> {
		if (!token) {
			return false;
		}

		isUploading = true;
		pageError = null;

		const form = new FormData();
		form.set('file', payload.file);
		form.set('slug', payload.slug);
		form.set('title', payload.title);

		try {
			const response = await fetch('/api/pages', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: form
			});

			if (!response.ok) {
				throw new Error(await readApiError(response, 'Could not publish page'));
			}

			const body = (await response.json()) as UploadResponse;
			pages = [body.page, ...pages.filter((page) => page.slug !== body.page.slug)];
			return true;
		} catch (error) {
			pageError = error instanceof Error ? error.message : 'Could not publish page';
			return false;
		} finally {
			isUploading = false;
		}
	}

	async function deletePage(slug: string): Promise<void> {
		if (!token) {
			return;
		}

		pageError = null;

		const previous = pages;
		pages = pages.filter((page) => page.slug !== slug);

		try {
			const response = await fetch(`/api/pages/${slug}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				pages = previous;
				throw new Error(await readApiError(response, 'Could not delete page'));
			}
		} catch (error) {
			pages = previous;
			pageError = error instanceof Error ? error.message : 'Could not delete page';
		}
	}

	function signOut(): void {
		clearShooIdentity();
		token = null;
		user = null;
		pages = [];
		authStatus = 'signed-out';
	}

	async function readApiError(response: Response, fallback: string): Promise<string> {
		const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
		return typeof body?.error === 'string' ? body.error : `${fallback} (${response.status})`;
	}
</script>

<svelte:head>
	<title>QckPages | HTML hosting</title>
	<meta name="description" content="Upload an HTML file and turn it into a shareable link." />
</svelte:head>

{#if authStatus === 'signed-in' && user}
	<div class="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
		<DashboardHeader {user} onsignout={signOut}>
			<ThemeToggle />
		</DashboardHeader>

		<main class="mx-auto grid max-w-6xl gap-7 px-5 py-7 lg:grid-cols-[420px_1fr]">
			<div>
				<UploadPanel {isUploading} error={pageError} onpublish={publishPage} />
			</div>

			<PageList {pages} {origin} isLoading={isLoadingPages} ondelete={deletePage} />
		</main>
	</div>
{:else if authStatus === 'checking' || authStatus === 'signed-in'}
	<AuthLoadingShell>
		<ThemeToggle />
	</AuthLoadingShell>
{:else}
	<AuthPanel isLoading={isCheckingAuth} error={authError} onsignin={startShooSignIn}>
		<ThemeToggle />
	</AuthPanel>
{/if}
