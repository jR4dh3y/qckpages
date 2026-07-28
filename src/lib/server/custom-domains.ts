import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { normalizeCustomHostname } from '$convex/domainValidation';

export function normalizeRequestedHostname(value: string): string {
	return normalizeCustomHostname(value, { reservedHosts: canonicalHostValues() });
}

export function isCanonicalAppHostname(hostname: string): boolean {
	const normalized = hostname.toLowerCase().replace(/\.$/, '');
	if (
		normalized === 'localhost' ||
		normalized === '127.0.0.1' ||
		normalized === '0.0.0.0' ||
		normalized === '[::1]' ||
		normalized.endsWith('.vercel.app')
	) {
		return true;
	}

	return canonicalHostValues().some((value) => hostnameFromValue(value) === normalized);
}

export function customDomainStatusFromMessage(message: string): number {
	if (
		message.includes('Authentication') ||
		message.includes('Unauth') ||
		message.includes('Sign in')
	) {
		return 401;
	}
	if (message.includes('require permanent Pro')) return 403;
	if (message.includes('Forbidden')) return 403;
	if (message.includes('not found')) return 404;
	if (
		message.includes('Only one') ||
		message.includes('already configured') ||
		message.includes('different Vercel project') ||
		message.includes('Use reassign')
	) {
		return 409;
	}
	if (
		message.includes('Enter an exact') ||
		message.includes('registrable-domain subdomain') ||
		message.includes('reserved by QckPages') ||
		message.includes('Choose a published')
	) {
		return 400;
	}
	return 502;
}

function canonicalHostValues(): string[] {
	return [
		publicEnv.PUBLIC_SITE_URL ?? '',
		privateEnv.SITE_URL ?? '',
		privateEnv.BETTER_AUTH_URL ?? ''
	].filter(Boolean);
}

function hostnameFromValue(value: string): string {
	try {
		return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
	} catch {
		return value.toLowerCase();
	}
}
