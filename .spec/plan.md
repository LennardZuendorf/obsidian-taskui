---
type: entrypoint
scope: implementation
covers: feature sequence, build order, validation criteria, open decisions
children: []
updated: 2026-06-09
---

# TaskUI — Implementation Plan

TaskUI is a single Obsidian plugin (alpha, v0.2.2 / targeting v0.3). The core data round-trip and all three views already exist in the codebase; current delivery focus is finishing the v0.3 alpha — polishing the List and Board UIs, stabilizing the create/edit form, confirming settings persistence, and adding initial tests. The four areas are largely parallel projections over one shared task store rather than a strict linear build, so this plan tracks them as a cluster with an honest status per area.

**Parent specs:** [product.md](product.md), [tech.md](tech.md), [design.md](design.md)

Feature folders under `features/<name>/` (with unit-level `plan.md`) are created
when an area is taken through a design phase. None are scoped yet; this root plan
is the current roadmap.

---

## Validation Summary

Built and working: plugin shell and view registration; Dataview fetch →
validated Jotai store → markdown write-back; bidirectional sync with periodic
remote fetch and bounded retry; Table view with sort/filter/group/pagination;
List and Board (Kanban) views; Ophidian-backed settings with an Obsidian
settings tab; create/edit form via React Hook Form + Zod.

Remaining for alpha: List and Board UI polish; create/edit form cleanup and
robust date editing; verification of settings persistence; initial test
coverage. See **Spec vs Implementation** for known drift.

---

## Feature Boundaries

```
task-sync   ── owns ──>  src/api/**, src/data/**, src/service/taskSyncService.ts, taskService.ts
task-views  ── owns ──>  src/ui/components/views/**, src/ui/components/table/**
task-forms  ── owns ──>  src/ui/components/forms/**, TaskFormSchema, field editors
settings    ── owns ──>  src/config/**, src/service/SettingsService.ts, settingsAtom
```

| Area | Owns | Does not own |
|---|---|---|
| **task-sync** | API mapping, vault read/write, atom store, validation, sync loop | Rendering tasks, form UI, settings UI |
| **task-views** | Table/List/Board rendering, shared controls, view state | Writing to the vault, task creation forms |
| **task-forms** | Create/edit form, field editors, form-schema validation | Persisting to disk (delegates to task-sync), view layout |
| **settings** | Settings schema, persistence, settings tab | Task data, view rendering |

---

## Feature Sequence

No single linear endgame — the four areas compose over one store and are
delivered/polished in parallel. Cross-area dependency is one-directional:
views and forms depend on task-sync's store and write path.

| Area | Deliverable | Status | Depends on |
|---|---|---|---|
| **task-sync** | Fetch → validated store → write-back + retry/conflict loop | MOSTLY DONE | — |
| **settings** | Default path/heading persisted (Ophidian) + settings tab | MOSTLY DONE | — |
| **task-views** | Table done; List & Board functional, UI polish pending | IN PROGRESS | task-sync |
| **task-forms** | Modal create/edit + inline editors; cleanup pending | IN PROGRESS | task-sync |

---

## Spec vs Implementation

| Gap | Area | Notes |
|---|---|---|
| `docs/` consolidated into `.spec/` (2026-06-09) | task-views / task-forms | Old `docs/` prose removed; design lives in `.spec/`, backlog migrated to GitHub Issues. List/Board are implemented (polish pending). |
| Some filed bugs predate the `views/`+`forms/` rewrite | task-views / task-forms | Tracked in GitHub Issues ("verify edit pre-fill / delete-from-list", "table column controls") — re-check against current code before fixing. |
| Initial test suite incomplete | all | Test setup and rough unit/integration tests are an alpha exit item. |
| `todoistApiKey` setting present but unused | settings | Placeholder for future external sync; not wired. |

---

## Current Focus

Finish the v0.3 alpha: polish the List and Board view UIs, clean up and harden
the create/edit form (especially date editing), verify settings persist across
reloads, and stand up an initial test suite. Next human gate: confirm the alpha
exit criteria in [product.md](product.md) § Implementation Phases are met before
tagging v0.3.
