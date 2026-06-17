import { getHomeWorld } from '@ff14_market/db';
import {
	fetchJapanPrices,
	fetchJapanWorlds,
	type ItemSearchResult,
	searchItem,
	type WorldPrice,
} from '@ff14_market/universalis';
import type { Message } from 'discord.js';
import { container } from './container';

const DISCORD_MESSAGE_LIMIT = 2000;

export const handleMarketMention = async (message: Message) => {
	if (message.author.bot) return;
	if (!message.client.user) return;
	if (!message.mentions.has(message.client.user)) return;

	const itemName = getMentionQuery(message.content, message.client.user.id);
	if (!itemName) {
		await message.reply('アイテム名をメンションの後に入力してください。');
		return;
	}

	const progress = await message.reply(`「${itemName}」の価格を検索中です...`);

	try {
		const homeWorld = await findHomeWorld(message.author.id);
		const item = await searchItem(itemName);

		if (!item) {
			await progress.edit(
				`「${itemName}」に一致するアイテムが見つかりませんでした。`,
			);
			return;
		}

		const worlds = await fetchJapanWorlds();
		const prices = await fetchJapanPrices(item.id, worlds);
		const lines = formatMarketLines(item, prices, homeWorld?.worldName);
		const chunks = chunkLines(lines, DISCORD_MESSAGE_LIMIT);

		await progress.edit(chunks[0]);
		for (const chunk of chunks.slice(1)) {
			if ('send' in message.channel) {
				await message.channel.send(chunk);
			}
		}
	} catch (error) {
		console.error('Failed to fetch market prices:', error);
		await progress.edit(
			'価格の取得中にエラーが発生しました。時間をおいて再度試してください。',
		);
	}
};

const getMentionQuery = (content: string, botUserId: string) => {
	return content.replace(new RegExp(`<@!?${botUserId}>`, 'g'), '').trim();
};

const findHomeWorld = async (userId: string) => {
	if (!container.current) return undefined;

	const store = container.current.getDataStore();
	return await store.do(async (db) => {
		return await getHomeWorld(db, userId);
	});
};

const formatMarketLines = (
	item: ItemSearchResult,
	prices: WorldPrice[],
	homeWorldName: string | undefined,
) => {
	const normalizedHomeWorldName = homeWorldName?.toLowerCase();
	const sortedPrices = [...prices].sort((a, b) => {
		const aIsHome = a.name.toLowerCase() === normalizedHomeWorldName;
		const bIsHome = b.name.toLowerCase() === normalizedHomeWorldName;
		if (aIsHome !== bIsHome) return aIsHome ? -1 : 1;

		return (
			a.dataCenter.localeCompare(b.dataCenter) || a.name.localeCompare(b.name)
		);
	});

	return [
		`**${item.name}** 日本DC 価格一覧`,
		...(homeWorldName ? [`ホームワールド: ${homeWorldName}`] : []),
		'',
		...sortedPrices.map((price) => {
			const prefix =
				price.name.toLowerCase() === normalizedHomeWorldName ? '★ ' : '';
			const amount =
				price.pricePerUnit === undefined
					? '出品なし'
					: `${price.pricePerUnit.toLocaleString('ja-JP')} gil${
							price.hq ? ' HQ' : ''
						}${price.quantity ? ` x${price.quantity}` : ''}`;

			return `${prefix}${price.dataCenter} / ${price.name}: ${amount}`;
		}),
	];
};

const chunkLines = (lines: string[], maxLength: number) => {
	const chunks: string[] = [];
	let current = '';

	for (const line of lines) {
		const next = current ? `${current}\n${line}` : line;
		if (next.length > maxLength && current) {
			chunks.push(current);
			current = line;
		} else {
			current = next;
		}
	}

	if (current) chunks.push(current);
	return chunks;
};
