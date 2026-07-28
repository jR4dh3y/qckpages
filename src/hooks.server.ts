import type { Handle } from '@sveltejs/kit';
import { getToken } from '@mmailaender/convex-better-auth-svelte/sveltekit';
import { withServerConvexToken } from '@mmailaender/convex-svelte/sveltekit/server';
import { api } from '$convex/_generated/api';
import { createServerConvexClient } from '$lib/server/convex';
import { isCanonicalAppHostname } from '$lib/server/custom-domains';
import { createSignedPublicUrl } from '$lib/server/fbs';

export const handle: Handle = async ({ event, resolve }) => {
	if (!isCanonicalAppHostname(event.url.hostname)) {
		if (
			event.url.pathname !== '/' ||
			(event.request.method !== 'GET' && event.request.method !== 'HEAD')
		) {
			return new Response('Not found', { status: 404 });
		}

		const convex = createServerConvexClient();
		const target = (await convex.query(api.customDomains.resolveActiveByHostname, {
			hostname: event.url.hostname
		})) as { bucket: string; key: string } | null;
		if (!target) return new Response('Not found', { status: 404 });

		return new Response(null, {
			status: 302,
			headers: { location: createSignedPublicUrl(target.bucket, target.key) }
		});
	}

	const token = getToken(event.cookies);
	event.locals.token = token;

	return withServerConvexToken(token, () => resolve(event));
};
