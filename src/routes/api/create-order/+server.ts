import { randomUUID } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { createServerConvexClient } from '$lib/server/convex';
import { getRazorpayClient, getRazorpayKeyId } from '$lib/server/razorpay';

interface CreateOrderRequest {
	amount?: unknown;
	currency?: unknown;
	receipt?: unknown;
}

interface RazorpayOrder {
	id: string;
	amount: number;
	currency: string;
}

interface RazorpayApiError {
	statusCode?: number;
	error?: {
		code?: string;
		description?: string;
	};
	message?: string;
}

export const POST: RequestHandler = async (event) => {
	try {
		const body = (await event.request.json().catch(() => ({}))) as CreateOrderRequest;
		const amount = parseAmount(body.amount);

		if (amount < 100) {
			return json({ error: 'Amount must be at least 100 paise' }, { status: 400 });
		}

		const currency = parseCurrency(body.currency);
		const receipt = parseReceipt(body.receipt);
		const convex = createServerConvexClient({ token: event.locals.token });
		const user = (await convex.mutation(api.billing.prepareRazorpaySubscription, {})) as {
			userId: string;
			email?: string;
			name?: string;
		};

		const order = (await getRazorpayClient().orders.create({
			amount,
			currency,
			receipt,
			notes: {
				userId: user.userId,
				product: 'qckpages_pro'
			}
		})) as RazorpayOrder;

		return json({
			order_id: order.id,
			amount: order.amount,
			currency: order.currency,
			key_id: getRazorpayKeyId(),
			userId: user.userId,
			email: user.email,
			name: user.name
		});
	} catch (error) {
		const status = responseStatus(error);
		const message = errorMessage(error, 'Could not create Razorpay order');
		return json({ error: message }, { status });
	}
};

function parseAmount(value: unknown): number {
	if (typeof value === 'number' && Number.isInteger(value)) {
		return value;
	}

	if (typeof value === 'string' && /^\d+$/.test(value)) {
		return Number(value);
	}

	return 0;
}

function parseCurrency(value: unknown): string {
	return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : 'INR';
}

function parseReceipt(value: unknown): string {
	return typeof value === 'string' && value.trim() ? value.trim() : `qckpages_${randomUUID()}`;
}

function responseStatus(error: unknown): 401 | 500 {
	const apiError = error as RazorpayApiError;

	if (apiError.statusCode === 401) {
		return 401;
	}

	if (error instanceof Error && error.message.includes('Sign in')) {
		return 401;
	}

	return 500;
}

function errorMessage(error: unknown, fallback: string): string {
	const apiError = error as RazorpayApiError;
	return apiError.error?.description ?? (error instanceof Error ? error.message : fallback);
}
