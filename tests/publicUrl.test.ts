import { describe, expect, test } from 'bun:test';
import type { CustomDomain } from '../src/lib/types/domains';
import { publicPageUrl } from '../src/lib/utils/public-url';

const activeDomain: CustomDomain = {
	hostname: 'pages.example.com',
	routingMode: 'subdomains',
	status: 'active',
	dnsInstructions: [],
	createdAt: '2026-07-28T00:00:00.000Z',
	updatedAt: '2026-07-28T00:00:00.000Z'
};

describe('publicPageUrl', () => {
	test('uses the app origin when no custom domain is active', () => {
		expect(publicPageUrl('https://qckpages.com', 'my-page', null)).toBe(
			'https://qckpages.com/my-page'
		);
	});

	test('replaces the app origin for every page slug', () => {
		expect(publicPageUrl('https://qckpages.com', 'first-page', activeDomain)).toBe(
			'https://first-page.pages.example.com'
		);
		expect(publicPageUrl('https://qckpages.com', 'second-page', activeDomain)).toBe(
			'https://second-page.pages.example.com'
		);
	});

	test('does not use a domain that is still waiting for DNS', () => {
		expect(
			publicPageUrl('https://qckpages.com', 'my-page', {
				...activeDomain,
				status: 'pending_dns'
			})
		).toBe('https://qckpages.com/my-page');
	});

	test('keeps the app origin for legacy exact-domain records', () => {
		const legacyDomain: CustomDomain = { ...activeDomain, routingMode: undefined };
		expect(publicPageUrl('https://qckpages.com', 'my-page', legacyDomain)).toBe(
			'https://qckpages.com/my-page'
		);
	});
});
