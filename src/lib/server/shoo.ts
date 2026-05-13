import { env } from '$env/dynamic/private';
import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import type { RequestEvent } from '@sveltejs/kit';
import type { PublicUser } from '$lib/types/pages';

const shooBaseUrl = env.SHOO_BASE_URL || 'https://shoo.dev';
const shooIssuer = env.SHOO_ISSUER || shooBaseUrl;
const jwks = createRemoteJWKSet(new URL('/.well-known/jwks.json', shooBaseUrl));

export class ShooAuthError extends Error {
	status: number;
	code: string;

	constructor(message: string, code = 'session_invalid', status = 401) {
		super(message);
		this.name = 'ShooAuthError';
		this.code = code;
		this.status = status;
	}
}

export async function verifyShooToken(idToken: string, appOrigin: string): Promise<PublicUser> {
	const audience = `origin:${new URL(appOrigin).origin}`;
	let payload;

	try {
		({ payload } = await jwtVerify(idToken, jwks, {
			issuer: shooIssuer,
			audience,
			clockTolerance: 30
		}));
	} catch (error) {
		if (error instanceof errors.JWTExpired) {
			throw new ShooAuthError('Session expired. Sign in again.', 'session_expired');
		}

		throw new ShooAuthError('Session could not be verified.');
	}

	if (typeof payload.pairwise_sub !== 'string') {
		throw new ShooAuthError('Session could not be verified.');
	}

	return {
		userId: payload.pairwise_sub,
		email: typeof payload.email === 'string' ? payload.email : undefined,
		name: typeof payload.name === 'string' ? payload.name : undefined,
		picture: typeof payload.picture === 'string' ? payload.picture : undefined
	};
}

export async function verifyShooRequest(event: RequestEvent): Promise<PublicUser> {
	const header = event.request.headers.get('authorization') ?? '';
	const [scheme, token] = header.split(/\s+/, 2);

	if (scheme?.toLowerCase() !== 'bearer' || !token) {
		throw new ShooAuthError('Sign in required.', 'session_missing');
	}

	return verifyShooToken(token, event.url.origin);
}
