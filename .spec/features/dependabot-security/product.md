---
type: feature-product
feature: dependabot-security
sibling: tech.md
parent: ../../product.md
updated: 2026-06-14
---

# Feature: Dependabot Security Updates — Product

Resolve every open Dependabot security alert on TaskUI's dependency tree using the
least-disruptive vector per alert — direct within-major bump, unused-dependency
removal, scoped `pnpm.overrides`, or dismiss-with-reason — **without** major-version
bumps of React or TailwindCSS, and without changing shipped plugin behavior.

**Parent:** [../../product.md](../../product.md)
**Architecture:** [tech.md](tech.md)
**Plan:** [plan.md](plan.md)

---

## Scope

| | |
|---|---|
| **Owns** | `package.json` dependency versions (deps + devDeps), `pnpm-lock.yaml`, an optional `pnpm.overrides` block, removal of three confirmed-unused deps, and the disposition (bump / remove / override / dismiss) of each open Dependabot alert. |
| **Does not own** | React 18 / TailwindCSS 3 **major** upgrades (explicitly excluded); any change to `src/` runtime logic; CI workflow changes; new product features; broader dependency freshening beyond security. |

---

## Requirements

### Requirement: Clear actionable alerts

The system SHALL resolve every open Dependabot alert that affects an installed
package version — whether shipped in `main.js` or in the dev/build/test toolchain —
via the least-disruptive vector. Alerts that cannot fire against this project are
handled under R5.

#### Scenario: No alert affects an installed version

- **Given** the open Dependabot alerts on `main`
- **When** the updates are applied and `pnpm-lock.yaml` is regenerated
- **Then** `gh api .../dependabot/alerts --state open` lists no alert whose vulnerable range still matches an installed version (any residual is dismissed-with-reason per R5)

### Requirement: No React or Tailwind major bumps

The system MUST NOT raise `react`/`react-dom` above `18.x` or `tailwindcss` above `3.x`.

#### Scenario: Pinned majors preserved

- **Given** the updated `package.json`
- **When** inspected
- **Then** `react` and `react-dom` remain `^18.x` and `tailwindcss` remains `^3.x`

### Requirement: Build, lint, and tests stay green

The system MUST keep `pnpm check`, `pnpm build`, and `pnpm test` passing after every unit.

#### Scenario: Toolchain passes post-update

- **Given** the applied updates
- **When** `pnpm check && pnpm build && pnpm test` runs
- **Then** all three succeed with no new errors or test failures

### Requirement: Shipped behavior unchanged

The system MUST NOT alter the plugin's runtime behavior; only dependency versions
and removal of confirmed-unused dependencies are in scope.

#### Scenario: Manual smoke test matches pre-update

- **Given** the rebuilt plugin
- **When** it loads in Obsidian and a task is created, edited, and viewed across Table/List/Board
- **Then** behavior matches the pre-update build

### Requirement: Honest alert disposition

Every alert not fixed by a version change SHALL be dismissed in the Dependabot UI
with a recorded reason. The dependency tree MUST NOT be contorted (e.g. forcing an
incompatible transitive version) solely to silence an alert that cannot fire.

#### Scenario: Not-applicable alert dismissed with reason

- **Given** a Deno-only or dev-only-not-shipped advisory
- **When** triaged
- **Then** it is dismissed in the UI with reason (`not-applicable` / `not in shipped bundle`), not patched by an unsafe override

---

## Non-Goals

- React 18→19 and TailwindCSS 3→4 — prior major attempts went badly; out of scope.
- General dependency freshening beyond what the alerts require.
- Removing unused dependencies beyond the three implicated in alerts (broader audit is a follow-up).

---

## Open Questions

1. **vitest major (2.1.9 → 3.2.6)?** The "critical" vitest advisory needs `@vitest/ui` listening; this repo uses `vitest run` + `@vitest/coverage-v8` only, so it is **not triggerable**. *Recommendation:* bump anyway (**Strategy A**) — it clears the alert and cascade-drops the `vite@5.4.21` / `esbuild@0.21.5` subtree, and `pnpm test` exists to validate the one major. Fallback (**Strategy B**): keep 2.x and dismiss vitest + its subtree as dev-only-not-triggerable. Human gate decides.
2. **Remove unused deps vs dismiss their alerts?** `jotai-devtools`, `@tanstack/react-form`, `@tanstack/zod-form-adapter` have zero references repo-wide. *Recommendation:* remove — eliminates `immutable` (HIGH), `jsondiffpatch`, and `devalue` alerts at the source and shrinks the bundle/lock, at zero functional cost.
