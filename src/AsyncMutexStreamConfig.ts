export interface AsyncMutexStreamConfig<Input, Output = never> {
	start?: () => Promise<void> | void;
	write: [Output] extends [never] ? (data: Input) => Promise<void> | void : (data: Input) => AsyncGenerator<Output, void, void>;
	end?: () => Promise<void> | void;
}

export type ExtractAsyncMutexStreamInput<T> = T extends { write: (data: infer I) => any } ? I : never;
export type ExtractAsyncMutexStreamOutput<T> = T extends { write: (data: any) => AsyncGenerator<infer O, any, any> } ? O : never;
