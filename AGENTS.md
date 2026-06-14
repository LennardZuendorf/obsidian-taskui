# AGENTS.MD - LLM Engineering Guide

**Last Updated:** 2026-02-10
**Repository:** taskui v0.3 (snapshot)
**Project Type:** Obsidian Plugin (Desktop-only)

## Core Operating Principles

### 1. ASK → PLAN → CONFIRM → EXECUTE

**NEVER write code without approval.**

1. **ASK**: Clarify requirements, understand constraints, avoid assumptions
2. **PLAN**: Break down tasks, research patterns, present approach with reasoning
3. **CONFIRM**: Get explicit user approval before any implementation
4. **EXECUTE**: Implement step-by-step with clear explanations

### 2. Quality-First Engineering

- **KISS**: Keep It Simple, Stupid - prefer simplicity over complexity
- **Type Safety**: All code MUST pass TypeScript strict mode (`noImplicitAny`, `strictNullChecks`)
- **Code Quality**: All commits MUST pass Biome checks
- **Validation**: Runtime validation with Zod schemas required
- **Performance**: Optimize for large task lists (100s-1000s of tasks)

### 3. Critical Constraints

- **NEVER run `pnpm dev`** - user already has watch mode running
- **NEVER modify Obsidian API surfaces without understanding plugin lifecycle**
- **NEVER skip Zod validation** - all external data MUST be validated
- **NEVER mutate Jotai atoms directly** - use atom write functions
- **NEVER create files without necessity** - prefer editing existing files
- **NEVER proceed without user confirmation**
- **NEVER skip Biome checks** - run `pnpm check` before commits

## Tech Stack

### Core Technologies
```typescript
// Platform & APIs
Obsidian API       // Plugin integration, file system, UI
Dataview API       // Task data source (MANDATORY dependency)
Tasks Plugin       // Task parsing (optional but recommended)

// Framework & Language
React 18           // UI components
TypeScript 4.8     // Strict mode required
Vite 7             // Build tooling
Node.js 16+        // Runtime environment

// UI & Styling
TailwindCSS 3.4    // Utility-first CSS
Radix UI           // Headless component primitives
Lucide React       // Icon library
shadcn/ui pattern  // Component architecture

// State & Data
Jotai 2.12         // Atomic state management
Zod 3.24           // Runtime schema validation
TanStack Table 8   // Data grid primitives
TanStack Form 1    // Form state management (optional/experimental)

// Interactions
dnd-kit 6          // Drag and drop (Kanban board)
React Hook Form 7  // Form handling (preferred - use this for consistency)
React Day Picker 9 // Date selection

// Utilities
date-fns 4         // Date manipulation
chrono-node 2      // Natural language date parsing
pino 9             // Structured logging
lodash 4           // Utility functions
```

### Package Manager Rules
```bash
# ONLY use PNPM - NEVER npm or yarn
pnpm install           # Install dependencies
pnpm dev               # Development build with watch (USER RUNS THIS - NOT YOU)
pnpm build             # Development build + Biome checks
pnpm build:release     # Production build + version bump (patch)
pnpm check             # Biome lint + format
```

## Project Architecture

### Directory Structure
```
/src/
  main.ts             # Plugin entry point (Obsidian Plugin class)
  MainView.tsx        # Root React component
  styles.css          # Global styles

  api/                # Obsidian & Dataview API integration
    types/            # API type definitions
    InternalApiService.ts  # Core API service

  config/             # Plugin settings
    PluginSettings.ts # Settings schema and defaults

  data/               # State management & data models
    types/            # Task types, enums, schemas
    store/            # Jotai atoms and state logic

  service/            # Business logic layer
    TaskSyncService.ts   # Sync between UI and markdown
    TaskMapper.ts        # Data transformation
    ValidationService.ts # Zod validation wrapper

  ui/                 # React components
    base/             # Reusable UI primitives (buttons, inputs, etc.)
    components/       # Feature components (views, forms, etc.)
    lib/              # UI utilities and configs

  utils/              # Utility functions
    logger.ts         # Pino logger setup
    dateUtils.ts      # Date parsing and formatting

/build/               # Build output (gitignored)
/dev-vault/           # Development Obsidian vault
/assets/              # Static assets (logo)
/.spec/               # Design docs (product, tech, design, plan, lessons)
```

### Obsidian Plugin Integration

