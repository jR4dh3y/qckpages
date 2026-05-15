import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	pages: defineTable({
		slug: v.string(),
		pageId: v.string(),
		ownerId: v.string(),
		title: v.string(),
		bucket: v.string(),
		key: v.string(),
		version: v.number(),
		originalFilename: v.string(),
		size: v.number(),
		etag: v.string(),
		published: v.boolean(),
		lockedReason: v.optional(v.literal('free_limit')),
		createdAt: v.string(),
		updatedAt: v.string()
	})
		.index('by_slug', ['slug'])
		.index('by_owner_updatedAt', ['ownerId', 'updatedAt'])
		.index('by_owner_published_updatedAt', ['ownerId', 'published', 'updatedAt']),
	entitlements: defineTable({
		userId: v.string(),
		tier: v.union(v.literal('free'), v.literal('pro')),
		status: v.string(),
		razorpayCustomerId: v.optional(v.string()),
		razorpaySubscriptionId: v.optional(v.string()),
		razorpaySubscriptionShortUrl: v.optional(v.string()),
		currentPeriodEnd: v.optional(v.string()),
		updatedAt: v.string()
	}).index('by_userId', ['userId'])
});
