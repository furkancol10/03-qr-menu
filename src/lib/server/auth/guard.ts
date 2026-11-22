import { redirect } from '@sveltejs/kit';
import type { SessionAdmin } from './session';

/**
 * Admin eylemlerinin ilk satırı: hooks atlansa bile oturumsuz çağrı çalışmaz.
 * Dönen `businessId` her sorguya verilir; formdan gelen işletme id'sine asla güvenilmez.
 */
export function requireAdmin(locals: App.Locals): SessionAdmin {
	if (!locals.admin) redirect(303, '/admin/login');
	return locals.admin;
}
