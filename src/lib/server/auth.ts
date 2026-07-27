import { api } from '$convex/_generated/api';
import { createServerConvexClient } from '$lib/server/convex';
import type { RequestEvent } from '@sveltejs/kit';

export interface AuthContext {
	token?: string;
	userId?: string;
}

export async function resolveAuthContext(event: RequestEvent): Promise<AuthContext> {
	const authHeader = event.request.headers.get('authorization');
	if (authHeader?.startsWith('Bearer ')) {
		const bearerToken = authHeader.slice(7).trim();
		if (bearerToken.startsWith('qck_')) {
			const convex = createServerConvexClient();
			const res = (await convex.mutation(api.apiKeys.validateApiKey, { key: bearerToken })) as {
				valid: boolean;
				userId: string | null;
			};
			if (res.valid && res.userId) {
				return { userId: res.userId };
			}
			throw new Error('Invalid or revoked API key');
		} else {
			return { token: bearerToken };
		}
	}

	if (event.locals.token) {
		return { token: event.locals.token };
	}

	throw new Error('Authentication required. Sign in or provide a valid API key.');
}
