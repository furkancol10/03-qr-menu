<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function svgDataUrl(svg: string): string {
		return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	}

	function downloadSvg(svg: string, filename: string) {
		const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>QR Kodları &amp; A4 Baskı — Yönetim</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2 print:hidden">
		<div>
			<h1 class="text-xl font-bold text-stone-900">QR Kodları</h1>
			<p class="text-xs text-stone-500">
				SVG veya PNG indirin ya da tüm masa kartlarını tek seferde A4 olarak yazdırın.
			</p>
		</div>
		<button
			type="button"
			data-testid="print-qr-btn"
			onclick={() => window.print()}
			class="min-h-11 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white active:bg-amber-900"
		>
			A4 Kartları Yazdır / PDF
		</button>
	</div>

	<!-- Genel menü QR (masasız) -->
	<section class="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs print:hidden">
		<div class="flex flex-wrap items-center gap-4">
			<div class="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-stone-200 p-1">
				<img
					src={svgDataUrl(data.general.svg)}
					alt="Genel menü QR kodu"
					class="h-full w-full object-contain"
				/>
			</div>
			<div class="min-w-0 flex-1 space-y-2">
				<h2 class="text-sm font-bold text-stone-900">Genel Menü QR (Masasız)</h2>
				<p class="truncate text-xs text-stone-500">{data.general.url}</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						onclick={() => downloadSvg(data.general.svg, `qr-${data.slug}-genel.svg`)}
						class="min-h-10 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-800"
					>
						SVG indir
					</button>
					<a
						href={data.general.pngDataUrl}
						download="qr-{data.slug}-genel.png"
						class="flex min-h-10 items-center rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-800"
					>
						PNG indir
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Masa kartları (ekranda liste, baskıda A4 2x4 kesilebilir kart ızgarası) -->
	{#if data.cards.length === 0}
		<p
			class="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500 print:hidden"
		>
			Aktif masa bulunamadı. <a href="/admin/tables" class="font-bold underline">Masalar</a>
			sayfasından masa ekleyin.
		</p>
	{:else}
		<div
			data-testid="qr-card-grid"
			class="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-4"
		>
			{#each data.cards as card (card.id)}
				<article
					data-testid="qr-card-{card.code}"
					class="flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-xs print:break-inside-avoid print:rounded-none print:border-dashed print:border-stone-400 print:p-5 print:shadow-none"
				>
					<p class="text-xs font-semibold tracking-wide text-amber-800 uppercase">
						{data.businessName}
					</p>
					<h2 class="mt-0.5 text-lg font-bold text-stone-900">{card.label}</h2>

					<div class="my-3 h-44 w-44 rounded-xl border border-stone-200 bg-white p-2">
						<img
							src={svgDataUrl(card.svg)}
							alt="{card.label} QR kodu"
							class="h-full w-full object-contain"
						/>
					</div>

					<p class="text-xs font-semibold text-stone-700">Menü için okutun · Scan for menu</p>
					<p class="mt-0.5 max-w-full truncate text-[11px] text-stone-400">{card.targetUrl}</p>

					<div class="mt-3 flex w-full justify-center gap-2 print:hidden">
						<button
							type="button"
							onclick={() => downloadSvg(card.svg, `qr-${data.slug}-${card.code}.svg`)}
							class="min-h-10 flex-1 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-800 active:bg-stone-100"
						>
							SVG indir
						</button>
						<a
							href={card.pngDataUrl}
							download="qr-{data.slug}-{card.code}.png"
							class="flex min-h-10 flex-1 items-center justify-center rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-800 active:bg-stone-100"
						>
							PNG indir
						</a>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
