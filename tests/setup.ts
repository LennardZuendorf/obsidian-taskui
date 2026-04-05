import { getDefaultStore } from "jotai";
import { beforeEach, vi } from "vitest";
import { defaultSettings } from "@/config/defaultSettings";
import { settingsAtom } from "@/data/settingsAtom";

// Silence pino and avoid reading process.env during module init.
vi.mock("@/utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

// Reset the jotai default store before each test so settings overrides in one
// test never leak into another. TaskMapper reads from this store directly via
// getDefaultStore().
beforeEach(() => {
	getDefaultStore().set(settingsAtom, { ...defaultSettings });
});