**Plugin Lifecycle:**
```typescript
// main.ts structure
export default class TaskUIPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    // 1. Load settings
    await this.loadSettings();

    // 2. Register views
    this.registerView(VIEW_TYPE_TASKUI, (leaf) => new TaskUIView(leaf, this));

    // 3. Add ribbon icon
    this.addRibbonIcon('file-check', 'TaskUI Task View', () => {
      this.activateView();
    });

    // 4. Register commands
    this.addCommand({
      id: 'open-taskui-view',
      name: 'Open TaskUI Task View',
      callback: () => this.activateView()
    });
  }

  async onunload() {
    // Cleanup: detach views, clear intervals
  }
}
```

**View Registration:**
```typescript
// Register custom view type
this.registerView(
  VIEW_TYPE_TASKUI,
  (leaf) => new TaskUIView(leaf, this.plugin)
);

// Activate view programmatically
async activateView() {
  const { workspace } = this.app;

  let leaf = workspace.getLeavesOfType(VIEW_TYPE_TASKUI)[0];
  if (!leaf) {
    const rightLeaf = workspace.getRightLeaf(false);
    if (!rightLeaf) {
      // Fallback: create new leaf if getRightLeaf returns null
      leaf = workspace.getRightLeaf(true);
      if (!leaf) {
        throw new Error('Failed to create leaf for TaskUI view');
      }
    } else {
      leaf = rightLeaf;
    }
    await leaf.setViewState({ type: VIEW_TYPE_TASKUI });
  }

  workspace.revealLeaf(leaf);
}
```

### State Management (Jotai)

**Atom Pattern:**
```typescript
// Base storage atom (private)
const baseTasksAtom = atom<Task[]>([]);

// Public read/write atom with operation handling
export const tasksAtom = atom(
  // Read
  (get) => get(baseTasksAtom),

  // Write with operation dispatch
  (get, set, update: { operation: storeOperation; tasks: Task[] }) => {
    const current = get(baseTasksAtom);

    switch (update.operation) {
      case storeOperation.ADD:
        set(baseTasksAtom, [...current, ...update.tasks]);
        break;

      case storeOperation.UPDATE:
        set(baseTasksAtom, current.map(task => {
          const updated = update.tasks.find(t => t.id === task.id);
          return updated || task;
        }));
        break;

      case storeOperation.DELETE: {
        const idsToDelete = new Set(update.tasks.map(t => t.id));
        set(baseTasksAtom, current.filter(t => !idsToDelete.has(t.id)));
        break;
      }

      case storeOperation.REPLACE:
        set(baseTasksAtom, update.tasks);
        break;
    }
  }
);

// Derived atoms for filtered/sorted views
export const filteredTasksAtom = atom(
  (get) => {
    const tasks = get(tasksAtom);
    const filters = get(filtersAtom);
    return applyFilters(tasks, filters);
  }
);
```

**Component Usage:**
```typescript
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

function TaskList() {
  // Read-only
  const tasks = useAtomValue(tasksAtom);

  // Read and write
  const [filters, setFilters] = useAtom(filtersAtom);

  // Write-only
  const updateTasks = useSetAtom(tasksAtom);

  const handleUpdate = (task: Task) => {
    updateTasks({
      operation: storeOperation.UPDATE,
      tasks: [task]
    });
  };
}
```

### Data Validation (Zod)

**Task Schema:**
```typescript
export const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
  dueDate: z.date().nullable().optional(),
  scheduledDate: z.date().nullable().optional(),
  startDate: z.date().nullable().optional(),
  createdDate: z.date().nullable().optional(),
  doneDate: z.date().nullable().optional(),
  path: z.string(),
  line: z.number().optional(),
  tags: z.array(z.string()).optional(),
  subtasks: z.lazy(() => z.array(TaskSchema)).optional(),
  // Dataview-specific fields
  lineDescription: z.string(),
  source: z.nativeEnum(TaskSource),
  symbol: z.string().optional(),
  recurs: z.string().nullable().optional(),
  blocks: z.array(z.string()).optional(),
});

export type Task = z.infer<typeof TaskSchema>;
```

