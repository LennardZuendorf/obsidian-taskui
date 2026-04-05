import { App, PluginSettingTab, Setting } from "obsidian";
import type TaskUIPlugin from "@/main";
import type { appSettings } from "./defaultSettings";

export type { appSettings } from "./defaultSettings";
export { defaultSettings } from "./defaultSettings";

export class AppSettingsTab extends PluginSettingTab {
	plugin: TaskUIPlugin;

	constructor(app: App, plugin: TaskUIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const settingsService = this.plugin.settingsService;

		// Clear previous elements
		containerEl.empty();

		// Default Path Setting
		new Setting(containerEl)
			.setName("Default Path")
			.setDesc("Set the default path where items will be saved.")
			.addText((text) =>
				text
					.setPlaceholder("/default/path")
					.setValue(settingsService.current.defaultPath)
					.onChange(async (value) => {
						await settingsService.update((settings) => {
							settings.defaultPath = value.trim();
						});
					}),
			);

		// Default Heading Setting
		new Setting(containerEl)
			.setName("Default Heading")
			.setDesc("Set the default heading to use.")
			.addText((text) =>
				text
					.setPlaceholder("My Default Heading")
					.setValue(settingsService.current.defaultHeading)
					.onChange(async (value) => {
						await settingsService.update((settings) => {
							settings.defaultHeading = value.trim();
						});
					}),
			);

		// Default Task Format Setting
		new Setting(containerEl)
			.setName("Default Task Format")
			.setDesc(
				"Format used when writing newly created tasks. Existing tasks always keep their original format on edit.",
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("dataview", "Dataview inline fields")
					.addOption("emoji", "Obsidian Tasks emojis")
					.setValue(settingsService.current.defaultTaskFormat ?? "dataview")
					.onChange(async (value) => {
						await settingsService.update((settings) => {
							settings.defaultTaskFormat =
								value === "emoji" ? "emoji" : "dataview";
						});
					}),
			);
	}
}

import { useAtomValue } from "jotai";
import { createContext, useContext } from "react";
import { settingsAtom } from "@/data/settingsAtom";

/**
 * Context to provide settings to React components (for backward compatibility).
 * Modern components should use useSettings() hook instead.
 */
export const SettingsContext = createContext<appSettings | undefined>(
	undefined,
);

/**
 * Hook to get settings using Jotai atom.
 * Automatically reactive - components re-render when settings change.
 * @returns Current settings
 */
export const useSettings = (): appSettings => {
	return useAtomValue(settingsAtom);
};
