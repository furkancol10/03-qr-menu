export type CartProduct = {
	id: number;
	nameTr: string;
	nameEn: string | null;
	priceKurus: number;
	available: boolean;
};

export type CartLine = {
	itemId: number;
	nameTr: string;
	nameEn: string | null;
	priceKurus: number;
	qty: number;
};

/** Saf yardımcı: `available === false` ürün asla sepete eklenmez. */
export function addCartItem(lines: CartLine[], product: CartProduct): CartLine[] {
	if (!product.available) return lines;
	const existing = lines.find((l) => l.itemId === product.id);
	if (existing) {
		return lines.map((l) =>
			l.itemId === product.id
				? {
						...l,
						nameTr: product.nameTr,
						nameEn: product.nameEn,
						priceKurus: product.priceKurus,
						qty: Math.min(99, l.qty + 1)
					}
				: l
		);
	}
	return [
		...lines,
		{
			itemId: product.id,
			nameTr: product.nameTr,
			nameEn: product.nameEn,
			priceKurus: product.priceKurus,
			qty: 1
		}
	];
}

export function updateCartQty(lines: CartLine[], itemId: number, qty: number): CartLine[] {
	if (qty <= 0) return lines.filter((l) => l.itemId !== itemId);
	const clamped = Math.min(99, Math.floor(qty));
	return lines.map((l) => (l.itemId === itemId ? { ...l, qty: clamped } : l));
}

export function removeCartItem(lines: CartLine[], itemId: number): CartLine[] {
	return lines.filter((l) => l.itemId !== itemId);
}

/**
 * Sayfa yüklendiğinde localStorage sepetini güncel menü verisiyle eşitler:
 * silinen veya `available === false` olan ürünler ayıklanır, fiyat/ad güncellenir.
 */
export function reconcileCart(lines: CartLine[], products: CartProduct[]): CartLine[] {
	const byId: Record<number, CartProduct> = {};
	for (const p of products) byId[p.id] = p;
	const out: CartLine[] = [];
	for (const line of lines) {
		const fresh = byId[line.itemId];
		if (!fresh || !fresh.available || line.qty <= 0) continue;
		out.push({
			itemId: fresh.id,
			nameTr: fresh.nameTr,
			nameEn: fresh.nameEn,
			priceKurus: fresh.priceKurus,
			qty: Math.min(99, Math.floor(line.qty))
		});
	}
	return out;
}

/** Svelte 5 runes + localStorage destekli reaktif sepet durumu. */
export class MenuCart {
	lines = $state<CartLine[]>([]);
	note = $state('');
	private readonly storageKey: string;

	constructor(slug: string) {
		this.storageKey = `qrmenu:cart:${slug}`;
	}

	get totalCount(): number {
		return this.lines.reduce((acc, l) => acc + l.qty, 0);
	}

	get totalKurus(): number {
		return this.lines.reduce((acc, l) => acc + l.priceKurus * l.qty, 0);
	}

	qtyOf(itemId: number): number {
		return this.lines.find((l) => l.itemId === itemId)?.qty ?? 0;
	}

	hydrate(products: CartProduct[]) {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(this.storageKey);
			if (!raw) return;
			const parsed = JSON.parse(raw) as unknown;
			if (!Array.isArray(parsed)) return;
			const valid: CartLine[] = parsed.filter(
				(x): x is CartLine =>
					typeof x === 'object' &&
					x !== null &&
					typeof (x as CartLine).itemId === 'number' &&
					typeof (x as CartLine).qty === 'number'
			);
			this.lines = reconcileCart(valid, products);
			this.persist();
		} catch {
			// Bozuk depolama verisini yoksay
		}
	}

	private persist() {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.lines));
		} catch {
			// Depolama kotası dolu veya gizli sekme
		}
	}

	add(product: CartProduct): boolean {
		if (!product.available) return false;
		this.lines = addCartItem(this.lines, product);
		this.persist();
		return true;
	}

	setQty(itemId: number, qty: number) {
		this.lines = updateCartQty(this.lines, itemId, qty);
		this.persist();
	}

	increment(product: CartProduct) {
		this.add(product);
	}

	decrement(itemId: number) {
		const cur = this.qtyOf(itemId);
		this.setQty(itemId, cur - 1);
	}

	remove(itemId: number) {
		this.lines = removeCartItem(this.lines, itemId);
		this.persist();
	}

	clear() {
		this.lines = [];
		this.note = '';
		this.persist();
	}
}
