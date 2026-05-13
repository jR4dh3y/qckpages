import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSignedPublicUrl } from '$lib/server/fbs';
import { getPageBySlug } from '$lib/server/page-store';
import { normalizeSlug } from '$lib/utils/slug';

export const GET: RequestHandler = async ({ params }) => {
	const slug = normalizeSlug(params.slug);
	const page = await getPageBySlug(slug);

	if (!page?.published) {
		error(404, 'Page not found');
	}

	redirect(302, createSignedPublicUrl(page.bucket, page.key));
};
