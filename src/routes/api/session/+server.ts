import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ShooAuthError, verifyShooToken } from '$lib/server/shoo';

export const POST: RequestHandler = async ({ request, url }) => {
	const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
	const idToken = typeof body?.idToken === 'string' ? body.idToken : '';

	if (!idToken) {
		return json({ error: 'Missing idToken' }, { status: 400 });
	}

	try {
		return json(await verifyShooToken(idToken, url.origin));
	} catch (error) {
		if (error instanceof ShooAuthError) {
			return json({ error: error.message, code: error.code }, { status: error.status });
		}

		return json({ error: 'Session verification failed', code: 'session_invalid' }, { status: 401 });
	}
};
