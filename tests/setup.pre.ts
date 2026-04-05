// Runs before tests/setup.ts. This file has no ESM imports so its side
// effects execute before anything else — which is required because the
// persistent settingsAtom touches `localStorage` at module-load time.
const storage = new Map<string, string>();
const localStorageStub = {
	getItem: (key: string): string | null => storage.get(key) ?? null,
	setItem: (key: string, value: string): void => {
		storage.set(key, String(value));
	},
	removeItem: (key: string): void => {
		storage.delete(key);
	},
	clear: (): void => {
		storage.clear();
	},
	key: (index: number): string | null =>
		Array.from(storage.keys())[index] ?? null,
	get length(): number {
		return storage.size;
	},
};

if (
	typeof (globalThis as { localStorage?: unknown }).localStorage === "undefined"
) {
	(globalThis as { localStorage: typeof localStorageStub }).localStorage =
		localStorageStub;
}
