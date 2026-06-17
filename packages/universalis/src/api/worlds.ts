import { request } from './base';
import { JAPAN_DATA_CENTERS, UNIVERSALIS_BASE_URL } from './consts';
import { getDataCenters, getWorldsById } from './parsers';
import type { WorldEntry } from './types';

/**
 * Universalis から日本リージョンのワールド一覧を取得します。
 */
export const fetchJapanWorlds = async (): Promise<WorldEntry[]> => {
	const [dataCentersResponse, worldsResponse] = await Promise.all([
		request<unknown>(`${UNIVERSALIS_BASE_URL}/data-centers`),
		request<unknown>(`${UNIVERSALIS_BASE_URL}/worlds`),
	]);

	const worldsById = getWorldsById(worldsResponse);
	const dataCenters = getDataCenters(dataCentersResponse);

	return dataCenters
		.filter(
			(dataCenter) =>
				dataCenter.name &&
				(dataCenter.region === 'Japan' ||
					JAPAN_DATA_CENTERS.has(dataCenter.name)),
		)
		.flatMap((dataCenter) =>
			(dataCenter.worlds ?? []).flatMap((worldId) => {
				const worldName = worldsById[String(worldId)];
				if (!dataCenter.name || !worldName) return [];

				return [
					{
						id: worldId,
						name: worldName,
						dataCenter: dataCenter.name,
					},
				];
			}),
		)
		.sort(
			(a, b) =>
				a.dataCenter.localeCompare(b.dataCenter) ||
				a.name.localeCompare(b.name),
		);
};
