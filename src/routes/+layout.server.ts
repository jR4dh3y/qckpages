import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';
import { getAuthState } from '@mmailaender/convex-better-auth-svelte/sveltekit';

export const load: LayoutServerLoad = () => ({
	authState: getAuthState(),
	// Vercel sets VERCEL=1 for its own runtime. Other adapter-auto targets do not.
	vercelTelemetry: env.VERCEL === '1'
});
