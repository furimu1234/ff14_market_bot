import { eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { guildPanel } from '../schema';
import { getGuildPanel } from './getGuildPanels';

export const upsertGuildPanel = async (
	db: SchemaDB,
	guildId: string,
	panelType: string,
	channelId: string,
	messageId: string | null = null,
) => {
	const now = new Date();
	const current = await getGuildPanel(db, guildId, panelType);

	if (current) {
		return await db
			.update(guildPanel)
			.set({ channelId, messageId, updatedAt: now })
			.where(eq(guildPanel.id, current.id))
			.returning();
	}

	return await db
		.insert(guildPanel)
		.values({
			guildId,
			panelType,
			channelId,
			messageId,
			createdAt: now,
			updatedAt: now,
		})
		.returning();
};

export const updateGuildPanelMessageId = async (
	db: SchemaDB,
	id: number,
	messageId: string,
) => {
	return await db
		.update(guildPanel)
		.set({ messageId, updatedAt: new Date() })
		.where(eq(guildPanel.id, id))
		.returning();
};
