import { ApiRequestError, request } from './base';
import { UNIVERSALIS_BASE_URL } from './consts';
import type {
	MarketResponse,
	MultiMarketResponse,
	TopMarketPrice,
	WorldEntry,
	WorldPrice,
} from './types';

const TOP_PRICE_BATCH_SIZE = 100;
const TOP_PRICE_MAX_MIN_PRICE = 1_000_000;
const DEMAND_CANDIDATE_LIMIT = 300;
const DEMAND_DETAIL_BATCH_SIZE = 20;
const DEMAND_HISTORY_ENTRIES = 10;

/**
 * 指定アイテムの日本DC各ワールドにおける最安出品を取得します。
 */
export const fetchJapanPrices = async (
	itemId: number,
	worlds: WorldEntry[],
): Promise<WorldPrice[]> => {
	const results = await Promise.all(
		worlds.map(async (world) => {
			try {
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
			} catch (error) {
				if (error instanceof ApiRequestError && error.status === 404) {
					return {
						...world,
						pricePerUnit: undefined,
						quantity: undefined,
						hq: false,
					};
				}

				throw error;
			}
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
 * 日本リージョン全体で需要があり、最安値が 100 万 gil 以内のアイテム Top 10 を取得します。
 */
export const fetchJapanTopDemandPricesUnderLimit = async (
	limit: number = 10,
): Promise<TopMarketPrice[]> => {
	const itemIds = await fetchMarketableItemIds();
	const candidates: TopMarketPrice[] = [];

	for (const batch of chunk(itemIds, TOP_PRICE_BATCH_SIZE)) {
		const response = await request<MultiMarketResponse>(
			`${UNIVERSALIS_BASE_URL}/Japan/${batch.join(',')}?listings=0&entries=0`,
		);

		for (const item of Object.values(response.items ?? {})) {
			if (!item.hasData || !item.itemID || !item.minPrice) continue;
			if (item.minPrice <= 0 || item.minPrice > TOP_PRICE_MAX_MIN_PRICE) {
				continue;
			}

			candidates.push({
				itemId: item.itemID,
				minPrice: item.minPrice,
				saleVelocity: 0,
				demandScore: item.minPrice,
				recentHistoryCount: item.recentHistoryCount ?? 0,
				unitsSold: item.unitsSold ?? 0,
			});
		}
	}

	const demandPrices = await fetchDemandDetails(
		candidates
			.sort((a, b) => b.minPrice - a.minPrice || a.itemId - b.itemId)
			.slice(0, DEMAND_CANDIDATE_LIMIT),
	);

	const rankingSource = demandPrices.length > 0 ? demandPrices : candidates;

	return rankingSource
		.sort(
			(a, b) =>
				b.demandScore - a.demandScore ||
				b.saleVelocity - a.saleVelocity ||
				b.minPrice - a.minPrice ||
				a.itemId - b.itemId,
		)
		.slice(0, limit);
};

const fetchDemandDetails = async (
	candidates: TopMarketPrice[],
): Promise<TopMarketPrice[]> => {
	const candidateByItemId = new Map(
		candidates.map((candidate) => [candidate.itemId, candidate]),
	);
	const demandPrices: TopMarketPrice[] = [];

	for (const batch of chunk(candidates, DEMAND_DETAIL_BATCH_SIZE)) {
		const response = await request<MultiMarketResponse>(
			`${UNIVERSALIS_BASE_URL}/Japan/${batch
				.map((candidate) => candidate.itemId)
				.join(',')}?listings=0&entries=${DEMAND_HISTORY_ENTRIES}`,
		).catch(() => undefined);
		if (!response) continue;

		for (const item of Object.values(response.items ?? {})) {
			if (!item.itemID) continue;

			const candidate = candidateByItemId.get(item.itemID);
			if (!candidate) continue;

			const saleVelocity = getSaleVelocity(item);
			const demandCount = getDemandCount(item);
			if (saleVelocity <= 0 && demandCount <= 0) continue;

			demandPrices.push({
				...candidate,
				saleVelocity,
				demandScore: Math.max(saleVelocity, demandCount) * candidate.minPrice,
				recentHistoryCount: item.recentHistoryCount ?? 0,
				unitsSold: item.unitsSold ?? 0,
			});
		}
	}

	return demandPrices;
};

const getSaleVelocity = (item: {
	regularSaleVelocity?: number;
	nqSaleVelocity?: number;
	hqSaleVelocity?: number;
}) => {
	return Math.max(
		item.regularSaleVelocity ?? 0,
		(item.nqSaleVelocity ?? 0) + (item.hqSaleVelocity ?? 0),
	);
};

const getDemandCount = (item: {
	recentHistoryCount?: number;
	unitsSold?: number;
}) => {
	return Math.max(item.recentHistoryCount ?? 0, item.unitsSold ?? 0);
};

const chunk = <T>(items: T[], size: number) => {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
};
