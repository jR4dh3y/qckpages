import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { requireCurrentUser } from './auth';

const freePublishedPageLimit = 5;
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/;

const pagePayload = {
	slug: v.string(),
	title: v.string(),
	originalFilename: v.string(),
	size: v.number(),
	bucket: v.string()
};

export const listForCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireCurrentUser(ctx);
		const pages = await ctx.db
			.query('pages')
			.withIndex('by_owner_updatedAt', (q) => q.eq('ownerId', authUserId(user)))
			.order('desc')
			.collect();

		return pages.map(toPublishedPage);
	}
});

export const getPublicPageBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const slug = requireValidSlug(args.slug);
		const page = await getPageBySlug(ctx, slug);

		if (!page?.published || page.lockedReason) {
			return null;
		}

		return toPublishedPage(page);
	}
});

export const preparePublish = mutation({
	args: pagePayload,
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const slug = requireValidSlug(args.slug);
		const existing = await getPageBySlug(ctx, slug);

		await assertCanPublish(ctx, authUserId(user), existing);

		const version = (existing?.version ?? 0) + 1;
		const pageId = existing?.pageId ?? crypto.randomUUID();
		const key = `page-${pageId}-v${version}.html`;

		return {
			pageId,
			version,
			bucket: args.bucket,
			key,
			title: cleanTitle(args.title) || existing?.title || titleFromFilename(args.originalFilename),
			existing: existing ? toPublishedPage(existing) : null
		};
	}
});

export const commitPublish = mutation({
	args: {
		...pagePayload,
		pageId: v.string(),
		key: v.string(),
		version: v.number(),
		etag: v.string()
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const slug = requireValidSlug(args.slug);
		const existing = await getPageBySlug(ctx, slug);

		await assertCanPublish(ctx, authUserId(user), existing);

		if (existing && (existing.pageId !== args.pageId || existing.version + 1 !== args.version)) {
			throw new ConvexError('Publish metadata is stale. Try again.');
		}

		const now = new Date().toISOString();
		const page = {
			slug,
			pageId: args.pageId,
			ownerId: authUserId(user),
			title: cleanTitle(args.title) || existing?.title || titleFromFilename(args.originalFilename),
			bucket: args.bucket,
			key: args.key,
			version: args.version,
			originalFilename: args.originalFilename,
			size: args.size,
			etag: args.etag,
			published: true,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now
		};

		if (existing) {
			await ctx.db.patch(existing._id, { ...page, lockedReason: undefined });
		} else {
			await ctx.db.insert('pages', page);
		}

		return toPublishedPage(page);
	}
});

export const prepareDelete = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const page = await requireOwnedPage(ctx, requireValidSlug(args.slug), authUserId(user));

		return {
			pageId: page.pageId,
			bucket: page.bucket,
			key: page.key
		};
	}
});

export const confirmDelete = mutation({
	args: {
		slug: v.string(),
		pageId: v.string(),
		bucket: v.string(),
		key: v.string()
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const page = await requireOwnedPage(ctx, requireValidSlug(args.slug), authUserId(user));

		if (page.pageId !== args.pageId || page.bucket !== args.bucket || page.key !== args.key) {
			throw new ConvexError('Delete metadata is stale. Try again.');
		}

		await ctx.db.delete(page._id);
	}
});

export const enforceFreeLimit = internalMutation({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const published = await ctx.db
			.query('pages')
			.withIndex('by_owner_published_updatedAt', (q) => q.eq('ownerId', args.userId))
			.filter((q) => q.eq(q.field('published'), true))
			.order('desc')
			.collect();

		const keep = new Set<Id<'pages'>>(
			published.slice(0, freePublishedPageLimit).map((page) => page._id)
		);

		await Promise.all(
			published.map((page) =>
				ctx.db.patch(page._id, {
					published: keep.has(page._id),
					lockedReason: keep.has(page._id) ? undefined : 'free_limit',
					updatedAt: new Date().toISOString()
				})
			)
		);
	}
});

async function assertCanPublish(
	ctx: QueryCtx | MutationCtx,
	userId: string,
	existing: Doc<'pages'> | null
): Promise<void> {
	if (existing && existing.ownerId !== userId) {
		throw new ConvexError('That link is already taken');
	}

	const willIncreasePublishedCount = !existing?.published;
	if (!willIncreasePublishedCount) {
		return;
	}

	const entitlement = await ctx.db
		.query('entitlements')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.unique();

	if (entitlement?.tier === 'pro' && entitlement.status === 'active') {
		return;
	}

	const published = await ctx.db
		.query('pages')
		.withIndex('by_owner_published_updatedAt', (q) => q.eq('ownerId', userId))
		.filter((q) => q.eq(q.field('published'), true))
		.collect();

	if (published.length >= freePublishedPageLimit) {
		throw new ConvexError('Free plan includes 5 published pages. Upgrade to publish more.');
	}
}

async function requireOwnedPage(
	ctx: QueryCtx | MutationCtx,
	slug: string,
	ownerId: string
): Promise<Doc<'pages'>> {
	const page = await getPageBySlug(ctx, slug);

	if (!page) {
		throw new ConvexError('Page not found');
	}

	if (page.ownerId !== ownerId) {
		throw new ConvexError('Forbidden');
	}

	return page;
}

async function getPageBySlug(
	ctx: QueryCtx | MutationCtx,
	slug: string
): Promise<Doc<'pages'> | null> {
	return await ctx.db
		.query('pages')
		.withIndex('by_slug', (q) => q.eq('slug', slug))
		.unique();
}

function requireValidSlug(slug: string): string {
	const normalized = slug.trim().toLowerCase();
	if (!slugPattern.test(normalized)) {
		throw new ConvexError('Link must be 3-64 lowercase letters, numbers, or hyphens');
	}
	return normalized;
}

function cleanTitle(title: string): string {
	return title.trim().slice(0, 120);
}

function titleFromFilename(filename: string): string {
	const base = filename
		.replace(/\.[^.]+$/, '')
		.replace(/[-_]+/g, ' ')
		.trim();
	return base ? base.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Untitled page';
}

function toPublishedPage(page: Omit<Doc<'pages'>, '_id' | '_creationTime'>) {
	return {
		slug: page.slug,
		pageId: page.pageId,
		ownerId: page.ownerId,
		title: page.title,
		bucket: page.bucket,
		key: page.key,
		version: page.version,
		originalFilename: page.originalFilename,
		size: page.size,
		etag: page.etag,
		published: page.published,
		lockedReason: page.lockedReason,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt
	};
}

function authUserId(user: { _id: string; userId?: string | null }): string {
	return user.userId ?? user._id;
}