**Validation Pattern:**
```typescript
// Validate raw data from Dataview
function validateTasks(rawTasks: unknown): { isValid: boolean; data?: Task[]; errors?: ZodIssue[] } {
  const TaskArraySchema = z.array(TaskSchema);
  const result = TaskArraySchema.safeParse(rawTasks);

  if (result.success) {
    return { isValid: true, data: result.data };
  }

  logger.error('Task validation failed', {
    errors: result.error.errors,
    data: rawTasks
  });

  return { isValid: false, errors: result.error.errors };
}

// Safe partial validation for updates
function validateTaskUpdate(update: unknown): Partial<Task> {
  const PartialTaskSchema = TaskSchema.partial();
  return PartialTaskSchema.parse(update);
}
```

### Data Synchronization

**Dataview Integration:**
```typescript
// InternalApiService.ts
class InternalApiService {
  async fetchTasks(): Promise<Task[]> {
    const dataviewApi = getAPI(this.app);

    if (!dataviewApi) {
      throw new Error('Dataview plugin not enabled (REQUIRED)');
    }

    // Query all tasks from vault
    const rawTasks = dataviewApi.pages()
      .file.tasks
      .where(t => t.text)  // Filter empty tasks
      .array();

    // Map Dataview format to internal format
    const mappedTasks = TaskMapper.fromDataview(rawTasks);

    // Validate with Zod
    const result = validateTasks(mappedTasks);
    if (!result.isValid || !result.data) {
      throw new Error('Task validation failed');
    }
    return result.data;
  }

  async updateTask(task: Task): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(task.path);

    if (!(file instanceof TFile)) {
      throw new Error(`File not found: ${task.path}`);
    }

    // Read file content
    const content = await this.app.vault.read(file);
    const lines = content.split('\n');

    // Update task line
    if (task.line !== undefined && task.line < lines.length) {
      lines[task.line] = TaskMapper.toMarkdown(task);

      // Write back to file
      await this.app.vault.modify(file, lines.join('\n'));
    }
  }
}
```

**Sync Service Pattern:**
```typescript
// TaskSyncService.ts
class TaskSyncService {
  private apiService: InternalApiService;

  async syncFromVault() {
    // Fetch tasks from Dataview
    const vaultTasks = await this.apiService.fetchTasks();

    // Update Jotai store
    updateTasks({
      operation: storeOperation.REPLACE,
      tasks: vaultTasks
    });
  }

  async syncToVault(task: Task) {
    // Validate before syncing
    const result = TaskSchema.safeParse(task);
    if (!result.success) {
      logger.error('Task validation failed', {
        errors: result.error.errors,
        task
      });
      return;
    }

    // Update markdown file
    await this.apiService.updateTask(result.data);

    // Trigger re-sync to confirm
    await this.syncFromVault();
  }
}
```

## UI Component System

### Component Architecture

**Base Components** (`ui/base/`):
- Button, Input, Select, Dialog, Popover
- Accordion, Collapsible, Separator, ScrollArea
- Based on Radix UI primitives + TailwindCSS
- Follow shadcn/ui patterns

**Feature Components** (`ui/components/`):
- TaskTable (TanStack Table)
- TaskList (card-based with grouping)
- TaskBoard (Kanban with dnd-kit)
- TaskForm (React Hook Form + Zod)
- DatePicker (React Day Picker)

### View Modes

**1. Table View:**
```typescript
// Uses TanStack Table
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

const columns: ColumnDef<Task>[] = [
  { accessorKey: 'description', header: 'Task' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'priority', header: 'Priority' },
  { accessorKey: 'dueDate', header: 'Due' },
];

function TaskTable() {
  const tasks = useAtomValue(filteredTasksAtom);

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Sorting, filtering, pagination
  });

  return <Table>...</Table>;
}
```

**2. Board View (Kanban):**
```typescript
// Uses dnd-kit
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';

function TaskBoard() {
  const tasks = useAtomValue(tasksAtom);
  const updateTasks = useSetAtom(tasksAtom);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    // Update task status based on column
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      updateTasks({
        operation: storeOperation.UPDATE,
        tasks: [{ ...task, status: over.id as TaskStatus }]
      });
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        {Object.values(TaskStatus).map(status => (
          <BoardColumn key={status} status={status} tasks={tasks.filter(t => t.status === status)} />
        ))}
      </div>
    </DndContext>
  );
}
```

**3. List View:**
```typescript
// Card-based with grouping
import { Collapsible } from '@/ui/base/collapsible';

function TaskList() {
  const tasks = useAtomValue(filteredTasksAtom);
  const groupBy = useAtomValue(groupByAtom);

  const grouped = groupTasks(tasks, groupBy);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, groupTasks]) => (
        <Collapsible key={group} defaultOpen>
          <CollapsibleTrigger>
            {group} ({groupTasks.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            {groupTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
```

