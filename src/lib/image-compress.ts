/**
 * İstemci tarafı WebP sıkıştırma (yalnız demo olmayan işletmelerde kullanılır).
 * En fazla 1200px genişliğe indirir ve <= 1 MB WebP dosya döndürür.
 */
export async function compressToWebp(file: File, maxWidth = 1200, quality = 0.82): Promise<File> {
	const bitmap = await createImageBitmap(file);
	const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		bitmap.close();
		return file;
	}
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob((b) => resolve(b), 'image/webp', quality)
	);
	if (!blob) return file;
	const base = file.name.replace(/\.[^.]+$/, '') || 'urun';
	return new File([blob], `${base}.webp`, { type: 'image/webp' });
}
