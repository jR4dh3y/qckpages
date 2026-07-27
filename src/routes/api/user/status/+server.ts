import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { createServerConvexClient } from '$lib/server/convex';
import { resolveAuthContext } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	try {
		const authCtx = await resolveAuthContext(event);
		const convex = createServerConvexClient({ token: authCtx.token });
		const status = await convex.query(api.apiKeys.getUserStatus, {
			userId: authCtx.userId
		});
		return json(status);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not fetch user status';
		return json({ error: message }, { status: 401 });
	}
};
