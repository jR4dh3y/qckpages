import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import {
	action,
	internalMutation,
	internalQuery,
	query,
	type ActionCtx
} from './_generated/server';
import { requireCurrentUser } from './auth';
import {
	authUserId,
	getDomainByHostname,
	getDomainByOwner,
	normalizeHostname,
	requireOwnedDomain,
	requirePro,
	toCustomDomain
} from './customDomainModel';
import { provisioningState, VercelApiError, VercelDomainsClient } from './vercelDomains';
import { wildcardHostname } from './domainValidation';

const dnsInstructionValidator = v.object({
	type: v.union(v.literal('CNAME'), v.literal('TXT'), v.literal('NS')),
	name: v.string(),
	value: v.string(),
	purpose: v.union(v.literal('traffic'), v.literal('ownership'))
});

const statusValidator = v.union(v.literal('pending_dns'), v.literal('active'), v.literal('error'));

export const getForCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = authUserId(await requireCurrentUser(ctx));
		const domain = await getDomainByOwner(ctx, ownerId);
		return domain ? toCustomDomain(domain) : null;
	}
});

export const resolveActivePageByHostname = query({
	args: { baseHostname: v.string(), slug: v.string() },
	handler: async (ctx, args) => {
		const baseHostname = normalizeHostname(args.baseHostname);
		const domain = await getDomainByHostname(ctx, baseHostname);
		if (!domain || domain.routingMode !== 'subdomains' || domain.status !== 'active') {
			return null;
		}

		const page = await ctx.db
			.query('pages')
			.withIndex('by_slug', (q) => q.eq('slug', args.slug))
			.unique();

		if (
			!page ||
			page.ownerId !== domain.ownerId ||
			!page.published ||
			page.lockedReason ||
			page.deleting
		) {
			return null;
		}

		return {
			hostname: domain.hostname,
			bucket: page.bucket,
			key: page.key
		};
	}
});

export const provision = action({
	args: { hostname: v.string() },
	handler: async (ctx, args): Promise<ReturnType<typeof toCustomDomain>> => {
		const ownerId = authUserId(await requireCurrentUser(ctx));
		const hostname = normalizeHostname(args.hostname);
		const providerHostname = wildcardHostname(hostname);
		const reservation: { created: boolean } = await ctx.runMutation(
			internal.customDomains.reserve,
			{ ownerId, hostname }
		);
		let vercel: VercelDomainsClient | undefined;
		let attachedByThisAttempt = false;

		try {
			vercel = new VercelDomainsClient();
			try {
				await vercel.addDomain(providerHostname);
				attachedByThisAttempt = true;
			} catch (error) {
				if (!(error instanceof VercelApiError) || !error.isAlreadyAttached) throw error;
				const existing = await vercel.getDomain(providerHostname);
				if (existing.projectId && existing.projectId !== vercel.targetProjectId) {
					throw new ConvexError('That hostname is attached to a different Vercel project');
				}
			}

			return await refreshProviderState(ctx, vercel, ownerId, hostname, false);
		} catch (error) {
			const message = publicErrorMessage(error);
			const definitive = error instanceof VercelApiError && error.isDefinitiveProvisioningFailure;

			if (reservation.created && definitive) {
				if (attachedByThisAttempt && vercel) {
					await vercel.removeDomain(providerHostname).catch(() => undefined);
				}
				await ctx.runMutation(internal.customDomains.releaseReservation, {
					ownerId,
					hostname
				});
			} else {
				await ctx.runMutation(internal.customDomains.setProvisioningState, {
					ownerId,
					hostname,
					status: 'error',
					dnsInstructions: [],
					error: message
				});
			}
			throw new ConvexError(message);
		}
	}
});

export const verify = action({
	args: { hostname: v.string() },
	handler: async (ctx, args): Promise<ReturnType<typeof toCustomDomain>> => {
		const ownerId = authUserId(await requireCurrentUser(ctx));
		const hostname = normalizeHostname(args.hostname);
		await requireOwnedDomainAction(ctx, ownerId, hostname);

		try {
			const vercel = new VercelDomainsClient();
			return await refreshProviderState(ctx, vercel, ownerId, hostname, true);
		} catch (error) {
			const message = publicErrorMessage(error);
			await ctx.runMutation(internal.customDomains.setProvisioningState, {
				ownerId,
				hostname,
				status: 'error',
				dnsInstructions: [],
				error: message
			});
			throw new ConvexError(message);
		}
	}
});

