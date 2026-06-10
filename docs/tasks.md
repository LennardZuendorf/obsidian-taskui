# Project Tasks & Issues

Backlog, open bugs, and planned refactorings for TaskUI.

> **Relationship to `.spec/`:** This is the project's **backlog + issue tracker**.
> The durable design docs under [`/.spec/`](../.spec/) stay *current-only* (no
> backlog) by design — long-horizon items and bugs live here instead. For the
> active delivery focus and feature boundaries, see
> [`.spec/plan.md`](../.spec/plan.md); for architecture, see
> [`.spec/tech.md`](../.spec/tech.md). **Code is truth** — statuses below were
> reconciled against the current `src/` layout on 2026-06-09; re-verify the
> items still marked open against the code before acting.

---

## 🚀 v0.3 Goals (Alpha)

### 1. View Implementations (List & Kanban)

- [x] **List View UI:** Implemented in `src/ui/components/views/ListView.tsx`
      (collapsible grouped cards). _Polish/visual pass still open._
- [x] **Kanban View UI:** Implemented in `src/ui/components/views/BoardView.tsx`
      + `views/board/BoardColumn.tsx` (dnd-kit drag-and-drop). _Polish still open._
- [ ] **Polish List & Board UIs** to "good-looking" alpha quality.
- [x] **Core View Architecture:**
  - [x] Table logic centralized in `src/ui/components/table/DTable.tsx` via the
        `useDTable()` hook (the planned `useTaskTable.ts` rename was not taken;
        the hook lives in `DTable.tsx`). Revisit only if it grows unwieldy.
  - [x] `src/ui/components/TaskView.tsx` handles tabs, shared controls
        (group/sort/filter + add), and view rendering (replaces the old
        `TaskViewManager` name).
  - [x] `ListView.tsx` and `BoardView.tsx` structures finalized for UI work.

### 2. Task Creation & Editing Form

- [x] **BUG (resolved):** "Cannot find module './TaskFormSchema'" — the old
      `src/ui/components/shared/FullTaskForm.tsx` was replaced by
      `src/ui/components/forms/TaskForm.tsx` with `forms/TaskFormSchema.ts`.
- [ ] **Cleanup & Finalize `forms/TaskForm.tsx`:**
  - [ ] Improve overall design, layout, and user experience.
  - [ ] Ensure robust and intuitive date editing (`forms/fields/DatePickerInput.tsx`).

### 3. Settings

- [x] **Implement Settings:** `src/service/SettingsService.ts` persists settings
      via `@ophidian/core`; `src/config/settings.ts` provides the Obsidian
      settings tab (default path + heading), backed by `settingsAtom`.
- [ ] **Refine Settings UX** and remove the unused `todoistApiKey` placeholder
      (or defer until external sync is scoped).

### 4. Initial Testing

- [x] **First test landed:** `tests/data/utils/validateTask.test.ts`.
- [ ] **Test runner setup:** confirm/standardize the runner (e.g. Jest with
      `jest-environment-obsidian`) and wire a `test` script.
- [ ] **Write view/form tests:** `ListView.tsx`, `BoardView.tsx`,
      `forms/TaskForm.tsx`, and core data/state management.

### 5. Project Finals & Documentation

- [x] **README.md:** present and comprehensive.
- [x] **Application Logo:** `docs/img/icon.png` in place.
- [x] **Design docs:** root specs drafted under [`/.spec/`](../.spec/).
- [ ] **CONTRIBUTING.md:** still missing — create contributor guidelines.
- [ ] **GitHub Setup:** review issue templates, labels, project boards.

---

## 🚀 v0.4 Goals (Post-Alpha)

- [ ] **Overview/Daily View:** dedicated daily-tasks or dashboard view.
- [ ] **Calendar View:** full UI + functionality (not yet implemented).
- [ ] **Enhanced Settings:** expand on the v0.3 settings.
- [ ] **Inline Editing (Views):** edit directly within List and Board views.
- [ ] **Obsidian Sidebar Integration:** surface current/daily tasks in the sidebar.
- [ ] **Event-Based Fetch Logic:** replace the periodic (~5s) poll with
      event-driven DataView updates (see risk in `.spec/tech.md`).
- [ ] **Tag Badges:** display tag badges in views.

---

## 🌌 v1.0+ Goals (Future Vision / Long-Term)

- [ ] **Projects & UI Revamp:** introduce a "Projects" concept and a larger UI overhaul.
- [ ] **Todoist API Sync:** synchronize with the Todoist API (the `TaskSource.TASKUI`
      path and `todoistApiKey` setting are placeholders for this).
- [ ] **Cloud Sync (TaskUI Webapp):** integrate cloud sync with a dedicated web app.
- [ ] **External Calendar Integration:** Google/Outlook calendar integration.
- [ ] **Advanced Query Language/Filtering:** powerful query/filter logic (à la Tasks plugin).

---

## 🐛 Known Bugs & Issues

> The components below were rewritten into `views/`, `forms/`, and `task/`
> since these were filed. References are updated; **re-verify each against the
> current code** before fixing — some may already be resolved.

### Needs re-verification

- [ ] **Edit action:** confirm `forms/TaskModal.tsx` pre-fills with the selected
      task (not create mode) when triggered from `views/ListView.tsx`.
- [ ] **Delete action:** confirm no `TypeError` on delete from the list cards
      (`task/TaskListCard.tsx` / `task/SettingsButton.tsx`) — original report was
      an undefined `task` in the handler.

### Table behavior

- [ ] **Grouping:** disable grouping for `description` and `tags` columns;
      verify computed date-category columns (`scheduledDateCategory`,
      `dueDateCategory`, via `src/ui/lib/config/dateCategory.ts`) group cleanly.
- [ ] **Sorting:** disable sorting for the computed date-category columns.
- [ ] **Filtering:** disable filtering for `description` and `tags` columns.
- [ ] **Sort dropdown:** fix the reordering issue in `table/DTableSortBy.tsx`.

### Code quality

- [ ] **`any` assertions:** address the `any` on the `table` prop passed to view
      components from `src/ui/components/TaskView.tsx`. (The old
      `src/data/types/dateCategories.ts` lint item is obsolete — that file no
      longer exists; date categories now live in `src/ui/lib/config/`.)

---

## 📜 Backlog / Future Enhancements

### Refactoring & Code Quality

- [x] **Display config abstraction:** done — `statusDisplayConfig`/`priorityDisplayConfig`/
      `dateDisplayConfig` were consolidated into `src/ui/lib/config/{status,priority,date,
      column}.ts` sharing `config/types.ts` + `config/utils.ts` (`getMatchingDisplay`).
- [x] **Reusable enum selector:** `forms/fields/EnumSelect.tsx` is a controlled,
      config-driven selector covering both status and priority (replaces the
      separate `PrioritySelect`/`StatusSelect`).
- [x] **Description input:** `forms/fields/DescInput.tsx` exists as a controlled component.
- [ ] **Continue consolidating** any remaining one-off display/selector logic into
      `ui/lib/config` and `forms/fields`.

### Testing

- [ ] **Comprehensive Testing:** expand coverage across views, forms, sync, and
      data/state beyond the initial validation test.

---

## ✅ Recently Completed / Verified

- [x] Core Table/View logic: sorting, filtering, grouping, pagination.
- [x] Task actions: editing and deleting tasks from views.
- [x] List and Board views implemented (UI polish ongoing).
- [x] Settings via Ophidian + Obsidian settings tab.
- [x] Display-config and field-component refactors (see Backlog above).
- [x] Root design docs drafted under `/.spec/`.
