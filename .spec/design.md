---
type: entrypoint
scope: design
design_format: google-labs-code/design.md-compatible
children: []
updated: 2026-06-09
# TaskUI inherits the active Obsidian theme. Tokens below are semantic roles
# that map onto Obsidian CSS variables rather than fixed brand values.
colors:
  primary: "var(--interactive-accent)"
  secondary: "var(--text-muted)"
  neutral: "var(--background-primary)"
typography:
  body:
    fontFamily: "var(--font-interface)"
    fontSize: var(--font-ui-medium)
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: var(--radius-s)
  md: var(--radius-m)
spacing:
  sm: 8px
  md: 16px
---

# TaskUI — Design

TaskUI has no separate visual identity by design: it inherits the user's active
Obsidian theme 100% so it feels native and stays compatible with style plugins.
The tokens in frontmatter are **semantic roles mapped onto Obsidian CSS
variables**, not brand colors. Styling is utility-first (TailwindCSS) layered on
top of Obsidian variables; Radix primitives provide accessible structure.

**Product:** [product.md](product.md)
**Architecture:** [tech.md](tech.md)

---

## Overview

The personality is "a calm spreadsheet that lives in your notes." TaskUI should
read as part of Obsidian, never as a transplanted third-party app. Density is
moderate-to-high (power users triaging many tasks), interactions are direct and
keyboard-friendly, and chrome is minimal so the task content dominates. When
making a design decision, preserve theme-inheritance first, native feel second,
and only then reach for custom styling.

## Colors

Never hardcode hex values for surfaces, text, or accents — bind to Obsidian
variables so themes flow through. Accent/primary actions use
`--interactive-accent`; muted/secondary text uses `--text-muted`; backgrounds
use `--background-primary` / `--background-secondary`. Status and priority are
the rare case where TaskUI assigns its own semantic color mapping (per
`ui/lib/config`), but those still resolve against theme variables for contrast.

## Typography

Use Obsidian's interface font and UI font-size variables (`--font-ui-small`
through `--font-ui-large`) so type matches the host. Task descriptions get the
most weight; metadata (dates, tags, priority) is smaller and muted. Avoid
introducing custom font families.

## Layout

Layouts are dense and scroll-contained. The view shell is a controls bar
(group / sort / filter / add) above a tabbed view region (Table, List, Board).
Tables favor compact rows; List groups cards under collapsible headers; Board is
horizontally scrolling status columns. Spacing follows the 8px / 16px rhythm in
frontmatter. Large lists should virtualize or paginate rather than render
unbounded.

## Elevation & Depth

Stay flat. Lean on Obsidian's `--background-modifier-border` and subtle
background tints for separation rather than heavy shadows. Elevation is reserved
for genuinely floating surfaces — popovers, dropdowns, modals (Radix) — and
should use the theme's modal/popover shadow rather than custom drop shadows.

## Shapes

Rounded corners use Obsidian's `--radius-s` / `--radius-m`. Icons come from
Lucide / react-icons at a consistent size. Component silhouettes stay
rectangular and quiet; the Kanban cards and list cards share one card silhouette.

## Components

| Pattern | Use When | Notes |
|---|---|---|
| Controls bar | Top of every view | Shared sort / filter / group / add-task; consistent across Table, List, Board. |
| Tabbed view region | Switching projections | Radix Tabs; each tab renders the same task state through a different view. |
| Task card | List & Board | One shared card silhouette; inline status checkbox, priority, dates, tags, actions. |
| Popover control | Sort / filter / group / date pick | Radix Popover/Dialog; never a bespoke floating div. |
| Enum select | Status / priority | Display-config-driven (`ui/lib/config`) with icon + label. |
| Modal form | Create / full edit | Radix Dialog wrapping the RHF + Zod task form. |

## Do's and Don'ts

- Do bind colors, fonts, radii, and shadows to Obsidian CSS variables.
- Do keep all three views visually consistent — same cards, same controls.
- Do keep chrome minimal so task content leads.
- Don't introduce a separate brand palette or custom font families.
- Don't add heavy shadows or skeuomorphic depth.
- Don't build bespoke floating/overlay UI when a Radix primitive exists.

## Feature Design Index

Feature-level interaction and copy live in `features/<name>/design.md` once an
area is taken through design. None are scoped yet.
