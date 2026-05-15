import { env } from '$env/dynamic/private';
import Razorpay from 'razorpay';

export function getRazorpayKeyId(): string {
	return requiredEnv(env.RAZORPAY_KEY_ID, 'RAZORPAY_KEY_ID');
}

export function getRazorpayPlanId(): string {
	return requiredEnv(env.RAZORPAY_PRO_PLAN_ID, 'RAZORPAY_PRO_PLAN_ID');
}

export function getRazorpayKeySecret(): string {
	return requiredEnv(env.RAZORPAY_KEY_SECRET, 'RAZORPAY_KEY_SECRET');
}

export function getRazorpayClient(): Razorpay {
	return new Razorpay({
		key_id: getRazorpayKeyId(),
		key_secret: getRazorpayKeySecret()
	});
}

function requiredEnv(value: string | undefined, name: string): string {
	if (!value?.trim()) {
		throw new Error(`${name} is required`);
	}

	return value.trim();
}
