import type { SessionAdmin } from '#lib/server/auth/session.ts';

declare global {
	namespace App {
		interface Locals {
			/** Yalnız /admin ve /api/upload yollarında doldurulur; geçerli oturum yoksa null */
			admin: SessionAdmin | null;
		}
	}
}

export {};
