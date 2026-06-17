import {
	getGuildPanelsByChannel,
	updateGuildPanelMessageId,
} from '@ff14_market/db';
import { container, Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { buildPanelMessage, type PanelType } from '../panelMessage';

export class PanelAutoRefreshListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options,
	) {
		super(context, {
			...options,
			event: 'messageCreate',
		});
	}

	public override async run(message: Message) {
		if (message.author.bot) return;
		if (!message.guildId) return;
		if (!message.channel.isSendable()) return;

		const panels = await container.dataStore.do(async (db) => {
			return await getGuildPanelsByChannel(
				db,
				message.guildId ?? '',
				message.channel.id,
			);
		});
		if (panels.length === 0) return;

		for (const panel of panels) {
			if (!isRefreshablePanelType(panel.panelType)) continue;

			if (panel.messageId && 'messages' in message.channel) {
				await message.channel.messages.delete(panel.messageId).catch(() => {});
			}

			const panelMessage = await message.channel.send(
				buildPanelMessage(panel.panelType as PanelType),
			);
			await container.dataStore.do(async (db) => {
				await updateGuildPanelMessageId(db, panel.id, panelMessage.id);
			});
		}
	}
}

const isRefreshablePanelType = (panelType: string): panelType is PanelType => {
	return panelType === 'myset' || panelType === 'market';
};
