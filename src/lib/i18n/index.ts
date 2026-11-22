import { en } from './en';
import { tr, type Dict } from './tr';

export type Lang = 'tr' | 'en';

export const ALLERGEN_KEYS = ['gluten', 'sut', 'yumurta', 'kuruyemis', 'soya', 'susam'] as const;
export type AllergenKey = (typeof ALLERGEN_KEYS)[number];

export function getDict(lang: Lang): Dict {
	return lang === 'en' ? en : tr;
}

/** Veritabanı TR/EN satır içi çeviri seçici: EN boş/null ise TR'ye düşer. */
export function pickLocalized(
	lang: Lang,
	trText: string | null | undefined,
	enText: string | null | undefined
): string {
	const fallback = (trText ?? '').trim();
	if (lang === 'en') {
		const candidate = (enText ?? '').trim();
		if (candidate.length > 0) return candidate;
	}
	return fallback;
}

export function allergenLabel(lang: Lang, key: string): string {
	const dict = getDict(lang);
	return dict.allergens[key] ?? key;
}
