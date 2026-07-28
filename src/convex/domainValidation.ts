import { parse } from 'tldts';

const hostnamePattern =
	/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const alwaysReservedHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export interface DomainValidationOptions {
	reservedHosts?: readonly string[];
}

export function normalizeCustomHostname(
	value: string,
	options: DomainValidationOptions = {}
): string {
	const rawHostname = value.trim().toLowerCase().replace(/\.$/, '');

	if (
		!rawHostname ||
		rawHostname.includes('://') ||
		rawHostname.includes('/') ||
		rawHostname.includes(':') ||
		rawHostname.includes('*') ||
		/[\\@?#%]/.test(rawHostname) ||
		/\s/.test(rawHostname)
	) {
		throw new Error('Enter an exact subdomain such as go.example.com');
	}

	const hostname = toAsciiHostname(rawHostname);
	if (!hostname || !hostnamePattern.test(hostname)) {
		throw new Error('Enter an exact valid subdomain such as go.example.com');
	}

	const reservedHosts = new Set([
		...alwaysReservedHosts,
		...(options.reservedHosts ?? []).map(normalizeReservedHost).filter(Boolean)
	]);
	if (
		reservedHosts.has(hostname) ||
		hostname.endsWith('.vercel.app') ||
		hostname.endsWith('.convex.site')
	) {
		throw new Error('That hostname is reserved by QckPages');
	}

	const parsed = parse(hostname, { allowPrivateDomains: true, validateHostname: true });
	if (
		!parsed.domain ||
		!parsed.publicSuffix ||
		(!parsed.isIcann && !parsed.isPrivate) ||
		!parsed.subdomain
	) {
		throw new Error('A registrable-domain subdomain is required; apex domains are not supported');
	}

	return hostname;
}

function toAsciiHostname(value: string): string {
	try {
		return new URL(`http://${value}`).hostname.toLowerCase().replace(/\.$/, '');
	} catch {
		return '';
	}
}

function normalizeReservedHost(value: string): string {
	const raw = value.trim().toLowerCase();
	if (!raw) return '';

	try {
		return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.replace(/\.$/, '');
	} catch {
		return raw.replace(/\.$/, '');
	}
}
