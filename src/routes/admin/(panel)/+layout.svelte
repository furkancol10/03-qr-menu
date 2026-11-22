<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const tabs = [
		{ href: '/admin/categories', label: 'Kategoriler' },
		{ href: '/admin/items', label: 'Ürünler' },
		{ href: '/admin/tables', label: 'Masalar' },
		{ href: '/admin/qr', label: 'QR' }
	];
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-dvh bg-stone-50 pb-20 text-stone-900 print:bg-white print:pb-0">
	<header class="border-b border-stone-200 bg-white print:hidden">
		<div class="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-3">
			<div class="min-w-0">
				<p class="truncate text-sm font-bold text-stone-900">{data.businessName}</p>
				<p class="truncate text-xs text-stone-500">Yönetim · {data.email}</p>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				{#if data.businessSlug}
					<a
						href="/{data.businessSlug}"
						target="_blank"
						rel="noopener noreferrer"
						class="flex min-h-10 items-center rounded-xl border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900"
					>
						Menü ↗
					</a>
				{/if}
				<form method="POST" action="/admin/logout">
					<button
						type="submit"
						class="min-h-10 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-700 active:bg-stone-100"
					>
						Çıkış
					</button>
				</form>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-3xl space-y-4 px-3 py-4 print:max-w-none print:p-0">
		{@render children()}
	</main>

	<nav class="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white print:hidden">
		<ul class="mx-auto grid max-w-3xl grid-cols-4">
			{#each tabs as t (t.href)}
				{@const active = page.url.pathname.startsWith(t.href)}
				<li>
					<a
						href={t.href}
						aria-current={active ? 'page' : undefined}
						class="flex min-h-14 items-center justify-center text-xs font-semibold {active
							? 'border-t-2 border-amber-800 text-amber-900'
							: 'text-stone-600'}"
					>
						{t.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
