#!/usr/bin/env bun
import { Command } from 'commander';
import pc from 'picocolors';
import { existsSync, unlinkSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { clearConfig, getConfigDir, loadConfig, saveConfig } from './config';
import { fetchPublishedPages, fetchUserStatus, publishPageFile } from './api';
import { formatBytes, openBrowser, prompt, slugify } from './utils';

const CLI_VERSION = '0.1.0';

const program = new Command();

program.name('qckpage').description('Fast single-file HTML publishing CLI').version(CLI_VERSION);

// 1. qckpage login
program
	.command('login')
	.description('Login to QckPages using an API Key')
	.option('-k, --key <apiKey>', 'API Key to authenticate with')
	.option('-u, --url <serverUrl>', 'Custom server URL')
	.action(async (options) => {
		try {
			const existingConfig = loadConfig();
			const serverUrl = options.url || existingConfig.serverUrl || 'http://localhost:5173';

			console.log(pc.bold(pc.cyan('\nQckPages CLI Login')));

			let apiKey = options.key;

			if (!apiKey) {
				const loginUrl = `${serverUrl.replace(/\/$/, '')}/?cli_login=true`;
				console.log(pc.yellow(`Opening browser to create your API Key...\n`));
				await openBrowser(loginUrl);

				apiKey = await prompt('Paste your API Key (starts with qck_live_): ');
			}

			if (!apiKey || !apiKey.startsWith('qck_')) {
				console.log(
					pc.red('\n[ERROR] Invalid API Key format. Keys should start with "qck_live_".')
				);
				process.exit(1);
			}

			console.log(pc.dim('Verifying API Key...'));
			if (options.url) {
				saveConfig({ serverUrl: options.url });
			}

			const status = await fetchUserStatus(apiKey);
			saveConfig({ apiKey, serverUrl });

			const displayName =
				[status.name, status.email ? `<${status.email}>` : ''].filter(Boolean).join(' ') || 'User';

			console.log(pc.green(`\n[OK] Successfully logged in!`));
			console.log(`  User:  ${pc.bold(displayName)}`);
			console.log(`  Plan:  ${pc.bold(status.isPro ? pc.magenta('Pro') : pc.cyan('Free Plan'))}`);
			console.log(`  Pages: ${pc.bold(`${status.publishedCount} published`)}\n`);
		} catch (error) {
			console.error(
				pc.red(`\n[ERROR] Login failed: ${error instanceof Error ? error.message : String(error)}`)
			);
			process.exit(1);
		}
	});

// 2. qckpage status (includes usage & user info, no raw IDs or server URL)
program
	.command('status')
	.description('Display user account status, subscription details, and page usage')
	.action(async () => {
		try {
			const status = await fetchUserStatus();

			const displayName =
				[status.name, status.email ? `<${status.email}>` : ''].filter(Boolean).join(' ') ||
				'Authenticated User';

			console.log(pc.bold(pc.cyan('\nAccount Status')));
			console.log(`  User:         ${pc.bold(displayName)}`);
			console.log(
				`  Plan:         ${status.isPro ? pc.magenta(pc.bold('Pro')) : pc.cyan('Free Plan')}`
			);
			console.log(
				`  Status:       ${status.status === 'active' ? pc.green('Active') : pc.yellow(status.status)}`
			);
			console.log(`  Pages Used:   ${status.publishedCount} / ${status.pageLimit ?? 'Unlimited'}`);

			if (!status.isPro) {
				console.log(`  Remaining:    ${pc.green(String(status.remainingPages ?? 0))} free page(s)`);
				if ((status.remainingPages ?? 0) <= 0) {
					console.log(
						pc.yellow(
							'\n[WARNING] Free plan page limit reached. Upgrade to Pro to publish more pages.'
						)
					);
				}
			}
			console.log('');
		} catch (error) {
			console.error(pc.red(`\n[ERROR] ${error instanceof Error ? error.message : String(error)}`));
			process.exit(1);
		}
	});

// 3. qckpage list
program
	.command('list')
	.description('List all published pages')
	.action(async () => {
		try {
			const config = loadConfig();
			const pages = await fetchPublishedPages();

			console.log(pc.bold(pc.cyan(`\nPublished Pages (${pages.length})`)));

			if (pages.length === 0) {
				console.log(
					pc.dim('  No pages published yet. Run `qckpage publish <filename.html>` to deploy one.\n')
				);
				return;
			}

			console.log(
				pc.dim('  ' + 'SLUG'.padEnd(20) + 'TITLE'.padEnd(30) + 'SIZE'.padEnd(12) + 'LINK')
			);
			console.log(pc.dim('  ' + '─'.repeat(80)));

			for (const p of pages) {
				const pageUrl = `${config.serverUrl?.replace(/\/$/, '')}/${p.slug}`;
				const isLocked = Boolean(p.lockedReason);
				const statusTag = isLocked ? pc.red('[LOCKED]') : pc.green('[ACTIVE]');
				console.log(
					`  ${statusTag} ${pc.bold(p.slug).padEnd(18)} ${p.title.slice(0, 28).padEnd(30)} ${formatBytes(p.size).padEnd(12)} ${pc.underline(pageUrl)}`
				);
			}
			console.log('');
		} catch (error) {
			console.error(pc.red(`\n[ERROR] ${error instanceof Error ? error.message : String(error)}`));
			process.exit(1);
		}
	});

// 4. qckpage logout
program
	.command('logout')
	.description('Remove saved credentials and log out')
	.action(() => {
		clearConfig();
		console.log(pc.green('\n[OK] Successfully logged out of QckPages CLI.\n'));
	});

// 5. qckpage update
program
	.command('update')
	.description('Check and update QckPages CLI')
	.action(() => {
		console.log(pc.bold(pc.cyan(`\nQckPages CLI Version: v${CLI_VERSION}`)));
		console.log('To update to the latest version, run:');
		console.log(
			pc.bold(
				'  curl -fsSL https://raw.githubusercontent.com/jR4dh3y/qckpages/main/install.sh | bash\n'
			)
		);
	});

// 6. qckpage uninstall
program
	.command('uninstall')
	.description('Uninstall QckPages CLI and remove local configuration')
	.action(async () => {
		const answer = await prompt('Are you sure you want to uninstall qckpage CLI? (y/N): ');
		if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
			console.log('Uninstall cancelled.');
			return;
		}

		clearConfig();
		const configDir = getConfigDir();
		if (existsSync(configDir)) {
			rmSync(configDir, { recursive: true, force: true });
		}

		const binaryPath = process.argv[1];
		if (binaryPath && existsSync(binaryPath)) {
			try {
				unlinkSync(binaryPath);
				console.log(pc.green(`[OK] Removed executable binary: ${binaryPath}`));
			} catch {
				console.log(
					pc.yellow(
						`Note: Could not automatically remove binary at ${binaryPath}. You may remove it manually.`
					)
				);
			}
		}

		console.log(pc.green('\n[OK] QckPages CLI uninstalled successfully.\n'));
	});

