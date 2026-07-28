import { describe, expect, test } from 'bun:test';
import { normalizeCustomHostname } from '../src/convex/domainValidation';

describe('normalizeCustomHostname', () => {
	test('normalizes an exact ASCII subdomain', () => {
		expect(normalizeCustomHostname('  Portfolio.Example.COM. ')).toBe('portfolio.example.com');
	});

	test('supports multi-label public suffixes', () => {
		expect(normalizeCustomHostname('go.example.co.uk')).toBe('go.example.co.uk');
	});

	test.each([
		'example.com',
		'https://go.example.com',
		'go.example.com/path',
		'go.example.com:443',
		'*.example.com',
		'go.example.com@other.example.net'
	])('rejects non-subdomain input: %s', (hostname) => {
		expect(() => normalizeCustomHostname(hostname)).toThrow();
	});

	test('normalizes a valid IDN to its ASCII DNS form', () => {
		expect(normalizeCustomHostname('münchen.example.com')).toBe('xn--mnchen-3ya.example.com');
	});

	test('rejects an invalid IDN', () => {
		expect(() => normalizeCustomHostname('xn--.example.com')).toThrow('valid subdomain');
	});

	test('uses private suffix rules to distinguish private apex domains', () => {
		expect(() => normalizeCustomHostname('portfolio.github.io')).toThrow('apex domains');
		expect(normalizeCustomHostname('www.portfolio.github.io')).toBe('www.portfolio.github.io');
	});

	test.each(['preview.vercel.app', 'site.convex.site'])(
		'rejects provider hosts: %s',
		(hostname) => {
			expect(() => normalizeCustomHostname(hostname)).toThrow('reserved');
		}
	);

	test('rejects the configured canonical QckPages host', () => {
		expect(() =>
			normalizeCustomHostname('app.example.com', {
				reservedHosts: ['https://app.example.com']
			})
		).toThrow('reserved');
	});
});
