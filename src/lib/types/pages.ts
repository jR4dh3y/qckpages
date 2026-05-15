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
	lockedReason?: 'free_limit';
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

export interface Entitlement {
	userId: string;
	tier: 'free' | 'pro';
	status: string;
	razorpayCustomerId?: string;
	razorpaySubscriptionId?: string;
	razorpaySubscriptionShortUrl?: string;
	razorpayOrderId?: string;
	razorpayPaymentId?: string;
	currentPeriodEnd?: string;
	updatedAt: string;
}
