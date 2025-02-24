import { Mutex } from 'async-mutex';
import type { AsyncMutexStreamConfig, ExtractAsyncMutexStreamInput, ExtractAsyncMutexStreamOutput } from './AsyncMutexStreamConfig';

function isAsyncGenerator<T>(value: any): value is AsyncGenerator<T, void, void> {
	return value != null && typeof value[Symbol.asyncIterator] === 'function';
}

export class AsyncMutexStream<const C extends AsyncMutexStreamConfig<ExtractAsyncMutexStreamInput<C>, ExtractAsyncMutexStreamOutput<C>>> {
	public readonly config: C;
	private _mutex = new Mutex();
	private _pipes = new Set<AsyncMutexStream<AsyncMutexStreamConfig<ExtractAsyncMutexStreamOutput<C>, any>>>();
	private _isStarted = false;
	private _isComplete = false;
	private _hasError = false;
	private _error: Error | null = null;

	constructor(config: C) {
		this.config = config;
		this.start().catch(() => {});
	}

	private async start(): Promise<void> {
		await this._mutex.runExclusive(async () => {
			if (this._isStarted) {
				return;
			}

			try {
				await this.config.start?.();
			} catch (e) {
				this._hasError = true;
				this._error = e as Error;
				return;
			}
			this._isStarted = true;
		});
	}

	public async write(data: ExtractAsyncMutexStreamInput<C>): Promise<void> {
		await this._mutex.runExclusive(async () => {
			if (this._isComplete || this._hasError) {
				return;
			}

			try {
				const result = this.config.write(data);

				if (isAsyncGenerator<ExtractAsyncMutexStreamOutput<C>>(result)) {
					for await (const output of result) {
						for (const pipe of this._pipes) {
							pipe.write(output);
						}
					}
				} else {
					await result;
				}
			} catch (e) {
				this._hasError = true;
				this._error = e as Error;
				return;
			}
		});
	}

	public async end(): Promise<void> {
		await this._mutex.runExclusive(async () => {
			if (this._isComplete) {
				return;
			}

			try {
				await this.config.end?.();
			} catch (e) {
				this._hasError = true;
				this._error = e as Error;
				return;
			}
			this._isComplete = true;
		});
	}

	public pipe<
		Target extends
			| AsyncMutexStream<AsyncMutexStreamConfig<ExtractAsyncMutexStreamOutput<C>, any>>
			| AsyncMutexStream<AsyncMutexStreamConfig<ExtractAsyncMutexStreamOutput<C>, never>>,
	>(target: Target): void {
		this._pipes.add(target);
	}

	public unpipe<
		Target extends
			| AsyncMutexStream<AsyncMutexStreamConfig<ExtractAsyncMutexStreamOutput<C>, any>>
			| AsyncMutexStream<AsyncMutexStreamConfig<ExtractAsyncMutexStreamOutput<C>, never>>,
	>(target: Target): void {
		this._pipes.delete(target);
	}

	public error(): Error | null {
		return this._hasError ? this._error : null;
	}

	public reset(): void {
		this._mutex.release();
		this._pipes.clear();
		this._isStarted = false;
		this._isComplete = false;
		this._hasError = false;
		this._error = null;
	}
}
