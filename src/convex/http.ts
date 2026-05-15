import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { authComponent, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
	path: '/razorpay/webhook',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.text();
		const signature = request.headers.get('x-razorpay-signature');
		const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

		if (!secret) {
			return new Response('Webhook secret is not configured', { status: 500 });
		}

		if (!signature || !(await isValidRazorpaySignature(body, signature, secret))) {
			return new Response('Invalid webhook signature', { status: 401 });
		}

		const payload = JSON.parse(body) as RazorpayWebhookPayload;
		const subscription = payload.payload.subscription?.entity;
		if (!subscription) {
			return Response.json({ received: true });
		}

		const userId = stringNote(subscription.notes?.userId);
		if (!userId) {
			return Response.json({ received: true });
		}

		if (isActiveSubscriptionEvent(payload.event, subscription.status)) {
			await ctx.runMutation(internal.billing.markRazorpayProActive, {
				userId,
				razorpayCustomerId: subscription.customer_id ?? undefined,
				razorpaySubscriptionId: subscription.id,
				razorpaySubscriptionShortUrl: subscription.short_url ?? undefined,
				currentPeriodEnd: timestampToIso(subscription.current_end ?? subscription.charge_at),
				status: subscription.status
			});
		}

		if (isInactiveSubscriptionEvent(payload.event, subscription.status)) {
			await ctx.runMutation(internal.billing.markRazorpayProInactive, {
				userId,
				razorpayCustomerId: subscription.customer_id ?? undefined,
				razorpaySubscriptionId: subscription.id,
				status: subscription.status
			});
		}

		return Response.json({ received: true });
	})
});

interface RazorpayWebhookPayload {
	event: string;
	payload: {
		subscription?: {
			entity: {
				id: string;
				status: string;
				customer_id?: string | null;
				short_url?: string | null;
				current_end?: number | null;
				charge_at?: number | null;
				notes?: Record<string, unknown>;
			};
		};
	};
}

function isActiveSubscriptionEvent(event: string, status: string): boolean {
	return (
		(event === 'subscription.authenticated' || event === 'subscription.activated') &&
		(status === 'authenticated' || status === 'active')
	);
}

function isInactiveSubscriptionEvent(event: string, status: string): boolean {
	return (
		event === 'subscription.cancelled' ||
		event === 'subscription.halted' ||
		status === 'cancelled' ||
		status === 'halted' ||
		status === 'expired'
	);
}

function timestampToIso(value: number | null | undefined): string | undefined {
	return value ? new Date(value * 1000).toISOString() : undefined;
}

function stringNote(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value : undefined;
}

async function isValidRazorpaySignature(
	body: string,
	signature: string,
	secret: string
): Promise<boolean> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
	return timingSafeEqual(hex(new Uint8Array(digest)), signature);
}

function hex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) {
		return false;
	}

	let result = 0;
	for (let index = 0; index < left.length; index += 1) {
		result |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return result === 0;
}

export default http;
