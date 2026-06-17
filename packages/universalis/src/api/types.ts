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
	maxPrice?: number;
	maxPriceNQ?: number;
	maxPriceHQ?: number;
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
	maxPrice: number;
};
