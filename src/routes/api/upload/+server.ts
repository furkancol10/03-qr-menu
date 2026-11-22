import { eq } from 'drizzle-orm';
import { uploadItemImage } from '#lib/server/blob/upload.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import { UPLOAD_LIMIT, rateLimiter, uploadKey } from '#lib/server/limiters.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.admin) {
		return Response.json({ error: 'Oturum gerekli.' }, { status: 401 });
	}

	const [business] = await db
		.select({ id: businesses.id, slug: businesses.slug, settings: businesses.settings })
		.from(businesses)
		.where(eq(businesses.id, locals.admin.businessId));

	if (!business) {
		return Response.json({ error: 'İşletme bulunamadı.' }, { status: 404 });
	}

	const allowed = await rateLimiter.hit(uploadKey(business.id), UPLOAD_LIMIT);
	if (!allowed) {
		return Response.json(
			{ error: 'Çok fazla yükleme denemesi. Lütfen biraz sonra tekrar deneyin.' },
			{ status: 429 }
		);
	}

	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) {
		return Response.json({ error: 'Görsel dosyası gerekli.' }, { status: 400 });
	}

	const result = await uploadItemImage(business, file);
	if (!result.ok) {
		return Response.json({ error: result.message }, { status: result.status });
	}
	return Response.json({ url: result.url });
};
