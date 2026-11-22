<script lang="ts">
	import { onMount } from 'svelte';
	import { MenuCart, reconcileCart } from '#lib/cart.svelte.ts';
	import { allergenLabel, getDict, pickLocalized, type Lang } from '#lib/i18n/index.ts';
	import { buildWhatsAppOrderUrl, formatPriceTl } from '#lib/whatsapp.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let lang = $state<Lang>('tr');
	let cartOpen = $state(false);
	let selectedTableCode = $derived(data.activeTable?.code ?? '');

	const dict = $derived(getDict(lang));
	const allItems = $derived(data.categories.flatMap((c) => c.items));
	const cart = $derived(new MenuCart(data.business.slug));

	const effectiveTable = $derived(
		data.tables.find((t) => t.code === selectedTableCode) ?? data.activeTable ?? null
	);

	const validLines = $derived(reconcileCart(cart.lines, allItems));

	onMount(() => {
		try {
			const savedLang = localStorage.getItem('qrmenu:lang');
			if (savedLang === 'en' || savedLang === 'tr') lang = savedLang;
		} catch {
			// ignore storage error
		}
		cart.hydrate(allItems);
	});

	async function syncCartWithServer() {
		if (cart.lines.length === 0) return;
		try {
			const res = await fetch('/api/order-link', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					slug: data.business.slug,
					tableCode: effectiveTable?.code ?? null,
					lang,
					items: cart.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
					note: cart.note
				})
			});
			const payload = (await res.json()) as { unavailableItemIds?: number[] };
			if (Array.isArray(payload.unavailableItemIds)) {
				for (const id of payload.unavailableItemIds) {
					cart.remove(id);
				}
			}
		} catch {
			// Ağ hatasında yerel sepet korunur
		}
	}

	function openCart() {
		cartOpen = true;
		void syncCartWithServer();
	}

	function toggleLang() {
		lang = lang === 'tr' ? 'en' : 'tr';
		try {
			localStorage.setItem('qrmenu:lang', lang);
		} catch {
			// ignore
		}
	}

	const whatsappUrl = $derived(
		buildWhatsAppOrderUrl({
			phone: data.business.whatsappPhone,
			businessName: data.business.name,
			tableLabel: effectiveTable?.label ?? null,
			lang,
			lines: validLines,
			note: cart.note
		})
	);

	const subtitle = $derived(
		pickLocalized(lang, data.business.settings?.subtitleTr, data.business.settings?.subtitleEn)
	);
</script>

<svelte:head>
	<title>{data.business.name} — QR Menü</title>
</svelte:head>

