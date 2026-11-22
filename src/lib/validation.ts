import { z } from 'zod';
import { ALLERGEN_KEYS } from './i18n';

const INT4_MAX = 2_147_483_647;

/** "85,50" / "120" / "120.5" → kuruş (8550, 12000, 12050); geçersizse null. */
export function parseTlToKurus(input: string): number | null {
	const m = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(input.trim());
	if (!m) return null;
	return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
}

/** Kuruş → admin form düzenleme metni: 8550 → "85,50". */
export function kurusToInputTl(kurus: number): string {
	const lira = Math.floor(kurus / 100);
	const rem = kurus % 100;
	return `${lira},${String(rem).padStart(2, '0')}`;
}

/** Yalnız `/demo/*.webp` veya `https://` görsel adreslerine izin verir. */
export function isSafeImageUrl(url: string): boolean {
	const trimmed = url.trim();
	if (!trimmed) return true;
	if (/^\/demo\/[a-z0-9-]+\.webp$/.test(trimmed)) return true;
	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

export function formStrings(fd: FormData): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
	return out;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
	return out;
}

const optText = (max: number, label: string) =>
	z
		.string()
		.trim()
		.max(max, `${label} en fazla ${max} karakter olabilir`)
		.transform((v) => (v.length > 0 ? v : null))
		.optional()
		.default(null);

const sortInt = z
	.string()
	.trim()
	.optional()
	.default('0')
	.transform((v) => (v === '' ? 0 : Number(v)))
	.pipe(
		z
			.number({ error: 'Sıra tam sayı olmalı' })
			.int('Sıra tam sayı olmalı')
			.min(0, 'Sıra 0 veya büyük olmalı')
			.max(9999, 'Sıra en fazla 9999 olabilir')
	);

export const positiveId = z
	.string()
	.trim()
	.regex(/^\d{1,10}$/, 'Geçersiz kimlik')
	.transform(Number)
	.pipe(z.number().int().min(1).max(INT4_MAX));

export const loginSchema = z.object({
	email: z.string().trim().min(3, 'E-posta girin').max(200),
	password: z.string().min(1, 'Şifre girin').max(200)
});

export const categorySchema = z.object({
	nameTr: z
		.string()
		.trim()
		.min(2, 'Kategori adı (TR) en az 2 karakter olmalı')
		.max(80, 'Kategori adı en fazla 80 karakter olabilir'),
	nameEn: optText(80, 'Kategori adı (EN)'),
	sortOrder: sortInt,
	active: z.literal('on').optional()
});

export const itemSchema = z.object({
	categoryId: positiveId,
	nameTr: z
		.string()
		.trim()
		.min(2, 'Ürün adı (TR) en az 2 karakter olmalı')
		.max(100, 'Ürün adı en fazla 100 karakter olabilir'),
	nameEn: optText(100, 'Ürün adı (EN)'),
	descTr: optText(300, 'Açıklama (TR)'),
	descEn: optText(300, 'Açıklama (EN)'),
	price: z.string().transform((v, ctx) => {
		const k = parseTlToKurus(v);
		if (k === null) {
			ctx.addIssue({ code: 'custom', message: 'Geçerli bir tutar girin (örn. 85,50 veya 120)' });
			return z.NEVER;
		}
		return k;
	}),
	imageUrl: z
		.string()
		.trim()
		.max(500, 'Görsel adresi çok uzun')
		.refine(isSafeImageUrl, 'Görsel adresi geçerli bir HTTPS URL veya hazır galeri olmalı')
		.transform((v) => (v.length > 0 ? v : null))
		.optional()
		.default(null),
	sortOrder: sortInt,
	available: z.literal('on').optional()
});

export const tableSchema = z.object({
	code: z
		.string()
		.trim()
		.min(1, 'Masa kodu girin (örn. 5 veya bahce-1)')
		.max(30, 'Masa kodu en fazla 30 karakter olabilir')
		.regex(/^[a-zA-Z0-9_-]+$/, 'Masa kodu yalnız harf, rakam, tire ve alt çizgi içerebilir'),
	label: z
		.string()
		.trim()
		.min(1, 'Masa etiketi girin (örn. Masa 5)')
		.max(60, 'Masa etiketi en fazla 60 karakter olabilir'),
	active: z.literal('on').optional()
});

const ALLOWED_ALLERGENS = new Set<string>(ALLERGEN_KEYS);

export function parseAllergens(values: FormDataEntryValue[]): string[] {
	const out: string[] = [];
	for (const v of values) {
		if (typeof v === 'string' && ALLOWED_ALLERGENS.has(v) && !out.includes(v)) {
			out.push(v);
		}
	}
	return out;
}
