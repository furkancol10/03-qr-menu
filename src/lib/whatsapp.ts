import { getDict, pickLocalized, type Lang } from './i18n';
import { normalizeTrPhone } from './phone';
import type { CartLine } from './cart.svelte';

/** Kuruş → Türkçe TL biçimi: 29100 → "291,00 TL", 8550 → "85,50 TL". */
export function formatPriceTl(kurus: number): string {
	const safe = Number.isFinite(kurus) ? Math.max(0, Math.round(kurus)) : 0;
	const lira = Math.floor(safe / 100);
	const rem = safe % 100;
	const liraStr = lira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return `${liraStr},${String(rem).padStart(2, '0')} TL`;
}

/** wa.me için yalnız rakam, ülke kodlu numara: "+905551234567" / "0555 123 45 67" → "905551234567". */
export function whatsappDigits(phone: string): string {
	let d = phone.replace(/\D/g, '');
	if (d.startsWith('0090')) d = d.slice(2);
	else if (d.startsWith('0')) d = '90' + d.slice(1);
	return d;
}

/** Yazma anı: işletme telefonu → wa.me rakamı ("905551234567"); TR cep numarası değilse null. */
export function businessPhoneDigits(input: string): string | null {
	const n = normalizeTrPhone(input);
	return n ? n.slice(1) : null;
}

export type WhatsAppOrderInput = {
	phone: string | null | undefined;
	businessName: string;
	tableLabel: string | null;
	lang: Lang;
	lines: CartLine[];
	note?: string;
};

export function cartTotalKurus(lines: CartLine[]): number {
	return lines.reduce((sum, line) => sum + line.priceKurus * line.qty, 0);
}

/** Sipariş kalemleri, masa ve TL toplamından WhatsApp mesaj gövdesi üretir. */
export function buildOrderMessage(input: Omit<WhatsAppOrderInput, 'phone'>): string {
	const d = getDict(input.lang);
	const rows: string[] = [];
	rows.push(`${d.orderGreeting} ${input.businessName},`);
	if (input.tableLabel) {
		rows.push(`${d.orderTableLine}: ${input.tableLabel}`);
	}
	rows.push('');
	for (const line of input.lines) {
		const name = pickLocalized(input.lang, line.nameTr, line.nameEn);
		const lineTotal = formatPriceTl(line.priceKurus * line.qty);
		rows.push(`- ${line.qty}x ${name} (${lineTotal})`);
	}
	rows.push('');
	rows.push(`${d.orderTotalLine}: ${formatPriceTl(cartTotalKurus(input.lines))}`);
	const cleanNote = input.note?.trim();
	if (cleanNote) {
		rows.push(`${d.orderNoteLine}: ${cleanNote}`);
	}
	return rows.join('\n');
}

/**
 * Geçerli telefon ve en az 1 ürün varsa `https://wa.me/{phone}?text=...` üretir; yoksa null.
 */
export function buildWhatsAppOrderUrl(input: WhatsAppOrderInput): string | null {
	if (input.lines.length === 0) return null;
	const digits = input.phone ? whatsappDigits(input.phone) : '';
	if (!/^[1-9]\d{9,14}$/.test(digits)) return null;
	const text = buildOrderMessage(input);
	return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
