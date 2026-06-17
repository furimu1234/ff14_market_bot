export class AsyncLock {
	private locked = false;
	private waiters: Array<() => void> = [];

	private async acquire(): Promise<() => void> {
		await new Promise<void>((resolve) => {
			if (!this.locked) {
				this.locked = true;
				resolve();
				return;
			}

			this.waiters.push(resolve);
		});

		let released = false;

		return () => {
			if (released) return;
			released = true;

			const next = this.waiters.shift();
			if (next) next();
			else this.locked = false;
		};
	}

	public async withLock<T>(callback: () => Promise<T>): Promise<T> {
		const release = await this.acquire();

		try {
			return await callback();
		} finally {
			release();
		}
	}
}
