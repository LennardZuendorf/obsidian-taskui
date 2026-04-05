import { beforeEach, describe, expect, it } from "vitest";
import { TaskBuilder } from "@/data/taskBuilder";
import { TaskPriority, TaskSource, TaskStatus } from "@/data/types/tasks";

describe("TaskBuilder", () => {
	describe("initial state", () => {
		it("seeds id, source and status by default", () => {
			const builder = TaskBuilder.create();
			const task = builder
				.setDescription("Do thing")
				.setPath("Tasks.md")
				.build();

			expect(task.id).toBeTruthy();
			expect(typeof task.id).toBe("string");
			expect(task.source).toBe(TaskSource.OBSIDIAN);
			expect(task.status).toBe(TaskStatus.TODO);
		});

		it("accepts a partial task on create() as initial state", () => {
			const builder = TaskBuilder.create({
				id: "seeded",
				description: "pre",
				source: TaskSource.OBSIDIAN,
				status: TaskStatus.IN_PROGRESS,
				priority: TaskPriority.HIGH,
				path: "Tasks.md",
				rawTaskLine: "",
			});
			const task = builder.build();
			expect(task.id).toBe("seeded");
			expect(task.status).toBe(TaskStatus.IN_PROGRESS);
			expect(task.priority).toBe(TaskPriority.HIGH);
		});
	});

	describe("setters and build()", () => {
		let builder: TaskBuilder;

		beforeEach(() => {
			builder = TaskBuilder.create();
		});

		it("chains setters and returns the same builder", () => {
			const chained = builder
				.setDescription("Write tests")
				.setPriority(TaskPriority.HIGH)
				.setStatus(TaskStatus.IN_PROGRESS)
				.setTags(["#work"])
				.setDueDate(new Date("2026-04-10"))
				.setPath("Tasks.md");
			expect(chained).toBe(builder);
		});

		it("produces a fully populated Task with a rawTaskLine", () => {
			const task = builder
				.setDescription("Write tests")
				.setPriority(TaskPriority.HIGH)
				.setDueDate(new Date("2026-04-10"))
				.setPath("Tasks.md")
				.build();

			expect(task.description).toBe("Write tests");
			expect(task.priority).toBe(TaskPriority.HIGH);
			expect(task.rawTaskLine).toBeTruthy();
			expect(task.rawTaskLine).toContain("Write tests");
		});

		it("throws a descriptive error when validation fails", () => {
			// An invalid priority enum value fails the Zod schema check.
			const bad = TaskBuilder.create({
				id: "x",
				description: "ok",
				priority: "urgent" as unknown as TaskPriority,
				source: TaskSource.OBSIDIAN,
				status: TaskStatus.TODO,
				path: "Tasks.md",
				rawTaskLine: "",
			});
			expect(() => bad.build()).toThrow(/Validation failed/);
		});
	});

	describe("finalize()", () => {
		it("returns isValid=false instead of throwing on invalid input", () => {
			const builder = TaskBuilder.create({
				id: "x",
				description: "ok",
				priority: "urgent" as unknown as TaskPriority,
				source: TaskSource.OBSIDIAN,
				status: TaskStatus.TODO,
				path: "Tasks.md",
				rawTaskLine: "",
			});
			const result = builder.finalize({});
			expect(result.isValid).toBe(false);
			expect(result.message).toMatch(/validation failed/i);
		});

		it("returns isValid=true and the built task on success", () => {
			const builder = TaskBuilder.create()
				.setDescription("ok")
				.setPath("Tasks.md");
			const result = builder.finalize({});
			expect(result.isValid).toBe(true);
			expect(result.task).toBeDefined();
			expect(result.task?.description).toBe("ok");
		});
	});
});
