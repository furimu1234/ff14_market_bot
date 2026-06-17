import { and, eq } from 'drizzle-orm';
import type { SchemaDB } from '../client';
import { guildPanel } from '../schema';

export const getGuildPanel = async (
	db: SchemaDB,
	guildId: string,
	panelType: string,
) => {
	return await db.query.guildPanel.findFirst({
		where: and(
			eq(guildPanel.guildId, guildId),
			eq(guildPanel.panelType, panelType),
		),
	});
};

export const getGuildPanelsByChannel = async (
	db: SchemaDB,
	guildId: string,
	channelId: string,
) => {
	return await db.query.guildPanel.findMany({
		where: and(
			eq(guildPanel.guildId, guildId),
			eq(guildPanel.channelId, channelId),
		),
	});
};

export const getGuildPanelsByType = async (db: SchemaDB, panelType: string) => {
	return await db.query.guildPanel.findMany({
		where: eq(guildPanel.panelType, panelType),
	});
};
