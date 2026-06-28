# dom-agent — Engine Decisions & Handoff Notes

**Purpose.** This document is for future coding agents (and contributors) joining the project mid-stream. It records what the engine looks like _and why_, what was decided collaboratively, and what is still pending. Read this before changing anything in `src/`; the reasoning explains design choices that the code alone cannot.

**Last updated.** 2026-06-28.

---

## 1. TL;DR — Fast Orientation

- `dom-agent` is a pure-algorithmic DOM change-detection library: no AI, no ML, no opaque hashes. Two HTML snapshots in, a structured list of typed differences out.
- This repository is the **OSS engine**. Several capabilities (dynamic page rendering, batching, hosted persistence) intentionally live in a **separate SaaS layer**, not here. See §2.
- Pipeline (also the order of `documents/proccesses/*.md`):
  1. **Prepare** — extract + parse HTML into `HTMLNode` (Cheerio adapter).
  2. **Decompose** — `HTMLToContextConverter` walks `HTMLNode` → builds indexed `ContextTree` of `ContextNode`s with scalar metadata (depth, height, sibling info, parent surface, attribute analytics, text hash).
  3. **Diff** — `Comparer` matches nodes between two trees; `DiffViewer` instances classify the matches into `DiffPoint`s.
  4. **Report** — `DiffSummary` bundles `DiffPoint[]`; call `summary.serialize()` + `JSON.stringify()` to persist or transmit. No built-in Renderer or file-writing reporter.

---

## 2. Strategic Positioning — OSS vs SaaS

The gaps in the engine were audited explicitly. Each was assigned a home:

| #   | Gap                                                                             | Where it lives                                                                 | Status                                                    |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1   | **Cheerio-only adapter** (no Puppeteer/Playwright)                              | SaaS only — strategic moat; do **NOT** add browser-driver adapters to OSS      | Decided                                                   |
| 2   | **Setup boilerplate / one-call facade** (e.g. `DomAgent.compare(html1, html2)`) | Not in core. SaaS or downstream apps build the facade. Engine stays primitive. | Decided                                                   |
| 3   | **CompositeDiffViewer** (reconcile multiple viewers)                            | Core OSS                                                                       | ✅ Done                                                   |
| 4   | **Reporters that return string/buffer instead of forcing fs write**             | Removed. `Renderer`, `DiffReporter`, and themes deleted. Callers use `DiffSummary.serialize()` directly. | ❌ Removed |
| 5   | **`deserialize` / `fromSnapshot` round-trip for DB persistence**                | Core OSS                                                                       | ⏳ Pending                                                |
| 6   | **Batch runner / scheduler** for monitoring many URLs                           | SaaS only                                                                      | Decided                                                   |

**Rule of thumb when in doubt:** if a feature requires infrastructure (browsers, queues, databases, schedulers), it belongs in SaaS. If it's pure data transformation or pure structural API improvement, it belongs in OSS.

---

## 3. Engine Philosophy

These principles were agreed explicitly during design discussion. They override personal preference.

1. **Keep the core clean.** No convenience layers in `src/`. Helpers that just wrap a few lines for ergonomics belong in the app layer or in the SaaS, not here.
2. **Classes own their semantics.** A class named `NodeMutationDiffViewer` must _know_ what mutation detection means; it does not borrow that knowledge from external rules passed in by the caller. Naming is a contract. Avoid "empty shells waiting to be filled."
3. **Hexagonal ports stay open.** Generic types default to `string`; subclasses can narrow. Users may bring custom `DiffViewer`s, `Comparer`s, etc., without modifying the core.
4. **Fail loud, not silent.** Misuse (e.g. `compare()` with no rule set) raises an error with remediation hints instead of producing junk output.

---

## 4. Core Architecture

### 4.1 DiffViewer inheritance tree

```
AbstractDiffViewer<T>                   ← name + stamp() helper
  ├─ ComparingBasedDiffViewer<T>        ← + protected readonly comparer
  │    ├─ TreeHierarchyDiffViewer       (default name "hierarchy")
  │    ├─ NodeMutationDiffViewer        (default name "mutation")
  │    └─ SubtreeShapeDiffViewer        (default name "shape")
  └─ CompositeDiffViewer<T>             (default name "composite")
```

- `AbstractDiffViewer` lives at `src/implementation/diff/viewer/AbstractDiffViewer.ts`. It provides a canonical `name` and a `protected stamp(points)` helper that writes `this.name` into each point's `source` field. Subclasses end their `highlight()` with `return this.stamp(points);`.
- `ComparingBasedDiffViewer` lifts the shared `comparer: Comparer` field out of the three concrete viewers — they used to redeclare it. Designed to absorb future shared behaviour (caching, instrumentation, pre/post hooks) without touching the leaf viewers.
- `CompositeDiffViewer` does **not** extend `ComparingBasedDiffViewer` — it composes other viewers rather than running its own `Comparer`.

