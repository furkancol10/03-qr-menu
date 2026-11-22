import { db } from '#lib/server/db/index.ts';
import { createRateLimiter, type Limit } from './rate-limit';

export const rateLimiter = createRateLimiter(db);

/**
 * Admin girişi: iki bağımsız sayaç; her deneme doğrulamadan ÖNCE atomik sayılır.
 * E-posta: 15 dk'da 5 deneme (başarılı girişte sıfırlanır).
 * IP: 15 dk'da 20 deneme (sıfırlanmaz).
 */
export const LOGIN_EMAIL_LIMIT: Limit = { max: 5, windowMs: 15 * 60_000 };
export const LOGIN_IP_LIMIT: Limit = { max: 20, windowMs: 15 * 60_000 };

/** Demo olmayan işletmelerde görsel yükleme hız sınırı: işletme başına 30 / 10 dk. */
export const UPLOAD_LIMIT: Limit = { max: 30, windowMs: 10 * 60_000 };

export const loginIpKey = (ip: string) => `login:ip:${ip}`;
export const loginEmailKey = (email: string) => `login:email:${email}`;
export const uploadKey = (businessId: number) => `upload:biz:${businessId}`;
