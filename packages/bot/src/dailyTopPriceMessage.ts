import {
	fetchItemDetail,
	fetchJapanTopMaximumPrices,
	type ItemDetail,
	type TopMarketPrice,
} from '@ff14_market/universalis';
import { EmbedBuilder } from 'discord.js';

const RANKING_LIMIT = 10;
const SOURCE_FOOTER_TEXT = 'source: universalis / xivapi / cafemaker';
const CAFEMAKER_BASE_URL = 'https://cafemaker.wakingsands.com';

type TopPriceEntry = TopMarketPrice & {
	item: ItemDetail | undefined;
};

/**
 * 全ワールド最高価格 Top 10 のメッセージを生成します。
 */
export const buildDailyTopPriceMessage = async () => {
	const topPrices = await fetchJapanTopMaximumPrices(RANKING_LIMIT);
	const entries = await Promise.all(
		topPrices.map(async (price) => ({
			...price,
			item: await fetchItemDetail(price.itemId),
		})),
	);

	return {
		embeds: [
			new EmbedBuilder()
				.setTitle('🏆 全ワールド高額アイテムランキング Top 10')
				.setColor(0xf2b84b)
				.setDescription('日本リージョン全体の現在出品最高単価です。')
				.addFields(
					entries.map((entry, index) => ({
						name: formatEntryTitle(entry, index),
						value: formatEntryBody(entry),
					})),
				)
				.setTimestamp(new Date())
				.setFooter({ text: SOURCE_FOOTER_TEXT }),
		],
	};
};

const formatEntryTitle = (entry: TopPriceEntry, index: number) => {
	return `${getRankEmoji(index)} ${index + 1}. ${entry.item?.name ?? `Item ${entry.itemId}`}`;
};

const formatEntryBody = (entry: TopPriceEntry) => {
	const detailsUrl = entry.item?.url
		? `${CAFEMAKER_BASE_URL}${entry.item.url}`
		: undefined;

	return [
		`💰 金額: ${entry.maxPrice.toLocaleString('ja-JP')} gil`,
		`📦 入手方法: ${entry.item?.obtainMethod ?? '詳細情報を参照'}`,
		...(entry.item?.categoryName ? [`🏷️ 分類: ${entry.item.categoryName}`] : []),
		...(detailsUrl ? [`🔗 詳細: ${detailsUrl}`] : []),
	].join('\n');
};

const getRankEmoji = (index: number) => {
	if (index === 0) return '🥇';
	if (index === 1) return '🥈';
	if (index === 2) return '🥉';
	return '🏅';
};
