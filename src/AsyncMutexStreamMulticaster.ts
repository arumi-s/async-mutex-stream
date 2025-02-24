import type { AsyncMutexStream } from './AsyncMutexStream';
import type { AsyncMutexStreamConfig, ExtractAsyncMutexStreamInput, ExtractAsyncMutexStreamOutput } from './AsyncMutexStreamConfig';

export type ExtractAsyncMutexStreamsInput<T> = T extends [infer First, ...infer Rest]
	? (First extends AsyncMutexStream<infer U> ? ExtractAsyncMutexStreamInput<U> : never) | ExtractAsyncMutexStreamsInput<Rest>
	: never;

export type ExtractAsyncMutexStreamsOutput<T> = T extends [infer First, ...infer Rest]
	? (First extends AsyncMutexStream<infer U> ? ExtractAsyncMutexStreamOutput<U> : never) | ExtractAsyncMutexStreamsOutput<Rest>
	: never;

export class AsyncMutexStreamMulticaster<
	const T extends AsyncMutexStream<AsyncMutexStreamConfig<any, any> | AsyncMutexStreamConfig<any, never>>[],
	Input = ExtractAsyncMutexStreamsInput<T>,
> {
	public readonly streams: Readonly<T>;

	constructor(streams: T) {
		this.streams = streams;
	}

	public async write(data: Input) {
		return Promise.all(this.streams.map((stream) => stream.write(data)));
	}

	public async end() {
		await Promise.all(this.streams.map((stream) => stream.end()));
	}
}
