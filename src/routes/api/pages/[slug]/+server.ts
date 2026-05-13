import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteHtmlFromFbs } from '$lib/server/fbs';
import { getPageBySlug, removePageForUser } from '$lib/server/page-store';
import { verifyShooRequest } from '$lib/server/shoo';
import { normalizeSlug } from '$lib/utils/slug';

export const DELETE: RequestHandler = async (event) => {
	let user;
	try {
		user = await verifyShooRequest(event);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unauthorized';
		return json({ error: message }, { status: 401 });
	}

	const slug = normalizeSlug(event.params.slug);
	const page = await getPageBySlug(slug);

	if (!page) {
		return json({ error: 'Page not found' }, { status: 404 });
	}

	if (page.ownerId !== user.userId) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await deleteHtmlFromFbs({ bucket: page.bucket, key: page.key });
	await removePageForUser(slug, user.userId);
	return new Response(null, { status: 204 });
};
