import { expect, test } from '@playwright/test';

test.describe('QR Menü MVP uçtan uca akış (360px)', () => {
	test('müşteri menüsü: TR/EN geçişi, localStorage sepet, Masa 5 WhatsApp linki ve admin tükendi senkronu', async ({
		page
	}) => {
		// 1. Müşteri /demo-kafe?masa=5 açar
		await page.goto('/demo-kafe?masa=5');
		await expect(page.getByRole('heading', { name: 'Defne Kafe & Fırın' })).toBeVisible();
		await expect(page.getByTestId('table-badge')).toHaveText('Masa 5');

		// 360px yatay taşma yok
		const hasOverflow = await page.evaluate(
			() => document.documentElement.scrollWidth > window.innerWidth
		);
		expect(hasOverflow).toBe(false);

		// Önceden tükendi olan Limonlu Tart devre dışı
		const tartCard = page.locator('article', { hasText: 'Limonlu Tart' });
		await expect(tartCard.getByRole('button', { name: 'Tükendi' })).toBeDisabled();

		// 2. TR -> EN geçişi
		await page.getByTestId('lang-toggle').click();
		await expect(page.getByRole('heading', { name: 'Hot Drinks' })).toBeVisible();
		await expect(page.getByText('Homemade Lemonade')).toBeVisible();

		// EN -> TR geri dön
		await page.getByTestId('lang-toggle').click();
		await expect(page.getByRole('heading', { name: 'Sıcak İçecekler' })).toBeVisible();

		// 3. Sepete 2× Ev Yapımı Limonata (85,50 TL) + 1× Baharatlı Chai Latte (120,00 TL) = 291,00 TL
		const lemonadeCard = page.locator('article', { hasText: 'Ev Yapımı Limonata' });
		await lemonadeCard.getByRole('button', { name: /\+ Ekle/ }).click();
		await lemonadeCard.getByRole('button', { name: /Artır Ev Yapımı Limonata/ }).click();

		const chaiCard = page.locator('article', { hasText: 'Baharatlı Chai Latte' });
		await chaiCard.getByRole('button', { name: /\+ Ekle/ }).click();

		// localStorage kalıcılığı: sayfa yenilenince sepet korunur
		await page.reload();
		await expect(page.getByTestId('open-cart')).toContainText('291,00 TL');

		// Sepeti aç ve WhatsApp bağlantısını doğrula
		await page.getByTestId('open-cart').click();
		await expect(page.getByTestId('cart-total')).toHaveText('291,00 TL');

		const waHref = await page.getByTestId('whatsapp-order-link').getAttribute('href');
		expect(waHref).toBeTruthy();
		expect(waHref!.startsWith('https://wa.me/905551234567?text=')).toBe(true);
		const decoded = decodeURIComponent(waHref!.split('?text=')[1]);
		expect(decoded).toContain('Masa 5');
		expect(decoded).toContain('2x Ev Yapımı Limonata');
		expect(decoded).toContain('1x Baharatlı Chai Latte');
		expect(decoded).toContain('291,00 TL');

		// 4. Oturumsuz /admin/items girişe yönlendirir
		await page.goto('/admin/items');
		await expect(page).toHaveURL(/\/admin\/login/);

		// 5. Hazır doldurulmuş demo bilgileriyle admin girişi
		await page.getByRole('button', { name: 'Giriş yap' }).click();
		await expect(page).toHaveURL(/\/admin\/items/);

		// Şart #1: Demo işletmede dosya yükleme alanı kapalı, yalnız hazır galeri var
		await page.getByRole('button', { name: '+ Yeni ürün' }).click();
		await expect(page.getByTestId('demo-upload-disabled')).toBeVisible();
		await expect(page.locator('input[type="file"]')).toHaveCount(0);

		// /api/upload demo işletmede 403 döner
		const uploadStatus = await page.evaluate(async () => {
			const fd = new FormData();
			fd.append('file', new File(['abc'], 'x.webp', { type: 'image/webp' }));
			const r = await fetch('/api/upload', { method: 'POST', body: fd });
			return r.status;
		});
		expect(uploadStatus).toBe(403);

		// 6. Admin Türk Kahvesi'ni "Tükendi" işaretler
		const coffeeAdminCard = page.locator('article', { hasText: 'Türk Kahvesi' });
		await coffeeAdminCard.getByRole('button', { name: 'Tükendi işaretle' }).click();
		await expect(page.getByRole('status')).toContainText('tükendi');

		// 7. Müşteri tarafında Türk Kahvesi artık devre dışı
		await page.goto('/demo-kafe?masa=5');
		const coffeeCustomerCard = page.locator('article', { hasText: 'Türk Kahvesi' });
		await expect(coffeeCustomerCard.getByRole('button', { name: 'Tükendi' })).toBeDisabled();

		// 8. Admin QR sayfası: Masa 5 kartı, SVG, PNG indirme ve A4 yazdırma butonu
		await page.goto('/admin/qr');
		await expect(page.getByTestId('print-qr-btn')).toBeVisible();
		const masa5Card = page.getByTestId('qr-card-5');
		await expect(masa5Card).toBeVisible();
		await expect(masa5Card.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
		await expect(masa5Card.getByRole('link', { name: 'PNG indir' })).toHaveAttribute(
			'href',
			/^data:image\/png;base64,/
		);
	});

	test('?masa=GECERSIZ uyarısı, tükendi ürün sunucu/localStorage koruması, demo-reset 401 ve giriş hız sınırı', async ({
		page,
		request
	}) => {
		// 1. ?masa=GECERSIZ -> masa rozeti yok, sepette uyarı var, WhatsApp mesajında masa yazmaz
		await page.goto('/demo-kafe?masa=GECERSIZ');
		await expect(page.getByTestId('table-badge')).toHaveCount(0);
		await expect(page.locator('#table-select')).toBeVisible();

		const lemonadeCard = page.locator('article', { hasText: 'Ev Yapımı Limonata' });
		await lemonadeCard.getByRole('button', { name: /\+ Ekle/ }).click();
		await page.getByTestId('open-cart').click();

		await expect(
			page.getByText('Sipariş vermek için lütfen masanızı seçin veya masadaki QR kodu okutun.')
		).toBeVisible();
		const waHref = await page.getByTestId('whatsapp-order-link').getAttribute('href');
		expect(waHref).toBeTruthy();
		const decoded = decodeURIComponent(waHref!.split('?text=')[1]);
		expect(decoded).not.toContain('Masa:');
		expect(decoded).not.toContain('GECERSIZ');

		// 2. Tükendi ürün (Limonlu Tart) localStorage'a enjekte edilse ve /api/order-link'e gönderilse bile girmez
		const tartTestId = await page
			.locator('article', { hasText: 'Limonlu Tart' })
			.getAttribute('data-testid');
		const tartId = Number(tartTestId!.replace('menu-item-', ''));
		expect(tartId).toBeGreaterThan(0);

		const apiOrderRes = await request.post('/api/order-link', {
			data: {
				slug: 'demo-kafe',
				tableCode: '5',
				lang: 'tr',
				items: [{ itemId: tartId, qty: 2 }]
			}
		});
		expect(apiOrderRes.status()).toBe(409);
		const apiOrderBody = (await apiOrderRes.json()) as {
			whatsappUrl: string | null;
			unavailableItemIds: number[];
		};
		expect(apiOrderBody.whatsappUrl).toBeNull();
		expect(apiOrderBody.unavailableItemIds).toContain(tartId);

		await page.evaluate((id) => {
			localStorage.setItem(
				'qrmenu:cart:demo-kafe',
				JSON.stringify([
					{
						itemId: id,
						nameTr: 'Limonlu Tart',
						nameEn: 'Lemon Tart',
						priceKurus: 16000,
						qty: 2
					}
				])
			);
		}, tartId);
		await page.reload();
		await expect(page.getByTestId('open-cart')).toHaveCount(0);

		// 3. /api/demo-reset secret yok/yanlış iken 401 döner (Content-Type: application/json ile CSRF'ye takılmaz)
		const noSecretRes = await request.post('/api/demo-reset', {
			headers: { 'content-type': 'application/json' },
			data: {}
		});
		expect(noSecretRes.status()).toBe(401);
		const badSecretRes = await request.post('/api/demo-reset', {
			headers: {
				'content-type': 'application/json',
				'x-demo-reset-secret': 'yanlis-deger'
			},
			data: {}
		});
		expect(badSecretRes.status()).toBe(401);

		// 4. /admin/login: aynı e-postaya 6. deneme 429 hız sınırıyla engellenir
		await page.goto('/admin/login');
		for (let i = 1; i <= 5; i++) {
			await page.locator('input[name="email"]').fill('hiz-siniri@defnekafe.example');
			await page.locator('input[name="password"]').fill(`yanlis-${i}`);
			await page.getByRole('button', { name: 'Giriş yap' }).click();
			await expect(page.getByRole('alert')).toContainText('E-posta veya şifre hatalı.');
		}
		await page.locator('input[name="email"]').fill('hiz-siniri@defnekafe.example');
		await page.locator('input[name="password"]').fill('yanlis-6');
		await page.getByRole('button', { name: 'Giriş yap' }).click();
		await expect(page.getByRole('alert')).toContainText('Çok fazla deneme');
	});
});