### 4.2 `DiffPoint.source`

Added in this refactor. Optional `string`, **mutable** field on `DiffPoint`. Stamped by `AbstractDiffViewer.stamp()` post-hoc; the `DiffPoint` constructor does _not_ take a `source` argument.

- Built-in viewers stamp `"hierarchy"`, `"mutation"`, `"shape"`.
- `CompositeDiffViewer` does **not** restamp — it preserves whichever child viewer stamped the point originally. This means a diff in a composite output can always be traced back to the leaf viewer that produced it, even when composites are nested.
- `DiffPointSnapshot` includes `source?: string`. `serialize()` emits the field only when defined.

### 4.3 CompositeDiffViewer — design contract

**Why it exists.** Each lens (hierarchy / mutation / shape) uses a different `CompareRule` and therefore pairs nodes differently. Naively concatenating their outputs produces noise: the same node is `REPARENTED` by one viewer and `DELETED`/`ADDED` by the others. Composite reconciles.

**One reconciliation rule.** Memorise this:

> **Matched beats unmatched.** If any child viewer paired reference-node R with target-node T (via any non-`ADDED`/`DELETED` diff type), every `DELETED` emitted for R and every `ADDED` emitted for T by _other_ viewers is dropped.

This is asymmetric on purpose. A positive match is strong evidence; many "I didn't match" votes are weak evidence. Voting majority would suppress legitimate REPARENTED / TAG_CHANGED detections — do **not** add it.

**Three-step pipeline.**

1. **Fan out.** Call `highlight()` on each child viewer; concatenate outputs into `allDiffs`. Each `DiffPoint` already has `source` stamped by its producer.
2. **Discover matched sets** *(computed but currently unused — present for future use).* Walk `allDiffs` once. Build `matchedRefs` = every `referenceNode` appearing in a non-`ADDED` diff; `matchedTars` = every `targetNode` appearing in a non-`DELETED` diff.
3. **Deduplicate.** Collapse points sharing the same key `(type, referenceNode.id ?? "", targetNode.id ?? "")` — keep the first. `ADDED` and `DELETED` survive regardless of whether the same node appears in other diff types.
4. **Return.** Surviving points retain their original `source`; composite does not overwrite.

**Output type.** `DiffPoint<T>[]` where `T extends string = string`. A `StandardDiffType` helper union (= `TreeHierarchyDiffType | NodeMutationDiffType | SubtreeShapeDiffType`) is exported for callers using the standard trio.

**Order.** Output preserves child viewer emit order. Downstream code is free to re-sort (by node, by document order); composite does not impose a layout.

**Known limitations (deliberate v1 scope).**

- **Multi-target conflicts are accepted, not resolved.** If viewer A pairs R→T₁ and viewer B pairs R→T₂, both points appear in the output. There is no principled, non-arbitrary tiebreaker. Detection: group output by `referenceNode.id` and inspect.
- **No derived-diff suppression.** A `REPARENTED` widget also produces `SHRUNK` on the old parent and `GROWN` on the new parent. All three appear; each carries information.
- **No node-level merge.** Each `DiffPoint` stays a separate array entry, even when multiple diffs touch the same node.

### 4.4 Per-viewer default rules

This was a critical insight: previously, the three viewers were "empty shells" — the user had to pass a `Comparer` with a specific `CompareRule` for the viewer to do its job correctly. The viewer's name suggested it knew, but really the knowledge lived in the demo's setup code.

Fixed by giving each viewer a static `DEFAULT_RULE` (and `DEFAULT_GROUP_BY` where applicable) plus a `defaultComparer()` factory. Constructor accepts an optional `Comparer`; default = `MyViewer.defaultComparer()`.

| Viewer                    | DEFAULT_RULE                                                                                      | DEFAULT_GROUP_BY                           |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `TreeHierarchyDiffViewer` | `tagName` match + `attributeAnalytic` values_match (NO depth — enables matching reparented nodes) | `tagName` (default of `RuleBasedComparer`) |
| `NodeMutationDiffViewer`  | `depth` equal + `attributeAnalytic` values_match (NO tagName — enables `TAG_CHANGED` detection)   | by `depth`                                 |
| `SubtreeShapeDiffViewer`  | `tagName` match + `attributeAnalytic` values_match                                                | `tagName` (default)                        |

Power-user override: pass a custom `Comparer`, or remix `MyViewer.DEFAULT_RULE.points` plus extra constraints. The rationale for each rule lives in JSDoc on the static field itself — keep it there if you ever change them.

### 4.5 Reporting — `DiffSummary.serialize()` only

`Renderer`, `DiffReporter`, `HTMLDiffReporter`, `JSONDiffReporter`, `DashboardLikeTheme`, and `DeepSpaceTheme` have all been deleted. There is no built-in file writer or HTML renderer.

