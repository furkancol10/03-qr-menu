import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { DEMO_ADMIN } from '#lib/demo.ts';
import { authenticate, normalizeEmail } from '#lib/server/auth/password.ts';
import { SESSION_COOKIE, createSession, deleteSession } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/db/index.ts';
import { admins } from '#lib/server/db/schema.ts';
import {
	LOGIN_EMAIL_LIMIT,
	LOGIN_IP_LIMIT,
	loginEmailKey,
	loginIpKey,
	rateLimiter
} from '#lib/server/limiters.ts';
import { formStrings, loginSchema } from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.admin) redirect(303, '/admin/items');
	const [demo] = await db
		.select({ id: admins.id })
		.from(admins)
		.where(eq(admins.email, DEMO_ADMIN.email));
	return { demo: demo ? DEMO_ADMIN : null };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const ip = getClientAddress();
		const fields = formStrings(await request.formData());
		const email = fields.email ?? '';
		const parsed = loginSchema.safeParse(fields);

		const emailKey = parsed.success ? loginEmailKey(normalizeEmail(parsed.data.email)) : null;
		const allowed =
			(await rateLimiter.hit(loginIpKey(ip), LOGIN_IP_LIMIT)) &&
			(!emailKey || (await rateLimiter.hit(emailKey, LOGIN_EMAIL_LIMIT)));
		if (!allowed) {
			return fail(429, {
				email,
				message: 'Çok fazla deneme. Lütfen 15 dakika sonra tekrar deneyin.'
			});
		}

		const admin = parsed.success
			? await authenticate(db, parsed.data.email, parsed.data.password)
			: null;
		if (!admin) return fail(400, { email, message: 'E-posta veya şifre hatalı.' });

		if (emailKey) await rateLimiter.reset(emailKey);

		const previous = cookies.get(SESSION_COOKIE);
		if (previous) await deleteSession(db, previous);
		const { token, expiresAt } = await createSession(db, admin.id);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !LOCAL_HOSTS.has(url.hostname),
			expires: expiresAt
		});
		redirect(303, '/admin/items');
	}
};
