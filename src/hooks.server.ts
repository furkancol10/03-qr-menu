import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, validateSession } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/db/index.ts';

const LOGIN_PATH = '/admin/login';

/**
 * /admin altı oturum ister (giriş sayfası hariç). Form eylemleri layout load'larından geçmediği
 * için koruma burada ve ayrıca her eylemde `requireAdmin` ile uygulanır.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = null;
	const path = event.url.pathname;
	const isAdminPath = path === '/admin' || path.startsWith('/admin/');
	const isUploadPath = path === '/api/upload';

	if (!isAdminPath && !isUploadPath) return resolve(event);

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		event.locals.admin = await validateSession(db, token);
		if (!event.locals.admin) event.cookies.delete(SESSION_COOKIE, { path: '/' });
	}
	event.setHeaders({ 'cache-control': 'private, no-store' });

	if (isAdminPath && !event.locals.admin && path !== LOGIN_PATH) {
		return new Response(null, { status: 303, headers: { location: LOGIN_PATH } });
	}
	return resolve(event);
};
