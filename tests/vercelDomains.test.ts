import { describe, expect, test } from 'bun:test';
import {
	parseDomainConfiguration,
	parseProjectDomain,
	providerError,
	provisioningState,
	VercelApiError
} from '../src/convex/vercelDomains';

describe('Vercel domain response parsing', () => {
	test('selects the recommended CNAME and ownership TXT challenge', () => {
		const domain = parseProjectDomain({
			name: 'go.example.com',
			projectId: 'prj_123',
			verified: false,
			verification: [
				{
					type: 'TXT',
					domain: '_vercel.example.com',
					value: 'vc-domain-verify=go.example.com,abc'
				}
			]
		});
		const configuration = parseDomainConfiguration({
			misconfigured: true,
			recommendedCNAME: [{ rank: 1, value: 'abc.vercel-dns-017.com.' }]
		});

		expect(provisioningState('go.example.com', domain, configuration)).toEqual({
			status: 'pending_dns',
			dnsInstructions: [
				{
					type: 'CNAME',
					name: 'go.example.com',
					value: 'abc.vercel-dns-017.com',
					purpose: 'traffic'
				},
				{
					type: 'TXT',
					name: '_vercel.example.com',
					value: 'vc-domain-verify=go.example.com,abc',
					purpose: 'ownership'
				}
			],
			error: undefined
		});
	});

	test('becomes active only when ownership and DNS are both ready', () => {
		const configured = { misconfigured: false, recommendedCname: 'target.vercel-dns.com' };
		expect(
			provisioningState(
				'go.example.com',
				{ name: 'go.example.com', verified: true, verification: [] },
				configured
			).status
		).toBe('active');
		expect(
			provisioningState(
				'go.example.com',
				{ name: 'go.example.com', verified: false, verification: [] },
				configured
			).status
		).toBe('pending_dns');
	});

	test('uses Vercel nameservers for wildcard page subdomains', () => {
		const state = provisioningState(
			'*.example.com',
			{ name: '*.example.com', verified: false, verification: [] },
			{ misconfigured: true, recommendedCname: 'ignored.vercel-dns.com' }
		);

		expect(state.dnsInstructions).toEqual([
			{
				type: 'NS',
				name: 'example.com',
				value: 'ns1.vercel-dns.com',
				purpose: 'traffic'
			},
			{
				type: 'NS',
				name: 'example.com',
				value: 'ns2.vercel-dns.com',
				purpose: 'traffic'
			}
		]);
	});

	test('treats a missing or ambiguous configuration as misconfigured', () => {
		expect(parseDomainConfiguration({}).misconfigured).toBe(true);
	});
});

describe('Vercel provider errors', () => {
	test('maps quota errors to a clear definitive failure', () => {
		const error = providerError(400, {
			error: { code: 'domain_limit_reached', message: 'limit' }
		});
		expect(error.message).toContain('quota');
		expect(error.isDefinitiveProvisioningFailure).toBe(true);
	});

	test('marks rate limits as retryable', () => {
		const error = providerError(429, {
			error: { code: 'rate_limited', message: 'slow down' }
		});
		expect(error.isDefinitiveProvisioningFailure).toBe(false);
	});

	test('recognizes retry-safe removal and idempotent attachment errors', () => {
		expect(new VercelApiError('missing', 404, 'not_found').isNotFound).toBe(true);
		expect(new VercelApiError('exists', 409, 'not_modified').isAlreadyAttached).toBe(true);
		expect(new VercelApiError('exists', 400, 'domain_already_in_use').isAlreadyAttached).toBe(true);
	});
});
