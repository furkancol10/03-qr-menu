import { formStrings, loginSchema } from '../../validation';
import type { Db } from '../db/client';
import {
	LOGIN_EMAIL_LIMIT,
	LOGIN_IP_LIMIT,
	loginEmailKey,
	loginIpKey,
	type RateLimiter
} from '../rate-limit';
import { authenticate, normalizeEmail } from './password';
import { createSession, deleteSession } from './session';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export type LoginAttemptResult =
	| { ok: false; status: 400 | 429; email: string; message: string }
	| { ok: true; token: string; expiresAt: Date; secure: boolean };

export async function handleLoginAttempt(
	input: {
		formData: FormData;
		ip: string;
		hostname: string;
		previousSessionToken?: string;
	},
	deps: { db: Db; rateLimiter: RateLimiter }
): Promise<LoginAttemptResult> {
	const fields = formStrings(input.formData);
	const email = fields.email ?? '';
	const parsed = loginSchema.safeParse(fields);

	const emailKey = parsed.success ? loginEmailKey(normalizeEmail(parsed.data.email)) : null;
	const allowed =
		(await deps.rateLimiter.hit(loginIpKey(input.ip), LOGIN_IP_LIMIT)) &&
		(!emailKey || (await deps.rateLimiter.hit(emailKey, LOGIN_EMAIL_LIMIT)));
	if (!allowed) {
		return {
			ok: false,
			status: 429,
			email,
			message: 'Çok fazla deneme. Lütfen 15 dakika sonra tekrar deneyin.'
		};
	}

	const admin = parsed.success
		? await authenticate(deps.db, parsed.data.email, parsed.data.password)
		: null;
	if (!admin) {
		return { ok: false, status: 400, email, message: 'E-posta veya şifre hatalı.' };
	}

	if (emailKey) await deps.rateLimiter.reset(emailKey);

	if (input.previousSessionToken) await deleteSession(deps.db, input.previousSessionToken);
	const { token, expiresAt } = await createSession(deps.db, admin.id);
	return {
		ok: true,
		token,
		expiresAt,
		secure: !LOCAL_HOSTS.has(input.hostname)
	};
}
