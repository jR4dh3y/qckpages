import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth } from 'better-auth';
import { query } from './_generated/server';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import authConfig from './auth.config';

const authBaseUrl = requiredEnv(
	process.env.BETTER_AUTH_URL ?? process.env.SITE_URL,
	'BETTER_AUTH_URL or SITE_URL'
);

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
	betterAuth({
		baseURL: authBaseUrl,
		secret: requiredEnv(process.env.BETTER_AUTH_SECRET, 'BETTER_AUTH_SECRET'),
		database: authComponent.adapter(ctx),
		...googleSocialProvider(),
		plugins: [convex({ authConfig })]
	});

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => (await authComponent.safeGetAuthUser(ctx)) ?? null
});

export async function requireCurrentUser(ctx: GenericCtx<DataModel>) {
	return await authComponent.getAuthUser(ctx);
}

function requiredEnv(value: string | undefined, name: string): string {
	if (!value?.trim()) {
		throw new Error(`${name} is required in Convex deployment env`);
	}

	return value.trim();
}

function googleSocialProvider():
	| { socialProviders: { google: { clientId: string; clientSecret: string } } }
	| Record<string, never> {
	const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

	if (!clientId || !clientSecret) {
		return {};
	}

	return {
		socialProviders: {
			google: {
				clientId,
				clientSecret
			}
		}
	};
}
