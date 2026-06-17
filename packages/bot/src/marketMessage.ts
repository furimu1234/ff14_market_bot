import type { ItemSearchResult, WorldPrice } from '@ff14_market/universalis';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from 'discord.js';

export const MARKET_CUSTOM_ID_PREFIX = 'market';
export const MARKET_AMOUNT_INPUT_ID = 'amount';

const DATA_CENTERS = ['Elemental', 'Gaia', 'Mana', 'Meteor'] as const;
const SOURCE_FOOTER_TEXT = 'source: universalis / xivapi / cafemaker';

type MarketFilter =
	| { type: 'all' }
	| { type: 'listed' }
	| { type: 'dataCenter'; dataCenter: string }
	| { type: 'price'; comparison: 'gte' | 'lte'; amount: number };

/**
 * 価格一覧 Embed と操作ボタンを生成します。
 */
export const buildMarketMessage = (
	item: ItemSearchResult,
	prices: WorldPrice[],
	homeWorldName: string | undefined,
	filter: MarketFilter = { type: 'all' },
) => {
	return {
		embeds: [formatMarketEmbed(item, prices, homeWorldName, filter)],
		components: buildMarketComponents(item.id),
	};
};

/**
 * DC 絞り込みボタンの customId を作ります。
 */
export const createMarketDataCenterCustomId = (
	itemId: number,
	dataCenter: string,
) => {
	return `${MARKET_CUSTOM_ID_PREFIX}:dc:${itemId}:${dataCenter}`;
};

/**
 * 金額入力 Modal を開くボタンの customId を作ります。
 */
export const createMarketAmountButtonCustomId = (
	itemId: number,
	comparison: 'gte' | 'lte',
) => {
	return `${MARKET_CUSTOM_ID_PREFIX}:amount:${comparison}:${itemId}`;
};

/**
 * 金額入力 Modal の customId を作ります。
 */
export const createMarketAmountModalCustomId = (
	itemId: number,
	comparison: 'gte' | 'lte',
) => {
	return `${MARKET_CUSTOM_ID_PREFIX}:amount-modal:${comparison}:${itemId}`;
};

/**
 * 全DC表示ボタンの customId を作ります。
 */
export const createMarketResetCustomId = (itemId: number) => {
	return `${MARKET_CUSTOM_ID_PREFIX}:reset:${itemId}`;
};

/**
 * 出品ありのみボタンの customId を作ります。
 */
export const createMarketListedCustomId = (itemId: number) => {
	return `${MARKET_CUSTOM_ID_PREFIX}:listed:${itemId}`;
};

/**
 * ホームワールド変更ボタンの customId を作ります。
 */
export const createMarketHomeWorldCustomId = (itemId: number) => {
	return `${MARKET_CUSTOM_ID_PREFIX}:home:${itemId}`;
};

/**
 * ホームワールド選択メニューの customId を作ります。
 */
export const createMarketHomeWorldSelectCustomId = (dataCenter: string) => {
	return `${MARKET_CUSTOM_ID_PREFIX}:home-select:${dataCenter}`;
};

/**
 * customId から価格一覧操作の内容を取り出します。
 */
export const parseMarketCustomId = (customId: string) => {
	const [prefix, action, first, second] = customId.split(':');
	if (prefix !== MARKET_CUSTOM_ID_PREFIX) return undefined;

	if (action === 'dc') {
		const itemId = Number(first);
		if (!Number.isSafeInteger(itemId) || !second) return undefined;
		return { action, itemId, dataCenter: second } as const;
	}

	if (action === 'amount' || action === 'amount-modal') {
		const comparison = first;
		const itemId = Number(second);
		if (
			(comparison !== 'gte' && comparison !== 'lte') ||
			!Number.isSafeInteger(itemId)
		) {
			return undefined;
		}

		return { action, itemId, comparison } as const;
	}

	if (action === 'reset' || action === 'listed') {
		const itemId = Number(first);
		if (!Number.isSafeInteger(itemId)) return undefined;
		return { action, itemId } as const;
	}

	if (action === 'home') {
		const itemId = Number(first);
		if (!Number.isSafeInteger(itemId)) return undefined;
		return { action, itemId } as const;
	}

	if (action === 'home-select') {
		if (!first) return undefined;
		return { action, dataCenter: first } as const;
	}

	return undefined;
};

/**
 * Embed title からアイテム名を取り出します。
 */
export const getMarketItemNameFromTitle = (title: string | null) => {
	return title?.replace(/ 価格一覧.*$/, '') || undefined;
};

/**
 * 価格一覧を DC ごとの Discord Embed に整形します。
 */
