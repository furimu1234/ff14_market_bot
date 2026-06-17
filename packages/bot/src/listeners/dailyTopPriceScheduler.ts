import { getGuildPanelsByType } from '@ff14_market/db';
import { container, Listener } from '@sapphire/framework';
import type { Client } from 'discord.js';
import { buildDailyTopPriceMessage } from '../dailyTopPriceMessage';

const DAILY_TOP_PANEL_TYPE = 'dailyTop';
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | undefined;

export class DailyTopPriceSchedulerListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options,
	) {
		super(context, {
			...options,
			event: 'ready',
			once: true,
		});
	}

	public override run(client: Client) {
		scheduleNextDailyTopPost(client);
	}
}

/**
 * 次の JST 0:00 に高額ランキング投稿を予約します。
 */
const scheduleNextDailyTopPost = (client: Client) => {
	if (timer) clearTimeout(timer);

	timer = setTimeout(async () => {
		await postDailyTopPrices(client).catch((error) => {
			console.log('daily top price scheduler failed', error);
		});
		scheduleNextDailyTopPost(client);
	}, getMsUntilNextJstMidnight());
};

/**
 * 設定済みチャンネルへ高額ランキングを投稿します。
 */
const postDailyTopPrices = async (client: Client) => {
	const panels = await container.dataStore.do(async (db) => {
		return await getGuildPanelsByType(db, DAILY_TOP_PANEL_TYPE);
	});
	if (panels.length === 0) return;

	const message = await buildDailyTopPriceMessage();

	for (const panel of panels) {
		const channel = await client.channels
			.fetch(panel.channelId)
			.catch(() => null);
		if (!channel?.isSendable()) continue;

		await channel.send(message).catch((error) => {
			console.log('daily top price post failed', {
				guildId: panel.guildId,
				channelId: panel.channelId,
				error,
			});
		});
	}
};

const getMsUntilNextJstMidnight = () => {
	const now = new Date();
	const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
	const nextJstMidnight = Date.UTC(
		jstNow.getUTCFullYear(),
		jstNow.getUTCMonth(),
		jstNow.getUTCDate() + 1,
		0,
		0,
		0,
		0,
	);

	return nextJstMidnight - jstNow.getTime();
};
