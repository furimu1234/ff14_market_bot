import { and, eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { mySetItem } from '../schema';

export const deleteMySetItem = async (
	db: SchemaDB,
	userId: string,
	itemId: number,
) => {
	return await db
		.delete(mySetItem)
		.where(and(eq(mySetItem.userId, userId), eq(mySetItem.itemId, itemId)))
		.returning();
};
