import type { Entitlement, PublicUser } from '$lib/types/pages';

export function toPublicUser(data: unknown): PublicUser | null {
	if (!data || typeof data !== 'object') return null;
	const value = data as Record<string, unknown>;

	return {
		userId: String(value.userId ?? value._id ?? value.id ?? ''),
		email: typeof value.email === 'string' ? value.email : undefined,
		name: typeof value.name === 'string' ? value.name : undefined,
		picture:
			typeof value.image === 'string'
				? value.image
				: typeof value.picture === 'string'
					? value.picture
					: undefined
	};
}

export function toEntitlement(value: unknown, userId = ''): Entitlement {
	if (!value || typeof value !== 'object') {
		return {
			userId,
			tier: 'free',
			status: 'inactive',
			updatedAt: new Date().toISOString()
		};
	}

	const entitlement = value as {
		userId?: unknown;
		tier?: unknown;
		status?: unknown;
		razorpayCustomerId?: unknown;
		razorpaySubscriptionId?: unknown;
		razorpaySubscriptionShortUrl?: unknown;
		razorpayOrderId?: unknown;
		razorpayPaymentId?: unknown;
		currentPeriodEnd?: unknown;
		updatedAt?: unknown;
	};

	return {
		userId: typeof entitlement.userId === 'string' ? entitlement.userId : userId,
		tier: entitlement.tier === 'pro' ? 'pro' : 'free',
		status: typeof entitlement.status === 'string' ? entitlement.status : 'inactive',
		razorpayCustomerId:
			typeof entitlement.razorpayCustomerId === 'string'
				? entitlement.razorpayCustomerId
				: undefined,
		razorpaySubscriptionId:
			typeof entitlement.razorpaySubscriptionId === 'string'
				? entitlement.razorpaySubscriptionId
				: undefined,
		razorpaySubscriptionShortUrl:
			typeof entitlement.razorpaySubscriptionShortUrl === 'string'
				? entitlement.razorpaySubscriptionShortUrl
				: undefined,
		razorpayOrderId:
			typeof entitlement.razorpayOrderId === 'string' ? entitlement.razorpayOrderId : undefined,
		razorpayPaymentId:
			typeof entitlement.razorpayPaymentId === 'string' ? entitlement.razorpayPaymentId : undefined,
		currentPeriodEnd:
			typeof entitlement.currentPeriodEnd === 'string' ? entitlement.currentPeriodEnd : undefined,
		updatedAt:
			typeof entitlement.updatedAt === 'string' ? entitlement.updatedAt : new Date().toISOString()
	};
}
