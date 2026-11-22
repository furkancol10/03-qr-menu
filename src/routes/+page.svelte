<svelte:head>
	<title>QR Menü — Dijital Kafe & Restoran Menüsü</title>
</svelte:head>

<div class="min-h-dvh bg-stone-50 text-stone-900">
	<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
		<div class="space-y-2">
			<p class="text-xs font-semibold tracking-wider text-amber-800 uppercase">Portföy Demo</p>
			<h1 class="text-3xl font-bold tracking-tight text-stone-900">QR Menü</h1>
			<p class="text-sm leading-relaxed text-stone-600">
				Kafe ve restoranlar için QR kod ile açılan mobil menü, TR/EN dil desteği, sepetten masa
				numaralı WhatsApp siparişi ve yazdırılabilir QR yönetim paneli.
			</p>
		</div>

		<div class="flex flex-col gap-3">
			<a
				href="/demo-kafe?masa=5"
				class="flex min-h-12 items-center justify-center rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white shadow-sm active:bg-amber-900"
			>
				Defne Kafe &amp; Fırın Demosu (Masa 5)
			</a>
			<a
				href="/admin/login"
				class="flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 active:bg-stone-100"
			>
				Yönetim Paneli Girişi
			</a>
		</div>

		<p class="text-xs text-stone-500">
			Demo verisi kurgusaldır ve her gece otomatik olarak başlangıç haline sıfırlanır.
		</p>
	</main>
</div>
