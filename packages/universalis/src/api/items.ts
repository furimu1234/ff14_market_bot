import { request } from './base';
import {
	CAFEMAKER_SEARCH_URL,
	XIVAPI_SEARCH_URL,
	XIVAPI_V2_SEARCH_URL,
} from './consts';
import type { ItemDetail, ItemSearchResult } from './types';

/**
 * 日本語アイテム名を XIVAPI と Cafemaker から検索します。
 */
export const searchItem = async (
	query: string,
): Promise<ItemSearchResult | undefined> => {
	const legacySearchParams = new URLSearchParams({
		indexes: 'Item',
		string: query,
		language: 'ja',
		columns: 'ID,Name',
	});
	const v2SearchParams = new URLSearchParams({
		sheets: 'Item',
		query: `Name~"${escapeSearchQuery(query)}"`,
		language: 'ja',
	});

	const results = await Promise.allSettled([
		fetchItemFromV2SearchApi(
			`${XIVAPI_V2_SEARCH_URL}?${v2SearchParams.toString()}`,
			query,
		),
		fetchItemFromSearchApi(
			`${XIVAPI_SEARCH_URL}?${legacySearchParams.toString()}`,
			query,
		),
		fetchItemFromSearchApi(
			`${CAFEMAKER_SEARCH_URL}?${legacySearchParams.toString()}`,
			query,
		),
	]);

	for (const result of results) {
		if (result.status === 'fulfilled' && result.value) {
			return result.value;
		}
	}

	return undefined;
};

/**
 * アイテム ID から日本語の詳細情報を取得します。
 */
export const fetchItemDetail = async (
	itemId: number,
): Promise<ItemDetail | undefined> => {
	const results = await Promise.allSettled([
		fetchItemDetailFromApi(
			`${CAFEMAKER_SEARCH_URL.replace('/search', '')}/Item/${itemId}?language=ja`,
		),
		fetchItemDetailFromApi(
			`${XIVAPI_SEARCH_URL.replace('/search', '')}/Item/${itemId}?language=ja`,
		),
	]);

	for (const result of results) {
		if (result.status === 'fulfilled' && result.value) {
			return result.value;
		}
	}

	return undefined;
};

/**
 * アイテム検索 API レスポンスから最初の有効な検索結果を取り出します。
 */
const fetchItemFromSearchApi = async (
	url: string,
	query: string,
): Promise<ItemSearchResult | undefined> => {
	const body = await request<{
		Results?: { ID?: number; Name?: string }[];
	}>(url);
	const item = findBestItemMatch(
		body.Results?.map((result) => ({
			id: result.ID,
			name: result.Name,
		})),
		query,
	);
	if (!item) return undefined;

	return item;
};

/**
 * XIVAPI v2 検索レスポンスから最も近いアイテムを取り出します。
 */
const fetchItemFromV2SearchApi = async (
	url: string,
	query: string,
): Promise<ItemSearchResult | undefined> => {
	const body = await request<{
		results?: {
			row_id?: number;
			fields?: { Name?: string };
		}[];
	}>(url);

	return findBestItemMatch(
		body.results?.map((result) => ({
			id: result.row_id,
			name: result.fields?.Name,
		})),
		query,
	);
};

const findBestItemMatch = (
	items: { id?: number; name?: string }[] | undefined,
	query: string,
): ItemSearchResult | undefined => {
	const validItems = items?.filter(
		(item): item is { id: number; name: string } =>
			Boolean(item.id && item.name),
	);
	if (!validItems || validItems.length === 0) return undefined;

	const normalizedQuery = normalizeItemName(query);
	const exactMatch = validItems.find(
		(item) => normalizeItemName(item.name) === normalizedQuery,
	);
	const item = exactMatch ?? validItems[0];

	return { id: item.id, name: item.name };
};

const normalizeItemName = (value: string) => {
	return value.normalize('NFKC').trim().toLocaleLowerCase('ja-JP');
};

const escapeSearchQuery = (value: string) => {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

/**
 * アイテム詳細 API レスポンスを表示用に整形します。
 */
const fetchItemDetailFromApi = async (
	url: string,
): Promise<ItemDetail | undefined> => {
	const body = await request<{
		ID?: number;
		Name?: string;
		Description?: string;
		Description_ja?: string;
		ItemSearchCategory?: { Name?: string; Name_ja?: string };
		GameContentLinks?: Record<string, Record<string, unknown> | unknown>;
		Url?: string;
	}>(url);

	if (!body.ID || !body.Name) return undefined;

	return {
		id: body.ID,
		name: body.Name,
		description: body.Description_ja ?? body.Description,
		categoryName:
			body.ItemSearchCategory?.Name_ja ?? body.ItemSearchCategory?.Name,
		obtainMethod: inferObtainMethod(body.GameContentLinks),
		url: body.Url,
	};
};

/**
 * XIVAPI/CafeMaker の関連リンクから主な入手方法を推定します。
 */
const inferObtainMethod = (
	links: Record<string, Record<string, unknown> | unknown> | undefined,
) => {
	if (!links) return '不明';

	const keys = Object.keys(links);
	const methods = new Set<string>();

	if (keys.includes('GatheringItem')) methods.add('採集');
	if (
		keys.includes('FishingSpot') ||
		keys.includes('FishParameter') ||
		keys.includes('SpearfishingItem')
	) {
		methods.add('釣り');
	}
	if (keys.includes('Quest')) methods.add('クエスト');
	if (
		keys.includes('GilShop') ||
		keys.includes('SpecialShop') ||
		keys.includes('InclusionShop') ||
		keys.includes('CollectablesShop') ||
		keys.includes('FateShop') ||
		keys.includes('MobHuntReward')
	) {
		methods.add('ショップ/交換');
	}
	if (
		keys.includes('RetainerTaskNormal') ||
		keys.includes('RetainerTaskRandom') ||
		keys.includes('RetainerTaskParameter')
	) {
		methods.add('リテイナー探索');
	}
	if (
		keys.includes('InstanceContent') ||
		keys.includes('ContentFinderCondition') ||
		keys.includes('ContentRoulette')
	) {
		methods.add('コンテンツ報酬');
	}
	if (keys.includes('TreasureHuntRank')) methods.add('宝の地図');
	if (keys.includes('GardeningSeed')) methods.add('栽培');
	if (
		keys.includes('AirshipExplorationPoint') ||
		keys.includes('SubmarineExploration')
	) {
		methods.add('探索航海');
	}
	if (keys.includes('Achievement')) methods.add('アチーブメント');
	if (keys.includes('CompanyCraftSequence')) methods.add('カンパニークラフト');

	const recipeLinks = links.Recipe;
	if (isRecord(recipeLinks)) {
		const recipeKeys = Object.keys(recipeLinks);
		if (recipeKeys.some((key) => key.startsWith('ItemResult'))) {
			methods.add('製作');
		}
		if (recipeKeys.some((key) => key.startsWith('ItemIngredient'))) {
			methods.add('製作素材');
		}
	}

	if (methods.size === 0) return '不明';
	return [...methods].join(' / ');
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null;
};
