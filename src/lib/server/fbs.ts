import { env } from '$env/dynamic/private';
import { createHash, createHmac } from 'node:crypto';

const defaultBucket = 'qckpages';
const region = 'us-east-1';
const service = 's3';
const unsignedPayload = 'UNSIGNED-PAYLOAD';
const emptyPayloadHash = sha256Hex('');

export function getFbsBucket(): string {
	return env.FBS_BUCKET || defaultBucket;
}

export async function uploadHtmlToFbs(params: {
	bucket: string;
	key: string;
	body: ArrayBuffer;
}): Promise<{ etag: string }> {
	const baseUrl = requiredEnv(env.FBS_BASE_URL, 'FBS_BASE_URL').replace(/\/$/, '');

	await ensureBucket(baseUrl, params.bucket);

	const url = new URL(`${baseUrl}/${encodeSegment(params.bucket)}/${encodeObjectKey(params.key)}`);
	const payloadHash = sha256Hex(params.body);
	const response = await fetch(url, {
		method: 'PUT',
		headers: signHeaders(
			'PUT',
			url,
			{
				'Content-Type': 'text/html; charset=utf-8'
			},
			payloadHash
		),
		body: params.body
	});

	if (!response.ok) {
		throw new Error(`FBS upload failed with HTTP ${response.status}${await errorDetail(response)}`);
	}

	return { etag: response.headers.get('etag') ?? '' };
}

export async function deleteHtmlFromFbs(params: { bucket: string; key: string }): Promise<void> {
	const baseUrl = requiredEnv(env.FBS_BASE_URL, 'FBS_BASE_URL').replace(/\/$/, '');
	const url = new URL(`${baseUrl}/${encodeSegment(params.bucket)}/${encodeObjectKey(params.key)}`);
	const response = await fetch(url, {
		method: 'DELETE',
		headers: signHeaders('DELETE', url, {}, emptyPayloadHash)
	});

	if (!response.ok && response.status !== 404) {
		throw new Error(`FBS delete failed with HTTP ${response.status}${await errorDetail(response)}`);
	}
}

export function createSignedPublicUrl(bucket: string, key: string): string {
	if (env.FBS_PUBLIC_READ_SIGNING_SECRET) {
		return createFbsPublicReadUrl(bucket, key);
	}

	return createSigV4PresignedUrl(bucket, key);
}

function createFbsPublicReadUrl(bucket: string, key: string): string {
	const publicBaseUrl = requiredEnv(
		env.FBS_PUBLIC_BASE_URL || env.FBS_BASE_URL,
		'FBS_PUBLIC_BASE_URL'
	);
	const secret = requiredEnv(env.FBS_PUBLIC_READ_SIGNING_SECRET, 'FBS_PUBLIC_READ_SIGNING_SECRET');
	const ttlSeconds = Number(env.FBS_PUBLIC_READ_TTL_SECONDS || '3600');
	const expires = Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds);
	const path = publicReadObjectPath(bucket, key);
	const signature = createHmac('sha256', secret).update(`GET\n${path}\n${expires}`).digest('hex');
	const query = new URLSearchParams({ expires: String(expires), signature });

	return `${publicBaseUrl.replace(/\/$/, '')}${path}?${query.toString()}`;
}

function createSigV4PresignedUrl(bucket: string, key: string): string {
	const publicBaseUrl = requiredEnv(
		env.FBS_PUBLIC_BASE_URL || env.FBS_BASE_URL,
		'FBS_PUBLIC_BASE_URL'
	);
	const ttlSeconds = String(Math.max(60, Number(env.FBS_PUBLIC_READ_TTL_SECONDS || '3600')));
	const url = new URL(
		`${publicBaseUrl.replace(/\/$/, '')}/${encodeSegment(bucket)}/${encodeObjectKey(key)}`
	);
	const amzDate = amzTimestamp(new Date());
	const shortDate = amzDate.slice(0, 8);
	const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;

	url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
	url.searchParams.set('X-Amz-Credential', `${sigV4AccessKeyId()}/${credentialScope}`);
	url.searchParams.set('X-Amz-Date', amzDate);
	url.searchParams.set('X-Amz-Expires', ttlSeconds);
	url.searchParams.set('X-Amz-SignedHeaders', 'host');
	url.searchParams.set('X-Amz-Content-SHA256', unsignedPayload);

	const canonicalRequest = [
		'GET',
		url.pathname,
		canonicalQueryString(url, new Set(['X-Amz-Signature'])),
		`host:${url.host}\n`,
		'host',
		unsignedPayload
	].join('\n');
	const signature = signatureFor(shortDate, credentialScope, amzDate, canonicalRequest);
	url.searchParams.set('X-Amz-Signature', signature);

	return url.toString();
}

