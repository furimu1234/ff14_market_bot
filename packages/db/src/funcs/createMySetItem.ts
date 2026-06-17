import { and, eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { mySetItem } from '../schema';

export const createMySetItem = async (
	db: SchemaDB,
	userId: string,
	itemId: number,
	itemName: string,
) => {
	const now = new Date();
	const current = await db.query.mySetItem.findFirst({
		where: and(eq(mySetItem.userId, userId), eq(mySetItem.itemId, itemId)),
	});

	if (current) {
		return await db
			.update(mySetItem)
			.set({ itemName, updatedAt: now })
			.where(eq(mySetItem.id, current.id))
			.returning();
	}

	return await db
		.insert(mySetItem)
		.values({
			userId,
			itemId,
			itemName,
			createdAt: now,
			updatedAt: now,
		})
		.returning();
};
