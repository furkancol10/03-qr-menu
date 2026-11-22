import { db } from '#lib/server/db/index.ts';
import {
	LOGIN_EMAIL_LIMIT,
	LOGIN_IP_LIMIT,
	UPLOAD_LIMIT,
	createRateLimiter,
	loginEmailKey,
	loginIpKey,
	uploadKey
} from './rate-limit';

export const rateLimiter = createRateLimiter(db);
export { LOGIN_EMAIL_LIMIT, LOGIN_IP_LIMIT, UPLOAD_LIMIT, loginEmailKey, loginIpKey, uploadKey };
