import { Events, Listener } from '@sapphire/framework';
import type { Client } from 'discord.js';
import { buildDailyTopPriceMessage } from '../dailyTopPriceMessage';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAILY_TOP_UPDATE_HOUR = 0;
const DAILY_TOP_UPDATE_MINUTE = 30;

let timer: NodeJS.Timeout | undefined;

export class DailyTopPriceSchedulerListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options,
	) {
		super(context, {
			...options,
			event: Events.ClientReady,
			once: true,
		});
	}

	public override run(client: Client) {
		void postDailyTopPrices(client).catch((error) => {
			console.log('daily top price startup update failed', error);
		});
		scheduleNextDailyTopPost(client);
	}
}

/**
 * 次の JST 0:30 に需要ランキング更新を予約します。
 */
const scheduleNextDailyTopPost = (client: Client) => {
	if (timer) clearTimeout(timer);

	timer = setTimeout(async () => {
		await postDailyTopPrices(client).catch((error) => {
			console.log('daily top price scheduler failed', error);
		});
		scheduleNextDailyTopPost(client);
	}, getMsUntilNextJstUpdateTime());
};

/**
 * 設定済みチャンネルへ需要ランキングを投稿/更新します。
 */
const postDailyTopPrices = async (client: Client) => {
	const message = await buildDailyTopPriceMessage();

	const channel = await client.channels.cache.get('1516638550819344404');

	if (!channel?.isSendable()) return;

	const currentMessage = await channel.messages
		.fetch('1516828513821261965')
		.catch(() => undefined);

	if (currentMessage) {
		const editedMessage = await currentMessage.edit(message).catch((error) => {
			console.log('daily top price edit failed', {
				error,
			});
			return undefined;
		});
		if (editedMessage) return;
	}

	const sentMessage = await channel.send(message).catch((error) => {
		console.log('daily top price post failed', {
			error,
		});
		return undefined;
	});
	if (!sentMessage) return;
};

const getMsUntilNextJstUpdateTime = () => {
	const now = new Date();
	const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
	let nextJstUpdateTime = Date.UTC(
		jstNow.getUTCFullYear(),
		jstNow.getUTCMonth(),
		jstNow.getUTCDate(),
		DAILY_TOP_UPDATE_HOUR,
		DAILY_TOP_UPDATE_MINUTE,
		0,
		0,
	);
	if (nextJstUpdateTime <= jstNow.getTime()) {
		nextJstUpdateTime += 24 * 60 * 60 * 1000;
	}

	return nextJstUpdateTime - jstNow.getTime();
};
