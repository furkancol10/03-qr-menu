import { describe, expect, it } from 'vitest';
import { generateQrPngDataUrl, generateQrSvg, menuTableUrl } from '../../src/lib/qr';
import { isSafeImageUrl, parseTlToKurus } from '../../src/lib/validation';

describe('QR üretimi ve doğrulama yardımcıları', () => {
	it('masa kodlu QR URL üretir ve özel karakterleri kodlar', () => {
		expect(menuTableUrl('https://menu.example/', 'demo-kafe', '5')).toBe(
			'https://menu.example/demo-kafe?masa=5'
		);
		expect(menuTableUrl('https://menu.example', 'demo-kafe', 'bahce 1')).toBe(
			'https://menu.example/demo-kafe?masa=bahce%201'
		);
		expect(menuTableUrl('https://menu.example', 'demo-kafe')).toBe(
			'https://menu.example/demo-kafe'
		);
	});

	it('vektörel SVG ve PNG data URL üretir', async () => {
		const url = menuTableUrl('https://menu.example', 'demo-kafe', '5');
		const svg = await generateQrSvg(url);
		expect(svg).toContain('<svg');
		expect(svg).toContain('</svg>');

		const png = await generateQrPngDataUrl(url);
		expect(png.startsWith('data:image/png;base64,')).toBe(true);
	});

	it('TL metnini kuruşa çevirir, geçersiz değerde null döner', () => {
		expect(parseTlToKurus('85,50')).toBe(8550);
		expect(parseTlToKurus('120')).toBe(12000);
		expect(parseTlToKurus('120.5')).toBe(12050);
		expect(parseTlToKurus('-10')).toBeNull();
		expect(parseTlToKurus('abc')).toBeNull();
	});

	it('yalnız güvenli görsel URL yollarına izin verir', () => {
		expect(isSafeImageUrl('/demo/turk-kahvesi.webp')).toBe(true);
		expect(isSafeImageUrl('https://blob.vercel-storage.com/menu/a.webp')).toBe(true);
		expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
		expect(isSafeImageUrl('http://insecure.example/a.jpg')).toBe(false);
		expect(isSafeImageUrl('data:text/html,<script>')).toBe(false);
	});
});
