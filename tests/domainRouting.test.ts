import { describe, expect, test } from 'bun:test';
import { pageSubdomainHostname, parsePageSubdomain } from '../src/lib/utils/domain-routing';

describe('page subdomain routing', () => {
	test('builds one subdomain per page slug', () => {
		expect(pageSubdomainHostname('portfolio', 'example.com')).toBe('portfolio.example.com');
		expect(pageSubdomainHostname('resume', 'pages.example.com')).toBe('resume.pages.example.com');
	});

	test('parses the slug and configured base hostname', () => {
		expect(parsePageSubdomain('portfolio.example.com')).toEqual({
			slug: 'portfolio',
			baseHostname: 'example.com'
		});
		expect(parsePageSubdomain('resume.pages.example.com')).toEqual({
			slug: 'resume',
			baseHostname: 'pages.example.com'
		});
	});

	test('rejects invalid or oversized page labels', () => {
		expect(parsePageSubdomain('example.com')).toBeNull();
		expect(pageSubdomainHostname('a'.repeat(64), 'example.com')).toBeNull();
	});
});
