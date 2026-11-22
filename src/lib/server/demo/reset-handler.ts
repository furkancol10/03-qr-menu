import { timingSafeEqual } from 'node:crypto';
import type { Db } from '../db/client';
import { resetDemo } from './seed';

const unauthorized = () => new Response('unauthorized', { status: 401 });

/** Sabit sürede karşılaştırma (iki taraf 256 baytlık sabit tampona yazılır; tampondan uzun değerler reddedilir). */
function safeEqual(a: string, b: string): boolean {
	const x = Buffer.alloc(256);
	const y = Buffer.alloc(256);
	x.write(a);
	y.write(b);
	return timingSafeEqual(x, y) && a.length === b.length && Buffer.byteLength(a) <= 256;
}

/**
 * Gece demo sıfırlama (GitHub Actions cron). Başlık: `x-demo-reset-secret`; değer ortamdaki
 * DEMO_RESET_SECRET ile eşleşmeli. Yalnız demo kafeyi (slug: demo-kafe) yeniden kurar.
 */
export async function handleDemoResetPost(
	request: Request,
	deps: { db: Db; expectedSecret?: string }
): Promise<Response> {
	const expected = deps.expectedSecret;
	const given = request.headers.get('x-demo-reset-secret');
	if (!expected || !given || !safeEqual(given, expected)) return unauthorized();
	const business = await resetDemo(deps.db);
	return Response.json({ ok: true, slug: business.slug });
}
