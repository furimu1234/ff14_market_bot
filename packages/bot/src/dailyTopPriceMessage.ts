import {
	fetchItemDetail,
	fetchJapanTopDemandPricesUnderLimit,
	type ItemDetail,
	type TopMarketPrice,
} from '@ff14_market/universalis';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from 'discord.js';

const RANKING_LIMIT = 10;
const RANKING_DETAIL_LIMIT = 30;
const SOURCE_FOOTER_TEXT = 'source: universalis / xivapi / cafemaker';
export const DAILY_TOP_PRICE_CALCULATION_CUSTOM_ID =
	'daily-top-price:calculation';

type TopPriceEntry = TopMarketPrice & {
	item: ItemDetail;
};

/**
 * 最安値 100 万 gil 以内の需要アイテム Top 10 メッセージを生成します。
 */
export const buildDailyTopPriceMessage = async () => {
	const topPrices =
		await fetchJapanTopDemandPricesUnderLimit(RANKING_DETAIL_LIMIT);
	const entriesWithDetails = await Promise.all(
		topPrices.map(async (price) => ({
			...price,
			item: await fetchItemDetail(price.itemId),
		})),
	);
	const entries = entriesWithDetails
		.filter(hasJapaneseItemDetail)
		.slice(0, RANKING_LIMIT);
	const fields =
		entries.length > 0
			? entries.map((entry, index) => ({
					name: formatEntryTitle(entry, index),
					value: formatEntryBody(entry),
				}))
			: [
					{
						name: '📭 該当データなし',
						value:
							'条件に一致するマーケットデータを取得できませんでした。次回更新時に再取得します。',
					},
				];

	return {
		embeds: [
			new EmbedBuilder()
				.setTitle('📈 最安値100万gil以内 需要ランキング Top 10')
				.setColor(0xf2b84b)
				.setDescription(
					'日本リージョン全体で、売れ行きと最安値から需要が高いアイテムを表示します。',
				)
				.addFields(fields)
				.setTimestamp(new Date())
				.setFooter({ text: SOURCE_FOOTER_TEXT }),
		],
		components: [
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(DAILY_TOP_PRICE_CALCULATION_CUSTOM_ID)
					.setLabel('📈 需要の計算方法')
					.setStyle(ButtonStyle.Secondary),
			),
		],
	};
};

const formatEntryTitle = (entry: TopPriceEntry, index: number) => {
	return `${getRankEmoji(index)} ${index + 1}. ${entry.item.name}`;
};

const formatEntryBody = (entry: TopPriceEntry) => {
	return [
		`💰 最安値: ${entry.minPrice.toLocaleString('ja-JP')} gil`,
		`📦 入手方法: ${entry.item.obtainMethod}`,
		...(entry.item.categoryName ? [`🏷️ 分類: ${entry.item.categoryName}`] : []),
	].join('\n');
};

const getRankEmoji = (index: number) => {
	if (index === 0) return '🥇';
	if (index === 1) return '🥈';
	if (index === 2) return '🥉';
	return '🏅';
};

const hasJapaneseItemDetail = (
	entry: TopMarketPrice & { item: ItemDetail | undefined },
): entry is TopPriceEntry => {
	return Boolean(entry.item?.name);
};
