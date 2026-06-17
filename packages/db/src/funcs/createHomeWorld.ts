import type { SchemaDB } from '../client';
import { homeWorld } from '../schema';

export const createHomeWorld = async (
	db: SchemaDB,
	userId: string,
	worldName: string,
) => {
	const now = new Date();

	return await db
		.insert(homeWorld)
		.values({
			userId,
			worldName,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: homeWorld.userId,
			set: {
				worldName,
				updatedAt: now,
			},
		})
		.returning();
};
