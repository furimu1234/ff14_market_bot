import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { homeWorld } from '../schema';

export const getHomeWorld = async (db: SchemaDB, userId: string) => {
	return await db.query.homeWorld.findFirst({
		where: eq(homeWorld.userId, userId),
	});
};
