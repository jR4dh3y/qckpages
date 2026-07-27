import { exec } from 'node:child_process';
import { createInterface } from 'node:readline';
import pc from 'picocolors';

export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function openBrowser(url: string): Promise<void> {
	const platform = process.platform;
	let command = '';

	if (platform === 'darwin') {
		command = `open "${url}"`;
	} else if (platform === 'win32') {
		command = `start "" "${url}"`;
	} else {
		command = `xdg-open "${url}"`;
	}

	return new Promise((resolve) => {
		exec(command, () => resolve());
	});
}

export function prompt(question: string): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout
	});

	return new Promise((resolve) => {
		rl.question(pc.bold(pc.cyan(question)), (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

export function slugify(text: string): string {
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/\.[^/.]+$/, '') // remove extension
		.replace(/\s+/g, '-') // replace spaces with -
		.replace(/[^\w-]+/g, '') // remove non-word chars
		.replace(/-+/g, '-') // replace multiple - with single -
		.replace(/^-+/, '') // trim - from start
		.replace(/-+$/, ''); // trim - from end
}
