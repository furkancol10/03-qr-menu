/** Türkiye cep telefonunu "+905XXXXXXXXX" biçimine çevirir; geçersizse null. */
export function normalizeTrPhone(input: string): string | null {
	if (!/^[\d\s()+.-]+$/.test(input)) return null;
	const plus = input.trim().startsWith('+');
	if (input.includes('+') && !plus) return null;
	let digits = input.replace(/\D/g, '');
	if (plus) {
		if (!digits.startsWith('90')) return null;
		digits = digits.slice(2);
	} else if (digits.startsWith('0090') && digits.length === 14) digits = digits.slice(4);
	else if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
	else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
	return /^5\d{9}$/.test(digits) ? `+90${digits}` : null;
}
