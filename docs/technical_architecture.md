# Technical Architecture

> **Canonical source moved.** TaskUI's architecture, product, design, and plan
> now live as durable design docs under [`/.spec/`](../.spec/). This file is kept
> as a pointer so existing links still resolve. **Code is truth; `.spec/` is the
> design memory.** Do not re-add a second architecture description here — update
> `.spec/` instead, then run `bash .claude/skills/spec/scripts/validate.sh`.

## Where things live now

| Topic | Canonical doc |
|---|---|
| What TaskUI is, requirements, principles, target user, phases | [`.spec/product.md`](../.spec/product.md) |
| Architecture, layers, tech stack, data/state contracts, risks | [`.spec/tech.md`](../.spec/tech.md) |
| Design language (theme-native tokens, components) | [`.spec/design.md`](../.spec/design.md) |
| Current delivery plan, feature boundaries, spec-vs-code gaps | [`.spec/plan.md`](../.spec/plan.md) |
| Accumulated lessons (read at session start) | [`.spec/lessons.md`](../.spec/lessons.md) |

## Quick architecture orientation

TaskUI is a React app embedded in an Obsidian `ItemView`. Dependencies flow one
way: **UI → state (Jotai) → services → API → Obsidian/Dataview**. Tasks are read
from Dataview, validated with Zod at the boundary, held as a single
`TaskWithMetadata` store, projected into Table / List / Board views, and written
back to the originating markdown line. A sync service pushes local edits to disk
and folds periodic remote fetches back into state with bounded retries.

For the authoritative contracts (`Task`/`TaskSchema`, `storeOperation`,
`TaskSource`, the markdown round-trip), see [`.spec/tech.md`](../.spec/tech.md) —
the prior copy in this file had drifted from the implementation and was removed.

## Backlog & open issues

Roadmap, bugs, and refactor backlog are tracked in [`tasks.md`](tasks.md) — the
external tracker that complements `.spec/` (which stays current-only with no
backlog).
