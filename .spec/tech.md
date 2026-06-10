---
type: entrypoint
scope: technical
children: []
updated: 2026-06-09
---

# TaskUI — Technical Architecture

TaskUI is a React application embedded in an Obsidian `ItemView`. A thin API layer reads tasks from the Dataview plugin and writes them back through the Obsidian vault file API; a Jotai atom store holds the single validated task model; and a sync service bridges the two, pushing local edits to disk and folding periodic remote fetches back into state. All data crossing the boundary is validated with Zod. Feature-level implementation detail lives under `.spec/features/<name>/`.

---

## Design Philosophy

1. **Layered, one-directional dependencies.** UI → state → services → API → Obsidian/Dataview. UI never calls the vault directly; the API layer never imports React.
2. **State is the contract between layers.** Components read and write Jotai atoms; services observe derived atoms. No component owns task data.
3. **Markdown round-trips, never diverges.** Writes go to files; a periodic fetch re-reads them; conflict logic preserves unsynced local edits over stale remote reads.
4. **Validate untrusted input once.** Dataview output and form input pass through Zod schemas at the edge; interior code trusts the `Task` type.
5. **No `any`, strict TypeScript, Biome-clean.** Type safety and a single formatter/linter (Biome, tabs) are enforced pre-commit.

---

## Architecture Overview

```
obsidian-taskui/
├── src/
│   ├── main.ts               # Plugin entry: registers VIEW_TYPE_MAIN, ribbon, settings tab
│   ├── MainView.tsx          # ItemView host; mounts React, wires sync observer
│   ├── api/                  # Obsidian + Dataview integration (internalApiService + internalApi/*)
│   ├── data/                 # Jotai atoms, mappers, builders, types, validation utils
│   ├── service/              # taskService (CRUD facade), taskSyncService, SettingsService
│   ├── config/               # Settings schema + Obsidian settings tab
│   ├── ui/                   # React: base/ primitives, components/ (views, forms, table), lib/config
│   └── utils/                # logger (pino), context, pluginCheck, errorUtils
├── tests/                    # Vitest suite (mapper, builder, dateUtils, validation)
├── dev-vault/                # Development Obsidian vault
├── assets/                   # Static assets (logo)
└── .spec/                    # Design docs (this directory)
```

---

## Tech Stack

**Platform:** Obsidian plugin API (`minAppVersion 1.10.0`, desktop-only), Dataview API (mandatory source), Tasks plugin conventions (interop), Ophidian (`@ophidian/core`) for settings persistence.

**Framework & build:** React 18, TypeScript 4.8 (strict), Vite 7, pnpm, Biome (lint/format), Husky + lint-staged.

**Testing:** Vitest (`test` / `test:watch` / `test:coverage`), node environment with mocked Obsidian setup files, run per Node version in CI.

**State & data:** Jotai (atoms, `atomWithStorage`, jotai-effect) for state; Zod for runtime validation; date-fns + chrono-node + `@internationalized/date` for dates.

**UI:** TanStack Table (Table view), dnd-kit (Board drag-and-drop), Radix UI primitives, React Hook Form + `@hookform/resolvers/zod` (forms), react-day-picker, Lucide/react-icons, TailwindCSS (theme-inheriting).

**Logging:** pino (`trace` in dev, `info` in prod).

---

## State / Data Contracts

| Contract | Location | Invariant |
|---|---|---|
| `Task` | `src/data/types/tasks.ts` (`TaskSchema`) | Every task in state has passed `TaskSchema`; enums are `TaskStatus`, `TaskPriority`, `TaskSource`. |
| `TaskWithMetadata` | `src/data/types/*` | Store holds `{ task, metadata }`; sync metadata (`needsSync`, `toBeSyncedAction`, `retryCount`, …) never leaks into markdown. |
| `storeOperation` | task atoms | All mutations go through `updateTaskAtom` with an operation (`LOCAL_ADD/UPDATE/DELETE`, `REMOTE_UPDATE`, `RESET`, `SYNC_CONFIRMED`); no direct atom mutation. |
| Markdown line | vault files | A task's `rawTaskLine` + `path`/`line` is the source of truth; writes merge fields onto the existing line, preserving unknown attributes. Two line formats are supported — Dataview inline fields and Tasks emoji syntax — with an existing line's format auto-detected and preserved. |
| Task line format | `appSettings.defaultTaskFormat` | `"dataview"` (default) or `"emoji"`; applies to newly created tasks. Existing tasks keep their detected format. |
| View state | `localStorage` via `atomWithStorage` | Sorting/filtering/grouping/pagination/expansion persist locally and are never written to the vault. |
| Settings | Ophidian (plugin data) ↔ `settingsAtom` | `SettingsService` keeps Ophidian and the Jotai atom in sync; default path/heading drive task creation. |

---

## Build vs Inherit

| Source | What |
|---|---|
| **Obsidian + Dataview + Tasks** (inherited) | Vault file system, task parsing/query, plugin lifecycle and UI host. |
| **Radix / TanStack / dnd-kit / RHF** (inherited) | Headless UI, table engine, drag-and-drop, form state. |
| **TaskUI** (this project) | The bridge: API mapping + write-back, Jotai store and sync engine, the three views, the form layer, settings wiring, validation. |

---

## Build Sequence

| Order | Component | Area |
|---|---|---|
| 1 | Plugin shell, view registration, Dataview/plugin checks | settings / platform |
| 2 | Task model, mapper, atom store, validation | task-sync |
| 3 | Fetch → store → write-back round-trip with retry | task-sync |
| 4 | Table view + shared sort/filter/group controls | task-views |
| 5 | List and Board views | task-views |
| 6 | Create/edit form + inline field editors | task-forms |

Unit-level detail lives in feature `plan.md` when an area is scoped — not here.

---

## Features

Branch-scoped architecture lives under `features/<name>/tech.md` once an area is
designed. Current high-level map:

| Area | Covers |
|---|---|
| **task-sync** | `api/` (Dataview fetch, Obsidian write), `data/` store + mappers, `service/taskSyncService.ts` periodic fetch, retry, conflict logic. |
| **task-views** | `ui/components/views/*` (Table/List/Board), `ui/components/table/*` controls, TanStack Table config, dnd-kit board. |
| **task-forms** | `ui/components/forms/*`, `TaskFormSchema`, field editors, RHF + Zod validation. |
| **settings** | `config/*`, `service/SettingsService.ts`, Ophidian persistence, `settingsAtom`. |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hard dependency on Dataview — absent/disabled breaks the source | `pluginCheck` verifies required plugins on load and surfaces a clear error view. |
| Polling-based fetch (every ~5s) can race local edits or scale poorly | Sync logic preserves `needsSync` local tasks over remote reads; v0.4 moves to event-based Dataview fetch. |
| Write-back corrupting a markdown line | Merge fields onto the existing raw line and preserve unknown attributes rather than regenerating from scratch; validate before write. |
| Sync failure loops | Bounded retry (`retryCount`), `syncFailed` flag after repeated failures, user notification. |
| Spec/docs drift from code | `.spec/` is the single source of design truth (old `docs/` prose removed); backlog/issues live in GitHub Issues. Keep `.spec/` + code as truth; re-validate after changes. |
