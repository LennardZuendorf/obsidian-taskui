import { format } from "date-fns";
import { getDefaultStore } from "jotai";
import { dvTaskType } from "../api/internalApi/dataviewApi";
import { logger } from "../utils/logger";
import { settingsAtom } from "./settingsAtom";
import { TaskBuilder } from "./taskBuilder";
import { Task, TaskPriority, TaskSource, TaskStatus } from "./types/tasks";
import { parseDate } from "./utils/dateUtils";

// Obsidian Tasks plugin emoji tokens.
// Note: 🔼 is the canonical MEDIUM priority in the Obsidian Tasks plugin
// (not "up arrow = high"). See https://publish.obsidian.md/tasks/Getting+Started/Priorities
const EMOJI = {
	due: "📅",
	scheduled: "⏳",
	start: "🛫",
	created: "➕",
	done: "✅",
	cancelled: "❌",
	recurs: "🔁",
	id: "🆔",
	blocks: "⛔",
	pHighest: "🔺",
	pHigh: "⏫",
	pMedium: "🔼",
	pLow: "🔽",
	pLowest: "⏬",
} as const;

// Any known emoji token, for detection + strip purposes.
const ANY_EMOJI_REGEX =
	/[\u{1F4C5}\u{23F3}\u{1F6EB}\u{2795}\u{2705}\u{274C}\u{1F501}\u{1F194}\u{26D4}\u{1F53A}\u{23EB}\u{1F53C}\u{1F53D}\u{23EC}]/u;

const DATAVIEW_FIELD_REGEX = /\[[a-zA-Z0-9_-]+::\s*[^\]]+\]/;

const ANY_EMOJI_REGEX_GLOBAL =
	/[\u{1F4C5}\u{23F3}\u{1F6EB}\u{2795}\u{2705}\u{274C}\u{1F501}\u{1F194}\u{26D4}\u{1F53A}\u{23EB}\u{1F53C}\u{1F53D}\u{23EC}]/gu;

const DATAVIEW_FIELD_REGEX_GLOBAL = /\[[a-zA-Z0-9_-]+::\s*[^\]]+\]/g;

const DATE_REGEX_BY_EMOJI: Record<string, RegExp> = {
	[EMOJI.due]: /📅\s*(\d{4}-\d{2}-\d{2})/u,
	[EMOJI.scheduled]: /⏳\s*(\d{4}-\d{2}-\d{2})/u,
	[EMOJI.start]: /🛫\s*(\d{4}-\d{2}-\d{2})/u,
	[EMOJI.created]: /➕\s*(\d{4}-\d{2}-\d{2})/u,
	[EMOJI.done]: /✅\s*(\d{4}-\d{2}-\d{2})/u,
	[EMOJI.cancelled]: /❌\s*(\d{4}-\d{2}-\d{2})/u,
};

export class TaskMapper {
	/**
	 * Detects whether a raw task line uses the Obsidian Tasks emoji syntax or
	 * the Dataview inline-field syntax. For mixed lines the dominant format
	 * wins; ties fall back to "dataview" to preserve historical behaviour.
	 */
	private detectFormat(line: string): "emoji" | "dataview" {
		const hasE = ANY_EMOJI_REGEX.test(line);
		const hasD = DATAVIEW_FIELD_REGEX.test(line);
		if (hasE && !hasD) return "emoji";
		if (hasD && !hasE) return "dataview";
		if (hasE && hasD) {
			const eCount = (line.match(ANY_EMOJI_REGEX_GLOBAL) || []).length;
			const dCount = (line.match(DATAVIEW_FIELD_REGEX_GLOBAL) || []).length;
			return eCount > dCount ? "emoji" : "dataview";
		}
		return "dataview";
	}

	/**
	 * Maps a Task object to a markdown line string. Preserves the task's
	 * original format when rawTaskLine is present; otherwise uses the
	 * configured default format for newly created tasks.
	 */
	public mapTaskToLineString(task: Task): string {
		let fmt: "emoji" | "dataview";
		if (task.rawTaskLine && task.rawTaskLine.trim().length > 0) {
			fmt = this.detectFormat(task.rawTaskLine);
		} else {
			const settings = getDefaultStore().get(settingsAtom);
			fmt = settings.defaultTaskFormat ?? "dataview";
		}
		return fmt === "emoji"
			? this.mapTaskToEmojiLineString(task)
			: this.mapTaskToDataviewLineString(task);
	}

