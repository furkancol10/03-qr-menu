<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const inputCls =
		'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-amber-700 focus:outline-none';
</script>

<svelte:head>
	<title>Masalar — Yönetim</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between gap-2">
		<h1 class="text-xl font-bold text-stone-900">Masalar ({data.tables.length})</h1>
		<a
			href="/admin/qr"
			class="flex min-h-10 items-center rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900"
		>
			QR Kodları →
		</a>
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

	<!-- Yeni masa -->
	<section class="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
		<h2 class="text-sm font-bold text-stone-900">Yeni masa ekle</h2>
		<form method="POST" action="?/create" class="mt-3 space-y-3">
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="block text-xs font-medium text-stone-700">
					Masa kodu (URL) *
					<input
						name="code"
						required
						value={form?.action === 'create' ? (form.fields?.code ?? '') : ''}
						placeholder="Örn. 7 veya bahce-3"
						class="mt-1 {inputCls}"
					/>
					{#if form?.action === 'create' && form.errors?.code}
						<span class="mt-1 block text-xs text-rose-700">{form.errors.code}</span>
					{/if}
				</label>
				<label class="block text-xs font-medium text-stone-700">
					Görünen ad *
					<input
						name="label"
						required
						value={form?.action === 'create' ? (form.fields?.label ?? '') : ''}
						placeholder="Örn. Masa 7"
						class="mt-1 {inputCls}"
					/>
				</label>
			</div>

			<label class="inline-flex min-h-10 items-center gap-2 text-sm text-stone-800">
				<input type="checkbox" name="active" checked class="h-4 w-4 accent-amber-800" />
				Aktif
			</label>

			<div>
				<button
					type="submit"
					class="min-h-11 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white active:bg-amber-900"
				>
					Masa ekle
				</button>
			</div>
		</form>
	</section>

	<!-- Masa listesi -->
	<div class="space-y-2.5">
		{#each data.tables as t (t.id)}
			<div class="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs">
				<form method="POST" action="?/update" class="space-y-3">
					<input type="hidden" name="id" value={t.id} />
					<div class="grid gap-2.5 sm:grid-cols-2">
						<label class="block text-xs font-medium text-stone-700">
							Kod
							<input name="code" required value={t.code} class="mt-1 {inputCls}" />
						</label>
						<label class="block text-xs font-medium text-stone-700">
							Etiket
							<input name="label" required value={t.label} class="mt-1 {inputCls}" />
						</label>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex items-center gap-3">
							<label class="inline-flex min-h-10 items-center gap-2 text-xs font-medium">
								<input
									type="checkbox"
									name="active"
									checked={t.active}
									class="h-4 w-4 accent-amber-800"
								/>
								Aktif
							</label>
							{#if data.businessSlug}
								<a
									href="/{data.businessSlug}?masa={encodeURIComponent(t.code)}"
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs font-medium text-amber-800 underline"
								>
									Menüyü aç ↗
								</a>
							{/if}
						</div>

						<button
							type="submit"
							class="min-h-10 rounded-xl bg-stone-900 px-3.5 text-xs font-semibold text-white"
						>
							Kaydet
						</button>
					</div>
				</form>

				<form
					method="POST"
					action="?/delete"
					class="mt-2 flex justify-end border-t border-stone-100 pt-2"
				>
					<input type="hidden" name="id" value={t.id} />
					<button type="submit" class="min-h-9 px-2 text-xs font-medium text-rose-700">
						Masayı sil
					</button>
				</form>
			</div>
		{/each}
	</div>
</div>
