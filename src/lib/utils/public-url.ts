import type { CustomDomain } from '$lib/types/domains';
import { pageSubdomainHostname } from '$lib/utils/domain-routing';

export function publicPageUrl(
	origin: string,
	slug: string,
	customDomain: CustomDomain | null
): string {
	if (customDomain?.status === 'active' && customDomain.routingMode === 'subdomains') {
		const hostname = pageSubdomainHostname(slug, customDomain.hostname);
		if (hostname) return `https://${hostname}`;
	}

	return `${origin}/${slug}`;
}
