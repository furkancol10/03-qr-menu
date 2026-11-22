<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const inputCls =
		'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-amber-700 focus:outline-none';
</script>

<svelte:head>
	<title>Kategoriler — Yönetim</title>
</svelte:head>

<div class="space-y-4">
	<h1 class="text-xl font-bold text-stone-900">Kategoriler</h1>

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

	<!-- Yeni kategori -->
	<section class="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
		<h2 class="text-sm font-bold text-stone-900">Yeni kategori ekle</h2>
		<form method="POST" action="?/create" class="mt-3 space-y-3">
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="block text-xs font-medium text-stone-700">
					Ad (TR) *
					<input
						name="nameTr"
						required
						value={form?.action === 'create' ? (form.fields?.nameTr ?? '') : ''}
						placeholder="Örn. Sıcak İçecekler"
						class="mt-1 {inputCls}"
					/>
					{#if form?.action === 'create' && form.errors?.nameTr}
						<span class="mt-1 block text-xs text-rose-700">{form.errors.nameTr}</span>
					{/if}
				</label>
				<label class="block text-xs font-medium text-stone-700">
					Ad (EN)
					<input
						name="nameEn"
						value={form?.action === 'create' ? (form.fields?.nameEn ?? '') : ''}
						placeholder="e.g. Hot Drinks"
						class="mt-1 {inputCls}"
					/>
				</label>
			</div>

			<div class="flex flex-wrap items-center gap-4">
				<label class="block w-28 text-xs font-medium text-stone-700">
					Sıra
					<input
						name="sortOrder"
						type="number"
						min="0"
						max="9999"
						value={form?.action === 'create'
							? (form.fields?.sortOrder ?? String(data.categories.length + 1))
							: String(data.categories.length + 1)}
						class="mt-1 {inputCls}"
					/>
				</label>

				<label class="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-stone-800">
					<input type="checkbox" name="active" checked class="h-4 w-4 accent-amber-800" />
					Menüde göster
				</label>
			</div>

			<button
				type="submit"
				class="min-h-11 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white active:bg-amber-900"
			>
				Kategori ekle
			</button>
		</form>
	</section>

	<!-- Mevcut kategoriler -->
	<section class="space-y-2.5">
		<h2 class="text-sm font-bold text-stone-700">Mevcut kategoriler ({data.categories.length})</h2>
		{#if data.categories.length === 0}
			<p
				class="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500"
			>
				Henüz kategori eklenmedi.
			</p>
		{:else}
			{#each data.categories as cat (cat.id)}
				<div class="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs">
					<form method="POST" action="?/update" class="space-y-3">
						<input type="hidden" name="id" value={cat.id} />
						<div class="grid gap-2.5 sm:grid-cols-2">
							<label class="block text-xs font-medium text-stone-700">
								Ad (TR)
								<input name="nameTr" required value={cat.nameTr} class="mt-1 {inputCls}" />
							</label>
							<label class="block text-xs font-medium text-stone-700">
								Ad (EN)
								<input name="nameEn" value={cat.nameEn ?? ''} class="mt-1 {inputCls}" />
							</label>
						</div>

						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="flex items-center gap-3">
								<label class="flex items-center gap-1.5 text-xs font-medium text-stone-700">
									Sıra
									<input
										name="sortOrder"
										type="number"
										min="0"
										max="9999"
										value={cat.sortOrder}
										class="min-h-10 w-20 rounded-xl border border-stone-300 px-2.5 text-sm"
									/>
								</label>
								<label class="inline-flex min-h-10 items-center gap-2 text-xs font-medium">
									<input
										type="checkbox"
										name="active"
										checked={cat.active}
										class="h-4 w-4 accent-amber-800"
									/>
									Aktif
								</label>
							</div>

							<div class="flex items-center gap-2">
								<button
									type="submit"
									class="min-h-10 rounded-xl bg-stone-900 px-3.5 text-xs font-semibold text-white active:bg-stone-700"
								>
									Kaydet
								</button>
							</div>
						</div>
					</form>

					<form
						method="POST"
						action="?/delete"
						class="mt-2 flex justify-end border-t border-stone-100 pt-2"
					>
						<input type="hidden" name="id" value={cat.id} />
						<button
							type="submit"
							class="min-h-9 rounded-lg px-2.5 text-xs font-medium text-rose-700 active:bg-rose-50"
						>
							Kategoriyi sil (ürünleriyle)
						</button>
					</form>
				</div>
			{/each}
		{/if}
	</section>
</div>
