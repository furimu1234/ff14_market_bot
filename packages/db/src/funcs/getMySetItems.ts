import { asc, eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { mySetItem } from '../schema';

export const getMySetItems = async (db: SchemaDB, userId: string) => {
	return await db.query.mySetItem.findMany({
		where: eq(mySetItem.userId, userId),
		orderBy: asc(mySetItem.itemName),
	});
};
