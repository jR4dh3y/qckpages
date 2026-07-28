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

export const POST: RequestHandler = async (event) => {
	try {
		const hostname = normalizeRequestedHostname(event.params.hostname);
		const auth = await resolveAuthContext(event);
		const convex = createServerConvexClient({ token: auth.token });
		const domain = (await convex.action(api.customDomains.verify, { hostname })) as CustomDomain;
		return json({ domain });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not check DNS';
		return json({ error: message }, { status: customDomainStatusFromMessage(message) });
	}
};