const formatMarketEmbed = (
	item: ItemSearchResult,
	prices: WorldPrice[],
	homeWorldName: string | undefined,
	filter: MarketFilter,
) => {
	const normalizedHomeWorldName = homeWorldName?.toLowerCase();
	const homeDataCenter = prices.find(
		(price) => price.name.toLowerCase() === normalizedHomeWorldName,
	)?.dataCenter;
	const filteredPrices = filterPrices(prices, filter);
	const pricesByDataCenter = groupPricesByDataCenter(filteredPrices);
	const dataCenters = [...pricesByDataCenter.keys()].sort((a, b) => {
		if (homeDataCenter) {
			const aIsHomeDataCenter = a === homeDataCenter;
			const bIsHomeDataCenter = b === homeDataCenter;
			if (aIsHomeDataCenter !== bIsHomeDataCenter) {
				return aIsHomeDataCenter ? -1 : 1;
			}
		}

		return a.localeCompare(b);
	});

	const embed = new EmbedBuilder()
		.setTitle(`🛒 ${item.name} 価格一覧${getFilterLabel(filter)}`)
		.setColor(0x3f8fcd)
		.setFooter({ text: SOURCE_FOOTER_TEXT });

	const description = [
		`🏆 全ワールド最安値: ${formatLowestPrice(prices)}`,
	].join('\n');
	embed.setDescription(description);

	if (dataCenters.length === 0) {
		embed.addFields({
			name: '🔍 該当なし',
			value: '条件に一致する出品はありません。',
			inline: false,
		});
		return embed;
	}

	for (const dataCenter of dataCenters) {
		const dataCenterPrices = pricesByDataCenter.get(dataCenter) ?? [];
		embed.addFields({
			name:
				dataCenter === homeDataCenter ? `⭐ ${dataCenter}` : `🗺️ ${dataCenter}`,
			value: dataCenterPrices
				.sort((a, b) => {
					const aIsHome = a.name.toLowerCase() === normalizedHomeWorldName;
					const bIsHome = b.name.toLowerCase() === normalizedHomeWorldName;
					if (aIsHome !== bIsHome) return aIsHome ? -1 : 1;

					return a.name.localeCompare(b.name);
				})
				.map((price) => formatPriceLine(price, normalizedHomeWorldName))
				.join('\n'),
			inline: false,
		});
	}

	return embed;
};

/**
 * 価格一覧操作用のボタンを生成します。
 */
const buildMarketComponents = (itemId: number) => {
	return [
		new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			...DATA_CENTERS.map((dataCenter) =>
				new ButtonBuilder()
					.setCustomId(createMarketDataCenterCustomId(itemId, dataCenter))
					.setLabel(dataCenter)
					.setStyle(ButtonStyle.Secondary),
			),
			new ButtonBuilder()
				.setCustomId(createMarketResetCustomId(itemId))
				.setLabel('🌐 全DC')
				.setStyle(ButtonStyle.Primary),
		),
		new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(createMarketAmountButtonCustomId(itemId, 'lte'))
				.setLabel('⬇️ 金額以下')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(createMarketAmountButtonCustomId(itemId, 'gte'))
				.setLabel('⬆️ 金額以上')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(createMarketListedCustomId(itemId))
				.setLabel('✅ 出品ありのみ')
				.setStyle(ButtonStyle.Secondary),
		),
		new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(createMarketHomeWorldCustomId(itemId))
				.setLabel('🏠 ホームワールド変更')
				.setStyle(ButtonStyle.Success),
		),
	];
};

/**
 * 指定された表示条件で価格一覧を絞り込みます。
 */
const filterPrices = (prices: WorldPrice[], filter: MarketFilter) => {
	if (filter.type === 'all') return prices;

	if (filter.type === 'dataCenter') {
		return prices.filter((price) => price.dataCenter === filter.dataCenter);
	}

	if (filter.type === 'listed') {
		return prices.filter((price) => price.pricePerUnit !== undefined);
	}

	return prices.filter((price) => {
		if (price.pricePerUnit === undefined) return false;
		if (filter.comparison === 'gte') return price.pricePerUnit >= filter.amount;
		return price.pricePerUnit <= filter.amount;
	});
};

/**
 * Embed title に表示する絞り込み条件ラベルを返します。
 */
const getFilterLabel = (filter: MarketFilter) => {
	if (filter.type === 'all') return '';
	if (filter.type === 'listed') return ' / 出品ありのみ';
	if (filter.type === 'dataCenter') return ` / ${filter.dataCenter}`;

	const operator = filter.comparison === 'gte' ? '以上' : '以下';
	return ` / ${filter.amount.toLocaleString('ja-JP')} gil ${operator}`;
};

/**
 * 表示対象の中で最安値のワールドと単価を返します。
 */
const formatLowestPrice = (prices: WorldPrice[]) => {
	const lowestPrice = prices
		.filter((price) => price.pricePerUnit !== undefined)
		.sort((a, b) => (a.pricePerUnit ?? 0) - (b.pricePerUnit ?? 0))[0];

	if (!lowestPrice || lowestPrice.pricePerUnit === undefined) {
		return '出品なし';
	}

	return `${lowestPrice.dataCenter} / ${lowestPrice.name}: ${lowestPrice.pricePerUnit.toLocaleString('ja-JP')} gil${
		lowestPrice.hq ? ' HQ' : ''
	}`;
};

/**
 * 価格一覧を DC 名ごとにまとめます。
 */
const groupPricesByDataCenter = (prices: WorldPrice[]) => {
	const pricesByDataCenter = new Map<string, WorldPrice[]>();

	for (const price of prices) {
		const dataCenterPrices = pricesByDataCenter.get(price.dataCenter);
		if (dataCenterPrices) {
			dataCenterPrices.push(price);
		} else {
			pricesByDataCenter.set(price.dataCenter, [price]);
		}
	}

	return pricesByDataCenter;
};

/**
 * ワールドごとの単価を Embed field 内の 1 行に整形します。
 */
const formatPriceLine = (
	price: WorldPrice,
	normalizedHomeWorldName: string | undefined,
) => {
	const prefix =
		price.name.toLowerCase() === normalizedHomeWorldName ? '⭐ ' : '';
	const amount =
		price.pricePerUnit === undefined
			? '出品なし'
			: `${price.pricePerUnit.toLocaleString('ja-JP')} gil${
					price.hq ? ' HQ' : ''
				}`;

	return `${prefix}${price.name}: ${amount}`;
};
