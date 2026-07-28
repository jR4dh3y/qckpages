export type DomainStatus = 'pending_dns' | 'active' | 'error';

export interface DnsInstruction {
	type: 'CNAME' | 'TXT';
	name: string;
	value: string;
	purpose: 'traffic' | 'ownership';
}

export interface VercelProjectDomain {
	name: string;
	projectId?: string;
	verified: boolean;
	verification: DnsInstruction[];
}

export interface VercelDomainConfiguration {
	misconfigured: boolean;
	recommendedCname?: string;
}

export interface ProvisioningState {
	status: DomainStatus;
	dnsInstructions: DnsInstruction[];
	error?: string;
}

interface VercelClientOptions {
	accessToken?: string;
	projectId?: string;
	teamId?: string;
	fetcher?: typeof fetch;
}

export class VercelApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string
	) {
		super(message);
		this.name = 'VercelApiError';
	}

	get isNotFound(): boolean {
		return this.status === 404 || this.code === 'not_found';
	}

	get isAlreadyAttached(): boolean {
		return (
			this.status === 409 ||
			this.code === 'not_modified' ||
			this.code === 'already_exists' ||
			this.code === 'domain_already_exists' ||
			this.code === 'domain_already_in_use'
		);
	}

	get isDefinitiveProvisioningFailure(): boolean {
		return this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429;
	}
}

export class VercelDomainsClient {
	private readonly accessToken: string;
	private readonly projectId: string;
	private readonly teamId?: string;
	private readonly fetcher: typeof fetch;

	constructor(options: VercelClientOptions = {}) {
		this.accessToken = required(
			options.accessToken ?? process.env.VERCEL_ACCESS_TOKEN,
			'VERCEL_ACCESS_TOKEN'
		);
		this.projectId = required(
			options.projectId ?? process.env.VERCEL_PROJECT_ID,
			'VERCEL_PROJECT_ID'
		);
		this.teamId = (options.teamId ?? process.env.VERCEL_TEAM_ID?.trim()) || undefined;
		this.fetcher = options.fetcher ?? fetch;
	}

	get targetProjectId(): string {
		return this.projectId;
	}

	async addDomain(hostname: string): Promise<VercelProjectDomain> {
		const body = await this.request(`/v10/projects/${encodeURIComponent(this.projectId)}/domains`, {
			method: 'POST',
			body: JSON.stringify({ name: hostname })
		});
		return parseProjectDomain(body);
	}

	async getDomain(hostname: string): Promise<VercelProjectDomain> {
		const body = await this.request(
			`/v9/projects/${encodeURIComponent(this.projectId)}/domains/${encodeURIComponent(hostname)}`
		);
		return parseProjectDomain(body);
	}

	async verifyDomain(hostname: string): Promise<VercelProjectDomain> {
		const body = await this.request(
			`/v9/projects/${encodeURIComponent(this.projectId)}/domains/${encodeURIComponent(hostname)}/verify`,
			{ method: 'POST' }
		);
		return parseProjectDomain(body);
	}

	async getConfiguration(hostname: string): Promise<VercelDomainConfiguration> {
		const query = new URLSearchParams({
			projectIdOrName: this.projectId,
			strict: 'true'
		});
		const body = await this.request(
			`/v6/domains/${encodeURIComponent(hostname)}/config?${query.toString()}`
		);
		return parseDomainConfiguration(body);
	}

	async removeDomain(hostname: string): Promise<void> {
		await this.request(
			`/v9/projects/${encodeURIComponent(this.projectId)}/domains/${encodeURIComponent(hostname)}`,
			{ method: 'DELETE' }
		);
	}

