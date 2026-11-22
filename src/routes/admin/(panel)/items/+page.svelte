<script lang="ts">
	import { DEMO_GALLERY } from '#lib/demo.ts';
	import { ALLERGEN_KEYS, allergenLabel } from '#lib/i18n/index.ts';
	import { compressToWebp } from '#lib/image-compress.ts';
	import { kurusToInputTl } from '#lib/validation.ts';
	import { formatPriceTl } from '#lib/whatsapp.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let selectedCatFilter = $state<number | 'all'>('all');
	let createOpen = $state(false);
	let editingId = $state<number | null>(null);
	let createImageUrl = $state(DEMO_GALLERY[0].url);
	let editImageUrl = $state('');
	let uploading = $state(false);
	let uploadError = $state('');

	const inputCls =
		'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-amber-700 focus:outline-none';

	const categoryMap = $derived(new Map(data.categories.map((c) => [c.id, c.nameTr])));
	const filteredItems = $derived(
		selectedCatFilter === 'all'
			? data.items
			: data.items.filter((i) => i.categoryId === selectedCatFilter)
	);

	function openEdit(item: (typeof data.items)[number]) {
		if (editingId === item.id) {
			editingId = null;
			return;
		}
		editingId = item.id;
		editImageUrl = item.imageUrl ?? '';
		uploadError = '';
	}

	async function handleFileUpload(event: Event, onUrl: (url: string) => void) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		uploadError = '';
		uploading = true;
		try {
			const compressed = await compressToWebp(file);
			const fd = new FormData();
			fd.append('file', compressed);
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			const body = (await res.json()) as { url?: string; error?: string };
			if (!res.ok || !body.url) {
				uploadError = body.error ?? 'Görsel yüklenemedi.';
			} else {
				onUrl(body.url);
			}
		} catch {
			uploadError = 'Görsel yüklenirken bir hata oluştu.';
		} finally {
			uploading = false;
			target.value = '';
		}
	}
</script>

