import { z } from "zod";

export const appSettingsSchema = z.object({
	defaultPath: z.string(),
	defaultHeading: z.string(),
	todoistApiKey: z.string().optional(),
	defaultTaskFormat: z.enum(["dataview", "emoji"]).default("dataview"),
});

export type appSettings = z.infer<typeof appSettingsSchema>;

export const defaultSettings: appSettings = {
	defaultPath: "Tasks.md",
	defaultHeading: "# Tasks",
	defaultTaskFormat: "dataview",
};
