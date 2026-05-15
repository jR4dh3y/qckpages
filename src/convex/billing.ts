import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { requireCurrentUser } from './auth';

const activeStatuses = new Set(['active', 'authenticated']);

const freeEntitlement = (userId: string) => ({
	userId,
	tier: 'free' as const,
	status: 'inactive',
	updatedAt: new Date().toISOString()
});

export const getEntitlement = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireCurrentUser(ctx);
		const userId = authUserId(user);
		return (await getEntitlementByUserId(ctx, userId)) ?? freeEntitlement(userId);
	}
});

export const prepareRazorpaySubscription = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await requireCurrentUser(ctx);
		return {
			userId: authUserId(user),
			email: user.email,
			name: user.name
		};
	}
});

export const markCurrentUserRazorpayProActive = mutation({
	args: {
		razorpaySubscriptionId: v.string(),
		razorpayPaymentId: v.string(),
		status: v.string(),
		razorpaySubscriptionShortUrl: v.optional(v.string()),
		currentPeriodEnd: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		if (!activeStatuses.has(args.status)) {
			throw new ConvexError('Subscription is not active yet');
		}

		const user = await requireCurrentUser(ctx);
		await upsertEntitlement(ctx, {
			userId: authUserId(user),
			tier: 'pro',
			status: args.status,
			razorpaySubscriptionId: args.razorpaySubscriptionId,
			razorpaySubscriptionShortUrl: args.razorpaySubscriptionShortUrl,
			currentPeriodEnd: args.currentPeriodEnd
		});
	}
});

export const markCurrentUserRazorpayOrderPaid = mutation({
	args: {
		razorpayOrderId: v.string(),
		razorpayPaymentId: v.string()
	},
	handler: async (ctx, args) => {
		const user = await requireCurrentUser(ctx);
		await upsertEntitlement(ctx, {
			userId: authUserId(user),
			tier: 'pro',
			status: 'active',
			razorpayOrderId: args.razorpayOrderId,
			razorpayPaymentId: args.razorpayPaymentId
		});
	}
});

export const markRazorpayProActive = internalMutation({
	args: {
		userId: v.string(),
		razorpayCustomerId: v.optional(v.string()),
		razorpaySubscriptionId: v.string(),
		razorpaySubscriptionShortUrl: v.optional(v.string()),
		currentPeriodEnd: v.optional(v.string()),
		status: v.string()
	},
	handler: async (ctx, args) => {
		await upsertEntitlement(ctx, {
			userId: args.userId,
			tier: 'pro',
			status: args.status,
			razorpayCustomerId: args.razorpayCustomerId,
			razorpaySubscriptionId: args.razorpaySubscriptionId,
			razorpaySubscriptionShortUrl: args.razorpaySubscriptionShortUrl,
			currentPeriodEnd: args.currentPeriodEnd
		});
	}
});

export const markRazorpayProInactive = internalMutation({
	args: {
		userId: v.string(),
		razorpayCustomerId: v.optional(v.string()),
		razorpaySubscriptionId: v.optional(v.string()),
		status: v.string()
	},
	handler: async (ctx, args) => {
		await upsertEntitlement(ctx, {
			userId: args.userId,
			tier: 'free',
			status: args.status,
			razorpayCustomerId: args.razorpayCustomerId,
			razorpaySubscriptionId: args.razorpaySubscriptionId,
			currentPeriodEnd: undefined
		});
		await ctx.runMutation(internal.pages.enforceFreeLimit, { userId: args.userId });
	}
});

export const markCurrentUserProInactive = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await requireCurrentUser(ctx);
		const userId = authUserId(user);
		await markFree(ctx, userId);
		await ctx.runMutation(internal.pages.enforceFreeLimit, { userId });
	}
});

async function getEntitlementByUserId(ctx: QueryCtx | MutationCtx, userId: string) {
	return await ctx.db
		.query('entitlements')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.unique();
}

async function upsertEntitlement(
	ctx: MutationCtx,
	value: {
		userId: string;
		tier: 'free' | 'pro';
		status: string;
		razorpayCustomerId?: string;
		razorpaySubscriptionId?: string;
		razorpaySubscriptionShortUrl?: string;
		razorpayOrderId?: string;
		razorpayPaymentId?: string;
		currentPeriodEnd?: string;
	}
): Promise<void> {
	const existing = await getEntitlementByUserId(ctx, value.userId);
	const row = {
		...value,
		updatedAt: new Date().toISOString()
	};

	if (existing) {
		await ctx.db.patch(existing._id, row);
	} else {
		await ctx.db.insert('entitlements', row);
	}
}

async function markFree(ctx: MutationCtx, userId: string): Promise<void> {
	const existing = await getEntitlementByUserId(ctx, userId);

	await upsertEntitlement(ctx, {
		userId,
		tier: 'free',
		status: existing?.status === 'active' ? 'inactive' : (existing?.status ?? 'inactive'),
		razorpayCustomerId: existing?.razorpayCustomerId,
		razorpaySubscriptionId: existing?.razorpaySubscriptionId,
		razorpaySubscriptionShortUrl: existing?.razorpaySubscriptionShortUrl,
		razorpayOrderId: existing?.razorpayOrderId,
		razorpayPaymentId: existing?.razorpayPaymentId,
		currentPeriodEnd: undefined
	});
}

function authUserId(user: { _id: string; userId?: string | null }): string {
	return user.userId ?? user._id;
}