	private async request(path: string, init: RequestInit = {}): Promise<unknown> {
		const url = new URL(path, 'https://api.vercel.com');
		if (this.teamId) url.searchParams.set('teamId', this.teamId);

		const headers = new Headers(init.headers);
		headers.set('Authorization', `Bearer ${this.accessToken}`);
		headers.set('Content-Type', 'application/json');

		const response = await this.fetcher(url, { ...init, headers });
		const body = await response.json().catch(() => null);
		if (!response.ok) {
			throw providerError(response.status, body);
		}
		return body;
	}
}

export function parseProjectDomain(value: unknown): VercelProjectDomain {
	const object = asObject(value);
	const name = stringField(object, 'name');
	if (!name) throw new Error('Vercel returned an invalid project domain response');

	const verification = Array.isArray(object.verification)
		? object.verification
				.map(parseVerificationInstruction)
				.filter((item): item is DnsInstruction => item !== null)
				.slice(0, 3)
		: [];

	return {
		name,
		projectId: stringField(object, 'projectId') || undefined,
		verified: object.verified === true,
		verification
	};
}

export function parseDomainConfiguration(value: unknown): VercelDomainConfiguration {
	const object = asObject(value);
	return {
		misconfigured: object.misconfigured !== false,
		recommendedCname: readRecommendedCname(object.recommendedCNAME)
	};
}

export function provisioningState(
	hostname: string,
	domain: VercelProjectDomain,
	configuration: VercelDomainConfiguration
): ProvisioningState {
	const dnsInstructions: DnsInstruction[] = [];
	if (configuration.recommendedCname) {
		dnsInstructions.push({
			type: 'CNAME',
			name: hostname,
			value: configuration.recommendedCname,
			purpose: 'traffic'
		});
	}
	dnsInstructions.push(...domain.verification);

	if (domain.verified && !configuration.misconfigured) {
		return { status: 'active', dnsInstructions: dnsInstructions.slice(0, 4) };
	}

	return {
		status: 'pending_dns',
		dnsInstructions: dnsInstructions.slice(0, 4),
		error: undefined
	};
}

export function providerError(status: number, value: unknown): VercelApiError {
	const object = asObject(value);
	const nested = asObject(object.error);
	const code = stringField(nested, 'code') || stringField(object, 'code') || undefined;
	const providerMessage =
		stringField(nested, 'message') || stringField(object, 'message') || `HTTP ${status}`;

	const publicMessage =
		code === 'custom_domain_needs_upgrade' ||
		code === 'domain_limit_reached' ||
		code === 'limit_reached'
			? 'The Vercel project domain quota or plan limit was reached'
			: status === 401 || status === 403
				? 'Vercel rejected the project credentials or domain access'
				: status === 429
					? 'Vercel is rate limiting domain checks; try again shortly'
					: `Vercel domain setup failed: ${providerMessage}`;

	return new VercelApiError(publicMessage, status, code);
}

function parseVerificationInstruction(value: unknown): DnsInstruction | null {
	const object = asObject(value);
	if (stringField(object, 'type').toUpperCase() !== 'TXT') return null;

	const name =
		stringField(object, 'domain') || stringField(object, 'name') || stringField(object, 'key');
	const recordValue = stringField(object, 'value');
	if (!name || !recordValue) return null;

	return { type: 'TXT', name, value: recordValue, purpose: 'ownership' };
}

function readRecommendedCname(value: unknown): string | undefined {
	if (typeof value === 'string') return cleanDnsValue(value);
	if (!Array.isArray(value)) return undefined;

	for (const item of value) {
		if (typeof item === 'string') return cleanDnsValue(item);
		const candidate = stringField(asObject(item), 'value');
		if (candidate) return cleanDnsValue(candidate);
	}
	return undefined;
}

function cleanDnsValue(value: string): string {
	return value.trim().replace(/\.$/, '');
}

function asObject(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function stringField(object: Record<string, unknown>, key: string): string {
	return typeof object[key] === 'string' ? object[key].trim() : '';
}

function required(value: string | undefined, name: string): string {
	if (!value?.trim()) throw new Error(`${name} is required`);
	return value.trim();
}
