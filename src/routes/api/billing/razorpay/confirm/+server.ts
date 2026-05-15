import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { createServerConvexClient } from '$lib/server/convex';
import { getRazorpayClient, getRazorpayKeySecret } from '$lib/server/razorpay';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';

export const POST: RequestHandler = async (event) => {
	try {
		const body = (await event.request.json()) as {
			razorpay_payment_id?: unknown;
			razorpay_subscription_id?: unknown;
			razorpay_signature?: unknown;
		};

		if (
			typeof body.razorpay_payment_id !== 'string' ||
			typeof body.razorpay_subscription_id !== 'string' ||
			typeof body.razorpay_signature !== 'string'
		) {
			return json({ error: 'Invalid checkout response' }, { status: 400 });
		}

		const verified = validatePaymentVerification(
			{
				payment_id: body.razorpay_payment_id,
				subscription_id: body.razorpay_subscription_id
			},
			body.razorpay_signature,
			getRazorpayKeySecret()
		);

		if (!verified) {
			return json({ error: 'Invalid checkout signature' }, { status: 401 });
		}

		const subscription = await getRazorpayClient().subscriptions.fetch(
			body.razorpay_subscription_id
		);
		const convex = createServerConvexClient({ token: event.locals.token });

		await convex.mutation(api.billing.markCurrentUserRazorpayProActive, {
			razorpaySubscriptionId: subscription.id,
			razorpayPaymentId: body.razorpay_payment_id,
			status: subscription.status,
			razorpaySubscriptionShortUrl: subscription.short_url,
			currentPeriodEnd: timestampToIso(subscription.current_end ?? subscription.charge_at)
		});

		return json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not verify checkout';
		return json({ error: message }, { status: 502 });
	}
};

function timestampToIso(value: number | null | undefined): string | undefined {
	return value ? new Date(value * 1000).toISOString() : undefined;
}
