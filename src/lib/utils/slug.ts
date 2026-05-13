const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/['"]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
}

export function isValidSlug(value: string): boolean {
	return slugPattern.test(value) && value.length >= 3 && value.length <= 64;
}

export function titleFromFilename(filename: string): string {
	const withoutExtension = filename.replace(/\.[^.]+$/, '');
	const cleaned = withoutExtension.replace(/[-_]+/g, ' ').trim();

	if (!cleaned) {
		return 'Untitled page';
	}

	return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
