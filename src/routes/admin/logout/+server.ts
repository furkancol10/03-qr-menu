import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSession } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await deleteSession(db, token);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/admin/login');
};
