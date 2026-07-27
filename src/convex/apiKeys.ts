import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireCurrentUser } from './auth';

async function sha256Hex(text: string): Promise<string> {
	const data = new TextEncoder().encode(text);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function authUserId(user: { _id: string; userId?: string | null }): string {
	return user.userId ?? user._id;
}

export const generateApiKey = mutation({
	args: {
		name: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const userId = authUserId(user);

		const randomBytes = new Uint8Array(24);
		crypto.getRandomValues(randomBytes);
		const randomHex = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
		const rawKey = `qck_live_${randomHex}`;

		const keyHash = await sha256Hex(rawKey);
		const keyPrefix = rawKey.slice(0, 14) + '...';
		const name = args.name?.trim() || 'CLI Key';
		const now = new Date().toISOString();

		const id = await ctx.db.insert('apiKeys', {
			userId,
			keyHash,
			keyPrefix,
			name,
			userName: user.name ?? undefined,
			userEmail: user.email ?? undefined,
			createdAt: now
		});

		return {
			id,
			rawKey,
			keyPrefix,
			name,
			createdAt: now
		};
	}
});

export const listForCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireCurrentUser(ctx);
		const userId = authUserId(user);

		const keys = await ctx.db
			.query('apiKeys')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.order('desc')
			.collect();

		return keys.map((k) => ({
			id: k._id,
			name: k.name,
			keyPrefix: k.keyPrefix,
			disabled: Boolean(k.disabled),
			createdAt: k.createdAt,
			lastUsedAt: k.lastUsedAt
		}));
	}
});

export const toggleApiKeyStatus = mutation({
	args: {
		keyId: v.id('apiKeys')
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const userId = authUserId(user);

		const key = await ctx.db.get(args.keyId);
		if (!key || key.userId !== userId) {
			throw new ConvexError('API key not found');
		}

		const newDisabledState = !key.disabled;
		await ctx.db.patch(args.keyId, { disabled: newDisabledState });
		return { success: true, disabled: newDisabledState };
	}
});

export const revokeApiKey = mutation({
	args: {
		keyId: v.id('apiKeys')
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		const userId = authUserId(user);

		const key = await ctx.db.get(args.keyId);
		if (!key || key.userId !== userId) {
			throw new ConvexError('API key not found');
		}

		await ctx.db.delete(args.keyId);
		return { success: true };
	}
});

export const validateApiKey = mutation({
	args: {
		key: v.string()
	},
	handler: async (ctx, args) => {
		const key = args.key.trim();
		if (!key || !key.startsWith('qck_')) {
			return { valid: false, userId: null };
		}

		const keyHash = await sha256Hex(key);
		const record = await ctx.db
			.query('apiKeys')
			.withIndex('by_keyHash', (q) => q.eq('keyHash', keyHash))
			.unique();

		if (!record || record.disabled) {
			return { valid: false, userId: null };
		}

		const now = new Date().toISOString();
		await ctx.db.patch(record._id, { lastUsedAt: now });

		return { valid: true, userId: record.userId };
	}
});

export const getUserStatus = query({
	args: {
		userId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		let userId = args.userId;
		let email: string | undefined;
		let name: string | undefined;

		if (userId) {
			const userRecord = await ctx.db
				.query('apiKeys')
				.withIndex('by_userId', (q) => q.eq('userId', userId!))
				.first();
			if (!userRecord) {
				throw new ConvexError('User not found');
			}
			email = userRecord.userEmail;
			name = userRecord.userName;
		} else {
			const user = await requireCurrentUser(ctx);
			userId = authUserId(user);
			email = user.email;
			name = user.name;
		}

		const pages = await ctx.db
			.query('pages')
			.withIndex('by_owner_updatedAt', (q) => q.eq('ownerId', userId!))
			.collect();

		const publishedPages = pages.filter((p) => p.published && !p.lockedReason);

		const entitlement = await ctx.db
			.query('entitlements')
			.withIndex('by_userId', (q) => q.eq('userId', userId!))
			.unique();

		const isPro = entitlement?.tier === 'pro' && entitlement.status === 'active';
		const pageLimit = isPro ? null : 5;
		const remaining = isPro ? null : Math.max(0, 5 - publishedPages.length);

		return {
			userId,
			email: email ?? null,
			name: name ?? null,
			tier: entitlement?.tier ?? 'free',
			status: entitlement?.status ?? 'inactive',
			currentPeriodEnd: entitlement?.currentPeriodEnd ?? null,
			publishedCount: publishedPages.length,
			totalPagesCount: pages.length,
			pageLimit,
			remainingPages: remaining,
			isPro
		};
	}
});