async function ensureBucket(baseUrl: string, bucket: string): Promise<void> {
	const bucketUrl = new URL(`${baseUrl}/${encodeSegment(bucket)}`);
	const create = await fetch(bucketUrl, {
		method: 'PUT',
		headers: signHeaders('PUT', bucketUrl, {}, emptyPayloadHash)
	});

	if (create.ok || create.status === 409) {
		return;
	}

	const head = await fetch(bucketUrl, {
		method: 'HEAD',
		headers: signHeaders('HEAD', bucketUrl, {}, emptyPayloadHash)
	});

	if (head.ok) {
		return;
	}

	if (head.status !== 404) {
		throw new Error(`FBS bucket check failed with HTTP ${head.status}${await errorDetail(head)}`);
	}

	if (!create.ok) {
		throw new Error(
			`FBS bucket create failed with HTTP ${create.status}${await errorDetail(create)}`
		);
	}
}

function publicReadObjectPath(bucket: string, key: string): string {
	return `/public/${encodeSegment(bucket)}/${encodeObjectKey(key)}`;
}

function signHeaders(
	method: string,
	url: URL,
	extraHeaders: Record<string, string> = {},
	payloadHash = unsignedPayload
): Headers {
	const amzDate = amzTimestamp(new Date());
	const shortDate = amzDate.slice(0, 8);
	const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;
	const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
	const canonicalHeaders = [
		`host:${url.host}`,
		`x-amz-content-sha256:${payloadHash}`,
		`x-amz-date:${amzDate}`,
		''
	].join('\n');
	const canonicalRequest = [
		method,
		url.pathname,
		canonicalQueryString(url),
		canonicalHeaders,
		signedHeaders,
		payloadHash
	].join('\n');
	const signature = signatureFor(shortDate, credentialScope, amzDate, canonicalRequest);
	const headers = new Headers(extraHeaders);

	headers.set('X-Amz-Date', amzDate);
	headers.set('X-Amz-Content-SHA256', payloadHash);
	headers.set(
		'Authorization',
		`AWS4-HMAC-SHA256 Credential=${sigV4AccessKeyId()}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
	);

	return headers;
}

function signatureFor(
	shortDate: string,
	credentialScope: string,
	amzDate: string,
	canonicalRequest: string
): string {
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		credentialScope,
		sha256Hex(canonicalRequest)
	].join('\n');

	return hmacHex(signingKey(shortDate), stringToSign);
}

function signingKey(shortDate: string): Buffer {
	const secret = sigV4SecretKey();
	const dateKey = hmacBuffer(Buffer.from(`AWS4${secret}`), shortDate);
	const regionKey = hmacBuffer(dateKey, region);
	const serviceKey = hmacBuffer(regionKey, service);
	return hmacBuffer(serviceKey, 'aws4_request');
}

function canonicalQueryString(url: URL, exclude = new Set<string>()): string {
	const pairs = Array.from(url.searchParams.entries())
		.filter(([key]) => !exclude.has(key))
		.sort(([leftKey, leftValue], [rightKey, rightValue]) =>
			leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
		);

	return pairs.map(([key, value]) => `${uriEncode(key)}=${uriEncode(value)}`).join('&');
}

function amzTimestamp(date: Date): string {
	return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(value: string | ArrayBuffer): string {
	const input = typeof value === 'string' ? value : Buffer.from(value);
	return createHash('sha256').update(input).digest('hex');
}

function hmacBuffer(key: Buffer | string, value: string): Buffer {
	return createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string): string {
	return createHmac('sha256', key).update(value).digest('hex');
}

function uriEncode(value: string): string {
	return encodeURIComponent(value).replace(
		/[!'()*]/g,
		(char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
	);
}

function sigV4AccessKeyId(): string {
	return requiredEnv(env.FBS_SIGV4_ACCESS_KEY_ID, 'FBS_SIGV4_ACCESS_KEY_ID');
}

function sigV4SecretKey(): string {
	return requiredEnv(env.FBS_SIGV4_SECRET_KEY, 'FBS_SIGV4_SECRET_KEY');
}

function encodeObjectKey(key: string): string {
	return key.split('/').map(encodeSegment).join('/');
}

function encodeSegment(value: string): string {
	return encodeURIComponent(value);
}

function requiredEnv(value: string | undefined, name: string): string {
	if (!value?.trim()) {
		throw new Error(`${name} is required`);
	}

	return value.trim();
}

async function errorDetail(response: Response): Promise<string> {
	const body = (await response.text().catch(() => '')).trim();
	return body ? `: ${body.slice(0, 300)}` : '';
}
