import { handleUploadPost } from '#lib/server/blob/upload.ts';
import { db } from '#lib/server/db/index.ts';
import { rateLimiter } from '#lib/server/limiters.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, request }) =>
	handleUploadPost({ locals, request }, { db, rateLimiter });
