import { isValidSlug } from '$lib/utils/slug';

export interface PageSubdomain {
	baseHostname: string;
	slug: string;
}

export function pageSubdomainHostname(slug: string, baseHostname: string): string | null {
	const hostname = `${slug}.${baseHostname}`.toLowerCase().replace(/\.$/, '');
	if (!isValidSlug(slug) || slug.length > 63 || hostname.length > 253) return null;
	return hostname;
}

export function parsePageSubdomain(hostname: string): PageSubdomain | null {
	const normalized = hostname.toLowerCase().replace(/\.$/, '');
	const [slug, ...baseParts] = normalized.split('.');
	const baseHostname = baseParts.join('.');

	if (!pageSubdomainHostname(slug, baseHostname) || baseParts.length < 2) return null;
	return { baseHostname, slug };
}
