# async-mutex-stream

[![npm version](https://badgen.net/npm/v/async-mutex-stream)](https://npm.im/async-mutex-stream) [![npm downloads](https://badgen.net/npm/dm/async-mutex-stream)](https://npm.im/async-mutex-stream)

This package is a TypeScript library for handling asynchronous streams with mutex locking and piping capabilities.

## Installation

```bash
npm install async-mutex-stream
# or
pnpm add async-mutex-stream
```

## Dependencies

This package requires the following dependencies:

- [async-mutex](https://www.npmjs.com/package/async-mutex)

## Features

- Mutex-based synchronization for stream operations
- Support for async generators
- Piping between streams
- Error handling and state management
- Strict type checking
- Stream multicasting

## Basic Usage

### Simple Stream

Create a basic stream that processes string data:

```typescript
import { AsyncMutexStream } from 'async-mutex-stream';

const stream = new AsyncMutexStream({
	start: async () => {
		// Optional initialization
		console.log('Stream started');
	},
	write: async (data: string) => {
		// Process the data
		console.log(`Processing: ${data}`);
	},
	end: async () => {
		// Optional cleanup
		console.log('Stream ended');
	},
});
// Use the stream
await stream.write('Hello');
await stream.write('World');
await stream.end();
```

## License

MIT License
