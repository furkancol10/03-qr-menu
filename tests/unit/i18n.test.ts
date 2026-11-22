import { describe, expect, it } from 'vitest';
import { getDict, pickLocalized } from '../../src/lib/i18n';

describe('Çeviri ve fallback (ARCHITECTURE §9)', () => {
	it('lang=en ve name_en=null ise name_tr döner', () => {
		expect(pickLocalized('en', 'Türk Kahvesi', null)).toBe('Türk Kahvesi');
		expect(pickLocalized('en', 'Türk Kahvesi', undefined)).toBe('Türk Kahvesi');
		expect(pickLocalized('en', 'Türk Kahvesi', '   ')).toBe('Türk Kahvesi');
	});

	it('lang=en ve name_en doluysa name_en döner', () => {
		expect(pickLocalized('en', 'Türk Kahvesi', 'Turkish Coffee')).toBe('Turkish Coffee');
	});

	it('lang=tr iken her zaman Türkçe alanı döner', () => {
		expect(pickLocalized('tr', 'Türk Kahvesi', 'Turkish Coffee')).toBe('Türk Kahvesi');
	});

	it('TR ve EN sözlükleri aynı anahtarlara sahiptir ve boş değildir', () => {
		const tr = getDict('tr');
		const en = getDict('en');
		expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
		expect(tr.soldOut.length).toBeGreaterThan(0);
		expect(en.soldOut.length).toBeGreaterThan(0);
		expect(tr.orderViaWhatsapp).not.toBe(en.orderViaWhatsapp);
	});
});
