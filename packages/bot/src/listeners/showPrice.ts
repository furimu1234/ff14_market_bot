import { getHomeWorld, getMySetItems } from '@ff14_market/db';
import { EMOJIS, messageID, SendError, wrapSendError } from '@ff14_market/lib';
import {
	fetchJapanPrices,
	fetchJapanWorlds,
	type ItemSearchResult,
	searchItem,
	type WorldEntry,
} from '@ff14_market/universalis';
import { container, Listener } from '@sapphire/framework';
import type { Message, MessageCreateOptions } from 'discord.js';
import { buildMarketMessage } from '../marketMessage';
import { buildMySetMessage } from '../mySetMessage';

export class ShowPriceListener extends Listener {
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
		if (!message.client.user) return;
		if (!message.mentions.has(message.client.user)) return;
		if (!message.channel.isSendable()) return;

		await wrapSendError(
			{ ephemeral: false, channel: message.channel },
			async () => await this.main(message),
		);
	}

	private async main(message: Message) {
		//@Market Moogle シナモン -> シナモン
		const itemName = getMentionQuery(message.content, message.client.user.id);
		if (!itemName) {
			throw new SendError(messageID.E00004());
		}

		const loadingReaction = await message.react(EMOJIS.LOADING);

		try {
			const homeWorld = await findHomeWorld(message.author.id);

			if (itemName === 'マイセット') {
				const items = await findMySetItems(message.author.id);
				await message.reply(
					await buildMySetMessage(items, homeWorld?.worldName),
				);
				return;
			}

			const itemNames = getItemNames(itemName);
			const worlds = await fetchJapanWorlds();
			const marketMessages = await buildMarketMessages(
				itemNames,
				worlds,
				homeWorld?.worldName,
			);

			await sendMarketMessages(message, marketMessages);
		} catch (error) {
			if (error instanceof SendError) throw error;

			console.error('Failed to fetch market prices:', error);
			throw new SendError(messageID.E00003());
		} finally {
			await loadingReaction.users
				.remove(message.client.user.id)
				.catch(() => {});
		}
	}
}

/**
 * bot へのメンション部分を取り除いて、検索対象のアイテム名だけを返します。
 */
const getMentionQuery = (content: string, botUserId: string) => {
	return content.replace(new RegExp(`<@!?${botUserId}>`, 'g'), '').trim();
};

/**
 * 入力された検索文字列を空白区切りのアイテム名リストとして取り出します。
 */
const getItemNames = (query: string) => {
	return query.split(/\s+/).filter((itemName) => itemName.length > 0);
};

/**
 * 複数アイテムの価格表示メッセージを生成します。
 */
const buildMarketMessages = async (
	itemNames: string[],
	worlds: WorldEntry[],
	homeWorldName: string | undefined,
) => {
	const messages: MessageCreateOptions[] = [];
	const missingItemNames: string[] = [];

	for (const itemName of itemNames) {
		const item = await searchItem(itemName);
		if (!item) {
			missingItemNames.push(itemName);
			continue;
		}

		messages.push(await buildSingleMarketMessage(item, worlds, homeWorldName));
	}

	if (missingItemNames.length > 0) {
		messages.push({
			content: `見つからなかったアイテム: ${missingItemNames
				.map((itemName) => `「${itemName}」`)
				.join('、')}`,
		});
	}

	if (messages.length === 0) {
		throw new SendError('一致するアイテムが見つかりませんでした。');
	}

	return messages;
};

/**
 * 1 アイテム分の価格表示メッセージを生成します。
 */
const buildSingleMarketMessage = async (
	item: ItemSearchResult,
	worlds: WorldEntry[],
	homeWorldName: string | undefined,
) => {
	const prices = await fetchJapanPrices(item.id, worlds);
	return buildMarketMessage(item, prices, homeWorldName);
};

/**
 * 生成した価格表示メッセージを順番に送信します。
 */
const sendMarketMessages = async (
	message: Message,
	marketMessages: MessageCreateOptions[],
) => {
	const [firstMessage, ...restMessages] = marketMessages;
	if (!firstMessage) return;

	await message.reply(firstMessage);
	for (const marketMessage of restMessages) {
		if ('send' in message.channel) {
			await message.channel.send(marketMessage);
		}
	}
};

/**
 * ユーザーに登録されているホームワールドを取得します。
 */
const findHomeWorld = async (userId: string) => {
	return await container.dataStore.do(async (db) => {
		return await getHomeWorld(db, userId);
	});
};

/**
 * ユーザーのマイセット登録アイテムを取得します。
 */
const findMySetItems = async (userId: string) => {
	return await container.dataStore.do(async (db) => {
		return await getMySetItems(db, userId);
	});
};