	private mapTaskToDataviewLineString(task: Task): string {
		const id = task.id ? `[id:: ${task.id}]` : "";
		const dependsOn =
			task.blocks && task.blocks.length > 0
				? `[dependsOn:: ${task.blocks.join(" ")}]`
				: "";
		const priority = task.priority ? `[priority:: ${task.priority}]` : "";
		const recurs = task.recurs ? `[repeat:: ${task.recurs}]` : "";
		const created = task.createdDate
			? `[created:: ${this.formatDate(task.createdDate)}]`
			: "";
		const start = task.startDate
			? `[start:: ${this.formatDate(task.startDate)}]`
			: "";
		const scheduled = task.scheduledDate
			? `[scheduled:: ${this.formatDate(task.scheduledDate)}]`
			: "";
		const due = task.dueDate ? `[due:: ${this.formatDate(task.dueDate)}]` : "";
		const completion = task.doneDate
			? `[completion:: ${this.formatDate(task.doneDate)}]`
			: "";
		const tagsString =
			task.tags && task.tags.length > 0 ? task.tags.join(" ") : "";
		const subtaskStrings = task.subtasks
			? task.subtasks
					?.map((sub) => this.mapTaskToDataviewLineString(sub))
					.join("\n\t")
			: "";

		return `- [${this.reverseMapStatus(task.status)}] ${task.description}${tagsString ? " " + tagsString : ""} ${id} ${dependsOn} ${priority} ${recurs} ${created} ${start} ${scheduled} ${due} ${completion}${subtaskStrings ? `\n\t${subtaskStrings}` : ""}`
			.replace(/\s+/g, " ")
			.trim();
	}

	private mapTaskToEmojiLineString(task: Task): string {
		const parts: string[] = [];
		parts.push(`- [${this.reverseMapStatus(task.status)}]`);
		if (task.description) parts.push(task.description);
		if (task.tags && task.tags.length > 0) parts.push(task.tags.join(" "));
		if (task.id) parts.push(`${EMOJI.id} ${task.id}`);
		if (task.blocks && task.blocks.length > 0) {
			parts.push(`${EMOJI.blocks} ${task.blocks.join(" ")}`);
		}
		const priorityEmoji = this.priorityToEmoji(task.priority);
		if (priorityEmoji) parts.push(priorityEmoji);
		if (task.recurs) parts.push(`${EMOJI.recurs} ${task.recurs}`);
		if (task.createdDate) {
			parts.push(`${EMOJI.created} ${this.formatDate(task.createdDate)}`);
		}
		if (task.startDate) {
			parts.push(`${EMOJI.start} ${this.formatDate(task.startDate)}`);
		}
		if (task.scheduledDate) {
			parts.push(`${EMOJI.scheduled} ${this.formatDate(task.scheduledDate)}`);
		}
		if (task.dueDate) {
			parts.push(`${EMOJI.due} ${this.formatDate(task.dueDate)}`);
		}
		if (task.doneDate) {
			parts.push(`${EMOJI.done} ${this.formatDate(task.doneDate)}`);
		}

		let line = parts.join(" ").replace(/\s+/g, " ").trim();
		if (task.subtasks && task.subtasks.length > 0) {
			const subtaskStrings = task.subtasks
				.map((sub) => this.mapTaskToEmojiLineString(sub))
				.join("\n\t");
			line += `\n\t${subtaskStrings}`;
		}
		return line;
	}

	/**
	 * Parses a markdown task line into a Task. Auto-detects whether the line
	 * uses Dataview inline-field syntax or Obsidian Tasks emoji syntax.
	 */
	public mapMdToTaskType(lineString: string): Task {
		return this.detectFormat(lineString) === "emoji"
			? this.mapEmojiMdToTaskType(lineString)
			: this.mapDataviewMdToTaskType(lineString);
	}

