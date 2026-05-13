import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFbsBucket, uploadHtmlToFbs } from '$lib/server/fbs';
import { getPageBySlug, listPagesForUser, upsertPage } from '$lib/server/page-store';
import { verifyShooRequest } from '$lib/server/shoo';
import type { PublishedPage } from '$lib/types/pages';
import { isValidSlug, normalizeSlug, titleFromFilename } from '$lib/utils/slug';

const maxHtmlBytes = 2 * 1024 * 1024;

export const GET: RequestHandler = async (event) => {
	try {
		const user = await verifyShooRequest(event);
		return json({ pages: await listPagesForUser(user.userId) });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not list pages';
		return json({ error: message }, { status: 401 });
	}
};

export const POST: RequestHandler = async (event) => {
	let user;
	try {
		user = await verifyShooRequest(event);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unauthorized';
		return json({ error: message }, { status: 401 });
	}

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

	const existing = await getPageBySlug(slug);
	if (existing && existing.ownerId !== user.userId) {
		return json({ error: 'That link is already taken' }, { status: 409 });
	}

	const now = new Date().toISOString();
	const pageId = existing?.pageId ?? crypto.randomUUID();
	const version = (existing?.version ?? 0) + 1;
	const bucket = getFbsBucket();
	const key = `pages/${pageId}/versions/v${version}/index.html`;
	const body = await file.arrayBuffer();
	const upload = await uploadHtmlToFbs({ bucket, key, body });

	const page: PublishedPage = {
		slug,
		pageId,
		ownerId: user.userId,
		title: title || existing?.title || titleFromFilename(file.name),
		bucket,
		key,
		version,
		originalFilename: file.name,
		size: file.size,
		etag: upload.etag,
		published: true,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now
	};

	await upsertPage(page);

	return json({
		page,
		publicPath: `/${page.slug}`
	});
};