<svelte:head>
	<title>Ürünler — Yönetim</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between gap-2">
		<h1 class="text-xl font-bold text-stone-900">Ürünler ({data.items.length})</h1>
		<button
			type="button"
			onclick={() => {
				createOpen = !createOpen;
				uploadError = '';
			}}
			class="min-h-10 rounded-xl bg-amber-800 px-3.5 text-xs font-semibold text-white active:bg-amber-900"
		>
			{createOpen ? 'Formu kapat' : '+ Yeni ürün'}
		</button>
	</div>

	{#if form?.message}
		<p
			role="status"
			class="rounded-xl border px-3 py-2.5 text-sm {form.ok
				? 'border-emerald-300 bg-emerald-50 text-emerald-900'
				: 'border-amber-300 bg-amber-50 text-amber-900'}"
		>
			{form.message}
		</p>
	{/if}

	{#if data.categories.length === 0}
		<p class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
			Ürün eklemek için önce <a href="/admin/categories" class="font-bold underline">Kategoriler</a>
			sayfasından en az bir kategori oluşturun.
		</p>
	{/if}

	<!-- Yeni ürün formu -->
	{#if createOpen && data.categories.length > 0}
		<section class="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
			<h2 class="text-sm font-bold text-stone-900">Yeni ürün ekle</h2>
			<form method="POST" action="?/create" class="mt-3 space-y-3">
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block text-xs font-medium text-stone-700">
						Kategori *
						<select name="categoryId" required class="mt-1 {inputCls}">
							{#each data.categories as c (c.id)}
								<option value={c.id}>{c.nameTr}</option>
							{/each}
						</select>
					</label>
					<label class="block text-xs font-medium text-stone-700">
						Fiyat (TL) *
						<input
							name="price"
							required
							inputmode="decimal"
							placeholder="Örn. 85,50"
							class="mt-1 {inputCls}"
						/>
						{#if form?.action === 'create' && form.errors?.price}
							<span class="mt-1 block text-xs text-rose-700">{form.errors.price}</span>
						{/if}
					</label>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block text-xs font-medium text-stone-700">
						Ürün adı (TR) *
						<input name="nameTr" required placeholder="Örn. Cortado" class="mt-1 {inputCls}" />
					</label>
					<label class="block text-xs font-medium text-stone-700">
						Ürün adı (EN)
						<input name="nameEn" placeholder="e.g. Cortado" class="mt-1 {inputCls}" />
					</label>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block text-xs font-medium text-stone-700">
						Açıklama (TR)
						<textarea
							name="descTr"
							rows="2"
							class="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm"></textarea>
					</label>
					<label class="block text-xs font-medium text-stone-700">
						Açıklama (EN)
						<textarea
							name="descEn"
							rows="2"
							class="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm"></textarea>
					</label>
				</div>

				<!-- Alerjenler -->
				<fieldset class="space-y-1.5">
					<legend class="text-xs font-medium text-stone-700">Alerjenler</legend>
					<div class="flex flex-wrap gap-2">
						{#each ALLERGEN_KEYS as key (key)}
							<label
								class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs"
							>
								<input type="checkbox" name="allergens" value={key} class="accent-amber-800" />
								{allergenLabel('tr', key)}
							</label>
						{/each}
					</div>
				</fieldset>

				<!-- Görsel seçimi (Şart #1) -->
				<div class="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
					<p class="text-xs font-semibold text-stone-800">Ürün görseli</p>
					{#if !data.canUpload}
						<p data-testid="demo-upload-disabled" class="text-xs text-stone-600">
							Demo işletmede görsel yükleme kapalıdır; aşağıdaki hazır galeriden seçebilirsiniz.
						</p>
						<input type="hidden" name="imageUrl" value={createImageUrl} />
						<div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
							<button
								type="button"
								onclick={() => (createImageUrl = '')}
								class="flex h-14 items-center justify-center rounded-lg border text-[11px] font-medium {createImageUrl ===
								''
									? 'border-amber-800 bg-amber-50 text-amber-900'
									: 'border-stone-300 bg-white text-stone-600'}"
							>
								Görsel yok
							</button>
							{#each DEMO_GALLERY as img (img.url)}
								<button
									type="button"
									onclick={() => (createImageUrl = img.url)}
									class="overflow-hidden rounded-lg border-2 {createImageUrl === img.url
										? 'border-amber-800'
										: 'border-transparent'}"
									title={img.label}
								>
									<img src={img.url} alt={img.label} class="h-14 w-full object-cover" />
								</button>
							{/each}
						</div>
					{:else}
						<div class="space-y-2">
							<label class="block text-xs text-stone-600">
								Dosya yükle (WebP sıkıştırılır, ≤1 MB)
								<input
									type="file"
									accept="image/webp,image/jpeg,image/png"
									disabled={uploading}
									onchange={(e) => handleFileUpload(e, (url) => (createImageUrl = url))}
									class="mt-1 block w-full text-xs"
								/>
							</label>
							{#if uploadError}
								<p class="text-xs text-rose-700">{uploadError}</p>
							{/if}
							<label class="block text-xs text-stone-600">
								veya HTTPS görsel adresi
								<input
									name="imageUrl"
									bind:value={createImageUrl}
									placeholder="https://..."
									class="mt-1 {inputCls}"
								/>
							</label>
						</div>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-4">
					<label class="block w-24 text-xs font-medium text-stone-700">
						Sıra
						<input name="sortOrder" type="number" min="0" value="0" class="mt-1 {inputCls}" />
					</label>
					<label class="mt-5 inline-flex min-h-10 items-center gap-2 text-sm">
						<input type="checkbox" name="available" checked class="h-4 w-4 accent-amber-800" />
						Mevcut (stokta)
					</label>
				</div>

				<button
					type="submit"
					disabled={uploading}
					class="min-h-11 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white active:bg-amber-900"
				>
					Ürünü kaydet
				</button>
			</form>
		</section>
	{/if}

	<!-- Kategori filtresi -->
	{#if data.categories.length > 1}
		<div class="flex gap-1.5 overflow-x-auto pb-1">
			<button
				type="button"
				onclick={() => (selectedCatFilter = 'all')}
				class="min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold {selectedCatFilter === 'all'
					? 'bg-stone-900 text-white'
					: 'border border-stone-300 bg-white text-stone-700'}"
			>
				Tümü ({data.items.length})
			</button>
			{#each data.categories as cat (cat.id)}
				<button
					type="button"
					onclick={() => (selectedCatFilter = cat.id)}
					class="min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold {selectedCatFilter ===
					cat.id
						? 'bg-stone-900 text-white'
						: 'border border-stone-300 bg-white text-stone-700'}"
				>
					{cat.nameTr}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Ürün listesi -->
	<div class="space-y-2.5">
		{#each filteredItems as item (item.id)}
			<article
				data-testid="admin-item-{item.id}"
				class="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs"
			>
				<div class="flex items-start gap-3">
					{#if item.imageUrl}
						<img
							src={item.imageUrl}
							alt={item.nameTr}
							loading="lazy"
							class="h-16 w-20 shrink-0 rounded-xl bg-stone-100 object-cover"
						/>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<p class="truncate text-sm font-bold text-stone-900">{item.nameTr}</p>
								<p class="text-xs text-stone-500">
									{categoryMap.get(item.categoryId) ?? ''} · {formatPriceTl(item.priceKurus)}
								</p>
							</div>
							<span
								class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold {item.available
									? 'bg-emerald-100 text-emerald-900'
									: 'bg-rose-100 text-rose-800'}"
							>
								{item.available ? 'Mevcut' : 'Tükendi'}
							</span>
						</div>

						<div class="mt-2.5 flex flex-wrap items-center gap-2">
							<form method="POST" action="?/toggleAvailable">
								<input type="hidden" name="id" value={item.id} />
								<input type="hidden" name="available" value={item.available ? 'false' : 'true'} />
								<button
									type="submit"
									data-testid="toggle-available-{item.id}"
									class="min-h-9 rounded-xl border px-3 text-xs font-semibold {item.available
										? 'border-rose-300 bg-rose-50 text-rose-800 active:bg-rose-100'
										: 'border-emerald-300 bg-emerald-50 text-emerald-800 active:bg-emerald-100'}"
								>
									{item.available ? 'Tükendi işaretle' : 'Tekrar mevcut yap'}
								</button>
							</form>

							<button
								type="button"
								onclick={() => openEdit(item)}
								class="min-h-9 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-700"
							>
								{editingId === item.id ? 'Kapat' : 'Düzenle'}
							</button>
						</div>
					</div>
				</div>

				{#if editingId === item.id}
					<form
						method="POST"
						action="?/update"
						class="mt-4 space-y-3 border-t border-stone-100 pt-3"
					>
						<input type="hidden" name="id" value={item.id} />
						<div class="grid gap-2.5 sm:grid-cols-2">
							<label class="block text-xs font-medium text-stone-700">
								Kategori
								<select name="categoryId" value={item.categoryId} class="mt-1 {inputCls}">
									{#each data.categories as c (c.id)}
										<option value={c.id}>{c.nameTr}</option>
									{/each}
								</select>
							</label>
							<label class="block text-xs font-medium text-stone-700">
								Fiyat (TL)
								<input
									name="price"
									required
									inputmode="decimal"
									value={kurusToInputTl(item.priceKurus)}
									class="mt-1 {inputCls}"
								/>
							</label>
						</div>

						<div class="grid gap-2.5 sm:grid-cols-2">
							<label class="block text-xs font-medium text-stone-700">
								Ad (TR)
								<input name="nameTr" required value={item.nameTr} class="mt-1 {inputCls}" />
							</label>
							<label class="block text-xs font-medium text-stone-700">
								Ad (EN)
								<input name="nameEn" value={item.nameEn ?? ''} class="mt-1 {inputCls}" />
							</label>
						</div>

						<div class="grid gap-2.5 sm:grid-cols-2">
							<label class="block text-xs font-medium text-stone-700">
								Açıklama (TR)
								<textarea
									name="descTr"
									rows="2"
									class="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm"
									>{item.descTr ?? ''}</textarea
								>
							</label>
							<label class="block text-xs font-medium text-stone-700">
								Açıklama (EN)
								<textarea
									name="descEn"
									rows="2"
									class="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm"
									>{item.descEn ?? ''}</textarea
								>
							</label>
						</div>

						<fieldset class="space-y-1.5">
							<legend class="text-xs font-medium text-stone-700">Alerjenler</legend>
							<div class="flex flex-wrap gap-2">
								{#each ALLERGEN_KEYS as key (key)}
									<label
										class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs"
									>
										<input
											type="checkbox"
											name="allergens"
											value={key}
											checked={item.allergens.includes(key)}
											class="accent-amber-800"
										/>
										{allergenLabel('tr', key)}
									</label>
								{/each}
							</div>
						</fieldset>

						<div class="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
							<p class="text-xs font-semibold text-stone-800">Görsel</p>
							{#if !data.canUpload}
								<input type="hidden" name="imageUrl" value={editImageUrl} />
								<div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
									<button
										type="button"
										onclick={() => (editImageUrl = '')}
										class="flex h-12 items-center justify-center rounded-lg border text-[11px] font-medium {editImageUrl ===
										''
											? 'border-amber-800 bg-amber-50 text-amber-900'
											: 'border-stone-300 bg-white text-stone-600'}"
									>
										Yok
									</button>
									{#each DEMO_GALLERY as img (img.url)}
										<button
											type="button"
											onclick={() => (editImageUrl = img.url)}
											class="overflow-hidden rounded-lg border-2 {editImageUrl === img.url
												? 'border-amber-800'
												: 'border-transparent'}"
											title={img.label}
										>
											<img src={img.url} alt={img.label} class="h-12 w-full object-cover" />
										</button>
									{/each}
								</div>
							{:else}
								<input
									type="file"
									accept="image/webp,image/jpeg,image/png"
									disabled={uploading}
									onchange={(e) => handleFileUpload(e, (url) => (editImageUrl = url))}
									class="block w-full text-xs"
								/>
								<input
									name="imageUrl"
									bind:value={editImageUrl}
									placeholder="https://..."
									class={inputCls}
								/>
							{/if}
						</div>

						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="flex items-center gap-3">
								<label class="flex items-center gap-1.5 text-xs font-medium">
									Sıra
									<input
										name="sortOrder"
										type="number"
										min="0"
										value={item.sortOrder}
										class="min-h-10 w-20 rounded-xl border border-stone-300 px-2.5 text-sm"
									/>
								</label>
								<label class="inline-flex min-h-10 items-center gap-2 text-xs font-medium">
									<input
										type="checkbox"
										name="available"
										checked={item.available}
										class="h-4 w-4 accent-amber-800"
									/>
									Mevcut
								</label>
							</div>

							<button
								type="submit"
								class="min-h-10 rounded-xl bg-stone-900 px-4 text-xs font-semibold text-white"
							>
								Güncelle
							</button>
						</div>
					</form>

					<form method="POST" action="?/delete" class="mt-2 flex justify-end">
						<input type="hidden" name="id" value={item.id} />
						<button type="submit" class="min-h-9 px-2 text-xs font-medium text-rose-700">
							Ürünü sil
						</button>
					</form>
				{/if}
			</article>
		{/each}
	</div>
</div>