	private mapDataviewMdToTaskType(lineString: string): Task {
		// --- Extract Status ---
		const statusMarkerRegex = /^\s*-\s*\[(.)\]/;
		const statusMarkerMatch = lineString.match(statusMarkerRegex);
		const statusChar = statusMarkerMatch ? statusMarkerMatch[1] : " ";

		// --- Extract Description, Tags, and Attributes ---
		const lineWithoutStatus = statusMarkerMatch
			? lineString.substring(statusMarkerMatch[0].length).trim()
			: lineString.trim();

		// Regex to find tags (# followed by non-whitespace)
		const tagRegex = /(?:^|\s)(#\S+)/g;
		const tags: string[] = [];
		let lineWithoutTags = lineWithoutStatus;
		let tagMatch;
		while ((tagMatch = tagRegex.exec(lineWithoutStatus)) !== null) {
			// Store the full tag including '#' e.g., "#test"
			tags.push(tagMatch[1]);
			// Replace the matched tag (including potential leading space) with a single space
			lineWithoutTags = lineWithoutTags.replace(tagMatch[0], " ");
		}
		lineWithoutTags = lineWithoutTags.trim(); // Clean up spaces

		// Extract description from the remaining string (after tags and attributes removed)
		const attributeBlockRegex = new RegExp(
			"\\[([a-zA-Z0-9_-]+)::\\s*[^\\]]+\\]", // Corrected regex escaping
			"g",
		);
		const description = lineWithoutTags.replace(attributeBlockRegex, "").trim();

		// --- Extract Attributes (from original lineString, includes tags if they were there) ---
		const idMatch = lineString.match("\\[id:: ([^\\]]+)\\]");
		const dependsOnMatch = lineString.match("\\[dependsOn:: ([^\\]]+)\\]");
		const priorityMatch = lineString.match("\\[priority:: ([^\\]]+)\\]");
		const recursMatch = lineString.match("\\[repeat:: ([^\\]]+)\\]");
		const createdMatch = lineString.match("\\[created:: ([^\\]]+)\\]");
		const startMatch = lineString.match("\\[start:: ([^\\]]+)\\]");
		const scheduledMatch = lineString.match("\\[scheduled:: ([^\\]]+)\\]");
		const dueMatch = lineString.match("\\[due:: ([^\\]]+)\\]");
		const completionMatch = lineString.match("\\[completion:: ([^\\]]+)\\]");

		// Get current settings for default path
		const store = getDefaultStore();
		const settings = store.get(settingsAtom);

		let taskBase: Partial<Task> | undefined = undefined;

		if (idMatch) {
			const id = idMatch[1];
			taskBase = {
				id: id,
				path: settings.defaultPath,
				source: TaskSource.OBSIDIAN,
			};
		}

		return TaskBuilder.create(taskBase)
			.setDescription(description) // Use cleaned description
			.setPriority(
				priorityMatch
					? this.mapPriorityEnum(priorityMatch[1])
					: TaskPriority.MEDIUM,
			)
			.setStatus(this.mapStatusEnum(statusChar))
			.setPath(settings.defaultPath)
			.setSource(TaskSource.OBSIDIAN)
			.setRecurs(recursMatch ? recursMatch[1] : null)
			.setCreatedDate(parseDate(createdMatch ? createdMatch[1] : null))
			.setDueDate(parseDate(dueMatch ? dueMatch[1] : null))
			.setScheduledDate(parseDate(scheduledMatch ? scheduledMatch[1] : null))
			.setStartDate(parseDate(startMatch ? startMatch[1] : null))
			.setBlocks(dependsOnMatch ? dependsOnMatch[1].split(" ") : []) // Simplified split
			.setDoneDate(parseDate(completionMatch ? completionMatch[1] : null))
			.setTags(tags) // Set extracted tags (now including '#')
			.build();
	}

	private mapEmojiMdToTaskType(lineString: string): Task {
		// --- Extract Status ---
		const statusMarkerRegex = /^\s*-\s*\[(.)\]/;
		const statusMarkerMatch = lineString.match(statusMarkerRegex);
		const statusChar = statusMarkerMatch ? statusMarkerMatch[1] : " ";

		const lineWithoutStatus = statusMarkerMatch
			? lineString.substring(statusMarkerMatch[0].length).trim()
			: lineString.trim();

		// --- Extract Tags ---
		const tagRegex = /(?:^|\s)(#\S+)/g;
		const tags: string[] = [];
		let tagMatch;
		while ((tagMatch = tagRegex.exec(lineWithoutStatus)) !== null) {
			tags.push(tagMatch[1]);
		}

		// --- Extract Date Fields ---
		const due = this.extractEmojiDate(lineWithoutStatus, EMOJI.due);
		const scheduled = this.extractEmojiDate(lineWithoutStatus, EMOJI.scheduled);
		const start = this.extractEmojiDate(lineWithoutStatus, EMOJI.start);
		const created = this.extractEmojiDate(lineWithoutStatus, EMOJI.created);
		const done = this.extractEmojiDate(lineWithoutStatus, EMOJI.done);
		const cancelled = this.extractEmojiDate(lineWithoutStatus, EMOJI.cancelled);

		// --- Priority ---
		const priority = this.extractEmojiPriority(lineWithoutStatus);

		// --- Id ---
		const idMatch = lineWithoutStatus.match(/🆔\s*(\S+)/u);
		const id = idMatch ? idMatch[1] : undefined;

		// --- Blocks / Recurs (consume until next known emoji token or EOL) ---
		const blocksMatch = lineWithoutStatus.match(
			/⛔\s*([^\n📅⏳🛫➕✅❌🔁🆔⛔]+)/u,
		);
		const blocks = blocksMatch
			? blocksMatch[1].trim().split(/\s+/).filter(Boolean)
			: [];

		const recursMatch = lineWithoutStatus.match(
			/🔁\s*([^\n📅⏳🛫➕✅❌🔁🆔⛔]+)/u,
		);
		const recurs = recursMatch ? recursMatch[1].trim() : null;

		// --- Build description by stripping all known emoji tokens + payloads + tags ---
		let description = lineWithoutStatus;
		// Strip date emoji + YYYY-MM-DD
		description = description.replace(
			/(📅|⏳|🛫|➕|✅|❌)\s*\d{4}-\d{2}-\d{2}/gu,
			"",
		);
		// Strip 🆔 + id token
		description = description.replace(/🆔\s*\S+/gu, "");
		// Strip 🔁 / ⛔ + free text until next known emoji or EOL
		description = description.replace(
			/(🔁|⛔)\s*[^\n📅⏳🛫➕✅❌🔁🆔⛔]+/gu,
			"",
		);
		// Strip priority emojis
		description = description.replace(/🔺|⏫|🔼|🔽|⏬/gu, "");
		// Strip tags
		for (const tag of tags) {
			description = description.replace(tag, "");
		}
		description = description.replace(/\s+/g, " ").trim();

		// Status: ❌ cancelled date implies CANCELLED status; keep its date as doneDate
		let status = this.mapStatusEnum(statusChar);
		let doneDate = parseDate(done);
		if (cancelled) {
			status = TaskStatus.CANCELLED;
			if (!doneDate) doneDate = parseDate(cancelled);
		}

		const store = getDefaultStore();
		const settings = store.get(settingsAtom);

		const taskBase: Partial<Task> | undefined = id
			? {
					id,
					path: settings.defaultPath,
					source: TaskSource.OBSIDIAN,
				}
			: undefined;

		return TaskBuilder.create(taskBase)
			.setDescription(description)
			.setPriority(priority)
			.setStatus(status)
			.setPath(settings.defaultPath)
			.setSource(TaskSource.OBSIDIAN)
			.setRecurs(recurs)
			.setCreatedDate(parseDate(created))
			.setDueDate(parseDate(due))
			.setScheduledDate(parseDate(scheduled))
			.setStartDate(parseDate(start))
			.setBlocks(blocks)
			.setDoneDate(doneDate)
			.setTags(tags)
			.build();
	}

	private extractEmojiDate(line: string, emoji: string): string | null {
		const regex =
			DATE_REGEX_BY_EMOJI[emoji] ??
			new RegExp(`${emoji}\\s*(\\d{4}-\\d{2}-\\d{2})`, "u");
		const m = line.match(regex);
		return m ? m[1] : null;
	}

	private extractEmojiPriority(line: string): TaskPriority {
		if (line.includes(EMOJI.pHighest)) return TaskPriority.HIGHEST;
		if (line.includes(EMOJI.pHigh)) return TaskPriority.HIGH;
		if (line.includes(EMOJI.pMedium)) return TaskPriority.MEDIUM;
		if (line.includes(EMOJI.pLow)) return TaskPriority.LOW;
		if (line.includes(EMOJI.pLowest)) return TaskPriority.LOWEST;
		return TaskPriority.MEDIUM;
	}

	private priorityToEmoji(priority: TaskPriority): string | null {
		switch (priority) {
			case TaskPriority.HIGHEST:
				return EMOJI.pHighest;
			case TaskPriority.HIGH:
				return EMOJI.pHigh;
			case TaskPriority.MEDIUM:
				// MEDIUM is the implicit default in the Obsidian Tasks plugin;
				// omit the token to keep lines clean.
				return null;
			case TaskPriority.LOW:
				return EMOJI.pLow;
			case TaskPriority.LOWEST:
				return EMOJI.pLowest;
			default:
				return null;
		}
	}

	/**
	 * Maps a dvTaskType object to a taskTypes object.
	 * @param dvTask - The dvTaskType object to map.
	 * @returns The taskTypes object.
	 */
	public mapDvToTaskType(dvTask: dvTaskType): Task {
		// Map the Dataview task text (description + inline fields/tags) to a Task object
		const mappedTask = this.mapMdToTaskType(dvTask.text);

		// --- Override/Set reliable data from dvTask properties ---
		mappedTask.status = this.mapStatusEnum(dvTask.status);
		mappedTask.path = dvTask.path;

		// Combine tags: ensure all tags start with '#'
		const dvTags =
			dvTask.tags?.map((t: string) => (t.startsWith("#") ? t : `#${t}`)) || [];
		const textTags = mappedTask.tags || []; // Already have '#' from mapMdToTaskType
		const combinedTags = Array.from(new Set([...textTags, ...dvTags]));
		mappedTask.tags = combinedTags;

		// Map subtasks recursively
		mappedTask.subtasks =
			dvTask.subtasks && dvTask.subtasks.length > 0
				? dvTask.subtasks.map((subtask: dvTaskType) =>
						this.mapDvToTaskType(subtask),
					)
				: [];

		// --- Reconstruct and store the correct raw line ---
		const statusChar = this.reverseMapStatus(mappedTask.status);
		// Use the text from dvTask as it contains inline fields correctly parsed by dataview
		const reconstructedLine = `- [${statusChar}] ${dvTask.text}`;
		mappedTask.rawTaskLine = reconstructedLine;
		logger.debug(`DV Mapped Task (final): ${JSON.stringify(mappedTask)}`);

		return mappedTask;
	}

	/**
	 * Maps a string to a taskStatus enum.
	 * @param statusString - The status string to map.
	 * @returns The taskStatus enum.
	 */
	private mapStatusEnum(statusString: string): TaskStatus {
		switch (statusString) {
			case "/":
				return TaskStatus.IN_PROGRESS;
			case "-":
				return TaskStatus.CANCELLED;
			case "x":
				return TaskStatus.DONE;
			default:
				return TaskStatus.TODO;
		}
	}

	/**
	 * Maps a string to a taskPriority enum.
	 * @param priorityString - The priority string to map.
	 * @returns The taskPriority enum.
	 */
	private mapPriorityEnum(priorityString: string): TaskPriority {
		switch (priorityString) {
			case "high":
				return TaskPriority.HIGH;
			case "highest":
				return TaskPriority.HIGHEST;
			case "low":
				return TaskPriority.LOW;
			case "lowest":
				return TaskPriority.LOWEST;
			case "medium":
				return TaskPriority.MEDIUM;
			default:
				return TaskPriority.MEDIUM;
		}
	}

	private reverseMapStatus(taskStatus: TaskStatus): string {
		switch (taskStatus) {
			case TaskStatus.IN_PROGRESS:
				return "/";
			case TaskStatus.CANCELLED:
				return "-";
			case TaskStatus.DONE:
				return "x";
			default:
				return " ";
		}
	}

	private formatDate(date: Date | null): string | null {
		return date ? format(date, "yyyy-MM-dd") : null;
	}

	/**
	 * Merges the data from a Task object onto an existing raw line string,
	 * preserving unknown attributes from the raw line. Dispatches to a
	 * format-specific merge based on the original line's detected format so
	 * that edits never change a task's on-disk syntax.
	 */
	public mergeTaskOntoRawLine(newTask: Task, originalRawLine: string): string {
		return this.detectFormat(originalRawLine) === "emoji"
			? this.mergeTaskOntoEmojiLine(newTask, originalRawLine)
			: this.mergeTaskOntoDataviewLine(newTask, originalRawLine);
	}

	private mergeTaskOntoEmojiLine(
		newTask: Task,
		_originalRawLine: string,
	): string {
		// Emoji format does not preserve unknown tokens (KISS), so merging is
		// just re-serialising newTask. The dispatcher already guaranteed the
		// original line used emoji syntax, and newTask carries the full edited
		// state from the UI.
		return this.mapTaskToEmojiLineString(newTask);
	}

	private mergeTaskOntoDataviewLine(
		newTask: Task,
		originalRawLine: string,
	): string {
		// --- Extract components from originalRawLine ---
		const statusMarkerRegex = /^\s*-\s*\[(.)\]\s*/;
		const statusMarkerMatch = originalRawLine.match(statusMarkerRegex);
		const lineWithoutStatus = statusMarkerMatch
			? originalRawLine.substring(statusMarkerMatch[0].length)
			: originalRawLine;

		const attributeRegex = /\s*\[([a-zA-Z0-9_-]+)::\s*([^\]]+?)\s*\]/g;
		const originalAttributes = new Map<string, string>();
		let lineWithoutAttrsOrStatus = lineWithoutStatus;
		let attrMatch;
		while (
			(attrMatch = attributeRegex.exec(lineWithoutAttrsOrStatus)) !== null
		) {
			originalAttributes.set(attrMatch[1], attrMatch[2]);
			lineWithoutAttrsOrStatus = lineWithoutAttrsOrStatus.replace(
				attrMatch[0],
				"",
			);
		}
		lineWithoutAttrsOrStatus = lineWithoutAttrsOrStatus.trim();

		// --- Get desired components from newTask ---
		const newStatusChar = this.reverseMapStatus(newTask.status);
		const newDescription = newTask.description;
		const newTagsString =
			newTask.tags && newTask.tags.length > 0
				? " " + newTask.tags.join(" ")
				: "";

		// --- Directly build the map of attributes from newTask ---
		const newAttributes = new Map<string, string>();
		if (newTask.id) newAttributes.set("id", newTask.id);
		if (newTask.priority) newAttributes.set("priority", newTask.priority);
		if (newTask.dueDate) {
			const formatted = this.formatDate(newTask.dueDate);
			if (formatted) newAttributes.set("due", formatted);
		}
		if (newTask.scheduledDate) {
			const formatted = this.formatDate(newTask.scheduledDate);
			if (formatted) newAttributes.set("scheduled", formatted);
		}
		if (newTask.startDate) {
			const formatted = this.formatDate(newTask.startDate);
			if (formatted) newAttributes.set("start", formatted);
		}
		if (newTask.createdDate) {
			const formatted = this.formatDate(newTask.createdDate);
			if (formatted) newAttributes.set("created", formatted);
		}
		if (newTask.doneDate) {
			const formatted = this.formatDate(newTask.doneDate);
			if (formatted) newAttributes.set("completion", formatted); // Use 'completion' key
		}
		if (newTask.recurs) newAttributes.set("repeat", newTask.recurs);
		if (newTask.blocks && newTask.blocks.length > 0) {
			newAttributes.set("dependsOn", newTask.blocks.join(" "));
		}
		// Note: We intentionally don't add attributes if their value in newTask is null/undefined

		// --- Merge attributes: newAttributes override originalAttributes ---
		const finalAttributes = new Map<string, string>(originalAttributes);
		for (const [key, updatedValue] of newAttributes.entries()) {
			finalAttributes.set(key, updatedValue);
		}
		// Remove attributes if the corresponding newTask property is explicitly null/undefined
		if (newTask.dueDate === null && finalAttributes.has("due"))
			finalAttributes.delete("due");
		if (newTask.scheduledDate === null && finalAttributes.has("scheduled"))
			finalAttributes.delete("scheduled");
		if (newTask.startDate === null && finalAttributes.has("start"))
			finalAttributes.delete("start");
		// createdDate usually shouldn't be nullified
		if (newTask.doneDate === null && finalAttributes.has("completion"))
			finalAttributes.delete("completion");
		if (newTask.recurs === null && finalAttributes.has("repeat"))
			finalAttributes.delete("repeat");
		if (newTask.blocks === null && finalAttributes.has("dependsOn"))
			finalAttributes.delete("dependsOn");

		// --- Reconstruct the final line --- (Description + Tags + Attributes)
		let reconstructedLine = `- [${newStatusChar}] ${newDescription}${newTagsString}`;

		const attributeOrder = [
			"id",
			"priority",
			"due",
			"scheduled",
			"start",
			"created",
			"done",
			"repeat",
			"dependsOn",
		];
		const writtenKeys = new Set<string>();
		for (const key of attributeOrder) {
			if (finalAttributes.has(key)) {
				reconstructedLine += ` [${key}:: ${finalAttributes.get(key)}]`;
				writtenKeys.add(key);
			}
		}
		for (const [key, value] of finalAttributes.entries()) {
			if (!writtenKeys.has(key)) {
				reconstructedLine += ` [${key}:: ${value}]`;
			}
		}

		return reconstructedLine.trim();
	}
}
