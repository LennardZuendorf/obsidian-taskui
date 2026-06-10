# TaskUI

[![Lint, Format and Build](https://github.com/LennardZuendorf/Obsidian-TaskUI/actions/workflows/pr-ci.yaml/badge.svg)](https://github.com/LennardZuendorf/Obsidian-TaskUI/actions/workflows/pr-ci.yaml)

**Author**: Lennard Zündorf  
**License**: Apache 2.0

## ⚠️ Alpha Status


> [!WARNING]
>**TaskUI is currently in Alpha (v0.3)**. This means:
> - The plugin is functional but may have bugs or incomplete features, and breaking changes may occur between versions.
> - Some features are still under active development
> While interoperable with the Tasks Plugin, currently only the DataView mode is supported (which saves task details as *[[priority::high]]*, etc.).

## Overview

**TaskUI** is a modern task management plugin for Obsidian that provides a comprehensive visual interface for managing tasks within your markdown vault. It seamlessly integrates with the **Tasks** plugin and **DataView**, enabling you to create, edit, and organize tasks through an intuitive UI while keeping all data stored in your markdown files.

TaskUI maintains bidirectional synchronization between the visual interface and your markdown files, ensuring data integrity and allowing you to work with tasks either through the UI or directly in your markdown files.

## Features

### 📊 Multiple View Modes
- **Table View**: Spreadsheet-like interface with sortable columns and inline editing
- **List View**: Card-based list with grouping and expandable sections
- **Board View (Kanban)**: Visual board with drag-and-drop between status columns

### ✨ Task Management
- **Full CRUD Operations**: Create, read, update, and delete tasks through an intuitive interface
- **Task Status Tracking**: Manage tasks with statuses (todo, in-progress, done, cancelled)
- **Priority Levels**: Assign and visualize task priorities
- **Date Management**: Set scheduled dates and due dates with an intuitive date picker
- **Tags Support**: Organize tasks with tags
- **Task Descriptions**: Add detailed descriptions to your tasks

### 🔍 Advanced Organization
- **Grouping**: Group tasks by status, priority, dates, or custom fields
- **Sorting**: Multi-column sorting with visual indicators
- **Filtering**: Filter tasks by various criteria
- **Pagination**: Navigate through large task lists efficiently

### 🔄 Real-Time Synchronization
- **Bidirectional Sync**: Changes in the UI automatically sync to markdown files
- **Conflict Resolution**: Built-in mechanisms to handle sync conflicts

### 🎨 Modern UI
- Built with **React** and **TypeScript** for a responsive, type-safe experience and **TailwindCSS** styling for a modern, clean interface
- **Native Obsidian Theme**, the app follows your Obsidian theme 100% and therefore is also interoperable with other style plugins. 

## Requirements

- **Obsidian** (Desktop only - mobile support not available)
- **Tasks Plugin** - Required for task parsing and management (not mandatory but suggested)
- **DataView Plugin** - Required for task data access (**mandatory**)

## Installation

### Manual Installation

Since TaskUI is currently in Alpha and not yet available in the Obsidian Community Plugins browser, you'll need to install it manually:

1. **Download the latest release** from the [Releases page](https://github.com/LennardZuendorf/Obsidian-TaskUI/releases)
2. **Extract the files** from the downloaded archive
3. **Copy the plugin folder** to your Obsidian vault:
   - Navigate to your vault's `.obsidian/plugins/` directory
   - Create a `taskui` folder if it doesn't exist
   - Copy the plugin files into this folder
4. **Enable the plugin**:
   - Open Obsidian
   - Go to **Settings > Community Plugins**
   - Find **TaskUI** in the list
   - Toggle it on

### Building from Source

If you want to build from source:

```bash
# Clone the repository
git clone https://github.com/LennardZuendorf/Obsidian-TaskUI.git
cd Obsidian-TaskUI

# Install dependencies (requires pnpm)
pnpm install

# Build the plugin
pnpm run build

# The built files will be in the build/ directory
# Copy the contents to your .obsidian/plugins/taskui/ folder
```

## Usage

### Opening TaskUI

1. **Ribbon Icon**: Click the file-check icon in the left ribbon to open the TaskUI view
2. **Command Palette**: Use the command palette to open "TaskUI Task View"

## Development

### Tech Stack

- TypeScript, React, Vite
- TailwindCSS (styling), Jotai (state), TanStack Table, dnd-kit
- Radix UI, Zod, React Hook Form

### Development Commands

```bash
# Install dependencies
pnpm install

# Run development build with watch mode & automatic file copy into the dev vault
pnpm run dev

# Build for production
pnpm run build

# Lint and format code
pnpm run check
```

### Project Structure

```
taskui/
├── src/
│   ├── api/              # API services and types
│   ├── config/           # Plugin settings
│   ├── data/             # Data models and state management
│   ├── service/          # Business logic services
│   ├── ui/               # React components
│   │   ├── base/         # Base UI components
│   │   ├── components/   # Feature components
│   │   └── lib/          # UI utilities and configs
│   ├── utils/            # Utility functions
│   └── main.ts           # Plugin entry point
├── build/                # Built plugin files
└── dev-vault/            # Development vault for testing
```

## Contributing

Contributions are welcome but there's currently no framework, this is tbd.

## Known Issues & Limitations

- Desktop-only (mobile support not available)
- Some features may be incomplete or have bugs (Alpha status)
- Settings UI is still being refined

## Roadmap

See [GitHub Issues](https://github.com/LennardZuendorf/obsidian-taskui/issues)
for the backlog and known issues, and [`.spec/plan.md`](.spec/plan.md) for the
current delivery focus.

## Support

- **Issues**: [GitHub Issues](https://github.com/LennardZuendorf/Obsidian-TaskUI/issues)

## License

This project is licensed under the Apache 2.0 License.
