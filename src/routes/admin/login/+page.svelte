<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const field =
		'min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 focus:border-amber-700 focus:outline-none';
</script>

<svelte:head>
	<title>Yönetici Girişi — QR Menü</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-dvh bg-stone-50 text-stone-900">
	<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-8">
		<div>
			<a href="/" class="text-xs font-medium text-amber-800 hover:underline">← Ana sayfa</a>
			<h1 class="mt-1 text-2xl font-bold">Yönetici Girişi</h1>
		</div>

		{#if data.demo}
			<p class="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900">
				Demo giriş bilgileri hazır dolduruldu. Yalnız deneme içindir.
			</p>
		{/if}
		{#if form?.message}
			<p
				role="alert"
				class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
			>
				{form.message}
			</p>
		{/if}

		<form method="POST" class="space-y-3">
			<label class="block text-sm font-medium">
				E-posta
				<input
					name="email"
					type="email"
					autocomplete="username"
					required
					value={form?.email ?? data.demo?.email ?? ''}
					class="mt-1 {field}"
				/>
			</label>
			<label class="block text-sm font-medium">
				Şifre
				<input
					name="password"
					type="password"
					autocomplete="current-password"
					required
					value={data.demo?.password ?? ''}
					class="mt-1 {field}"
				/>
			</label>
			<button
				type="submit"
				class="min-h-12 w-full rounded-xl bg-amber-800 px-4 font-semibold text-white active:bg-amber-900"
			>
				Giriş yap
			</button>
		</form>
	</main>
</div>
