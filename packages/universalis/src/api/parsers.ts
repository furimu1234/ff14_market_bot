import type { DataCenterEntry, WorldApiEntry } from './types';

/**
 * unknown な API レスポンスをオブジェクトとして扱えるか判定します。
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Universalis の worlds レスポンスから worldId と worldName の対応を取り出します。
 */
export const getWorldsById = (response: unknown): Record<string, string> => {
	if (Array.isArray(response)) {
		return Object.fromEntries(
			response
				.filter(isWorldApiEntry)
				.map((world) => [String(world.id), world.name]),
		);
	}

	if (!isRecord(response)) return {};

	if (isRecord(response.worlds)) {
		return getStringRecord(response.worlds);
	}

	return getStringRecord(response);
};

/**
 * Universalis の data-centers レスポンスからデータセンター一覧を取り出します。
 */
export const getDataCenters = (response: unknown): DataCenterEntry[] => {
	if (Array.isArray(response)) {
		return response.filter(isDataCenterEntry);
	}

	if (!isRecord(response)) return [];

	if (Array.isArray(response.dataCenters)) {
		return response.dataCenters.filter(isDataCenterEntry);
	}

	return Object.values(response).filter(isDataCenterEntry);
};

/**
 * unknown な値が Universalis の world エントリとして扱えるか判定します。
 */
export const isWorldApiEntry = (value: unknown): value is WorldApiEntry => {
	if (!isRecord(value)) return false;
	return typeof value.id === 'number' && typeof value.name === 'string';
};

/**
 * unknown な値が Universalis の data center エントリとして扱えるか判定します。
 */
export const isDataCenterEntry = (value: unknown): value is DataCenterEntry => {
	if (!isRecord(value)) return false;
	return (
		(value.name === undefined || typeof value.name === 'string') &&
		(value.region === undefined || typeof value.region === 'string') &&
		(value.worlds === undefined ||
			(Array.isArray(value.worlds) &&
				value.worlds.every((worldId) => typeof worldId === 'number')))
	);
};

/**
 * 文字列値だけを持つ record として取り出します。
 */
export const getStringRecord = (value: Record<string, unknown>) => {
	return Object.fromEntries(
		Object.entries(value).filter(
			(entry): entry is [string, string] => typeof entry[1] === 'string',
		),
	);
};
