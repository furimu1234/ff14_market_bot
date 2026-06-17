import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';

export const homeWorld = pgTable(
	'homeworld',
	{
		userId: varchar('user_id', { length: 19 }).primaryKey(),
		worldName: text('worldname').notNull(),

		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index('homeworld_user_id').on(table.userId)],
);

export const mySetItem = pgTable(
	'myset_item',
	{
		id: serial('id').primaryKey(),
		userId: varchar('user_id', { length: 19 }).notNull(),
		itemId: integer('item_id').notNull(),
		itemName: text('item_name').notNull(),

		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index('myset_item_user_id').on(table.userId),
		index('myset_item_user_item_id').on(table.userId, table.itemId),
	],
);

export const guildPanel = pgTable(
	'guild_panel',
	{
		id: serial('id').primaryKey(),
		guildId: varchar('guild_id', { length: 20 }).notNull(),
		panelType: text('panel_type').notNull(),
		channelId: varchar('channel_id', { length: 20 }).notNull(),
		messageId: varchar('message_id', { length: 20 }),

		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index('guild_panel_guild_id').on(table.guildId),
		index('guild_panel_channel_id').on(table.channelId),
		index('guild_panel_guild_panel_type').on(table.guildId, table.panelType),
	],
);
