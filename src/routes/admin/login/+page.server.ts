import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { DEMO_ADMIN } from '#lib/demo.ts';
import { handleLoginAttempt } from '#lib/server/auth/login.ts';
import { SESSION_COOKIE } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/db/index.ts';
import { admins } from '#lib/server/db/schema.ts';
import { rateLimiter } from '#lib/server/limiters.ts';
import type { Actions, PageServerLoad } from './$types';

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
		const result = await handleLoginAttempt(
			{
				formData: await request.formData(),
				ip: getClientAddress(),
				hostname: url.hostname,
				previousSessionToken: cookies.get(SESSION_COOKIE)
			},
			{ db, rateLimiter }
		);

		if (!result.ok) {
			return fail(result.status, { email: result.email, message: result.message });
		}

		cookies.set(SESSION_COOKIE, result.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: result.secure,
			expires: result.expiresAt
		});
		redirect(303, '/admin/items');
	}
};