<div class="min-h-dvh bg-stone-50 pb-28 text-stone-900">
	<!-- Üst başlık -->
	<header class="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
		<div class="mx-auto max-w-lg px-3 pt-3 pb-2">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<h1 class="truncate text-lg font-bold tracking-tight text-stone-900">
						{data.business.name}
					</h1>
					{#if subtitle}
						<p class="truncate text-xs text-stone-500">{subtitle}</p>
					{/if}
				</div>

				<div class="flex shrink-0 items-center gap-2">
					{#if effectiveTable}
						<span
							data-testid="table-badge"
							class="inline-flex min-h-9 items-center rounded-full bg-amber-100 px-3 text-xs font-semibold text-amber-900"
						>
							{effectiveTable.label}
						</span>
					{/if}
					<button
						type="button"
						data-testid="lang-toggle"
						onclick={toggleLang}
						aria-label="Dil değiştir / Switch language"
						class="inline-flex min-h-9 min-w-11 items-center justify-center rounded-full border border-stone-300 bg-white px-3 text-xs font-bold text-stone-800 active:bg-stone-100"
					>
						{dict.switchLang}
					</button>
				</div>
			</div>

			{#if !effectiveTable && data.tables.length > 0}
				<div class="mt-2 flex items-center gap-2">
					<label class="sr-only" for="table-select">{dict.selectTable}</label>
					<select
						id="table-select"
						bind:value={selectedTableCode}
						class="min-h-9 w-full rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-xs font-medium text-amber-950"
					>
						<option value="">{dict.selectTable}</option>
						{#each data.tables as t (t.id)}
							<option value={t.code}>{t.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Kategori çubuğu -->
			{#if data.categories.length > 0}
				<nav aria-label="Kategoriler" class="-mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1">
					{#each data.categories as cat (cat.id)}
						<a
							href="#cat-{cat.id}"
							class="inline-flex min-h-8 shrink-0 items-center rounded-full border border-stone-200 bg-stone-100 px-3 text-xs font-medium text-stone-800 active:bg-amber-800 active:text-white"
						>
							{pickLocalized(lang, cat.nameTr, cat.nameEn)}
						</a>
					{/each}
				</nav>
			{/if}
		</div>
	</header>

	<!-- Menü listesi -->
	<main class="mx-auto max-w-lg space-y-6 px-3 pt-4">
		{#each data.categories as cat (cat.id)}
			<section id="cat-{cat.id}" class="scroll-mt-32 space-y-2.5">
				<h2 class="text-base font-bold text-stone-900">
					{pickLocalized(lang, cat.nameTr, cat.nameEn)}
				</h2>

				{#if cat.items.length === 0}
					<p class="rounded-xl border border-dashed border-stone-300 p-4 text-xs text-stone-500">
						{dict.emptyCategory}
					</p>
				{:else}
					<div class="space-y-2.5">
						{#each cat.items as item (item.id)}
							{@const qty = cart.qtyOf(item.id)}
							{@const itemName = pickLocalized(lang, item.nameTr, item.nameEn)}
							{@const itemDesc = pickLocalized(lang, item.descTr, item.descEn)}
							<article
								data-testid="menu-item-{item.id}"
								class="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-xs {item.available
									? ''
									: 'opacity-65'}"
							>
								{#if item.imageUrl}
									<img
										src={item.imageUrl}
										alt={itemName}
										loading="lazy"
										decoding="async"
										width="96"
										height="72"
										class="h-20 w-24 shrink-0 rounded-xl bg-stone-100 object-cover"
									/>
								{/if}

								<div class="flex min-w-0 flex-1 flex-col justify-between gap-2">
									<div>
										<div class="flex items-start justify-between gap-2">
											<h3 class="text-sm leading-snug font-semibold text-stone-900">
												{itemName}
											</h3>
											{#if !item.available}
												<span
													class="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800"
												>
													{dict.soldOut}
												</span>
											{/if}
										</div>

										{#if itemDesc}
											<p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-stone-500">
												{itemDesc}
											</p>
										{/if}

										{#if item.allergens.length > 0}
											<div class="mt-1.5 flex flex-wrap gap-1">
												{#each item.allergens as a (a)}
													<span
														class="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600"
													>
														{allergenLabel(lang, a)}
													</span>
												{/each}
											</div>
										{/if}
									</div>

									<div class="flex items-center justify-between gap-2 pt-1">
										<span class="text-sm font-bold text-amber-900">
											{formatPriceTl(item.priceKurus)}
										</span>

										{#if !item.available}
											<button
												type="button"
												disabled
												data-testid="add-item-{item.id}"
												class="min-h-9 cursor-not-allowed rounded-xl bg-stone-200 px-3 text-xs font-semibold text-stone-500"
											>
												{dict.soldOut}
											</button>
										{:else if qty > 0}
											<div class="flex items-center gap-1.5">
												<button
													type="button"
													aria-label="{dict.decrease} {itemName}"
													onclick={() => cart.decrement(item.id)}
													class="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-bold text-stone-800 active:bg-stone-100"
												>
													−
												</button>
												<span class="min-w-6 text-center text-sm font-bold">{qty}</span>
												<button
													type="button"
													aria-label="{dict.increase} {itemName}"
													onclick={() => cart.increment(item)}
													class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-800 text-sm font-bold text-white active:bg-amber-900"
												>
													+
												</button>
											</div>
										{:else}
											<button
												type="button"
												data-testid="add-item-{item.id}"
												onclick={() => cart.add(item)}
												class="min-h-9 rounded-xl bg-amber-800 px-3.5 text-xs font-semibold text-white active:bg-amber-900"
											>
												+ {dict.addToCart}
											</button>
										{/if}
									</div>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	</main>

	<!-- Yapışkan alt sepet çubuğu -->
	{#if cart.totalCount > 0}
		<div
			class="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 p-3 backdrop-blur"
		>
			<div class="mx-auto max-w-lg">
				<button
					type="button"
					data-testid="open-cart"
					onclick={openCart}
					class="flex min-h-12 w-full items-center justify-between rounded-2xl bg-amber-800 px-4 text-sm font-semibold text-white shadow-md active:bg-amber-900"
				>
					<span>
						{dict.viewCart} ({cart.totalCount}
						{dict.itemsCount})
					</span>
					<span class="font-bold">{formatPriceTl(cart.totalKurus)}</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Sepet çekmecesi -->
	{#if cartOpen}
		<div
			class="fixed inset-0 z-40 flex items-end justify-center bg-black/50"
			role="dialog"
			aria-modal="true"
			aria-label={dict.cartTitle}
		>
			<div
				class="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl"
			>
				<div class="flex items-center justify-between border-b border-stone-200 pb-3">
					<div>
						<h2 class="text-base font-bold text-stone-900">{dict.cartTitle}</h2>
						{#if effectiveTable}
							<p class="text-xs font-medium text-amber-800">{effectiveTable.label}</p>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => (cartOpen = false)}
						class="min-h-9 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-700"
					>
						{dict.close}
					</button>
				</div>

				{#if cart.lines.length === 0}
					<p class="py-8 text-center text-sm text-stone-500">{dict.cartEmpty}</p>
				{:else}
					<ul class="divide-y divide-stone-100 py-2">
						{#each cart.lines as line (line.itemId)}
							{@const lineName = pickLocalized(lang, line.nameTr, line.nameEn)}
							<li class="flex items-center justify-between gap-2 py-2.5">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold text-stone-900">{lineName}</p>
									<p class="text-xs text-stone-500">
										{formatPriceTl(line.priceKurus * line.qty)}
									</p>
								</div>
								<div class="flex shrink-0 items-center gap-1.5">
									<button
										type="button"
										aria-label="{dict.decrease} {lineName}"
										onclick={() => cart.decrement(line.itemId)}
										class="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 text-sm font-bold"
									>
										−
									</button>
									<span class="min-w-5 text-center text-sm font-semibold">{line.qty}</span>
									<button
										type="button"
										aria-label="{dict.increase} {lineName}"
										onclick={() => cart.setQty(line.itemId, line.qty + 1)}
										class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-800 text-sm font-bold text-white"
									>
										+
									</button>
								</div>
							</li>
						{/each}
					</ul>

					{#if !effectiveTable && data.tables.length > 0}
						<div class="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5">
							<p class="text-xs text-amber-950">{dict.noTableWarning}</p>
							<select
								bind:value={selectedTableCode}
								class="mt-2 min-h-9 w-full rounded-lg border border-amber-300 bg-white px-2.5 text-xs font-medium"
							>
								<option value="">{dict.selectTable}</option>
								{#each data.tables as t (t.id)}
									<option value={t.code}>{t.label}</option>
								{/each}
							</select>
						</div>
					{/if}

					<label class="mt-3 block text-xs font-medium text-stone-700">
						{dict.noteLabel}
						<textarea
							bind:value={cart.note}
							rows="2"
							maxlength="200"
							placeholder={dict.notePlaceholder}
							class="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm text-stone-900 focus:border-amber-700 focus:outline-none"
						></textarea>
					</label>

					<div class="mt-4 flex items-center justify-between border-t border-stone-200 pt-3">
						<span class="text-sm font-semibold text-stone-700">{dict.total}</span>
						<span data-testid="cart-total" class="text-lg font-bold text-amber-900">
							{formatPriceTl(cart.totalKurus)}
						</span>
					</div>

					<div class="mt-3 flex flex-col gap-2">
						{#if whatsappUrl}
							<a
								href={whatsappUrl}
								target="_blank"
								rel="noopener noreferrer"
								data-testid="whatsapp-order-link"
								class="flex min-h-12 w-full items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm active:bg-emerald-800"
							>
								{dict.orderViaWhatsapp}
							</a>
						{:else}
							<p class="rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-900">
								{dict.whatsappUnavailable}
							</p>
						{/if}
						<button
							type="button"
							onclick={() => {
								cart.clear();
								cartOpen = false;
							}}
							class="min-h-10 rounded-xl text-xs font-medium text-stone-500 active:bg-stone-100"
						>
							{dict.clearCart}
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
