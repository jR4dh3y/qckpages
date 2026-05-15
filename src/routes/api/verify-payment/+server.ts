import { createHmac, timingSafeEqual } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { RequestHandler } from './$types';
import { createServerConvexClient } from '$lib/server/convex';
import { getRazorpayKeySecret } from '$lib/server/razorpay';

interface VerifyPaymentRequest {
	razorpay_payment_id?: unknown;
	razorpay_order_id?: unknown;
	razorpay_signature?: unknown;
}

export const POST: RequestHandler = async (event) => {
	try {
		const body = (await event.request.json().catch(() => ({}))) as VerifyPaymentRequest;

		if (
			typeof body.razorpay_payment_id !== 'string' ||
			typeof body.razorpay_order_id !== 'string' ||
			typeof body.razorpay_signature !== 'string'
		) {
			return json({ error: 'Missing payment verification fields' }, { status: 400 });
		}

		if (
			!isValidSignature({
				orderId: body.razorpay_order_id,
				paymentId: body.razorpay_payment_id,
				signature: body.razorpay_signature
			})
		) {
			return json({ error: 'Invalid payment signature' }, { status: 400 });
		}

		const convex = createServerConvexClient({ token: event.locals.token });
		await convex.mutation(api.billing.markCurrentUserRazorpayOrderPaid, {
			razorpayOrderId: body.razorpay_order_id,
			razorpayPaymentId: body.razorpay_payment_id
		});

		return json({ success: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not verify payment';
		return json({ error: message }, { status: message.includes('Sign in') ? 401 : 500 });
	}
};

function isValidSignature(args: {
	orderId: string;
	paymentId: string;
	signature: string;
}): boolean {
	const expected = createHmac('sha256', getRazorpayKeySecret())
		.update(`${args.orderId}|${args.paymentId}`)
		.digest('hex');

	return safeEqual(expected, args.signature);
}

function safeEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);

	return (
		leftBuffer.byteLength === rightBuffer.byteLength && timingSafeEqual(leftBuffer, rightBuffer)
	);
}