// 7. qckpage publish "page path" -s "slug"
program
	.command('publish <path>')
	.description('Publish an HTML page file to QckPages')
	.option('-s, --slug <slug>', 'Custom slug/link for the page')
	.option('-t, --title <title>', 'Page title')
	.action(async (filePathInput, options) => {
		try {
			const absolutePath = resolve(filePathInput);
			if (!existsSync(absolutePath)) {
				console.error(pc.red(`\n[ERROR] File not found: ${filePathInput}`));
				process.exit(1);
			}

			if (
				!absolutePath.toLowerCase().endsWith('.html') &&
				!absolutePath.toLowerCase().endsWith('.htm')
			) {
				console.error(
					pc.red('\n[ERROR] Only single-file HTML (.html / .htm) documents can be published.')
				);
				process.exit(1);
			}

			const slug = options.slug ? options.slug.trim().toLowerCase() : slugify(filePathInput);

			console.log(pc.cyan(`\nPublishing ${pc.bold(filePathInput)}...`));

			const result = await publishPageFile(absolutePath, slug, options.title);

			console.log(pc.green('\n[OK] Successfully published!'));
			console.log(`  Title: ${pc.bold(result.page.title)}`);
			console.log(`  Link:  ${pc.bold(pc.underline(pc.cyan(result.publicUrl)))}\n`);
		} catch (error) {
			console.error(
				pc.red(
					`\n[ERROR] Publish failed: ${error instanceof Error ? error.message : String(error)}\n`
				)
			);
			process.exit(1);
		}
	});

program.parse(process.argv);
