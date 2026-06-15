---
type: feature-plan
feature: dependabot-security
sibling: tech.md
parent: ../../plan.md
updated: 2026-06-14
---

# Feature: Dependabot Security Updates — Implementation Plan

Four sequenced units that take the dependency tree from "open alerts" to "clean or
dismissed-with-reason": direct bumps, unused-dep removal, residual overrides (re-derived
after regenerating the lock), then dismissals + PR #42 reconciliation + manual smoke.

**Parent:** [../../plan.md](../../plan.md)
**Requirements:** [product.md](product.md)
**Architecture:** [tech.md](tech.md)

**Feature gate:** Self-contained; depends on no other feature. Branch `fix/dependabot-security` off current `main` (#41).

---

## Problem Frame

The alerts span direct deps, build/test transitives, and three **unused** runtime
deps. A blind "override everything" pass would add breakage surface the `vite`+`vitest`
bumps make unnecessary — so units are ordered tightest-constraint-first: bump and remove,
**regenerate the lock**, then override only what survives, and dismiss only what cannot fire.
Validation is the same gate after every unit: `pnpm check && pnpm build && pnpm test`,
plus a manual Obsidian smoke at the end.

---

## Requirements Trace

| ID | Requirement | Units |
|---|---|---|
| R1 | [Clear actionable alerts](product.md#requirement-clear-actionable-alerts) | dependabot-security/1, /2, /3, /4 |
| R2 | [No React or Tailwind major bumps](product.md#requirement-no-react-or-tailwind-major-bumps) | dependabot-security/1 |
| R3 | [Build, lint, and tests stay green](product.md#requirement-build-lint-and-tests-stay-green) | dependabot-security/1, /2, /3 |
| R4 | [Shipped behavior unchanged](product.md#requirement-shipped-behavior-unchanged) | dependabot-security/2, /4 |
| R5 | [Honest alert disposition](product.md#requirement-honest-alert-disposition) | dependabot-security/4 |

---

## Key Technical Decisions

1. **Sequence: bump → regen → re-derive overrides.** The `vite`+`vitest` bumps cascade-fix picomatch/rollup/esbuild-0.21/transitive-postcss; authoring all overrides up front adds needless breakage surface. See [tech.md](tech.md) § Strategy.
2. **Remove unused deps over override/dismiss.** `jotai-devtools` and the `@tanstack` form deps are unused (zero repo refs) — removing them clears `immutable` HIGH + `jsondiffpatch` + `devalue` at the source.
3. **uuid 11.1.1, not 14.** `^11.1.0` already permits the patch; avoid PR #42's needless ESM-only major.
4. **vitest 2→3 is the one accepted major.** Dev-only, validated by the data-layer `pnpm test` suite; clears the critical + drops the vite5/esbuild0.21 subtree. (Strategy B fallback: keep 2.x, dismiss — human gate.)
5. **Dismiss-with-reason for not-triggerable alerts.** `svelte` (dev-only, never bundled) and `esbuild` GHSA-gv7w (Deno-only) are dismissed, not patched by unsafe overrides.

---

## Unit IDs

Units are `dependabot-security/n`. Cite in commits (`fix(deps): dependabot-security/1 ...`).
**Seq** is execution order (units run in ID order here).

---

### dependabot-security/1 — Direct bumps + regenerate lock

**Goal:** Bump the four direct deps and regenerate the lockfile.

**Requirements:** R1, R2, R3

**Dependencies:** —

**Files:**

```text
package.json     # vite ^7.3.2, vitest ^3.2.6, @vitest/coverage-v8 ^3.2.6, postcss ^8.5.10, uuid ^11.1.1
pnpm-lock.yaml   # regenerated via `pnpm install`
```

**Test scenarios:**

- `react`/`react-dom` stay `^18.x`, `tailwindcss` stays `^3.x` (R2).
- vitest critical, the three vite-7 alerts, direct-postcss XSS, and uuid buffer-bounds no longer match installed versions.
- Cascade: `pnpm why rollup picomatch esbuild` shows patched versions; `vite@5.4.21`/`esbuild@0.21.5` subtree gone after the vitest bump.

**Verification:** `pnpm check && pnpm build && pnpm test` all green; `pnpm why vitest vite postcss uuid rollup picomatch` confirms new versions.

---

### dependabot-security/2 — Remove unused dependencies

**Goal:** Delete the three confirmed-unused deps, clearing `immutable`/`jsondiffpatch`/`devalue` at the source.

**Requirements:** R1, R3, R4

**Dependencies:** dependabot-security/1

**Files:**

```text
package.json     # remove jotai-devtools, @tanstack/react-form, @tanstack/zod-form-adapter
pnpm-lock.yaml   # regenerated
```

**Test scenarios:**

- `pnpm why immutable jsondiffpatch devalue` → not found (their only parents removed).
- Build + tests still green (deps were unused — verified zero repo refs).

**Verification:** `pnpm build && pnpm test` green; `pnpm why immutable jsondiffpatch devalue` returns nothing.

---

### dependabot-security/3 — Re-derive + apply residual overrides

**Goal:** After the regen, add `pnpm.overrides` only for transitives still flagged.

**Requirements:** R1, R3

**Dependencies:** dependabot-security/2

**Files:**

```text
package.json     # pnpm.overrides (caret-bounded): rollup ^4.59.0, minimatch@9 ^9.0.7,
                 # brace-expansion@2 ^2.0.3, brace-expansion@5 ^5.0.6,
                 # picomatch@2 ^2.3.2, picomatch@4 ^4.0.4, yaml@2 ^2.8.3
pnpm-lock.yaml   # regenerated
```

**Test scenarios:**

- Overrides caret-bounded to each consumer's major (unbounded `>=` pulled latest majors → breakage: minimatch 10, brace-expansion 5, picomatch 4 under micromatch).
- `pnpm audit` shows only the dismiss-bucket residuals (svelte dev-only, esbuild Deno-only) — no other flagged transitive at a vulnerable version.
- `minimatch@9` override leaves the `minimatch@10.2.5` consumer untouched.

**Verification:** `pnpm build && pnpm test` green (73/73); `pnpm audit` non-svelte/esbuild residuals = none.

---

### dependabot-security/4 — Dismiss not-applicable + smoke test

**Goal:** Close out the residual alerts honestly and confirm runtime is unregressed.

**Requirements:** R1, R4, R5

**Dependencies:** dependabot-security/3

**Files:**

```text
(no repo files — Dependabot UI dismissals + manual test)
```

**Test scenarios:**

- `svelte` alerts dismissed (reason: every advisory is SSR/binding XSS; TaskUI never compiles or renders svelte → paths unreachable); `esbuild` GHSA-gv7w dismissed (reason: vuln lives in esbuild's Deno install module, unused under pnpm/Node).
- Manual Obsidian smoke: plugin loads in `dev-vault`; create + edit a task via the form; switch Table/List/Board — behavior matches pre-update (R4).

**Verification:** `gh api .../dependabot/alerts --state open` returns only dismissed-with-reason entries; manual smoke result recorded in the PR description.

---

## Progress

| Unit | Status |
|---|---|
| dependabot-security/1 | DONE — vite 7.3.5, vitest 3.2.6, postcss 8.5.15, uuid 11.1.1; build + 73 tests green |
| dependabot-security/2 | DONE — jotai-devtools + @tanstack form deps removed; immutable/jsondiffpatch/devalue gone |
| dependabot-security/3 | DONE — 7 caret-bounded overrides; build + tests green; audit residuals = svelte/esbuild only |
| dependabot-security/4 | PENDING — dismiss svelte (dev-only) + esbuild (Deno-only) in UI post-merge; manual Obsidian smoke |

---

## Open Questions

1. **Strategy A vs B for vitest** — bump to 3.2.6 (recommended, clears most + cascades) vs keep 2.x and dismiss (no major, 3 dismissals). Resolve at the human gate before /1 runs; the plan assumes A.
