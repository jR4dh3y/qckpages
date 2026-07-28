import { describe, expect, test } from 'bun:test';
import { normalizeCustomHostname, wildcardHostname } from '../src/convex/domainValidation';

describe('normalizeCustomHostname', () => {
	test('normalizes an exact ASCII subdomain', () => {
		expect(normalizeCustomHostname('  Portfolio.Example.COM. ')).toBe('portfolio.example.com');
	});

	test('supports multi-label public suffixes', () => {
		expect(normalizeCustomHostname('go.example.co.uk')).toBe('go.example.co.uk');
	});

	test('accepts an apex domain as the wildcard base', () => {
		expect(normalizeCustomHostname('Example.COM')).toBe('example.com');
		expect(wildcardHostname('example.com')).toBe('*.example.com');
	});

	test.each([
		'https://go.example.com',
		'go.example.com/path',
		'go.example.com:443',
		'*.example.com',
		'go.example.com@other.example.net'
	])('rejects invalid domain input: %s', (hostname) => {
		expect(() => normalizeCustomHostname(hostname)).toThrow();
	});

	test('normalizes a valid IDN to its ASCII DNS form', () => {
		expect(normalizeCustomHostname('münchen.example.com')).toBe('xn--mnchen-3ya.example.com');
	});

	test('rejects an invalid IDN', () => {
		expect(() => normalizeCustomHostname('xn--.example.com')).toThrow('valid domain');
	});

	test('rejects private hosting suffixes that the user cannot control', () => {
		expect(() => normalizeCustomHostname('portfolio.github.io')).toThrow('registrable domain');
		expect(() => normalizeCustomHostname('www.portfolio.github.io')).toThrow('registrable domain');
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

	test('rejects a wildcard base that would cover the canonical QckPages host', () => {
		expect(() =>
			normalizeCustomHostname('example.com', {
				reservedHosts: ['https://app.example.com']
			})
		).toThrow('reserved');
	});
});
