import { describe, expect, it, vi } from 'vitest';
import { AsyncMutexStream, AsyncMutexStreamConfig, AsyncMutexStreamMulticaster } from '../src';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AsyncMutexStream', () => {
	it('is defined', () => {
		expect(AsyncMutexStream).toBeDefined();
	});

	it('works', async () => {
		const callback = vi.fn();

		const stream = new AsyncMutexStream({
			start: async () => {
				await wait(100);
				callback('start');
			},
			write: async (data: string) => {
				await wait(10 * data.length);
				callback('write ' + data);
			},
			end: async () => {
				await wait(20);
				callback('end');
			},
		});

		stream.write('hello world');
		stream.write('!');
		await stream.end();

		expect(callback).toHaveBeenCalledTimes(4);
		expect(callback).toHaveBeenNthCalledWith(1, 'start');
		expect(callback).toHaveBeenNthCalledWith(2, 'write hello world');
		expect(callback).toHaveBeenNthCalledWith(3, 'write !');
		expect(callback).toHaveBeenNthCalledWith(4, 'end');
	});

	it('should keep config types', async () => {
		class Config implements AsyncMutexStreamConfig<string> {
			async write(data: string) {}
			custom() {
				return true;
			}
		}
		const config = new Config();
		const stream = new AsyncMutexStream(config);

		stream.write('hello world');
		await stream.end();
		expect(stream.config.custom()).toStrictEqual(true);
	});

	it('should suppress errors', async () => {
		const callback = vi.fn();

		const stream = new AsyncMutexStream({
			start: async () => {
				callback('start');
			},
			write: async (data: string) => {
				if (data === '!') {
					throw new Error('test error');
				}
				callback('write ' + data);
			},
			end: async () => {
				callback('end');
			},
		});

		stream.write('hello world');
		stream.write('!');
		stream.write('other text');
		await stream.end();

		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenNthCalledWith(1, 'start');
		expect(callback).toHaveBeenNthCalledWith(2, 'write hello world');
		expect(callback).toHaveBeenNthCalledWith(3, 'end');
		expect(stream.error()).toStrictEqual(new Error('test error'));
	});

	it('should pipe', async () => {
		const callback = vi.fn();

		const stream1 = new AsyncMutexStream({
			write: async function* (data: string) {
				await wait(10 * data.length);
				yield* data.split('');
			},
		});

		const stream2 = new AsyncMutexStream({
			write: async (data: string) => {
				callback('write ' + data);
			},
		});

		stream1.pipe(stream2);
		stream1.write('hello wo');
		stream1.write('rld');
		await stream1.end();

		expect(callback).toHaveBeenCalledTimes(11);
		expect(callback).toHaveBeenNthCalledWith(1, 'write h');
		expect(callback).toHaveBeenNthCalledWith(2, 'write e');
		expect(callback).toHaveBeenNthCalledWith(3, 'write l');
		expect(callback).toHaveBeenNthCalledWith(4, 'write l');
		expect(callback).toHaveBeenNthCalledWith(5, 'write o');
		expect(callback).toHaveBeenNthCalledWith(6, 'write  ');
		expect(callback).toHaveBeenNthCalledWith(7, 'write w');
		expect(callback).toHaveBeenNthCalledWith(8, 'write o');
		expect(callback).toHaveBeenNthCalledWith(9, 'write r');
		expect(callback).toHaveBeenNthCalledWith(10, 'write l');
		expect(callback).toHaveBeenNthCalledWith(11, 'write d');
	});

	it('should check types', () => {
		const stream = new AsyncMutexStream<AsyncMutexStreamConfig<string>>({
			// @ts-expect-error Type '(data: number) => Promise<void>' is not assignable to type '(data: string) => void | Promise<void>'.
			write: async function (data: number) {},
		});

		const streamWithoutOutput = new AsyncMutexStream<AsyncMutexStreamConfig<string>>({
			// @ts-expect-error Type '(data: string) => AsyncGenerator<string, void, unknown>' is not assignable to type '(data: string) => void | Promise<void>'.
			write: async function* (data) {},
		});

		const streamWithOutput = new AsyncMutexStream<AsyncMutexStreamConfig<string, string>>({
			// @ts-expect-error Type '(data: string) => void | Promise<void>' is not assignable to type '(data: string) => AsyncGenerator<string, void, unknown>'
			write: async (data) => {},
		});
	});
});

describe('AsyncMutexStreamMulticaster', () => {
	it('is defined', () => {
		expect(AsyncMutexStreamMulticaster).toBeDefined();
	});

	it('works', async () => {
		const callback = vi.fn();

		const stream1 = new AsyncMutexStream({
			start: async () => {
				callback('1 start');
			},
			write: async (data: string) => {
				callback('1 write ' + data);
			},
			end: async () => {
				callback('1 end');
			},
		});
		const stream2 = new AsyncMutexStream({
			start: async () => {
				callback('2 start');
			},
			write: async function* (data: string) {
				callback('2 write ' + data);
				yield data.length;
			},
			end: async () => {
				callback('2 end');
			},
		});

		const multicaster = new AsyncMutexStreamMulticaster([stream1, stream2]);
		multicaster.write('hello world');
		multicaster.write('!');
		await multicaster.end();

		expect(callback).toHaveBeenCalledTimes(8);
		expect(callback).toHaveBeenNthCalledWith(1, '1 start');
		expect(callback).toHaveBeenNthCalledWith(2, '2 start');
		expect(callback).toHaveBeenNthCalledWith(3, '1 write hello world');
		expect(callback).toHaveBeenNthCalledWith(4, '2 write hello world');
		expect(callback).toHaveBeenNthCalledWith(5, '1 write !');
		expect(callback).toHaveBeenNthCalledWith(6, '2 write !');
		expect(callback).toHaveBeenNthCalledWith(7, '1 end');
		expect(callback).toHaveBeenNthCalledWith(8, '2 end');
	});

	it('should check types', () => {
		const stream1 = new AsyncMutexStream({
			write: async function (data: string) {},
		});

		const stream2 = new AsyncMutexStream({
			write: async function* (data: string): AsyncGenerator<number, void, void> {},
		});

		const multicaster = new AsyncMutexStreamMulticaster([stream1, stream2]);
		multicaster.write('');
		// @ts-expect-error Argument of type 'number' is not assignable to parameter of type 'string'.
		multicaster.write(0);
	});

	it('should check union types', () => {
		const stream1 = new AsyncMutexStream<AsyncMutexStreamConfig<string>>({
			write: async function (data) {},
		});

		const stream2 = new AsyncMutexStream<AsyncMutexStreamConfig<number, number>>({
			write: async function* (data) {},
		});

		const multicaster = new AsyncMutexStreamMulticaster([stream1, stream2]);
		multicaster.write('');
		multicaster.write(0);
		// @ts-expect-error Argument of type 'boolean' is not assignable to parameter of type 'string | number'.
		multicaster.write(true);
	});
});
