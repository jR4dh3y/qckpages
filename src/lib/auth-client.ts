import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	plugins: [convexClient()]
});

interface RazorpayCheckoutResponse {
	razorpay_payment_id: string;
	razorpay_subscription_id: string;
	razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
	key: string;
	subscription_id: string;
	name: string;
	description: string;
	handler: (response: RazorpayCheckoutResponse) => void;
	prefill?: {
		name?: string;
		email?: string;
	};
	notes?: Record<string, string>;
	theme?: {
		color?: string;
	};
	modal?: {
		ondismiss?: () => void;
	};
}

interface RazorpayConstructor {
	new (options: RazorpayCheckoutOptions): {
		open(): void;
	};
}

declare global {
	interface Window {
		Razorpay?: RazorpayConstructor;
	}
}

let razorpayScriptPromise: Promise<void> | null = null;

export async function startProCheckout(): Promise<void> {
	await loadRazorpayScript();

	const response = await fetch('/api/billing/razorpay/subscription', {
		method: 'POST'
	});

	if (!response.ok) {
		throw new Error(await readApiError(response, 'Could not start checkout'));
	}

	const subscription = (await response.json()) as {
		keyId: string;
		subscriptionId: string;
		userId: string;
		name?: string;
		email?: string;
	};

	const Razorpay = window.Razorpay;
	if (!Razorpay) {
		throw new Error('Razorpay checkout did not load');
	}

	await new Promise<void>((resolve, reject) => {
		const checkout = new Razorpay({
			key: subscription.keyId,
			subscription_id: subscription.subscriptionId,
			name: 'QckPages Pro',
			description: 'Unlimited pages at Rs.149/month',
			prefill: {
				name: subscription.name,
				email: subscription.email
			},
			notes: {
				userId: subscription.userId
			},
			theme: {
				color: '#22c55e'
			},
			handler: (payment) => {
				void confirmRazorpaySubscription(payment).then(resolve, reject);
			},
			modal: {
				ondismiss: () => reject(new Error('Checkout was closed before payment completed'))
			}
		});

		checkout.open();
	});
}

export async function openCustomerPortal(): Promise<void> {
	const response = await fetch('/api/billing/razorpay/portal', {
		method: 'POST'
	});

	if (!response.ok) {
		throw new Error(await readApiError(response, 'Could not open billing'));
	}

	const body = (await response.json()) as { url?: unknown };
	if (typeof body.url !== 'string') {
		throw new Error('Billing link is not available yet');
	}

	window.location.href = body.url;
}

async function confirmRazorpaySubscription(payment: RazorpayCheckoutResponse): Promise<void> {
	const response = await fetch('/api/billing/razorpay/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payment)
	});

	if (!response.ok) {
		throw new Error(await readApiError(response, 'Could not verify checkout'));
	}
}

async function loadRazorpayScript(): Promise<void> {
	if (razorpayScriptPromise) {
		return razorpayScriptPromise;
	}

	razorpayScriptPromise = new Promise((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(
			'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
		);
		if (existing) {
			resolve();
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://checkout.razorpay.com/v1/checkout.js';
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
		document.head.append(script);
	});

	return razorpayScriptPromise;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
	const body = (await response.json().catch(() => null)) as {
		error?: unknown;
	} | null;
	return typeof body?.error === 'string' ? body.error : `${fallback} (${response.status})`;
}
