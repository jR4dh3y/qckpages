import { env } from '$env/dynamic/public';
import { ConvexHttpClient, type ConvexClientOptions } from 'convex/browser';

export function createServerConvexClient(
	args: {
		token?: string;
		options?: ConvexClientOptions;
	} = {}
): ConvexHttpClient {
	const url = requiredPublicEnv(env.PUBLIC_CONVEX_URL, 'PUBLIC_CONVEX_URL');
	const client = new ConvexHttpClient(url, args.options);

	if (args.token) {
		client.setAuth(args.token);
	}

	return client;
}

export function getConvexSiteUrl(): string {
	return requiredPublicEnv(env.PUBLIC_CONVEX_SITE_URL, 'PUBLIC_CONVEX_SITE_URL');
}

function requiredPublicEnv(value: string | undefined, name: string): string {
	if (!value?.trim()) {
		throw new Error(`${name} is required. Run Convex setup and add it to .env.`);
	}

	return value.trim();
}
