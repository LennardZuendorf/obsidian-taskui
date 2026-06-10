---
type: entrypoint
scope: product
children: []
updated: 2026-06-09
---

# TaskUI — Product

TaskUI is an Obsidian plugin that turns the scattered, plain-text checkboxes in a vault into a single visual workspace — table, list, and Kanban board — for managing tasks without leaving Obsidian. It reads tasks through Dataview, stays interoperable with the Tasks plugin's markdown conventions, and writes every change straight back into the markdown files so the vault remains the source of truth.

**One-liner:** A visual, vault-native task manager for Obsidian where markdown stays the source of truth.

---

## Story

Obsidian users already capture tasks as markdown checkboxes scattered across hundreds of notes. The Tasks and Dataview plugins make those tasks queryable, but querying is not managing: there is no place to triage a backlog, drag a task across a board, or edit due dates and priorities through a real interface. People either accept read-only query blocks or leave Obsidian for a dedicated task app and lose the link to their notes. TaskUI closes that gap — a first-class management UI that reads and writes the same markdown, so the plugin is a lens over the vault rather than a second store to keep in sync.

---

## Requirements

At a project level, TaskUI must:

1. **Surface every vault task in one view.** Aggregate tasks via Dataview and present them in interchangeable Table, List, and Board modes.
2. **Keep markdown the source of truth.** Every create, edit, and delete writes back to the originating markdown file; the UI never becomes an authoritative second copy.
3. **Stay interoperable with the Tasks plugin.** Parse and emit task metadata in both supported conventions — Dataview inline `[field:: value]` attributes and Obsidian Tasks emoji syntax — detecting an existing line's format and preserving it, and using the configured default format for new tasks.
4. **Synchronize bidirectionally and resiliently.** Reflect external edits to files back into the UI, push UI edits to disk, and recover from transient failures with bounded retries.
5. **Validate all task data at the boundary.** No task enters application state without passing schema validation.
6. **Respect the host environment.** Follow the active Obsidian theme, clean up on unload, and require only the dependencies it declares (Dataview mandatory, Tasks recommended).

---

## Design Principles

1. **Vault is truth, UI is a lens.** When the UI and the file disagree, the file wins after a sync round-trip. The plugin's job is to present and edit, not to own.
2. **Validate at the edge.** Untrusted data (Dataview output, user input) is validated once on the way in; the interior trusts its types.
3. **One task model, many views.** Table, List, and Board are projections of the same validated task state, not separate data paths.
4. **Fail loud, degrade gracefully.** Missing required plugins and sync failures surface to the user instead of corrupting state silently.
5. **Desktop-first, theme-native.** Optimize for the desktop Obsidian experience and inherit the user's theme rather than imposing a separate visual identity.

---

## Target User

An existing Obsidian power user who already keeps tasks as markdown checkboxes and runs Dataview (and usually the Tasks plugin). They manage tens to hundreds of tasks across many notes, want a structured interface to triage and update them, and refuse to give up plain-text ownership of their data. They work on desktop.

---

## Features

TaskUI is a single plugin composed of the cohesive areas below. Detailed,
branch-scoped specs are written under `features/<name>/` when an area is taken
through a design phase; until then this map is the high-level inventory.

| Area | Covers |
|---|---|
| **task-sync** | Bidirectional sync engine: Dataview fetch, markdown write-back, periodic remote refresh, retry and conflict handling. |
| **task-views** | The three view projections — Table (TanStack Table), List (grouped cards), Board (Kanban via dnd-kit) — plus shared sort/filter/group controls. |
| **task-forms** | Create and edit experience: modal form, inline field editors, schema-backed validation, date/tag/enum inputs. |
| **settings** | Plugin settings (default file path, default heading) persisted via Ophidian and surfaced in an Obsidian settings tab. |

---

## Implementation Phases

| Phase | Goal | Exit Criteria |
|---|---|---|
| **1: Alpha (v0.3)** | All three views usable, full task CRUD with bidirectional sync, working settings, initial tests | List & Board UIs finalized; create/edit form stable; settings persist; core data flow tested |
| **2: Post-alpha (v0.4)** | Reactivity and reach | Event-based Dataview fetch; inline editing in List/Board; calendar/overview view; sidebar surfacing |

---

## Non-Goals

- **Mobile support.** Desktop-only by design (`isDesktopOnly`).
- **A second data store.** TaskUI does not maintain an authoritative database independent of the vault's markdown.
- **External sync (now).** Todoist, cloud, and external-calendar integrations are long-horizon vision, not current scope.
- **Replacing Dataview or Tasks.** TaskUI builds on them; it does not reimplement task parsing or querying.
