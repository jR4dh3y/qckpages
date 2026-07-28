import { ConvexError } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { normalizeCustomHostname } from './domainValidation';

export async function requirePro(ctx: MutationCtx, ownerId: string): Promise<void> {
	const entitlement = await ctx.db
		.query('entitlements')
		.withIndex('by_userId', (q) => q.eq('userId', ownerId))
		.unique();
	if (entitlement?.tier !== 'pro' || entitlement.status !== 'active') {
		throw new ConvexError('Custom domains require permanent Pro access');
	}
}

export async function requireOwnedDomain(
	ctx: QueryCtx | MutationCtx,
	ownerId: string,
	hostname: string
): Promise<Doc<'customDomains'>> {
	const domain = await getDomainByHostname(ctx, hostname);
	if (!domain) throw new ConvexError('Custom domain not found');
	if (domain.ownerId !== ownerId) throw new ConvexError('Forbidden');
	return domain;
}

export async function getDomainByOwner(ctx: QueryCtx | MutationCtx, ownerId: string) {
	return await ctx.db
		.query('customDomains')
		.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
		.unique();
}

export async function getDomainByHostname(ctx: QueryCtx | MutationCtx, hostname: string) {
	return await ctx.db
		.query('customDomains')
		.withIndex('by_hostname', (q) => q.eq('hostname', hostname))
		.unique();
}

export function normalizeHostname(value: string): string {
	try {
		return normalizeCustomHostname(value, {
			reservedHosts: [
				process.env.SITE_URL ?? '',
				process.env.BETTER_AUTH_URL ?? '',
				process.env.PUBLIC_SITE_URL ?? ''
			]
		});
	} catch (error) {
		throw new ConvexError(error instanceof Error ? error.message : 'Invalid hostname');
	}
}

export function toCustomDomain(
	domain: Pick<
		Doc<'customDomains'>,
		| 'hostname'
		| 'routingMode'
		| 'status'
		| 'dnsInstructions'
		| 'error'
		| 'createdAt'
		| 'updatedAt'
		| 'verifiedAt'
	>
) {
	return {
		hostname: domain.hostname,
		routingMode: domain.routingMode,
		status: domain.status,
		dnsInstructions: domain.dnsInstructions,
		error: domain.error,
		createdAt: domain.createdAt,
		updatedAt: domain.updatedAt,
		verifiedAt: domain.verifiedAt
	};
}

export function authUserId(user: { _id: string; userId?: string | null }): string {
	return user.userId ?? user._id;
}
