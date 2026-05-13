import type { PublicUser } from '$lib/types/pages';

export interface ShooIdentity {
	userId: string | null;
	token: string | null;
	email?: string;
	name?: string;
	picture?: string;
}

interface ShooClient {
	getIdentity(): ShooIdentity;
	startSignIn(options?: { returnTo?: string; requestPii?: boolean }): void;
	clearIdentity(): void;
}

declare global {
	interface Window {
		Shoo?: ShooClient;
	}
}

export interface CachedShooSession {
	token: string;
	user: PublicUser;
}

const sessionCacheKey = 'qckpages-shoo-session';

async function waitForShooClient(timeoutMs = 2000): Promise<ShooClient | undefined> {
	const startedAt = performance.now();

	while (!window.Shoo && performance.now() - startedAt < timeoutMs) {
		await new Promise((resolve) => window.setTimeout(resolve, 25));
	}

	return window.Shoo;
}

export function readShooIdentity(): ShooIdentity | null {
	return window.Shoo?.getIdentity() ?? null;
}

export async function readShooIdentityWhenReady(): Promise<ShooIdentity | null> {
	await waitForShooClient();
	return readShooIdentity();
}

export function readCachedShooSession(): CachedShooSession | null {
	const raw = window.sessionStorage.getItem(sessionCacheKey);
	if (!raw) {
		return null;
	}

	try {
		const cached = JSON.parse(raw) as Partial<CachedShooSession>;
		if (
			typeof cached.token !== 'string' ||
			!cached.user ||
			typeof cached.user.userId !== 'string'
		) {
			return null;
		}

		return {
			token: cached.token,
			user: {
				userId: cached.user.userId,
				email: typeof cached.user.email === 'string' ? cached.user.email : undefined,
				name: typeof cached.user.name === 'string' ? cached.user.name : undefined,
				picture: typeof cached.user.picture === 'string' ? cached.user.picture : undefined
			}
		};
	} catch {
		window.sessionStorage.removeItem(sessionCacheKey);
		return null;
	}
}

export function writeCachedShooSession(session: CachedShooSession): void {
	window.sessionStorage.setItem(sessionCacheKey, JSON.stringify(session));
}

export function clearCachedShooSession(): void {
	window.sessionStorage.removeItem(sessionCacheKey);
}

export async function startShooSignIn(): Promise<void> {
	const shoo = await waitForShooClient();
	shoo?.startSignIn({ returnTo: '/', requestPii: true });
}

export function clearShooIdentity(): void {
	clearCachedShooSession();
	window.Shoo?.clearIdentity();
}

export class ShooSessionError extends Error {
	code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = 'ShooSessionError';
		this.code = code;
	}
}

export async function verifyShooIdentity(token: string): Promise<PublicUser> {
	const response = await fetch('/api/session', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ idToken: token })
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: unknown;
			code?: unknown;
		} | null;
		const message =
			typeof body?.error === 'string' ? body.error : 'Shoo session could not be verified';
		const code = typeof body?.code === 'string' ? body.code : 'session_invalid';

		throw new ShooSessionError(message, code);
	}

	return (await response.json()) as PublicUser;
}
