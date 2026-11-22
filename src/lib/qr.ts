import QRCode from 'qrcode';

/** İşletme menü bağlantısı: `/{slug}` veya `/{slug}?masa={code}`. */
export function menuTableUrl(origin: string, slug: string, tableCode?: string): string {
	const base = origin.replace(/\/+$/, '');
	const path = `${base}/${encodeURIComponent(slug)}`;
	if (!tableCode) return path;
	return `${path}?masa=${encodeURIComponent(tableCode)}`;
}

/** Baskıya uygun keskin vektörel SVG QR kodu üretir. */
export async function generateQrSvg(url: string): Promise<string> {
	return QRCode.toString(url, {
		type: 'svg',
		errorCorrectionLevel: 'M',
		margin: 1,
		color: { dark: '#1c1917', light: '#ffffff' }
	});
}

/** İndirilebilir PNG veri URL'i üretir (512px yüksek çözünürlük). */
export async function generateQrPngDataUrl(url: string): Promise<string> {
	return QRCode.toDataURL(url, {
		type: 'image/png',
		width: 512,
		margin: 2,
		errorCorrectionLevel: 'M',
		color: { dark: '#1c1917', light: '#ffffff' }
	});
}
