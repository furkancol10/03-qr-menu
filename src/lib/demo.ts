export const DEMO_SLUG = 'demo-kafe';

/** Yalnız demo: giriş sayfasında hazır doldurulur. Müşteri kurulumunda seed'den kaldırılır. */
export const DEMO_ADMIN = {
	email: 'demo@defnekafe.example',
	password: 'demo-1234'
} as const;

export type DemoImage = {
	url: string;
	label: string;
};

/** Demo işletmede seçilebilen hazır görseller (`static/demo/*.webp`). */
export const DEMO_GALLERY: readonly DemoImage[] = [
	{ url: '/demo/turk-kahvesi.webp', label: 'Türk Kahvesi' },
	{ url: '/demo/flat-white.webp', label: 'Flat White' },
	{ url: '/demo/filtre-kahve.webp', label: 'Filtre Kahve' },
	{ url: '/demo/chai-latte.webp', label: 'Chai Latte' },
	{ url: '/demo/buzlu-latte.webp', label: 'Buzlu Latte' },
	{ url: '/demo/limonata.webp', label: 'Limonata' },
	{ url: '/demo/cold-brew.webp', label: 'Cold Brew' },
	{ url: '/demo/smoothie.webp', label: 'Smoothie' },
	{ url: '/demo/kruvasan.webp', label: 'Kruvasan' },
	{ url: '/demo/cheesecake.webp', label: 'Cheesecake' },
	{ url: '/demo/brownie.webp', label: 'Brownie' },
	{ url: '/demo/limonlu-tart.webp', label: 'Limonlu Tart' },
	{ url: '/demo/avokado-tost.webp', label: 'Avokado Tost' },
	{ url: '/demo/peynirli-tost.webp', label: 'Peynirli Tost' },
	{ url: '/demo/granola.webp', label: 'Granola Kasesi' },
	{ url: '/demo/salata.webp', label: 'Akdeniz Salata' }
] as const;

export const DEMO_GALLERY_URLS = new Set<string>(DEMO_GALLERY.map((g) => g.url));
