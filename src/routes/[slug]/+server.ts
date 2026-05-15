import { error, redirect } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { createSignedPublicUrl } from '$lib/server/fbs';
import { createServerConvexClient } from '$lib/server/convex';
import type { PublishedPage } from '$lib/types/pages';
import { normalizeSlug } from '$lib/utils/slug';

export const GET: RequestHandler = async ({ params }) => {
	const slug = normalizeSlug(params.slug);
	const convex = createServerConvexClient();
	const page = (await convex.query(api.pages.getPublicPageBySlug, {
		slug
	})) as PublishedPage | null;

	if (!page?.published || page.lockedReason) {
		error(404, 'Page not found');
	}

	redirect(302, createSignedPublicUrl(page.bucket, page.key));
};
