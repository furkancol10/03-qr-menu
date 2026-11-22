import { db } from '#lib/server/db/index.ts';
import { handleOrderLinkPost } from '#lib/server/menu/order.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) => handleOrderLinkPost(request, { db });
