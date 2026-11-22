import { put } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { DEMO_GALLERY_URLS, DEMO_SLUG } from '../../demo';
import { isSafeImageUrl } from '../../validation';
import type { Db } from '../db/client';
import { businesses, type BusinessSettings } from '../db/schema';
import { UPLOAD_LIMIT, uploadKey, type RateLimiter } from '../rate-limit';

export const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB
const ALLOWED_MIME = new Set(['image/webp', 'image/jpeg', 'image/png']);

export type BlobPutFn = (
	pathname: string,
	body: File,
	options: { access: 'public'; contentType: string; token: string }
) => Promise<{ url: string }>;

export type UploadOptions = {
	token?: string;
	putBlob?: BlobPutFn;
};

type BusinessLike = {
	slug: string;
	settings?: BusinessSettings | null;
};

/** Demo işletme tespiti (slug veya settings.isDemo). */
export function isDemoBusiness(business: BusinessLike): boolean {
	return business.slug === DEMO_SLUG || business.settings?.isDemo === true;
}

/**
 * Şart #1: Demo işletmede görsel yükleme KAPALIDIR; yalnız demo olmayan işletmelerde açıktır.
 */
export function canUploadImages(business: BusinessLike): boolean {
	return !isDemoBusiness(business);
}

/**
 * Ürün kaydederken görsel adresi doğrulaması:
 * - Demo işletme: yalnız `static/demo/` hazır galerisi veya boş (null).
 * - Gerçek işletme: boş, `/demo/...` veya güvenli `https://` URL.
 */
export function validateImageForBusiness(
	business: BusinessLike,
	imageUrl: string | null | undefined
): { ok: true; url: string | null } | { ok: false; message: string } {
	const clean = imageUrl?.trim() ?? '';
	if (!clean) return { ok: true, url: null };

	if (isDemoBusiness(business)) {
		if (DEMO_GALLERY_URLS.has(clean)) return { ok: true, url: clean };
		return {
			ok: false,
			message: 'Demo işletmede yalnızca hazır galerideki görseller seçilebilir.'
		};
	}

	if (!isSafeImageUrl(clean)) {
		return { ok: false, message: 'Görsel adresi geçerli bir HTTPS URL olmalıdır.' };
	}
	return { ok: true, url: clean };
}

export async function uploadItemImage(
	business: BusinessLike & { id: number },
	file: File,
	options: UploadOptions = {}
): Promise<{ ok: true; url: string } | { ok: false; status: number; message: string }> {
	const token = options.token ?? process.env.BLOB_READ_WRITE_TOKEN;
	const putBlob: BlobPutFn = options.putBlob ?? put;

	if (!canUploadImages(business)) {
		return { ok: false, status: 403, message: 'Demo işletmede görsel yükleme kapalıdır.' };
	}
	if (!ALLOWED_MIME.has(file.type)) {
		return {
			ok: false,
			status: 400,
			message: 'Yalnız WebP, JPEG veya PNG görselleri yüklenebilir.'
		};
	}
	if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
		return { ok: false, status: 400, message: 'Görsel boyutu en fazla 1 MB olabilir.' };
	}
	if (!token) {
		return {
			ok: false,
			status: 503,
			message: 'Görsel depolama (Vercel Blob) bu ortamda yapılandırılmamış.'
		};
	}

	const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
	const safePath = `menu/${business.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
	const blob = await putBlob(safePath, file, {
		access: 'public',
		contentType: file.type,
		token
	});
	return { ok: true, url: blob.url };
}

export async function handleUploadPost(
	event: { locals: App.Locals; request: Request },
	deps: { db: Db; rateLimiter: RateLimiter; token?: string; putBlob?: BlobPutFn }
): Promise<Response> {
	if (!event.locals.admin) {
		return Response.json({ error: 'Oturum gerekli.' }, { status: 401 });
	}

	const [business] = await deps.db
		.select({ id: businesses.id, slug: businesses.slug, settings: businesses.settings })
		.from(businesses)
		.where(eq(businesses.id, event.locals.admin.businessId));

	if (!business) {
		return Response.json({ error: 'İşletme bulunamadı.' }, { status: 404 });
	}

	if (!canUploadImages(business)) {
		return Response.json({ error: 'Demo işletmede görsel yükleme kapalıdır.' }, { status: 403 });
	}

	const allowed = await deps.rateLimiter.hit(uploadKey(business.id), UPLOAD_LIMIT);
	if (!allowed) {
		return Response.json(
			{ error: 'Çok fazla yükleme denemesi. Lütfen biraz sonra tekrar deneyin.' },
			{ status: 429 }
		);
	}

	const formData = await event.request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) {
		return Response.json({ error: 'Görsel dosyası gerekli.' }, { status: 400 });
	}

	const result = await uploadItemImage(business, file, {
		token: deps.token,
		putBlob: deps.putBlob
	});
	if (!result.ok) {
		return Response.json({ error: result.message }, { status: result.status });
	}
	return Response.json({ url: result.url });
}
