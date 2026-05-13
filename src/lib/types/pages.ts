export interface PublishedPage {
	slug: string;
	pageId: string;
	ownerId: string;
	title: string;
	bucket: string;
	key: string;
	version: number;
	originalFilename: string;
	size: number;
	etag: string;
	published: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface PublicUser {
	userId: string;
	email?: string;
	name?: string;
	picture?: string;
}

export interface UploadResponse {
	page: PublishedPage;
	publicPath: string;
}
