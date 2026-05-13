import { env } from '$env/dynamic/private';
import { get } from '@vercel/edge-config';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PublishedPage } from '$lib/types/pages';

type EdgeConfigValue = PublishedPage | string[] | null;

const localStorePath = join(process.cwd(), '.data', 'qckpages.json');

interface LocalStore {
	items: Record<string, EdgeConfigValue>;
}

export async function getPageBySlug(slug: string): Promise<PublishedPage | null> {
	const value = await readItem<PublishedPage>(pageKey(slug));
	return value && typeof value === 'object' && 'slug' in value ? value : null;
}

export async function listPagesForUser(ownerId: string): Promise<PublishedPage[]> {
	const slugs = (await readItem<string[]>(userPagesKey(ownerId))) ?? [];
	const pages = await Promise.all(slugs.map((slug) => getPageBySlug(slug)));

	return pages
		.filter((page): page is PublishedPage => Boolean(page))
		.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function upsertPage(page: PublishedPage): Promise<void> {
	const currentSlugs = (await readItem<string[]>(userPagesKey(page.ownerId))) ?? [];
	const slugs = currentSlugs.includes(page.slug) ? currentSlugs : [page.slug, ...currentSlugs];

	await writeItems([
		{ key: pageKey(page.slug), value: page },
		{ key: userPagesKey(page.ownerId), value: slugs }
	]);
}

export async function removePageForUser(slug: string, ownerId: string): Promise<void> {
	const currentSlugs = (await readItem<string[]>(userPagesKey(ownerId))) ?? [];
	const nextSlugs = currentSlugs.filter((item) => item !== slug);

	await deleteItems([pageKey(slug)]);
	await writeItems([{ key: userPagesKey(ownerId), value: nextSlugs }]);
}

async function readItem<T>(key: string): Promise<T | null> {
	try {
		const value = await get<T>(key);
		if (value !== undefined) {
			return value;
		}
	} catch {
		// Fall through to REST/local storage. The SDK requires EDGE_CONFIG in deployed environments.
	}

	if (hasVercelWriteConfig()) {
		const response = await fetch(edgeConfigItemEndpoint(key), {
			headers: { Authorization: `Bearer ${env.VERCEL_API_TOKEN}` }
		});

		if (response.status === 204) {
			return null;
		}

		if (response.ok) {
			const body = (await response.json()) as { value?: T };
			return body.value ?? null;
		}

		if (response.status !== 404) {
			throw new Error(`Edge Config read failed with HTTP ${response.status}`);
		}
	}

	const local = await readLocalStore();
	return (local.items[key] as T | undefined) ?? null;
}

async function writeItems(
	items: Array<{ key: string; value: Exclude<EdgeConfigValue, null> }>
): Promise<void> {
	if (hasVercelWriteConfig()) {
		const response = await fetch(edgeConfigItemsEndpoint(), {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				items: items.map((item) => ({ operation: 'upsert', ...item }))
			})
		});

		if (!response.ok) {
			throw new Error(`Edge Config write failed with HTTP ${response.status}`);
		}

		return;
	}

	const local = await readLocalStore();
	for (const item of items) {
		local.items[item.key] = item.value;
	}
	await writeLocalStore(local);
}

async function deleteItems(keys: string[]): Promise<void> {
	if (hasVercelWriteConfig()) {
		const response = await fetch(edgeConfigItemsEndpoint(), {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${env.VERCEL_API_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				items: keys.map((key) => ({ operation: 'delete', key }))
			})
		});

		if (!response.ok) {
			throw new Error(`Edge Config delete failed with HTTP ${response.status}`);
		}

		return;
	}

	const local = await readLocalStore();
	for (const key of keys) {
		delete local.items[key];
	}
	await writeLocalStore(local);
}

async function readLocalStore(): Promise<LocalStore> {
	try {
		const raw = await readFile(localStorePath, 'utf8');
		return JSON.parse(raw) as LocalStore;
	} catch {
		return { items: {} };
	}
}

async function writeLocalStore(store: LocalStore): Promise<void> {
	await mkdir(join(process.cwd(), '.data'), { recursive: true });
	await writeFile(localStorePath, JSON.stringify(store, null, 2));
}

function pageKey(slug: string): string {
	return `page_${slug}`;
}

function userPagesKey(ownerId: string): string {
	return `user_${ownerId}_pages`;
}

function hasVercelWriteConfig(): boolean {
	return Boolean(env.VERCEL_API_TOKEN && env.VERCEL_EDGE_CONFIG_ID);
}

function edgeConfigItemsEndpoint(): string {
	const endpoint = new URL(
		`https://api.vercel.com/v1/edge-config/${env.VERCEL_EDGE_CONFIG_ID}/items`
	);
	applyVercelScope(endpoint);
	return endpoint.toString();
}

function edgeConfigItemEndpoint(key: string): string {
	const endpoint = new URL(
		`https://api.vercel.com/v1/edge-config/${env.VERCEL_EDGE_CONFIG_ID}/item/${encodeURIComponent(key)}`
	);
	applyVercelScope(endpoint);
	return endpoint.toString();
}

function applyVercelScope(endpoint: URL): void {
	if (env.VERCEL_TEAM_ID) {
		endpoint.searchParams.set('teamId', env.VERCEL_TEAM_ID);
	}
	if (env.VERCEL_TEAM_SLUG) {
		endpoint.searchParams.set('slug', env.VERCEL_TEAM_SLUG);
	}
}
