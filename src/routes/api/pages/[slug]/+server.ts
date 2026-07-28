import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { deleteHtmlFromFbs } from '$lib/server/fbs';
import { createServerConvexClient } from '$lib/server/convex';
import { resolveAuthContext } from '$lib/server/auth';
import { normalizeSlug } from '$lib/utils/slug';

export const DELETE: RequestHandler = async (event) => {
	try {
		const authCtx = await resolveAuthContext(event);
		const convex = createServerConvexClient({ token: authCtx.token });
		const slug = normalizeSlug(event.params.slug);
		const prepared = (await convex.mutation(api.pages.prepareDelete, {
			slug,
			userId: authCtx.userId
		})) as {
			pageId: string;
			bucket: string;
			key: string;
		};

		try {
			await deleteHtmlFromFbs({ bucket: prepared.bucket, key: prepared.key });
		} catch (error) {
			await convex
				.mutation(api.pages.cancelDelete, {
					slug,
					pageId: prepared.pageId,
					userId: authCtx.userId
				})
				.catch(() => undefined);
			throw error;
		}
		await convex.mutation(api.pages.confirmDelete, {
			slug,
			pageId: prepared.pageId,
			bucket: prepared.bucket,
			key: prepared.key,
			userId: authCtx.userId
		});

		return new Response(null, { status: 204 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not delete page';
		return json({ error: message }, { status: statusFromMessage(message) });
	}
};

function statusFromMessage(message: string): number {
	if (message.includes('Page not found')) {
		return 404;
	}
	if (message.includes('Forbidden')) {
		return 403;
	}
	if (message.includes('linked to')) {
		return 409;
	}
	if (message.includes('Sign in') || message.includes('Unauth')) {
		return 401;
	}
	return 502;
}
