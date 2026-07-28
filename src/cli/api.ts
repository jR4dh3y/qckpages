import { loadConfig } from './config';
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { DEFAULT_SERVER_URL } from './constants';

export interface UserStatus {
	userId: string;
	email: string | null;
	name: string | null;
	tier: 'free' | 'pro';
	status: string;
	currentPeriodEnd: string | null;
	publishedCount: number;
	totalPagesCount: number;
	pageLimit: number | null;
	remainingPages: number | null;
	isPro: boolean;
}

export interface PublishedPage {
	slug: string;
	pageId: string;
	ownerId: string;
	title: string;
	bucket: string;
	key: string;
	version: number;
	originalFilename: string;
	size: number;
	published: boolean;
	lockedReason?: string;
	createdAt: string;
	updatedAt: string;
}

export async function fetchUserStatus(apiKeyOverride?: string): Promise<UserStatus> {
	const config = loadConfig();
	const apiKey = apiKeyOverride || config.apiKey;
	if (!apiKey) {
		throw new Error('Not logged in. Please run `qckpage login` first.');
	}
	const serverUrl = config.serverUrl ?? DEFAULT_SERVER_URL;

	const response = await fetch(`${serverUrl}/api/user/status`, {
		headers: {
			Authorization: `Bearer ${apiKey}`
		}
	});

	if (!response.ok) {
		const errData = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(errData.error || `HTTP ${response.status}: Unauthorized or server error`);
	}

	return (await response.json()) as UserStatus;
}

export async function fetchPublishedPages(): Promise<PublishedPage[]> {
	const config = loadConfig();
	const apiKey = config.apiKey;
	if (!apiKey) {
		throw new Error('Not logged in. Please run `qckpage login` first.');
	}
	const serverUrl = config.serverUrl ?? DEFAULT_SERVER_URL;

	const response = await fetch(`${serverUrl}/api/pages`, {
		headers: {
			Authorization: `Bearer ${apiKey}`
		}
	});

	if (!response.ok) {
		const errData = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(errData.error || `HTTP ${response.status}: Failed to list pages`);
	}

	const data = (await response.json()) as { pages: PublishedPage[] };
	return data.pages || [];
}

export async function publishPageFile(
	filePath: string,
	slug: string,
	title?: string
): Promise<{ page: PublishedPage; publicUrl: string }> {
	const config = loadConfig();
	const apiKey = config.apiKey;
	if (!apiKey) {
		throw new Error('Not logged in. Please run `qckpage login` first.');
	}
	const serverUrl = config.serverUrl ?? DEFAULT_SERVER_URL;

	if (!existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}

	const filename = basename(filePath);
	const fileBuffer = readFileSync(filePath);
	const blob = new Blob([fileBuffer], { type: 'text/html' });

	const formData = new FormData();
	formData.append('file', blob, filename);
	formData.append('slug', slug);
	if (title) {
		formData.append('title', title);
	}

	const response = await fetch(`${serverUrl}/api/pages`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Origin: new URL(serverUrl).origin
		},
		body: formData
	});

	if (!response.ok) {
		const errData = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(errData.error || `HTTP ${response.status}: Failed to publish page`);
	}

	const result = (await response.json()) as { page: PublishedPage; publicPath: string };
	const publicUrl = `${serverUrl}${result.publicPath}`;

	return {
		page: result.page,
		publicUrl
	};
}
