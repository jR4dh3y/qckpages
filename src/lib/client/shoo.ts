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

export function readShooIdentity(): ShooIdentity | null {
	return window.Shoo?.getIdentity() ?? null;
}

export function startShooSignIn(): void {
	window.Shoo?.startSignIn({ returnTo: '/', requestPii: true });
}

export function clearShooIdentity(): void {
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
