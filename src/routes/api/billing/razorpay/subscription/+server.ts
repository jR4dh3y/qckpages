import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { createServerConvexClient } from '$lib/server/convex';
import { getRazorpayClient, getRazorpayKeyId, getRazorpayPlanId } from '$lib/server/razorpay';

export const POST: RequestHandler = async (event) => {
	try {
		const convex = createServerConvexClient({ token: event.locals.token });
		const user = (await convex.mutation(api.billing.prepareRazorpaySubscription, {})) as {
			userId: string;
			email?: string;
			name?: string;
		};

		const subscription = await getRazorpayClient().subscriptions.create({
			plan_id: getRazorpayPlanId(),
			total_count: 120,
			quantity: 1,
			customer_notify: 1,
			notes: {
				userId: user.userId,
				product: 'qckpages_pro'
			}
		});

		return json({
			keyId: getRazorpayKeyId(),
			subscriptionId: subscription.id,
			userId: user.userId,
			email: user.email,
			name: user.name
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not create subscription';
		return json({ error: message }, { status: message.includes('Sign in') ? 401 : 502 });
	}
};
