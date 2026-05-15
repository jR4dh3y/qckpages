<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$convex/_generated/api';
	import { useQuery } from '@mmailaender/convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import AppFooter from '$lib/components/AppFooter.svelte';
	import AuthLoadingShell from '$lib/components/AuthLoadingShell.svelte';
	import AuthPanel from '$lib/components/AuthPanel.svelte';
	import DashboardHeader from '$lib/components/DashboardHeader.svelte';
	import PageList from '$lib/components/PageList.svelte';
	import PlanBadge from '$lib/components/PlanBadge.svelte';
	import UpgradeButton from '$lib/components/UpgradeButton.svelte';
	import UploadPanel from '$lib/components/UploadPanel.svelte';
	import { authClient, openCustomerPortal, startProCheckout } from '$lib/auth-client';
	import type { Entitlement, PublicUser, PublishedPage, UploadResponse } from '$lib/types/pages';

	const auth = useAuth();
	const currentUserQuery = useQuery(api.auth.getCurrentUser, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const pagesQuery = useQuery(api.pages.listForCurrentUser, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const entitlementQuery = useQuery(api.billing.getEntitlement, () =>
		auth.isAuthenticated ? {} : 'skip'
	);

	let isUploading = $state(false);
	let isBillingLoading = $state(false);
	let authError = $state<string | null>(null);
	let pageError = $state<string | null>(null);
	let origin = $state('');

	let user = $derived(toPublicUser(currentUserQuery.data));
	let pages = $derived((pagesQuery.data as PublishedPage[] | undefined) ?? []);
	let entitlement = $derived(toEntitlement(entitlementQuery.data, user?.userId));
	let publishedCount = $derived(
		pages.filter((page) => page.published && !page.lockedReason).length
	);
	let publishedSlugs = $derived(
		pages.filter((page) => page.published && !page.lockedReason).map((page) => page.slug)
	);
	let isPro = $derived(entitlement.tier === 'pro' && entitlement.status === 'active');
	let isQuotaBlocked = $derived(!isPro && publishedCount >= 5);
	let hasBillingPortal = $derived(Boolean(entitlement.razorpaySubscriptionShortUrl));
	let usageLabel = $derived(isPro ? 'Unlimited pages' : `${publishedCount} / 5 pages`);

	onMount(() => {
		origin = window.location.origin;
	});

	async function signInWithGoogle(): Promise<void> {
		authError = null;
		const result = await authClient.signIn.social({
			provider: 'google',
			callbackURL: '/'
		});

		if (result.error) {
			authError = result.error.message ?? 'Could not start Google sign-in';
		}
	}

	async function publishPage(payload: {
		file: File;
		slug: string;
		title: string;
	}): Promise<boolean> {
		isUploading = true;
		pageError = null;

		const form = new FormData();
		form.set('file', payload.file);
		form.set('slug', payload.slug);
		form.set('title', payload.title);

		try {
			const response = await fetch('/api/pages', {
				method: 'POST',
				body: form
			});

			if (!response.ok) {
				throw new Error(await readApiError(response, 'Could not publish page'));
			}

			(await response.json()) as UploadResponse;
			return true;
		} catch (error) {
			pageError = error instanceof Error ? error.message : 'Could not publish page';
			return false;
		} finally {
			isUploading = false;
		}
	}

	async function deletePage(slug: string): Promise<void> {
		pageError = null;

		try {
			const response = await fetch(`/api/pages/${slug}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(await readApiError(response, 'Could not delete page'));
			}
		} catch (error) {
			pageError = error instanceof Error ? error.message : 'Could not delete page';
		}
	}

	async function signOut(): Promise<void> {
		await authClient.signOut();
	}

	async function upgrade(): Promise<void> {
		await runBillingAction(startProCheckout);
	}

	async function openPortal(): Promise<void> {
		await runBillingAction(openCustomerPortal);
	}

	async function runBillingAction(action: () => Promise<void>): Promise<void> {
		isBillingLoading = true;
		pageError = null;

		try {
			await action();
		} catch (error) {
			pageError = error instanceof Error ? error.message : 'Could not open billing';
		} finally {
			isBillingLoading = false;
		}
	}

	async function readApiError(response: Response, fallback: string): Promise<string> {
		const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
		return typeof body?.error === 'string' ? body.error : `${fallback} (${response.status})`;
	}

	function toPublicUser(value: unknown): PublicUser | null {
		if (!value || typeof value !== 'object') {
			return null;
		}

		const userValue = value as {
			id?: unknown;
			_id?: unknown;
			userId?: unknown;
			email?: unknown;
			name?: unknown;
			image?: unknown;
		};

		const userId =
			typeof userValue.id === 'string'
				? userValue.id
				: typeof userValue.userId === 'string'
					? userValue.userId
					: typeof userValue._id === 'string'
						? userValue._id
						: null;

		if (!userId) {
			return null;
		}

		return {
			userId,
			email: typeof userValue.email === 'string' ? userValue.email : undefined,
			name: typeof userValue.name === 'string' ? userValue.name : undefined,
			picture: typeof userValue.image === 'string' ? userValue.image : undefined
		};
	}

	function toEntitlement(value: unknown, userId = ''): Entitlement {
		if (!value || typeof value !== 'object') {
			return {
				userId,
				tier: 'free',
				status: 'inactive',
				updatedAt: new Date().toISOString()
			};
		}

		const entitlementValue = value as {
			userId?: unknown;
			tier?: unknown;
			status?: unknown;
			razorpayCustomerId?: unknown;
			razorpaySubscriptionId?: unknown;
			razorpaySubscriptionShortUrl?: unknown;
			razorpayOrderId?: unknown;
			razorpayPaymentId?: unknown;
			currentPeriodEnd?: unknown;
			updatedAt?: unknown;
		};

		return {
			userId: typeof entitlementValue.userId === 'string' ? entitlementValue.userId : userId,
			tier: entitlementValue.tier === 'pro' ? 'pro' : 'free',
			status: typeof entitlementValue.status === 'string' ? entitlementValue.status : 'inactive',
			razorpayCustomerId:
				typeof entitlementValue.razorpayCustomerId === 'string'
					? entitlementValue.razorpayCustomerId
					: undefined,
			razorpaySubscriptionId:
				typeof entitlementValue.razorpaySubscriptionId === 'string'
					? entitlementValue.razorpaySubscriptionId
					: undefined,
			razorpaySubscriptionShortUrl:
				typeof entitlementValue.razorpaySubscriptionShortUrl === 'string'
					? entitlementValue.razorpaySubscriptionShortUrl
					: undefined,
			razorpayOrderId:
				typeof entitlementValue.razorpayOrderId === 'string'
					? entitlementValue.razorpayOrderId
					: undefined,
			razorpayPaymentId:
				typeof entitlementValue.razorpayPaymentId === 'string'
					? entitlementValue.razorpayPaymentId
					: undefined,
			currentPeriodEnd:
				typeof entitlementValue.currentPeriodEnd === 'string'
					? entitlementValue.currentPeriodEnd
					: undefined,
			updatedAt:
				typeof entitlementValue.updatedAt === 'string'
					? entitlementValue.updatedAt
					: new Date().toISOString()
		};
	}
</script>

<svelte:head>
	<title>QckPages | HTML hosting</title>
	<meta name="description" content="Upload an HTML file and turn it into a shareable link." />
</svelte:head>

{#if auth.isAuthenticated && user}
	<div class="flex h-dvh flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
		<DashboardHeader {user} onsignout={signOut}>
			<PlanBadge tier={entitlement.tier} />
			{#if isPro && hasBillingPortal}
				<UpgradeButton kind="portal" isLoading={isBillingLoading} onclick={openPortal} />
			{:else if !isPro}
				<UpgradeButton isLoading={isBillingLoading} onclick={upgrade} />
			{/if}
		</DashboardHeader>

		<main
			class="mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-4 px-4 py-4 lg:grid-cols-[400px_minmax(0,1fr)]"
		>
			<div class="self-start">
				<UploadPanel
					{isUploading}
					{isQuotaBlocked}
					{publishedSlugs}
					error={pageError}
					onpublish={publishPage}
					onupgrade={upgrade}
				/>
			</div>

			<PageList
				{pages}
				{origin}
				{usageLabel}
				isLoading={pagesQuery.isLoading}
				ondelete={deletePage}
			/>
		</main>

		<AppFooter />
	</div>
{:else if auth.isLoading || (auth.isAuthenticated && !user)}
	<AuthLoadingShell />
{:else}
	<AuthPanel isLoading={auth.isLoading} error={authError} onsignin={signInWithGoogle} />
{/if}
