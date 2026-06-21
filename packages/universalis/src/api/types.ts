export type WorldEntry = {
	id: number;
	name: string;
	dataCenter: string;
};

export type ItemSearchResult = {
	id: number;
	name: string;
};

export type ItemDetail = ItemSearchResult & {
	description: string | undefined;
	categoryName: string | undefined;
	obtainMethod: string;
	url: string | undefined;
};

export type DataCenterEntry = {
	name?: string;
	region?: string;
	worlds?: number[];
};

export type WorldApiEntry = {
	id: number;
	name: string;
};

export type MarketListing = {
	pricePerUnit?: number;
	quantity?: number;
	hq?: boolean;
};

export type MarketResponse = {
	listings?: MarketListing[];
};

export type MultiMarketItemResponse = {
	itemID?: number;
	minPrice?: number;
	minPriceNQ?: number;
	minPriceHQ?: number;
	maxPrice?: number;
	maxPriceNQ?: number;
	maxPriceHQ?: number;
	regularSaleVelocity?: number;
	nqSaleVelocity?: number;
	hqSaleVelocity?: number;
	recentHistoryCount?: number;
	unitsSold?: number;
	hasData?: boolean;
};

export type MultiMarketResponse = {
	items?: Record<string, MultiMarketItemResponse>;
};

export type WorldPrice = WorldEntry & {
	pricePerUnit: number | undefined;
	quantity: number | undefined;
	hq: boolean;
};

export type TopMarketPrice = {
	itemId: number;
	minPrice: number;
	saleVelocity: number;
	demandScore: number;
	recentHistoryCount: number;
	unitsSold: number;
};
