import { request } from './base';
import { CAFEMAKER_SEARCH_URL, XIVAPI_SEARCH_URL } from './consts';
import type { ItemDetail, ItemSearchResult } from './types';

/**
 * 日本語アイテム名を XIVAPI と Cafemaker から検索します。
 */
export const searchItem = async (
	query: string,
): Promise<ItemSearchResult | undefined> => {
	const searchParams = new URLSearchParams({
		indexes: 'Item',
		string: query,
		language: 'ja',
		columns: 'ID,Name',
	});

	const results = await Promise.allSettled([
		fetchItemFromSearchApi(`${XIVAPI_SEARCH_URL}?${searchParams.toString()}`),
		fetchItemFromSearchApi(
			`${CAFEMAKER_SEARCH_URL}?${searchParams.toString()}`,
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
): Promise<ItemSearchResult | undefined> => {
	const body = await request<{
		Results?: { ID?: number; Name?: string }[];
	}>(url);
	const exactMatch = body.Results?.find((item) => item.Name && item.ID);
	if (!exactMatch?.ID || !exactMatch.Name) return undefined;

	return {
		id: exactMatch.ID,
		name: exactMatch.Name,
	};
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
	if (!links) return '詳細情報を参照';

	const keys = Object.keys(links);
	const methods = new Set<string>();

	if (keys.includes('GatheringItem')) methods.add('採集');
	if (keys.includes('FishingSpot') || keys.includes('FishParameter')) {
		methods.add('釣り');
	}
	if (keys.includes('Quest')) methods.add('クエスト');
	if (keys.includes('GilShop') || keys.includes('SpecialShop')) {
		methods.add('ショップ/交換');
	}
	if (
		keys.includes('RetainerTaskNormal') ||
		keys.includes('RetainerTaskRandom')
	) {
		methods.add('リテイナー探索');
	}
	if (
		keys.includes('InstanceContent') ||
		keys.includes('ContentFinderCondition')
	) {
		methods.add('コンテンツ報酬');
	}

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

	if (methods.size === 0) return '詳細情報を参照';
	return [...methods].join(' / ');
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null;
};