export const remove = action({
	args: { hostname: v.string() },
	handler: async (ctx, args): Promise<null> => {
		const ownerId = authUserId(await requireCurrentUser(ctx));
		const hostname = normalizeHostname(args.hostname);
		await requireOwnedDomainAction(ctx, ownerId, hostname);

		try {
			const vercel = new VercelDomainsClient();
			for (const providerHostname of [wildcardHostname(hostname), hostname]) {
				try {
					await vercel.removeDomain(providerHostname);
				} catch (error) {
					if (!(error instanceof VercelApiError) || !error.isNotFound) {
						throw error;
					}
				}
			}
		} catch (error) {
			throw new ConvexError(publicErrorMessage(error));
		}

		await ctx.runMutation(internal.customDomains.releaseReservation, { ownerId, hostname });
		return null;
	}
});

export const reserve = internalMutation({
	args: { ownerId: v.string(), hostname: v.string() },
	handler: async (ctx, args) => {
		await requirePro(ctx, args.ownerId);

		const ownerDomain = await getDomainByOwner(ctx, args.ownerId);
		if (ownerDomain) {
			if (ownerDomain.hostname !== args.hostname) {
				throw new ConvexError('Only one custom domain is available per Pro account');
			}
			return { created: false };
		}

		const hostnameDomain = await getDomainByHostname(ctx, args.hostname);
		if (hostnameDomain) throw new ConvexError('That hostname is already configured');

		const now = new Date().toISOString();
		await ctx.db.insert('customDomains', {
			ownerId: args.ownerId,
			hostname: args.hostname,
			routingMode: 'subdomains',
			status: 'pending_dns',
			dnsInstructions: [],
			createdAt: now,
			updatedAt: now
		});
		return { created: true };
	}
});

export const setProvisioningState = internalMutation({
	args: {
		ownerId: v.string(),
		hostname: v.string(),
		status: statusValidator,
		dnsInstructions: v.array(dnsInstructionValidator),
		error: v.optional(v.string()),
		routingMode: v.optional(v.literal('subdomains'))
	},
	handler: async (ctx, args) => {
		const domain = await requireOwnedDomain(ctx, args.ownerId, args.hostname);
		const now = new Date().toISOString();
		const dnsInstructions =
			args.status === 'error' && args.dnsInstructions.length === 0
				? domain.dnsInstructions
				: args.dnsInstructions.slice(0, 4);
		const update = {
			status: args.status,
			dnsInstructions,
			error: args.error?.slice(0, 300),
			updatedAt: now,
			verifiedAt: args.status === 'active' ? now : domain.verifiedAt,
			...(args.routingMode ? { routingMode: args.routingMode } : {})
		};

		await ctx.db.patch(domain._id, update);
		return toCustomDomain({ ...domain, ...update });
	}
});

export const releaseReservation = internalMutation({
	args: { ownerId: v.string(), hostname: v.string() },
	handler: async (ctx, args) => {
		const domain = await getDomainByHostname(ctx, args.hostname);
		if (domain?.ownerId === args.ownerId) await ctx.db.delete(domain._id);
	}
});

export const getOwnedDomain = internalQuery({
	args: { ownerId: v.string(), hostname: v.string() },
	handler: async (ctx, args) => {
		const domain = await requireOwnedDomain(ctx, args.ownerId, args.hostname);
		return toCustomDomain(domain);
	}
});

async function refreshProviderState(
	ctx: ActionCtx,
	vercel: VercelDomainsClient,
	ownerId: string,
	hostname: string,
	attemptVerification: boolean
): Promise<ReturnType<typeof toCustomDomain>> {
	const providerHostname = wildcardHostname(hostname);
	if (attemptVerification) {
		try {
			await vercel.verifyDomain(providerHostname);
		} catch (error) {
			if (!(error instanceof VercelApiError) || error.status !== 400) throw error;
		}
	}

	const [domain, configuration] = await Promise.all([
		vercel.getDomain(providerHostname),
		vercel.getConfiguration(providerHostname)
	]);
	if (domain.projectId && domain.projectId !== vercel.targetProjectId) {
		throw new ConvexError('That hostname is attached to a different Vercel project');
	}

	const state = provisioningState(providerHostname, domain, configuration);
	const updated: ReturnType<typeof toCustomDomain> = await ctx.runMutation(
		internal.customDomains.setProvisioningState,
		{
			ownerId,
			hostname,
			status: state.status,
			dnsInstructions: state.dnsInstructions,
			error: state.error,
			routingMode: 'subdomains'
		}
	);
	return updated;
}

async function requireOwnedDomainAction(
	ctx: ActionCtx,
	ownerId: string,
	hostname: string
): Promise<void> {
	await ctx.runQuery(internal.customDomains.getOwnedDomain, { ownerId, hostname });
}

function publicErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not configure the custom domain';
}
