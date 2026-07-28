export async function createCustomDomain(hostname: string): Promise<void> {
	await requestDomainUpdate('/api/domains', 'POST', { hostname });
}

export async function verifyCustomDomain(hostname: string): Promise<void> {
	await requestDomainUpdate(`/api/domains/${encodeURIComponent(hostname)}/verify`, 'POST');
}

export async function removeCustomDomain(hostname: string): Promise<void> {
	await requestDomainUpdate(`/api/domains/${encodeURIComponent(hostname)}`, 'DELETE');
}

async function requestDomainUpdate(
	url: string,
	method: 'POST' | 'DELETE',
	body?: Record<string, string>
): Promise<void> {
	const response = await fetch(url, {
		method,
		headers: body ? { 'content-type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined
	});

	if (!response.ok) {
		throw new Error(await readApiError(response, 'Could not update custom domain'));
	}
}

async function readApiError(response: Response, fallback: string): Promise<string> {
	const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
	return typeof body?.error === 'string' ? body.error : `${fallback} (${response.status})`;
}