### Form Handling

**Task Form Pattern:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const TaskFormSchema = TaskSchema.partial().extend({
  description: z.string().min(1, 'Description required'),
});

function TaskForm({ task, onSubmit }: TaskFormProps) {
  const form = useForm<Partial<Task>>({
    resolver: zodResolver(TaskFormSchema),
    defaultValues: task || {},
  });

  const handleSubmit = form.handleSubmit((data) => {
    const validated = TaskFormSchema.parse(data);
    onSubmit(validated);
  });

  return (
    <form onSubmit={handleSubmit}>
      <Input {...form.register('description')} />
      <Select {...form.register('priority')} />
      <DatePicker {...form.register('dueDate')} />
      <Button type="submit">Save</Button>
    </form>
  );
}
```

## Development Workflows

### Git Commit Standards

**ABSOLUTE FORMAT (50 characters max, one line only):**
```bash
[type](optional-scope): imperative subject

# Examples:
feat(ui): add kanban board view
fix(sync): resolve dataview query race condition
refactor(store): simplify atom structure
perf(table): optimize large task list rendering
chore(deps): update tanstack table to 8.21
```

**Allowed Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change (no bug fix or feature)
- `perf`: Performance improvement
- `style`: Formatting only (no logic changes)
- `test`: Add/update tests
- `docs`: Documentation only
- `build`: Build system changes
- `ci`: CI/CD configuration
- `chore`: Housekeeping (NOT code changes)
- `revert`: Revert previous commit

**Rules:**
- MUST be imperative mood ("add", NOT "added" or "adds")
- MUST be lowercase (except proper nouns/acronyms)
- MUST NOT exceed 50 characters total
- MUST NOT have trailing period
- MUST NOT have body or footer

### Code Quality Standards

**Biome Configuration:**
```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "correctness": "error",
      "suspicious": { "noExplicitAny": "error" },
      "style": { "useConst": "error" }
    }
  }
}
```

**Run before commits:**
```bash
pnpm check  # Biome lint + format (auto-fix)
pnpm build  # Verify build passes
```

### TypeScript Best Practices

**DO ✅**
- Use strict null checks (`strictNullChecks: true`)
- Avoid `any` - use `unknown` or proper types
- Define interfaces for all data structures
- Use type guards for runtime checks
- Leverage Zod for runtime validation
- Use `as const` for readonly objects

**DON'T ❌**
- Use `any` (Biome will error)
- Ignore TypeScript errors
- Use `@ts-ignore` without comment
- Cast without validation
- Mutate readonly types

### Obsidian Plugin Best Practices

**DO ✅**
- Clean up in `onunload()` (intervals, event listeners, views)
- Use `this.registerEvent()` for auto-cleanup
- Use `this.addCommand()` for commands
- Use `this.registerView()` for custom views
- Check plugin dependencies (Dataview) in `onload()`
- Use `app.workspace` for UI interactions
- Use `app.vault` for file operations

**DON'T ❌**
- Modify files without user action
- Access `window` directly (use `activeWindow`)
- Use `setInterval` without cleanup
- Assume plugins are loaded (check API availability)
- Block UI thread with long operations
- Store sensitive data in settings

### Performance Optimization

**Task List Performance:**
```typescript
// Virtualize large lists
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualTaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Task row height
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(item => (
          <TaskRow key={item.key} task={tasks[item.index]} />
        ))}
      </div>
    </div>
  );
}
```

**Memoization:**
```typescript
// Expensive computations
const sortedTasks = useMemo(
  () => sortTasks(tasks, sortConfig),
  [tasks, sortConfig]
);

// Component re-render prevention with shallow comparison
const TaskCard = memo(({ task }: { task: Task }) => {
  return <div>...</div>;
});
// Note: Uses default shallow comparison of props.
// For custom comparison, compare all relevant task fields:
// (prev, next) => prev.task === next.task || shallowEqual(prev.task, next.task)
```

## Testing Strategy

### Unit Tests
- Validation functions (Zod schemas)
- Mapper functions (Dataview → Task)
- State operations (Jotai atoms)
- Utility functions

### Integration Tests
- API service (Obsidian + Dataview)
- Sync service (bidirectional sync)
- Component interactions

### Manual Testing
```bash
# Development vault workflow
pnpm dev  # Start watch mode

