import { describe, expect, it } from "vitest";
import {
	Task,
	TaskPriority,
	TaskSource,
	TaskStatus,
	TaskWithMetadata,
} from "@/data/types/tasks";
import {
	validateTask,
	validateTasks,
	validateTasksWithMetadata,
	validateTaskWithMetadata,
} from "@/data/utils/validateTask";

function validTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "tid",
		description: "Do thing",
		priority: TaskPriority.MEDIUM,
		status: TaskStatus.TODO,
		path: "Tasks.md",
		source: TaskSource.OBSIDIAN,
		rawTaskLine: "- [ ] Do thing",
		tags: [],
		blocks: [],
		recurs: null,
		dueDate: null,
		scheduledDate: null,
		startDate: null,
		createdDate: null,
		doneDate: null,
		...overrides,
	};
}

describe("validateTask", () => {
	it("returns isValid=true for a well-formed task", () => {
		const result = validateTask(validTask());
		expect(result.isValid).toBe(true);
	});

	it("returns isValid=false when a required field is missing", () => {
		const broken = {
			...validTask(),
			description: undefined,
		} as unknown as Task;
		const result = validateTask(broken);
		expect(result.isValid).toBe(false);
		expect(result.message).toMatch(/validation failed/i);
	});

	it("rejects an invalid priority enum value", () => {
		const broken = {
			...validTask(),
			priority: "urgent",
		} as unknown as Task;
		const result = validateTask(broken);
		expect(result.isValid).toBe(false);
	});
});

describe("validateTasks", () => {
	it("returns isValid=true for an empty array", () => {
		const result = validateTasks([]);
		expect(result.isValid).toBe(true);
	});

	it("returns isValid=true when every task is valid", () => {
		const result = validateTasks([validTask(), validTask({ id: "2" })]);
		expect(result.isValid).toBe(true);
	});

	it("short-circuits on the first invalid task", () => {
		const broken = {
			...validTask({ id: "2" }),
			description: undefined,
		} as unknown as Task;
		const result = validateTasks([validTask(), broken, validTask({ id: "3" })]);
		expect(result.isValid).toBe(false);
		expect(result.message).toMatch(/validation failed/i);
	});

	it("rejects non-array input", () => {
		const result = validateTasks("nope" as unknown as Task[]);
		expect(result.isValid).toBe(false);
	});
});

describe("validateTaskWithMetadata", () => {
	const wrap = (
		overrides: Partial<TaskWithMetadata> = {},
	): TaskWithMetadata => ({
		task: validTask(),
		metadata: { needsSync: false },
		...overrides,
	});

	it("accepts a well-formed TaskWithMetadata", () => {
		const result = validateTaskWithMetadata(wrap());
		expect(result.isValid).toBe(true);
	});

	it("rejects an invalid retryCount", () => {
		const result = validateTaskWithMetadata(
			wrap({
				metadata: { retryCount: -1 },
			}),
		);
		expect(result.isValid).toBe(false);
	});
});

describe("validateTasksWithMetadata", () => {
	it("accepts an empty array", () => {
		expect(validateTasksWithMetadata([]).isValid).toBe(true);
	});

	it("rejects non-array input", () => {
		const result = validateTasksWithMetadata(
			"nope" as unknown as TaskWithMetadata[],
		);
		expect(result.isValid).toBe(false);
	});

	it("short-circuits on the first invalid entry", () => {
		const good: TaskWithMetadata = {
			task: validTask(),
			metadata: {},
		};
		const bad: TaskWithMetadata = {
			task: validTask(),
			metadata: { retryCount: -5 },
		};
		const result = validateTasksWithMetadata([good, bad]);
		expect(result.isValid).toBe(false);
	});
});
