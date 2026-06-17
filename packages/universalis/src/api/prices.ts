import { request } from './base';
import { UNIVERSALIS_BASE_URL } from './consts';
import type {
	MarketResponse,
	MultiMarketResponse,
	TopMarketPrice,
	WorldEntry,
	WorldPrice,
} from './types';

const TOP_PRICE_BATCH_SIZE = 100;

/**
 * 指定アイテムの日本DC各ワールドにおける最安出品を取得します。
 */
export const fetchJapanPrices = async (
	itemId: number,
	worlds: WorldEntry[],
): Promise<WorldPrice[]> => {
	const results = await Promise.all(
		worlds.map(async (world) => {
			const response = await request<MarketResponse>(
				`${UNIVERSALIS_BASE_URL}/${encodeURIComponent(world.name)}/${itemId}?listings=1&entries=0`,
			);
			const listing = response.listings?.[0];

			return {
				...world,
				pricePerUnit: listing?.pricePerUnit,
				quantity: listing?.quantity,
				hq: listing?.hq ?? false,
			};
		}),
	);

	return results;
};

/**
 * マーケット取引可能な全アイテム ID を取得します。
 */
export const fetchMarketableItemIds = async (): Promise<number[]> => {
	return await request<number[]>(`${UNIVERSALIS_BASE_URL}/marketable`);
};

/**
 * 日本リージョン全体で現在出品されている最高単価トップ 10 を取得します。
 */
export const fetchJapanTopMaximumPrices = async (
	limit: number = 10,
): Promise<TopMarketPrice[]> => {
	const itemIds = await fetchMarketableItemIds();
	const topPrices: TopMarketPrice[] = [];

	for (const batch of chunk(itemIds, TOP_PRICE_BATCH_SIZE)) {
		const response = await request<MultiMarketResponse>(
			`${UNIVERSALIS_BASE_URL}/Japan/${batch.join(',')}?listings=0&entries=0`,
		);

		for (const item of Object.values(response.items ?? {})) {
			if (!item.hasData || !item.itemID || !item.maxPrice) continue;
			if (item.maxPrice <= 0) continue;

			topPrices.push({
				itemId: item.itemID,
				maxPrice: item.maxPrice,
			});
		}
	}

	return topPrices
		.sort((a, b) => b.maxPrice - a.maxPrice || a.itemId - b.itemId)
		.slice(0, limit);
};

const chunk = <T>(items: T[], size: number) => {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
};