To get a JSON payload from a `DiffSummary`:

```ts
const json = JSON.stringify(summary.serialize());
await s3.putObject({ Body: json, Key: "..." });
```

If a rendering/reporting layer is needed, it lives in the SaaS — not in this OSS engine.

### 4.6 `Comparer` & `RuleBasedComparer` evolution

- `Comparer` interface gained `setCompareRule(rule)` and `setGroupBy(fn)` to support configure-after-construct workflows.
- `RuleBasedComparer.rule` is now `CompareRule | undefined`; constructor accepts `rule?: CompareRule`.
- **`compare()` throws** if the rule is still unset at call time. This is deliberate fail-loud behaviour — a missing rule would otherwise produce an empty pairing (everything looking like ADDED/DELETED), which is silent and hard to debug.
- Inside `bestMatch`, the rule is passed as a parameter rather than read from `this.rule`, eliminating the optional-chaining `?.` that previously hid the missing-rule failure mode.

### 4.7 Empirical baseline (from the bundled demo)

`examples/demo.ts` is the canonical fixture for the engine. Its two HTML snapshots are hand-crafted to exercise every diff type. Running the demo unchanged should produce the numbers below; treat them as a regression checkpoint when touching the diff/composite pipeline.

| Stage                                                   | DiffPoint count |
| ------------------------------------------------------- | --------------- |
| `TreeHierarchyDiffViewer` alone                         | 21              |
| `NodeMutationDiffViewer` alone                          | 21              |
| `SubtreeShapeDiffViewer` alone                          | 21              |
| **Naive union of all three**                            | **63**          |
| **`CompositeDiffViewer` output (after reconciliation)** | **16**          |
| Noise removed by reconciliation                         | 47 (≈ 75 %)     |

Composite breakdown by source and type — verify with `jq` against `report/compositeDiffs.json`:

| Source    | Type              | Count  |
| --------- | ----------------- | ------ |
| hierarchy | REPARENTED        | 4      |
| hierarchy | REORDERED         | 2      |
| mutation  | TEXT_CHANGED      | 2      |
| mutation  | TAG_CHANGED       | 1      |
| mutation  | ATTRIBUTE_CHANGED | 1      |
| shape     | DEPTH_CHANGED     | 3      |
| shape     | GROWN             | 2      |
| shape     | SHRUNK            | 1      |
|           | **Total**         | **16** |

If any of these numbers shift after a code change, the composite pipeline has changed behaviour — either intentionally (record the change here and in `CHANGELOG.md`) or as an unexpected regression worth investigating before merging. A short script to regenerate the verification:

```sh
yarn dev   # or: npx tsx examples/demo.ts
jq '{totalDiffs, bySource: ([.diffPoints[].source] | group_by(.) | map({(.[0]): length}) | add), byType: ([.diffPoints[].type] | group_by(.) | map({(.[0]): length}) | add)}' report/compositeDiffs.json
```

---

## 5. Where Things Live

```
src/
  core/
    diff/
      DiffPoint.ts             # source?: string field
      DiffViewer.ts            # interface
      DiffSummary.ts           # data container; call .serialize() for JSON-safe output
    compare/
      Comparer.ts              # interface — has setCompareRule / setGroupBy
      CompareRule.ts
    ... (context, crypto, plain, interface)

  implementation/
    diff/
      viewer/
        AbstractDiffViewer.ts
        ComparingBasedDiffViewer.ts
        TreeHierarchyDiffViewer.ts        # static DEFAULT_RULE, defaultComparer()
        NodeMutationDiffViewer.ts         # static DEFAULT_RULE, DEFAULT_GROUP_BY
        SubtreeShapeDiffViewer.ts
        CompositeDiffViewer.ts            # exports StandardDiffType
        index.ts
    compare/RuleBasedComparer.ts          # rule?: CompareRule; compare() throws if unset
    converter/HTMLToContextConverter.ts   # idGenerator + hasher default to UUID + SHA256

  adapters/atom/CheerioAdapter.ts         # OSS stays Cheerio-only
  ...

documents/
  IMPORTANT.md
  proccesses/
    0_prepare_step.md
    1_decompose_step.md
    2_diff_step.md
    3_report_step.md
  AGENT_HANDOFF.md                        # ← this file

examples/demo.ts                          # canonical example
```

---

## 6. Recent Changes (this refactor)

In chronological order, so an agent can map this document against `git log`:

