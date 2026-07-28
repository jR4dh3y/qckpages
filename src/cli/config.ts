import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_SERVER_URL } from './constants';

export interface QckPageConfig {
	apiKey?: string;
	serverUrl?: string;
}

const CONFIG_DIR = join(homedir(), '.config', 'qckpage');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getConfigPath(): string {
	return CONFIG_FILE;
}

export function getConfigDir(): string {
	return CONFIG_DIR;
}

export function loadConfig(): QckPageConfig {
	const envKey = process.env.QCKPAGE_API_KEY || process.env.QCK_API_KEY;
	const envServer = process.env.QCKPAGE_SERVER_URL || process.env.SITE_URL || DEFAULT_SERVER_URL;

	let fileConfig: QckPageConfig = {};
	if (existsSync(CONFIG_FILE)) {
		try {
			const data = readFileSync(CONFIG_FILE, 'utf-8');
			fileConfig = JSON.parse(data);
		} catch {
			// ignore invalid config file
		}
	}

	return {
		apiKey: envKey || fileConfig.apiKey,
		serverUrl: fileConfig.serverUrl || envServer
	};
}

export function saveConfig(config: Partial<QckPageConfig>): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true });
	}

	const existing = loadConfig();
	const merged: QckPageConfig = {
		...existing,
		...config
	};

	writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
}

export function clearConfig(): void {
	if (existsSync(CONFIG_FILE)) {
		unlinkSync(CONFIG_FILE);
	}
}
