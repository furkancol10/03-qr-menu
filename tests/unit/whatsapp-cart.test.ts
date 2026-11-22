import { describe, expect, it } from 'vitest';
import {
	addCartItem,
	reconcileCart,
	removeCartItem,
	updateCartQty,
	type CartLine,
	type CartProduct
} from '../../src/lib/cart.svelte';
import { buildWhatsAppOrderUrl, formatPriceTl } from '../../src/lib/whatsapp';

const lemonade: CartProduct = {
	id: 1,
	nameTr: 'Ev Yapımı Limonata',
	nameEn: 'Homemade Lemonade',
	priceKurus: 8550,
	available: true
};

const chai: CartProduct = {
	id: 2,
	nameTr: 'Baharatlı Chai Latte',
	nameEn: 'Spiced Chai Latte',
	priceKurus: 12000,
	available: true
};

const soldOutTart: CartProduct = {
	id: 3,
	nameTr: 'Limonlu Tart',
	nameEn: 'Lemon Tart',
	priceKurus: 16000,
	available: false
};

describe('Sepet ve WhatsApp sipariş bağlantısı (ARCHITECTURE §9)', () => {
	it('kuruş tutarını Türkçe TL biçiminde formatlar', () => {
		expect(formatPriceTl(29100)).toBe('291,00 TL');
		expect(formatPriceTl(8550)).toBe('85,50 TL');
		expect(formatPriceTl(0)).toBe('0,00 TL');
	});

	it('2×8550 + 1×12000 kuruş ve masa=5 için 291,00 TL içeren encoded wa.me linki üretir', () => {
		let lines: CartLine[] = [];
		lines = addCartItem(lines, lemonade);
		lines = addCartItem(lines, lemonade);
		lines = addCartItem(lines, chai);

		const url = buildWhatsAppOrderUrl({
			phone: '905551234567',
			businessName: 'Defne Kafe & Fırın',
			tableLabel: 'Masa 5',
			lang: 'tr',
			lines
		});

		expect(url).not.toBeNull();
		expect(url!.startsWith('https://wa.me/905551234567?text=')).toBe(true);

		const decoded = decodeURIComponent(url!.split('?text=')[1]);
		expect(decoded).toContain('Masa 5');
		expect(decoded).toContain('2x Ev Yapımı Limonata');
		expect(decoded).toContain('1x Baharatlı Chai Latte');
		expect(decoded).toContain('291,00 TL');
	});

	it('available=false ürün sepete eklenemez', () => {
		const initial: CartLine[] = [];
		const next = addCartItem(initial, soldOutTart);
		expect(next).toHaveLength(0);
	});

	it('tükenen ürünler menü yenilendiğinde sepetten ayıklanır', () => {
		let lines: CartLine[] = [];
		lines = addCartItem(lines, lemonade);
		lines = addCartItem(lines, chai);

		const updatedMenu: CartProduct[] = [{ ...lemonade, available: false }, chai];
		const cleaned = reconcileCart(lines, updatedMenu);
		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].itemId).toBe(chai.id);
	});

	it('adet güncelleme 0 veya altına inince kalemi kaldırır', () => {
		let lines = addCartItem([], lemonade);
		lines = updateCartQty(lines, lemonade.id, 3);
		expect(lines[0].qty).toBe(3);

		lines = updateCartQty(lines, lemonade.id, 0);
		expect(lines).toHaveLength(0);

		lines = addCartItem([], chai);
		lines = removeCartItem(lines, chai.id);
		expect(lines).toHaveLength(0);
	});

	it('geçersiz veya boş telefonda wa.me bağlantısı üretmez', () => {
		const lines = addCartItem([], lemonade);
		expect(
			buildWhatsAppOrderUrl({
				phone: 'abc',
				businessName: 'Defne',
				tableLabel: 'Masa 5',
				lang: 'tr',
				lines
			})
		).toBeNull();
		expect(
			buildWhatsAppOrderUrl({
				phone: '905551234567',
				businessName: 'Defne',
				tableLabel: 'Masa 5',
				lang: 'tr',
				lines: []
			})
		).toBeNull();
	});
});
