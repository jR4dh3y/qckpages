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

export const GET: RequestHandler = async (event) => {
	try {
		const auth = await resolveAuthContext(event);
		const convex = createServerConvexClient({ token: auth.token });
		const domain = (await convex.query(
			api.customDomains.getForCurrentUser,
			{}
		)) as CustomDomain | null;
		return json({ domain });
	} catch (error) {
		return errorResponse(error, 'Could not load the custom domain');
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		const body = await readDomainBody(event.request);
		const hostname = normalizeRequestedHostname(body.hostname);
		const auth = await resolveAuthContext(event);
		const convex = createServerConvexClient({ token: auth.token });
		const domain = (await convex.action(api.customDomains.provision, {
			hostname,
			pageId: body.pageId
		})) as CustomDomain;
		return json({ domain }, { status: 201 });
	} catch (error) {
		return errorResponse(error, 'Could not configure the custom domain');
	}
};

async function readDomainBody(request: Request): Promise<{ hostname: string; pageId: string }> {
	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (typeof body?.hostname !== 'string' || typeof body.pageId !== 'string') {
		throw new Error('hostname and pageId are required');
	}
	return { hostname: body.hostname, pageId: body.pageId };
}

function errorResponse(error: unknown, fallback: string): Response {
	const message = error instanceof Error ? error.message : fallback;
	return json({ error: message }, { status: customDomainStatusFromMessage(message) });
}
