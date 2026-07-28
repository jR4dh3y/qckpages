<script lang="ts">
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$convex/_generated/api';
	import DashboardHeader from '$lib/components/DashboardHeader.svelte';
	import AppFooter from '$lib/components/AppFooter.svelte';
	import AuthLoadingShell from '$lib/components/AuthLoadingShell.svelte';
	import AuthPanel from '$lib/components/AuthPanel.svelte';
	import CliSection from '$lib/components/CliSection.svelte';
	import UpgradeButton from '$lib/components/UpgradeButton.svelte';
	import PlanComparisonModal from '$lib/components/PlanComparisonModal.svelte';
	import { authClient, openCustomerPortal, startProCheckout } from '$lib/auth-client';
	import { toEntitlement, toPublicUser } from '$lib/utils/account';

	const auth = useAuth();
	const currentUserQuery = useQuery(api.auth.getCurrentUser, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const entitlementQuery = useQuery(api.billing.getEntitlement, () =>
		auth.isAuthenticated ? {} : 'skip'
	);

	let isBillingLoading = $state(false);
	let showPlanModal = $state(false);
	let authError = $state<string | null>(null);

	let user = $derived(toPublicUser(currentUserQuery.data));
	let entitlement = $derived(toEntitlement(entitlementQuery.data, user?.userId));
	let isPro = $derived(entitlement.tier === 'pro' && entitlement.status === 'active');
	let hasBillingPortal = $derived(Boolean(entitlement.razorpaySubscriptionShortUrl));

	async function signOut(): Promise<void> {
		await authClient.signOut();
	}

	function openPlanModal(): void {
		showPlanModal = true;
	}

	async function upgrade(): Promise<void> {
		isBillingLoading = true;
		try {
			await startProCheckout();
		} catch (err) {
			authError = err instanceof Error ? err.message : 'Checkout error';
		} finally {
			isBillingLoading = false;
		}
	}

	async function openPortal(): Promise<void> {
		await openCustomerPortal();
	}

	function signInWithGoogle(): void {
		authError = null;
		void authClient.signIn.social({
			provider: 'google',
			callbackURL: typeof window !== 'undefined' ? window.location.href : '/'
		});
	}
</script>

<svelte:head>
	<title>CLI & API Keys | QckPages</title>
	<meta
		name="description"
		content="Manage API keys and view installation instructions for QckPages CLI."
	/>
</svelte:head>

{#if auth.isAuthenticated && user}
	<div class="flex h-dvh flex-col overflow-hidden bg-(--paper) text-(--ink)">
		<DashboardHeader
			{user}
			current="cli"
			onsignout={signOut}
			onbilling={isPro && hasBillingPortal ? openPortal : undefined}
		>
			<UpgradeButton {isPro} isLoading={isBillingLoading} onclick={openPlanModal} />
		</DashboardHeader>

		<main
			class="mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-4 px-4 py-4 lg:grid-cols-[400px_minmax(0,1fr)]"
		>
			<CliSection />
		</main>

		<AppFooter />
	</div>

	{#if showPlanModal && !isPro}
		<PlanComparisonModal
			isLoading={isBillingLoading}
			onupgrade={upgrade}
			onclose={() => {
				showPlanModal = false;
			}}
		/>
	{/if}
{:else if auth.isLoading || (auth.isAuthenticated && !user)}
	<AuthLoadingShell />
{:else}
	<AuthPanel isLoading={auth.isLoading} error={authError} onsignin={signInWithGoogle} />
{/if}
