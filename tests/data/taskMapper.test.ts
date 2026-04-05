import { getDefaultStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { defaultSettings } from "@/config/defaultSettings";
import { settingsAtom } from "@/data/settingsAtom";
import { TaskMapper } from "@/data/taskMapper";
import { Task, TaskPriority, TaskSource, TaskStatus } from "@/data/types/tasks";

function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "tid",
		description: "Do thing",
		priority: TaskPriority.MEDIUM,
		status: TaskStatus.TODO,
		path: "Tasks.md",
		source: TaskSource.OBSIDIAN,
		rawTaskLine: "",
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

/**
 * Compare two dates at day granularity so timezone offsets on parsed
 * "YYYY-MM-DD" strings don't cause flaky equality checks.
 */
function expectSameDay(actual: Date | null | undefined, iso: string): void {
	expect(actual).toBeInstanceOf(Date);
	expect((actual as Date).toISOString().slice(0, 10)).toBe(iso);
}

describe("TaskMapper", () => {
	let mapper: TaskMapper;

	beforeEach(() => {
		mapper = new TaskMapper();
	});

	// ============================================================
	// Dataview parsing
	// ============================================================
	describe("mapMdToTaskType — dataview", () => {
		it("parses each status character correctly", () => {
			expect(mapper.mapMdToTaskType("- [ ] a [id:: 1]").status).toBe(
				TaskStatus.TODO,
			);
			expect(mapper.mapMdToTaskType("- [/] a [id:: 2]").status).toBe(
				TaskStatus.IN_PROGRESS,
			);
			expect(mapper.mapMdToTaskType("- [-] a [id:: 3]").status).toBe(
				TaskStatus.CANCELLED,
			);
			expect(mapper.mapMdToTaskType("- [x] a [id:: 4]").status).toBe(
				TaskStatus.DONE,
			);
		});

		it("parses a full dataview line with every known field", () => {
			const line =
				"- [ ] Buy milk #shopping #home [id:: abc] [priority:: high] [due:: 2026-04-10] [scheduled:: 2026-04-08] [start:: 2026-04-07] [created:: 2026-04-05] [completion:: 2026-04-12] [repeat:: every week] [dependsOn:: xyz pqr]";

			const task = mapper.mapMdToTaskType(line);

			expect(task.description).toBe("Buy milk");
			expect(task.status).toBe(TaskStatus.TODO);
			expect(task.priority).toBe(TaskPriority.HIGH);
			expect(task.id).toBe("abc");
			expect(task.tags).toEqual(expect.arrayContaining(["#shopping", "#home"]));
			expect(task.recurs).toBe("every week");
			expect(task.blocks).toEqual(["xyz", "pqr"]);
			expectSameDay(task.dueDate, "2026-04-10");
			expectSameDay(task.scheduledDate, "2026-04-08");
			expectSameDay(task.startDate, "2026-04-07");
			expectSameDay(task.createdDate, "2026-04-05");
			expectSameDay(task.doneDate, "2026-04-12");
		});

		it("leaves description clean of attribute blocks and tags", () => {
			const task = mapper.mapMdToTaskType(
				"- [ ] Write report #work [priority:: low] [due:: 2026-05-01]",
			);
			expect(task.description).toBe("Write report");
			expect(task.tags).toEqual(["#work"]);
		});

		it("defaults to MEDIUM priority and null dates when fields are missing", () => {
			const task = mapper.mapMdToTaskType("- [ ] Bare task");
			expect(task.priority).toBe(TaskPriority.MEDIUM);
			expect(task.dueDate).toBeNull();
			expect(task.scheduledDate).toBeNull();
			expect(task.blocks).toEqual([]);
		});
	});

	// ============================================================
	// Emoji parsing
	// ============================================================
	describe("mapMdToTaskType — emoji", () => {
		it("parses a full emoji line", () => {
			const line =
				"- [ ] Do thing #work ⏫ 📅 2026-04-10 ⏳ 2026-04-08 🛫 2026-04-07 ➕ 2026-04-05 ✅ 2026-04-12 🔁 every week 🆔 abc123 ⛔ xyz pqr";

			const task = mapper.mapMdToTaskType(line);

			expect(task.description).toBe("Do thing");
			expect(task.priority).toBe(TaskPriority.HIGH);
			expect(task.tags).toEqual(["#work"]);
			expect(task.id).toBe("abc123");
			expect(task.recurs).toBe("every week");
			expect(task.blocks).toEqual(["xyz", "pqr"]);
			expectSameDay(task.dueDate, "2026-04-10");
			expectSameDay(task.scheduledDate, "2026-04-08");
			expectSameDay(task.startDate, "2026-04-07");
			expectSameDay(task.createdDate, "2026-04-05");
			expectSameDay(task.doneDate, "2026-04-12");
		});

		it.each([
			["🔺", TaskPriority.HIGHEST],
			["⏫", TaskPriority.HIGH],
			["🔼", TaskPriority.MEDIUM],
			["🔽", TaskPriority.LOW],
			["⏬", TaskPriority.LOWEST],
		])("maps priority emoji %s to %s", (emoji, expected) => {
			const task = mapper.mapMdToTaskType(`- [ ] task ${emoji} 📅 2026-01-01`);
			expect(task.priority).toBe(expected);
		});

		it("promotes ❌ cancelled emoji to CANCELLED status and populates doneDate", () => {
			const task = mapper.mapMdToTaskType("- [ ] Scrap this ❌ 2026-04-01");
			expect(task.status).toBe(TaskStatus.CANCELLED);
			expectSameDay(task.doneDate, "2026-04-01");
		});

		it("captures recurrence text up to the next known token", () => {
			const task = mapper.mapMdToTaskType(
				"- [ ] Weekly review 🔁 every week on monday 📅 2026-04-10",
			);
			expect(task.recurs).toBe("every week on monday");
			expectSameDay(task.dueDate, "2026-04-10");
		});

		it("strips all tokens and tags from the description", () => {
			const task = mapper.mapMdToTaskType(
				"- [ ] clean description #tag ⏫ 📅 2026-04-10 🆔 xyz",
			);
			expect(task.description).toBe("clean description");
			expect(task.tags).toEqual(["#tag"]);
		});

		it("returns MEDIUM and null dates for a bare emoji-less task", () => {
			const task = mapper.mapMdToTaskType("- [ ] Bare");
			expect(task.priority).toBe(TaskPriority.MEDIUM);
			expect(task.dueDate).toBeNull();
			expect(task.description).toBe("Bare");
		});
	});

	// ============================================================
	// Mixed / format detection
	// ============================================================
	describe("mapMdToTaskType — mixed format detection", () => {
		it("routes mostly-emoji lines with one dv field to the emoji parser", () => {
			// Two emoji tokens vs one dv field → emoji wins
			const task = mapper.mapMdToTaskType(
				"- [ ] Thing ⏫ 📅 2026-04-10 [project:: home]",
			);
			// Emoji parser captured the priority and due date
			expect(task.priority).toBe(TaskPriority.HIGH);
			expectSameDay(task.dueDate, "2026-04-10");
		});

		it("routes mostly-dataview lines with one stray emoji to the dataview parser", () => {
			const task = mapper.mapMdToTaskType(
				"- [ ] Thing 📅 [priority:: high] [due:: 2026-04-10] [id:: a]",
			);
			// Dataview parser captured the due date
			expectSameDay(task.dueDate, "2026-04-10");
			expect(task.priority).toBe(TaskPriority.HIGH);
		});

		it("falls back to dataview for a bare line (regression guard)", () => {
			// Empty line should never throw; dataview parser handles it.
			const task = mapper.mapMdToTaskType("- [ ] Nothing special");
			expect(task.description).toBe("Nothing special");
		});
	});

	// ============================================================
	// Serialisation dispatch
	// ============================================================
	describe("mapTaskToLineString — dispatch", () => {
		it("serialises to dataview when rawTaskLine uses dataview syntax", () => {
			const task = makeTask({
				description: "Thing",
				priority: TaskPriority.HIGH,
				dueDate: new Date("2026-04-10"),
				rawTaskLine: "- [ ] Thing [priority:: high] [due:: 2026-04-10]",
			});
			const out = mapper.mapTaskToLineString(task);
			expect(out).toContain("[priority:: high]");
			expect(out).toContain("[due:: 2026-04-10]");
			expect(out).not.toContain("📅");
		});

		it("serialises to emoji when rawTaskLine uses emoji syntax", () => {
			const task = makeTask({
				description: "Thing",
				priority: TaskPriority.HIGH,
				dueDate: new Date("2026-04-10"),
				rawTaskLine: "- [ ] Thing ⏫ 📅 2026-04-10",
			});
			const out = mapper.mapTaskToLineString(task);
			expect(out).toContain("📅 2026-04-10");
			expect(out).toContain("⏫");
			expect(out).not.toContain("[due::");
		});

		it("falls back to settings.defaultTaskFormat when rawTaskLine is empty", () => {
			const task = makeTask({ rawTaskLine: "" });

			// Default setting is dataview
			getDefaultStore().set(settingsAtom, {
				...defaultSettings,
				defaultTaskFormat: "dataview",
			});
			expect(mapper.mapTaskToLineString(task)).toContain("[priority::");

			// Switch to emoji default
			getDefaultStore().set(settingsAtom, {
				...defaultSettings,
				defaultTaskFormat: "emoji",
			});
			const emojiOut = mapper.mapTaskToLineString(
				makeTask({ rawTaskLine: "", priority: TaskPriority.HIGH }),
			);
			expect(emojiOut).toContain("⏫");
			expect(emojiOut).not.toContain("[priority::");
		});
	});

	// ============================================================
	// Dataview serialiser details
	// ============================================================
	describe("mapTaskToDataviewLineString (via dispatch)", () => {
		it("writes attributes in the serializer's stable order", () => {
			// mapTaskToDataviewLineString emits in the order:
			// id, dependsOn, priority, recurs, created, start, scheduled, due, completion
			const task = makeTask({
				id: "a",
				priority: TaskPriority.HIGH,
				dueDate: new Date("2026-04-10"),
				scheduledDate: new Date("2026-04-08"),
				startDate: new Date("2026-04-07"),
				createdDate: new Date("2026-04-05"),
				doneDate: new Date("2026-04-12"),
				rawTaskLine: "- [ ] Thing [id:: a]",
			});
			const out = mapper.mapTaskToLineString(task);
			const positions = [
				out.indexOf("[id::"),
				out.indexOf("[priority::"),
				out.indexOf("[created::"),
				out.indexOf("[start::"),
				out.indexOf("[scheduled::"),
				out.indexOf("[due::"),
				out.indexOf("[completion::"),
			];
			for (const p of positions) expect(p).toBeGreaterThan(-1);
			for (let i = 1; i < positions.length; i++) {
				expect(positions[i - 1]).toBeLessThan(positions[i]);
			}
		});

		it("omits optional fields that are null", () => {
			const task = makeTask({
				rawTaskLine: "- [ ] x [id:: 1]",
				dueDate: null,
				scheduledDate: null,
			});
			const out = mapper.mapTaskToLineString(task);
			expect(out).not.toContain("[due::");
			expect(out).not.toContain("[scheduled::");
		});
	});

	// ============================================================
	// Emoji serialiser details
	// ============================================================
	describe("mapTaskToEmojiLineString (via dispatch)", () => {
		const base = (overrides: Partial<Task> = {}) =>
			makeTask({ rawTaskLine: "- [ ] x 📅 2026-01-01", ...overrides });

		it("writes tokens in the documented stable order", () => {
			const task = base({
				id: "a",
				blocks: ["b1"],
				priority: TaskPriority.HIGH,
				recurs: "every week",
				createdDate: new Date("2026-04-05"),
				startDate: new Date("2026-04-07"),
				scheduledDate: new Date("2026-04-08"),
				dueDate: new Date("2026-04-10"),
				doneDate: new Date("2026-04-12"),
			});
			const out = mapper.mapTaskToLineString(task);
			const positions = {
				id: out.indexOf("🆔"),
				blocks: out.indexOf("⛔"),
				priority: out.indexOf("⏫"),
				recurs: out.indexOf("🔁"),
				created: out.indexOf("➕"),
				start: out.indexOf("🛫"),
				scheduled: out.indexOf("⏳"),
				due: out.indexOf("📅"),
				done: out.indexOf("✅"),
			};
			for (const key of Object.keys(positions)) {
				expect(positions[key as keyof typeof positions]).toBeGreaterThan(-1);
			}
			expect(positions.id).toBeLessThan(positions.blocks);
			expect(positions.blocks).toBeLessThan(positions.priority);
			expect(positions.priority).toBeLessThan(positions.recurs);
			expect(positions.recurs).toBeLessThan(positions.created);
			expect(positions.created).toBeLessThan(positions.start);
			expect(positions.start).toBeLessThan(positions.scheduled);
			expect(positions.scheduled).toBeLessThan(positions.due);
			expect(positions.due).toBeLessThan(positions.done);
		});

		it("omits the priority token for MEDIUM (Obsidian Tasks default)", () => {
			const task = base({ priority: TaskPriority.MEDIUM });
			const out = mapper.mapTaskToLineString(task);
			expect(out).not.toMatch(/🔺|⏫|🔼|🔽|⏬/u);
		});

		it.each([
			[TaskPriority.HIGHEST, "🔺"],
			[TaskPriority.HIGH, "⏫"],
			[TaskPriority.LOW, "🔽"],
			[TaskPriority.LOWEST, "⏬"],
		])("writes priority %s as %s", (priority, expectedEmoji) => {
			const task = base({ priority });
			expect(mapper.mapTaskToLineString(task)).toContain(expectedEmoji);
		});

		it("preserves tags in the output", () => {
			const task = base({ tags: ["#work", "#urgent"] });
			const out = mapper.mapTaskToLineString(task);
			expect(out).toContain("#work");
			expect(out).toContain("#urgent");
		});
	});

	// ============================================================
	// Merge — dataview
	// ============================================================
	describe("mergeTaskOntoRawLine — dataview", () => {
		it("updates dueDate while preserving surrounding fields", () => {
			const original =
				"- [ ] Task [id:: a] [priority:: high] [due:: 2026-04-10]";
			const newTask = makeTask({
				id: "a",
				description: "Task",
				priority: TaskPriority.HIGH,
				dueDate: new Date("2026-05-01"),
			});
			const out = mapper.mergeTaskOntoRawLine(newTask, original);
			expect(out).toContain("[due:: 2026-05-01]");
			expect(out).toContain("[priority:: high]");
			expect(out).toContain("[id:: a]");
			expect(out).not.toContain("2026-04-10");
		});

		it("deletes an attribute when the corresponding field is explicitly null", () => {
			const original =
				"- [ ] Task [id:: a] [priority:: medium] [due:: 2026-04-10]";
			const newTask = makeTask({
				id: "a",
				description: "Task",
				dueDate: null,
			});
			const out = mapper.mergeTaskOntoRawLine(newTask, original);
			expect(out).not.toContain("[due::");
			expect(out).toContain("[id:: a]");
		});

		it("preserves an unknown custom dataview attribute from the original", () => {
			// Single unknown attribute; known fields come from newTask, so the
			// merge's attribute-iteration only has to parse this one correctly.
			const original = "- [ ] Task [project:: home]";
			const newTask = makeTask({
				id: "a",
				description: "Task",
				priority: TaskPriority.HIGH,
				dueDate: new Date("2026-05-01"),
			});
			const out = mapper.mergeTaskOntoRawLine(newTask, original);
			expect(out).toContain("[project:: home]");
			expect(out).toContain("[due:: 2026-05-01]");
			expect(out).toContain("[id:: a]");
		});

		it("rewrites an existing field instead of duplicating it", () => {
			const original = "- [ ] Task [id:: a] [priority:: medium]";
			const newTask = makeTask({
				id: "a",
				description: "Task",
				priority: TaskPriority.HIGH,
			});
			const out = mapper.mergeTaskOntoRawLine(newTask, original);
			const priorityMatches = out.match(/\[priority::/g) || [];
			expect(priorityMatches.length).toBe(1);
			expect(out).toContain("[priority:: high]");
		});
	});

	// ============================================================
	// Merge — emoji
	// ============================================================
	describe("mergeTaskOntoRawLine — emoji", () => {
		it("keeps the line in emoji format after an edit", () => {
			const original = "- [ ] Task ⏫ 📅 2026-04-10";
			const newTask = makeTask({
				description: "Task",
				priority: TaskPriority.HIGH,
				dueDate: new Date("2026-05-01"),
			});
			const out = mapper.mergeTaskOntoRawLine(newTask, original);
			expect(out).toContain("📅 2026-05-01");
			expect(out).toContain("⏫");
			expect(out).not.toContain("[due::");
			expect(out).not.toContain("2026-04-10");
		});

		it("swaps the priority emoji rather than duplicating", () => {
			const original = "- [ ] Task ⏫ 📅 2026-04-10";
			const newTask = makeTask({
				description: "Task",
				priority: TaskPriority.HIGHEST,
				dueDate: new Date("2026-04-10"),
			});
			const out = mapper.mergeTaskOntoRawLine(newTask, original);
			expect(out).toContain("🔺");
			expect(out).not.toContain("⏫");
		});

		it("removes tokens when the corresponding field is null", () => {
			const original = "- [ ] Task ⏫ 📅 2026-04-10";
			const newTask = makeTask({
				description: "Task",
				priority: TaskPriority.HIGH,
				dueDate: null,
			});
			const out = mapper.mergeTaskOntoRawLine(newTask, original);
			expect(out).not.toContain("📅");
		});

		it("drops unknown emoji tokens from the original (documented limitation)", () => {
			// 🏷 is not a known Obsidian Tasks token; it gets dropped by KISS merge.
			const original = "- [ ] Task 🏷 special ⏫ 📅 2026-04-10";
			const newTask = makeTask({
				description: "Task",
				priority: TaskPriority.HIGH,
				dueDate: new Date("2026-04-10"),
			});
			const out = mapper.mergeTaskOntoRawLine(newTask, original);
			expect(out).not.toContain("🏷");
		});
	});

	// ============================================================
	// Dataview Task mapping
	// ============================================================
	describe("mapDvToTaskType", () => {
		it("merges tags and overrides path / status from dvTask", () => {
			const dvTask = {
				text: "Do thing #inline [priority:: high] [due:: 2026-04-10]",
				status: "x",
				path: "real/path.md",
				tags: ["extra", "#hash"],
				subtasks: [],
			} as unknown as Parameters<TaskMapper["mapDvToTaskType"]>[0];

			const task = mapper.mapDvToTaskType(dvTask);

			expect(task.status).toBe(TaskStatus.DONE);
			expect(task.path).toBe("real/path.md");
			expect(task.tags).toEqual(
				expect.arrayContaining(["#inline", "#extra", "#hash"]),
			);
			expect(task.rawTaskLine).toBe(
				"- [x] Do thing #inline [priority:: high] [due:: 2026-04-10]",
			);
		});

		it("recurses into subtasks", () => {
			const dvTask = {
				text: "Parent [id:: p]",
				status: " ",
				path: "p.md",
				tags: [],
				subtasks: [
					{
						text: "Child [id:: c]",
						status: " ",
						path: "p.md",
						tags: [],
						subtasks: [],
					},
				],
			} as unknown as Parameters<TaskMapper["mapDvToTaskType"]>[0];

			const task = mapper.mapDvToTaskType(dvTask);
			expect(task.subtasks).toHaveLength(1);
			expect(task.subtasks?.[0]?.description).toBe("Child");
		});
	});

	// ============================================================
	// Round trip
	// ============================================================
	describe("round trip", () => {
		it("dataview: parse → serialise → parse is stable", () => {
			const line =
				"- [ ] Thing #work [id:: abc] [priority:: high] [due:: 2026-04-10] [repeat:: every week]";
			const first = mapper.mapMdToTaskType(line);
			first.rawTaskLine = line; // preserve format signal
			const serialised = mapper.mapTaskToLineString(first);
			const second = mapper.mapMdToTaskType(serialised);

			expect(second.description).toBe(first.description);
			expect(second.priority).toBe(first.priority);
			expect(second.recurs).toBe(first.recurs);
			expect(second.tags).toEqual(first.tags);
			expect(second.dueDate?.toISOString()).toBe(first.dueDate?.toISOString());
		});

		it("emoji: parse → serialise → parse is stable", () => {
			const line = "- [ ] Thing #work ⏫ 📅 2026-04-10 🔁 every week 🆔 abc123";
			const first = mapper.mapMdToTaskType(line);
			first.rawTaskLine = line;
			const serialised = mapper.mapTaskToLineString(first);
			const second = mapper.mapMdToTaskType(serialised);

			expect(second.description).toBe(first.description);
			expect(second.priority).toBe(first.priority);
			expect(second.recurs).toBe(first.recurs);
			expect(second.tags).toEqual(first.tags);
			expect(second.dueDate?.toISOString()).toBe(first.dueDate?.toISOString());
			// Format preserved across the round trip
			expect(serialised).toContain("📅");
			expect(serialised).not.toContain("[due::");
		});
	});
});
