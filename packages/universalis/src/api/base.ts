import { sleep } from '@ff14_market/lib';

const RATE_LIMIT_STATUS = 429;
const MAX_RATE_LIMIT_RETRIES = 5;
const DEFAULT_RATE_LIMIT_RETRY_MS = 1000;

export class ApiRequestError extends Error {
	public constructor(
		public readonly status: number,
		public readonly url: string,
	) {
		super(`Request failed: ${status} ${url}`);
		this.name = 'ApiRequestError';
	}
}

/**
 * JSON API にリクエストし、429 の場合だけ待機して最大 5 回リトライします。
 */
export const request = async <T>(url: string): Promise<T> => {
	for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
		const response = await fetch(url);
		if (response.ok) {
			return (await response.json()) as T;
		}

		if (
			response.status !== RATE_LIMIT_STATUS ||
			attempt === MAX_RATE_LIMIT_RETRIES
		) {
			throw new ApiRequestError(response.status, url);
		}

		await sleep(getRateLimitRetryDelayMs(response, attempt) / 1000);
	}

	throw new Error(`Request failed after retries: ${url}`);
};

/**
 * Retry-After ヘッダーまたは指数バックオフから次の待機時間をミリ秒で返します。
 */
const getRateLimitRetryDelayMs = (response: Response, attempt: number) => {
	const retryAfter = response.headers.get('retry-after');
	if (!retryAfter) {
		return DEFAULT_RATE_LIMIT_RETRY_MS * 2 ** attempt;
	}

	const retryAfterSeconds = Number(retryAfter);
	if (Number.isFinite(retryAfterSeconds)) {
		return Math.max(0, retryAfterSeconds * 1000);
	}

	const retryAfterDate = Date.parse(retryAfter);
	if (Number.isFinite(retryAfterDate)) {
		return Math.max(0, retryAfterDate - Date.now());
	}

	return DEFAULT_RATE_LIMIT_RETRY_MS * 2 ** attempt;
};
