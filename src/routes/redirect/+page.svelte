<script lang="ts">
	import { resolve } from '$app/paths';
	import { api } from '$convex/_generated/api';
	import { useQuery } from '@mmailaender/convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import AppFooter from '$lib/components/AppFooter.svelte';
	import AuthLoadingShell from '$lib/components/AuthLoadingShell.svelte';
	import AuthPanel from '$lib/components/AuthPanel.svelte';
	import CustomDomainPanel from '$lib/components/CustomDomainPanel.svelte';
	import DashboardHeader from '$lib/components/DashboardHeader.svelte';
	import PlanComparisonModal from '$lib/components/PlanComparisonModal.svelte';
	import UpgradeButton from '$lib/components/UpgradeButton.svelte';
	import { authClient, openCustomerPortal, startProCheckout } from '$lib/auth-client';
	import {
		createCustomDomain,
		removeCustomDomain,
		verifyCustomDomain
	} from '$lib/custom-domain-client';
	import type { CustomDomain } from '$lib/types/domains';
	import { toEntitlement, toPublicUser } from '$lib/utils/account';

	const auth = useAuth();
	const currentUserQuery = useQuery(api.auth.getCurrentUser, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const entitlementQuery = useQuery(api.billing.getEntitlement, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const customDomainQuery = useQuery(api.customDomains.getForCurrentUser, () =>
		auth.isAuthenticated ? {} : 'skip'
	);

	let isBillingLoading = $state(false);
	let isDomainWorking = $state(false);
	let showPlanModal = $state(false);
	let authError = $state<string | null>(null);
	let domainError = $state<string | null>(null);
	let billingError = $state<string | null>(null);

	let user = $derived(toPublicUser(currentUserQuery.data));
	let entitlement = $derived(toEntitlement(entitlementQuery.data, user?.userId));
	let customDomain = $derived((customDomainQuery.data as CustomDomain | null | undefined) ?? null);
	let isPro = $derived(entitlement.tier === 'pro' && entitlement.status === 'active');
	let hasBillingPortal = $derived(Boolean(entitlement.razorpaySubscriptionShortUrl));

	async function signInWithGoogle(): Promise<void> {
		authError = null;
		const result = await authClient.signIn.social({
			provider: 'google',
			callbackURL: resolve('/redirect')
		});

		if (result.error) {
			authError = result.error.message ?? 'Could not start Google sign-in';
		}
	}

	async function signOut(): Promise<void> {
		await authClient.signOut();
	}

	async function createDomain(hostname: string): Promise<void> {
		await runDomainAction(() => createCustomDomain(hostname));
	}

	async function verifyDomain(hostname: string): Promise<void> {
		await runDomainAction(() => verifyCustomDomain(hostname));
	}

	async function removeDomain(hostname: string): Promise<void> {
		await runDomainAction(() => removeCustomDomain(hostname));
	}

	async function runDomainAction(action: () => Promise<void>): Promise<void> {
		isDomainWorking = true;
		domainError = null;

		try {
			await action();
		} catch (error) {
			domainError = error instanceof Error ? error.message : 'Could not update custom domain';
		} finally {
			isDomainWorking = false;
		}
	}

	function openPlanModal(): void {
		showPlanModal = true;
	}

	async function upgrade(): Promise<void> {
		showPlanModal = false;
		await runBillingAction(startProCheckout);
	}

	async function openPortal(): Promise<void> {
		await runBillingAction(openCustomerPortal);
	}

	async function runBillingAction(action: () => Promise<void>): Promise<void> {
		isBillingLoading = true;
		billingError = null;

		try {
			await action();
		} catch (error) {
			billingError = error instanceof Error ? error.message : 'Could not open billing';
		} finally {
			isBillingLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Custom Domain | QckPages</title>
	<meta
		name="description"
		content="Give every HTML page published with QckPages its own custom subdomain."
	/>
</svelte:head>

{#if auth.isAuthenticated && user}
	<div class="flex min-h-dvh flex-col bg-(--paper) text-(--ink)">
		<DashboardHeader
			{user}
			current="redirect"
			onsignout={signOut}
			onbilling={isPro && hasBillingPortal ? openPortal : undefined}
		>
			<UpgradeButton {isPro} isLoading={isBillingLoading} onclick={openPlanModal} />
		</DashboardHeader>

		<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6">
			<div>
				{#if billingError}
					<p
						class="mb-4 border border-(--danger-line) bg-(--danger-bg) px-3 py-2 text-sm text-(--danger)"
					>
						{billingError}
					</p>
				{/if}

				<CustomDomainPanel
					{isPro}
					domain={customDomain}
					isLoading={customDomainQuery.isLoading}
					isWorking={isDomainWorking}
					error={domainError}
					oncreate={createDomain}
					onverify={verifyDomain}
					onremove={removeDomain}
					onupgrade={openPlanModal}
				/>
			</div>
		</main>

		<AppFooter />
	</div>

	{#if showPlanModal && !isPro}
		<PlanComparisonModal
			isLoading={isBillingLoading}
			onupgrade={upgrade}
			onclose={() => (showPlanModal = false)}
		/>
	{/if}
{:else if auth.isLoading || (auth.isAuthenticated && !user)}
	<AuthLoadingShell />
{:else}
	<AuthPanel isLoading={auth.isLoading} error={authError} onsignin={signInWithGoogle} />
{/if}