1. **`documents/proccesses/` filled and renamed.** `1_pre_proccess_step.md → 1_decompose_step.md`, `2_proccess_step.md → 2_diff_step.md`, `3_comparing_step.md → 3_report_step.md`. Names now reflect what the steps actually do.
2. **`JSONRenderer` introduced.** Refactored `JSONDiffSummaryer` to delegate. Exported via `src/implementation/renderer/index.ts` and `src/index.ts`.
3. **`DiffPoint.source` added.** Optional, mutable. `DiffPointSnapshot` updated; `serialize()` emits the field when set.
4. **`AbstractDiffViewer` created** at `src/implementation/diff/viewer/`. Provides `name` + `stamp()`. (A no-op stub exists at `src/core/diff/AbstractDiffViewer.ts` for path compatibility — safe to delete.)
5. **`ComparingBasedDiffViewer` created.** All three concrete viewers extend it; their private `comparer` field is removed in favour of the inherited `protected readonly comparer`.
6. **`CompositeDiffViewer` created.** Five-step pipeline; `StandardDiffType` union exported.
7. **`DEFAULT_RULE` static + `defaultComparer()` factory** added to each of the three concrete viewers. Constructors accept `comparer?: Comparer`.
8. **`Comparer` interface gained `setCompareRule` / `setGroupBy`.** `RuleBasedComparer.compare()` now throws if rule is unset; the `?.` in `bestMatch` was removed.
9. **`examples/demo.ts` simplified.** ~40 lines of rule setup removed; viewers constructed with no args. A `CompositeDiffViewer` section was added showing reconciled output.

**Post-v2.0.0 changes (HEAD):**

10. **`Renderer`, `DiffReporter`, themes deleted.** `src/core/renderer/`, `src/core/diff/DiffReporter.ts`, `src/implementation/renderer/`, `src/implementation/diff/reporter/`, `src/implementation/theme/` all removed. No built-in file writer or HTML renderer remains.
11. **`CompositeDiffViewer` filter step removed.** The "matched beats unmatched" filter (step 3 in the old pipeline) is gone. `ADDED`/`DELETED` now survive into the output; deduplication by `(type, refId, tarId)` is the only post-fan-out pass. The matched-sets discovery (step 2) remains in the code but is currently unused.
12. **`HTMLToContextConverter` constructor parameters defaulted.** `idGenerator` defaults to `new UUIDAdapter()`, `hasher` to `new SHA256HashAdapter()`. Zero-arg construction is valid.
13. **`DiffViewerTypes` union type added** to `src/index.ts`: `"mutation" | "hierarchy" | "composition" | "subshape"`. Enumerates the canonical `name` of every built-in viewer.

---

## 7. Pending Work

Items explicitly agreed but not yet implemented:

1. **`deserialize` / `fromSnapshot` methods** for `ContextNode`, `ContextTree`, `DiffPoint`, `DiffSummary`. Required for DB round-trip; SaaS persistence depends on this.

   **Implementation traps to remember:**
   - `ContextNode` constructor re-hashes `directText` via the injected `HashAdapter`, but `ContextNodeSnapshot` already stores `directTextHash`. Either bypass the constructor in `fromSnapshot` or pass a "pass-through hasher" that returns the stored hash.
   - `ContextTree` reconstruction needs **two passes**: (a) instantiate every node from the flat snapshot array, (b) wire up `parent`, `children`, `nextSibling`, `previousSibling` using the `parentId` / `childIds` recorded in the snapshot. The order matters — without pass (a) you cannot resolve IDs in pass (b).

2. **`deserialize` / `fromSnapshot` methods.** Still pending — see §7 item 1 above.
3. **Update empirical baseline in §4.7.** The composite output count may have changed now that `ADDED`/`DELETED` are no longer filtered. Re-run `yarn dev` and update the table.
4. **Version bump.** See version recommendation in `CHANGELOG.md` [Unreleased] section.

---

## 8. SaaS Roadmap (out of scope for this repo)

For context only — do not add these to the OSS engine:

- **Dynamic page rendering.** Puppeteer/Playwright with browser pool, proxy rotation, captcha handling, anti-bot. The OSS adapter intentionally stays Cheerio-only as a funnel into SaaS.
- **Persistence layer.** Postgres / Mongo / Redis for storing trees + diff reports. Depends on §7 item 1.
- **Batch runner / scheduler.** Run many URL pairs on cron/cadence; emit alerts when diffs cross thresholds.
- **API / Dashboard / Auth / Billing.** Standard SaaS plumbing.

---

## 9. House Style Notes

Stylistic conventions observed in this codebase that future agents should respect:

- ESM modules, `verbatimModuleSyntax: true`. Always `import type` for types.
- Path aliases: `@core/*`, `@implementation/*`, `@adapters/*`, `@tests/*`. Use them; don't use long relative paths within `src/`.
- All public classes have JSDoc with `@example` blocks. New classes should match.
- Tests live in `tests/`, examples in `examples/`.
- The demo at `examples/demo.ts` doubles as the canonical "how to use" reference. Keep it short and readable.
- Build via `tsc` + `tsc-alias`; do not introduce a bundler.
