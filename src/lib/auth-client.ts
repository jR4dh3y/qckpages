import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	plugins: [convexClient()]
});

interface RazorpayCheckoutResponse {
	razorpay_payment_id: string;
	razorpay_order_id: string;
	razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
	key: string;
	order_id: string;
	amount: number;
	currency: string;
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

interface RazorpayPaymentFailedResponse {
	error?: {
		description?: string;
		reason?: string;
	};
}

interface RazorpayConstructor {
	new (options: RazorpayCheckoutOptions): {
		open(): void;
		on(event: 'payment.failed', callback: (response: RazorpayPaymentFailedResponse) => void): void;
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

	const response = await fetch('/api/create-order', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			amount: 14900,
			currency: 'INR',
			receipt: `qckpages_pro_${Date.now()}`
		})
	});

	if (!response.ok) {
		throw new Error(await readApiError(response, 'Could not start checkout'));
	}

	const order = (await response.json()) as {
		key_id: string;
		order_id: string;
		amount: number;
		currency: string;
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
			key: order.key_id,
			order_id: order.order_id,
			amount: order.amount,
			currency: order.currency,
			name: 'QckPages Pro',
			description: 'Unlimited pages',
			prefill: {
				name: order.name,
				email: order.email
			},
			notes: {
				userId: order.userId
			},
			theme: {
				color: '#22c55e'
			},
			handler: (payment) => {
				void verifyRazorpayPayment(payment).then(resolve, reject);
			},
			modal: {
				ondismiss: () => reject(new Error('Checkout was closed before payment completed'))
			}
		});

		checkout.on('payment.failed', (response) => {
			reject(new Error(response.error?.description ?? response.error?.reason ?? 'Payment failed'));
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

async function verifyRazorpayPayment(payment: RazorpayCheckoutResponse): Promise<void> {
	const response = await fetch('/api/verify-payment', {
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
