import { hash, verify } from '@node-rs/argon2';
import { describe, expect, it } from 'vitest';
import { DUMMY_HASH } from '../../src/lib/server/auth/password';

const params = (h: string) => h.split('$').slice(1, 4).join('$');

describe('DUMMY_HASH (olmayan kullanıcı yolu)', () => {
	it('sabit bir değerdir: istek anında hash üretilmez', () => {
		expect(typeof DUMMY_HASH).toBe('string');
	});
	it('gerçek şifre özetiyle aynı argon2 maliyet parametrelerini kullanır', async () => {
		expect(params(DUMMY_HASH)).toBe(params(await hash('baska-sifre')));
	});
	it('geçerli bir özettir: verify hata fırlatmadan false döner', async () => {
		await expect(verify(DUMMY_HASH, 'herhangi-bir-sifre')).resolves.toBe(false);
	});
});
