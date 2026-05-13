<script lang="ts">
	import { onMount } from 'svelte';
	import AuthPanel from '$lib/components/AuthPanel.svelte';
	import DashboardHeader from '$lib/components/DashboardHeader.svelte';
	import PageList from '$lib/components/PageList.svelte';
	import UploadPanel from '$lib/components/UploadPanel.svelte';
	import {
		clearShooIdentity,
		readShooIdentity,
		ShooSessionError,
		startShooSignIn,
		verifyShooIdentity
	} from '$lib/client/shoo';
	import type { PublicUser, PublishedPage, UploadResponse } from '$lib/types/pages';

	let user = $state<PublicUser | null>(null);
	let token = $state<string | null>(null);
	let pages = $state<PublishedPage[]>([]);
	let isCheckingAuth = $state(true);
	let isLoadingPages = $state(false);
	let isUploading = $state(false);
	let authError = $state<string | null>(null);
	let pageError = $state<string | null>(null);
	let origin = $state('');

	onMount(() => {
		origin = window.location.origin;
		void hydrateShooSession();
	});

	async function hydrateShooSession(): Promise<void> {
		isCheckingAuth = true;
		authError = null;

		try {
			const identity = readShooIdentity();
			if (!identity?.token) {
				return;
			}

			token = identity.token;
			user = await verifyShooIdentity(identity.token);
			await loadPages();
		} catch (error) {
			clearShooIdentity();
			token = null;
			user = null;

			if (error instanceof ShooSessionError && error.code === 'session_expired') {
				startShooSignIn();
				return;
			}

			authError = error instanceof Error ? error.message : 'Could not verify Shoo session';
		} finally {
			isCheckingAuth = false;
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

	async function publishPage(payload: { file: File; slug: string; title: string }): Promise<void> {
		if (!token) {
			return;
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
		} catch (error) {
			pageError = error instanceof Error ? error.message : 'Could not publish page';
		} finally {
			isUploading = false;
		}
	}

	async function deletePage(slug: string): Promise<void> {
		if (!token) {
			return;
		}

		pageError = null;

		try {
			const response = await fetch(`/api/pages/${slug}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				throw new Error(await readApiError(response, 'Could not delete page'));
			}

			pages = pages.filter((page) => page.slug !== slug);
		} catch (error) {
			pageError = error instanceof Error ? error.message : 'Could not delete page';
		}
	}

	function signOut(): void {
		clearShooIdentity();
		token = null;
		user = null;
		pages = [];
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

{#if user}
	<div class="min-h-dvh bg-[#f7f3ea] text-[#171717]">
		<DashboardHeader {user} onsignout={signOut} />

		<main class="mx-auto grid max-w-6xl gap-7 px-5 py-7 lg:grid-cols-[420px_1fr]">
			<div class="space-y-5">
				<section class="border-2 border-[#171717] bg-[#171717] p-5 text-white">
					<p class="text-xs font-black tracking-[0.22em] text-[#ffe15a] uppercase">Publisher</p>
					<h1 class="mt-3 text-3xl leading-none font-black">Your pages live here.</h1>
					<p class="mt-3 text-sm leading-6 text-[#d9d2c5]">No builds, no branches, no waiting.</p>
				</section>

				<UploadPanel {isUploading} error={pageError} onpublish={publishPage} />
			</div>

			<PageList {pages} {origin} isLoading={isLoadingPages} ondelete={deletePage} />
		</main>
	</div>
{:else}
	<AuthPanel isLoading={isCheckingAuth} error={authError} onsignin={startShooSignIn} />
{/if}
