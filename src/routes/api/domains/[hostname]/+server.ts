import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import { resolveAuthContext } from '$lib/server/auth';
import { createServerConvexClient } from '$lib/server/convex';
import {
	customDomainStatusFromMessage,
	normalizeRequestedHostname
} from '$lib/server/custom-domains';
import type { CustomDomain } from '$lib/types/domains';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async (event) => {
	try {
		const hostname = normalizeRequestedHostname(event.params.hostname);
		const body = (await event.request.json().catch(() => null)) as Record<string, unknown> | null;
		if (typeof body?.pageId !== 'string') throw new Error('pageId is required');

		const auth = await resolveAuthContext(event);
		const convex = createServerConvexClient({ token: auth.token });
		const domain = (await convex.mutation(api.customDomains.reassign, {
			hostname,
			pageId: body.pageId
		})) as CustomDomain;
		return json({ domain });
	} catch (error) {
		return errorResponse(error, 'Could not reassign the custom domain');
	}
};

export const DELETE: RequestHandler = async (event) => {
	try {
		const hostname = normalizeRequestedHostname(event.params.hostname);
		const auth = await resolveAuthContext(event);
		const convex = createServerConvexClient({ token: auth.token });
		await convex.action(api.customDomains.remove, { hostname });
		return new Response(null, { status: 204 });
	} catch (error) {
		return errorResponse(error, 'Could not remove the custom domain');
	}
};

function errorResponse(error: unknown, fallback: string): Response {
	const message = error instanceof Error ? error.message : fallback;
	return json({ error: message }, { status: customDomainStatusFromMessage(message) });
}