# In dev-vault:
# 1. Create test tasks in markdown files
# 2. Open TaskUI view
# 3. Verify sync works
# 4. Test CRUD operations
# 5. Check markdown files updated correctly
```

## Common Patterns

### Error Handling
```typescript
// API operations
try {
  const tasks = await apiService.fetchTasks();
  updateTasks({ operation: storeOperation.REPLACE, tasks });
} catch (error) {
  logger.error('Failed to fetch tasks', { error });
  // Show user-friendly error in UI
  showNotice('Failed to load tasks. Check console for details.');
}

// Validation errors
try {
  const validated = TaskSchema.parse(rawData);
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('Validation failed', {
      errors: error.errors,
      data: rawData
    });
  }
  throw error;
}
```

### Logging Pattern
```typescript
import { logger } from '@/utils/logger';

// Structured logging with Pino
logger.info('Task created', { taskId: task.id, path: task.path });
logger.error('Sync failed', { error, taskId: task.id });
logger.debug('State updated', { operation, taskCount: tasks.length });
```

### Date Handling
```typescript
import { format, parseISO, isValid } from 'date-fns';
import * as chrono from 'chrono-node';

// Parse natural language
const parsedDate = chrono.parseDate('tomorrow at 3pm');

// Format for display
const formatted = format(task.dueDate, 'MMM dd, yyyy');

// ISO string for storage
const isoString = task.dueDate?.toISOString();
```

## Troubleshooting

### Common Issues

**Dataview not loading:**
- Check Dataview plugin is enabled in Obsidian
- Verify `getAPI(app)` returns non-null
- Check console for Dataview errors

**Tasks not syncing:**
- Verify file paths are correct
- Check file permissions
- Ensure line numbers are valid
- Check Biome validation errors

**Build failures:**
- Run `pnpm check` to fix Biome issues
- Check TypeScript errors: `tsc --noEmit`
- Verify all imports are correct
- Check Vite config for external deps

**State not updating:**
- Verify atom write functions are called correctly
- Check operation type is correct
- Use Jotai DevTools for debugging
- Ensure no direct mutations

## Best Practices Summary

### DO ✅
- Follow ASK → PLAN → CONFIRM → EXECUTE workflow
- Validate all external data with Zod
- Use Jotai atoms for state (never direct mutations)
- Use TypeScript strict mode
- Run `pnpm check` before commits
- Use structured logging (Pino)
- Clean up resources in `onunload()`
- Handle errors gracefully
- Optimize for large task lists
- Test in dev-vault before committing

### DON'T ❌
- Skip user confirmation before implementing
- Use `any` type (use `unknown` or proper types)
- Mutate state directly (use atom write functions)
- Skip Zod validation on external data
- Run `pnpm dev` (user already has it running)
- Exceed 50 characters in commit messages
- Use npm/yarn (ONLY pnpm)
- Modify files without user action
- Block UI thread with sync operations
- Ignore TypeScript or Biome errors

## Quick Reference

### Essential Commands
```bash
pnpm install           # Install dependencies
pnpm check             # Lint + format with Biome
pnpm build             # Build for development
pnpm build:release     # Build for production (auto version bump)
pnpm dev               # Watch mode (USER RUNS - NOT YOU)
```

### Key Imports
```typescript
// State Management
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

// Validation
import { z } from 'zod';
import { TaskSchema } from '@/data/types/task';

// Obsidian API
import { Plugin, TFile, Notice } from 'obsidian';
import { getAPI } from 'obsidian-dataview';

// UI Components
import { Button } from '@/ui/base/button';
import { Dialog } from '@/ui/base/dialog';
import { Select } from '@/ui/base/select';

// Tables & Forms
import { useReactTable } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Utilities
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
```

### File Locations
```
Plugin Entry:   src/main.ts
Root Component: src/MainView.tsx
API Service:    src/api/InternalApiService.ts
Sync Service:   src/service/TaskSyncService.ts
State Store:    src/data/store/
Task Types:     src/data/types/task.ts
UI Components:  src/ui/base/, src/ui/components/
Config:         biome.json, tsconfig.json, vite.config.ts
```

---

**Remember:** ASK → PLAN → CONFIRM → EXECUTE. Quality over speed. KISS principle always.
