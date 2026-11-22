import { db } from '#lib/server/db/index.ts';
import { handleDemoResetPost } from '#lib/server/demo/reset-handler.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) =>
	handleDemoResetPost(request, { db, expectedSecret: process.env.DEMO_RESET_SECRET });
