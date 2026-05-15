import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { createServerConvexClient } from '$lib/server/convex';
import type { Entitlement } from '$lib/types/pages';

export const POST: RequestHandler = async (event) => {
	try {
		const convex = createServerConvexClient({ token: event.locals.token });
		const entitlement = (await convex.query(api.billing.getEntitlement, {})) as Entitlement;

		if (!entitlement.razorpaySubscriptionShortUrl) {
			return json({ error: 'Billing link is not available yet' }, { status: 404 });
		}

		return json({ url: entitlement.razorpaySubscriptionShortUrl });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not open billing';
		return json({ error: message }, { status: 502 });
	}
};
