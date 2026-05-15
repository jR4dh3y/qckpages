import { json } from '@sveltejs/kit';
import { createSvelteKitHandler } from '@mmailaender/convex-better-auth-svelte/sveltekit';
import type { RequestHandler } from './$types';
import { getConvexSiteUrl } from '$lib/server/convex';

const proxy = createSvelteKitHandler({ convexSiteUrl: getConvexSiteUrlOrUndefined() });

export const GET: RequestHandler = async (event) => handleAuthProxy(event, proxy.GET);
export const POST: RequestHandler = async (event) => handleAuthProxy(event, proxy.POST);

async function handleAuthProxy(
	event: Parameters<RequestHandler>[0],
	handler: RequestHandler
): Promise<Response> {
	try {
		return await handler(event);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Auth service is not configured';
		return json({ error: message }, { status: 500 });
	}
}

function getConvexSiteUrlOrUndefined(): string | undefined {
	try {
		return getConvexSiteUrl();
	} catch {
		return undefined;
	}
}
