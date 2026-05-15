import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { deleteHtmlFromFbs, getFbsBucket, uploadHtmlToFbs } from '$lib/server/fbs';
import { createServerConvexClient } from '$lib/server/convex';
import type { PublishedPage, UploadResponse } from '$lib/types/pages';
import { isValidSlug, normalizeSlug, titleFromFilename } from '$lib/utils/slug';

const maxHtmlBytes = 2 * 1024 * 1024;

export const GET: RequestHandler = async (event) => {
	try {
		const convex = createServerConvexClient({ token: event.locals.token });
		const pages = (await convex.query(api.pages.listForCurrentUser, {})) as PublishedPage[];
		return json({ pages });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not list pages';
		return json({ error: message }, { status: 401 });
	}
};

export const POST: RequestHandler = async (event) => {
	const form = await event.request.formData();
	const file = form.get('file');
	const slug = normalizeSlug(String(form.get('slug') ?? ''));
	const title = String(form.get('title') ?? '').trim();

	if (!isValidSlug(slug)) {
		return json(
			{ error: 'Link must be 3-64 lowercase letters, numbers, or hyphens' },
			{ status: 400 }
		);
	}

	if (!(file instanceof File)) {
		return json({ error: 'Upload a single HTML file' }, { status: 400 });
	}

	if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
		return json({ error: 'Only .html files are supported' }, { status: 400 });
	}

	if (file.size <= 0 || file.size > maxHtmlBytes) {
		return json({ error: 'HTML file must be between 1 byte and 2 MB' }, { status: 400 });
	}

	try {
		const bucket = getFbsBucket();
		const convex = createServerConvexClient({ token: event.locals.token });
		const prepared = (await convex.mutation(api.pages.preparePublish, {
			slug,
			title,
			originalFilename: file.name,
			size: file.size,
			bucket
		})) as { pageId: string; version: number; bucket: string; key: string; title: string };

		const body = await file.arrayBuffer();
		const upload = await uploadHtmlToFbs({ bucket: prepared.bucket, key: prepared.key, body });

		let page: PublishedPage;
		try {
			page = (await convex.mutation(api.pages.commitPublish, {
				slug,
				title: title || prepared.title || titleFromFilename(file.name),
				originalFilename: file.name,
				size: file.size,
				bucket: prepared.bucket,
				pageId: prepared.pageId,
				key: prepared.key,
				version: prepared.version,
				etag: upload.etag
			})) as PublishedPage;
		} catch (error) {
			await deleteHtmlFromFbs({ bucket: prepared.bucket, key: prepared.key });
			throw error;
		}

		return json({
			page,
			publicPath: `/${page.slug}`
		} satisfies UploadResponse);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not publish page';
		return json({ error: message }, { status: statusFromMessage(message) });
	}
};

function statusFromMessage(message: string): number {
	if (message.includes('Sign in') || message.includes('Unauth')) {
		return 401;
	}
	if (message.includes('already taken')) {
		return 409;
	}
	if (message.includes('Free plan')) {
		return 403;
	}
	return 502;
}
