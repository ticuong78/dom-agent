# @ticuong78/dom-agent — Release Notes

## [Unreleased]

Changes made after the `dagent-v2.0.0` tag.

### Breaking Changes

- **Removed `Renderer` interface and all implementations.** `src/core/renderer/Renderer.ts`, `src/implementation/renderer/JSONRenderer.ts`, and their index files are deleted. To get a JSON string from a `DiffSummary`, call `JSON.stringify(summary.serialize())` directly.
- **Removed `DiffReporter` interface and all implementations.** `src/core/diff/DiffReporter.ts`, `src/implementation/diff/reporter/HTMLDiffReporter.ts`, `src/implementation/diff/reporter/JSONDiffReporter.ts`, and their index files are deleted. There is no longer a built-in file-writing reporter.
- **Removed HTML themes.** `DashboardLikeTheme` and `DeepSpaceTheme` are deleted.
- **`CompositeDiffViewer` reconciliation rule changed.** The "matched beats unmatched" filter step has been removed. Previously, any `DELETED` for a matched reference node and any `ADDED` for a matched target node were silently dropped. Now, `ADDED` and `DELETED` survive regardless of whether the same node appears in a non-`ADDED`/`DELETED` diff type. The sole post-fan-out operation is deduplication by `(type, referenceNode.id, targetNode.id)`.

### Changed

- **`HTMLToContextConverter` constructor parameters now have defaults.** Both `idGenerator` (defaults to `new UUIDAdapter()`) and `hasher` (defaults to `new SHA256HashAdapter()`) are optional. `new HTMLToContextConverter()` is now valid.

### Added

- **`DiffViewerTypes` union type.** Exported from the top-level index. Enumerates the canonical `name` string of every built-in viewer: `"mutation" | "hierarchy" | "composition" | "subshape"`. Use it to type-narrow on `DiffPoint.source` or to build viewer registries.

---

## v2.0.0

Major release. The headline addition is `CompositeDiffViewer` — composing the three built-in viewers into a single, deduplicated, contradiction-free output. Alongside it, every viewer now owns its canonical matching rule, every `DiffPoint` carries a `source` stamp tracing it back to the viewer that produced it, and the renderer/reporter pair has been cleanly separated so the JSON (or HTML) string is reachable without touching the filesystem. A handful of small interface tightenings make misuse fail loudly instead of silently.

### CompositeDiffViewer

A new `DiffViewer` that runs any number of child viewers over the same tree pair and reconciles their outputs with one rule:

> **Matched beats unmatched.** If any child viewer paired reference-node `R` with target-node `T` (via any non-`ADDED`/`DELETED` diff type), every `DELETED` for `R` and every `ADDED` for `T` from other viewers is dropped.

After filtering, duplicates sharing the same `(type, referenceNode.id, targetNode.id)` key are collapsed. Surviving points keep the `source` stamped by their original child viewer — the composite never overwrites it, so traceability holds even through nested composites.

The class implements `DiffViewer<T>` like any other viewer; you can pass its output to `DiffReport`, `Renderer`, or further composites without special-casing.

Empirical measurement on the bundled demo: 63 raw diffs across the three viewers reduce to 16 in the composite output (≈ 75 % noise removed) with no signal lost. The exact baseline is recorded in `documents/AGENT_HANDOFF.md` §4.7 as a regression checkpoint.

A `StandardDiffType` union is exported for the common case of composing the built-in trio:

```typescript
const composite = new CompositeDiffViewer<StandardDiffType>([
  new TreeHierarchyDiffViewer(),
  new NodeMutationDiffViewer(),
  new SubtreeShapeDiffViewer(),
]);
const diffs = composite.highlight(treeV1, treeV2);
```

Known limitations are deliberate for this release: multi-target matches (the same reference paired to two different targets by different viewers) are accepted as separate points rather than resolved, derived shape diffs from a reparenting are not suppressed, and points about the same node are not merged into a single entry.

### Viewer Self-Ownership

The three built-in viewers used to be parametric shells — their behaviour depended entirely on whichever `CompareRule` the caller wired up. The class name suggested a semantic the class did not actually own.

v2 fixes this. Each viewer now ships with its canonical matching rule baked in:

| Viewer                    | Default rule                                            | Grouping     |
| ------------------------- | ------------------------------------------------------- | ------------ |
| `TreeHierarchyDiffViewer` | `tagName` + `attributeAnalytic values_match` (no depth) | by `tagName` |
| `NodeMutationDiffViewer`  | `depth` + `attributeAnalytic values_match` (no tagName) | by `depth`   |
| `SubtreeShapeDiffViewer`  | `tagName` + `attributeAnalytic values_match`            | by `tagName` |

The rule is exposed as `DEFAULT_RULE` static (and `DEFAULT_GROUP_BY` where applicable) for inspection and remixing. Constructors accept an optional `Comparer`; the default is built from the static rule. Calling `new NodeMutationDiffViewer()` is now sufficient.

```typescript
// v2: viewer owns its semantics
const viewer = new NodeMutationDiffViewer();

// v2: remix the canonical rule
const customRule = new CompareRule([
  ...NodeMutationDiffViewer.DEFAULT_RULE.points,
  { attType: "tagName", matchType: "match", logicType: "and" },
]);
const stricter = new NodeMutationDiffViewer(
  new RuleBasedComparer(customRule, NodeMutationDiffViewer.DEFAULT_GROUP_BY),
);
```

The result is that `examples/demo.ts` lost roughly 40 lines of explicit rule wiring; newcomers reading it can grasp the pipeline in seconds instead of decoding three rule comments.

### Source Tracing on Every DiffPoint

`DiffPoint` now has an optional mutable `source: string` field. Each viewer stamps its name onto every point it emits, via a new `stamp()` helper on the new `AbstractDiffViewer` base class. The built-in defaults are `"hierarchy"`, `"mutation"`, and `"shape"`; you can override per-instance via the constructor's `name` parameter.

`DiffPointSnapshot.source` mirrors the field, and `DiffPoint.serialize()` emits it when set.

### AbstractDiffViewer and ComparingBasedDiffViewer

Two new abstract base classes formalise the viewer hierarchy:

```
AbstractDiffViewer<T>                   ← name + stamp()
  ├─ ComparingBasedDiffViewer<T>        ← + protected comparer
  │    ├─ TreeHierarchyDiffViewer
  │    ├─ NodeMutationDiffViewer
  │    └─ SubtreeShapeDiffViewer
  └─ CompositeDiffViewer<T>
```

`AbstractDiffViewer` provides the canonical `name` field and the `stamp(points)` helper. `ComparingBasedDiffViewer` lifts the shared `comparer: Comparer` field out of each concrete viewer — they used to redeclare it. Future shared behaviour (caching, instrumentation, hooks) can live here without touching the leaves. `CompositeDiffViewer` intentionally does NOT extend `ComparingBasedDiffViewer` — it composes other viewers rather than running its own comparer.

### Renderer / Reporter Separation

The JSON output path now flows through a proper `Renderer`. A new `JSONRenderer` class implements `Renderer` with the single responsibility of `JSON.stringify(report.serialize())`. `JSONDiffReporter` becomes a thin convenience wrapper around any `Renderer` (default `JSONRenderer`) and owns only the filesystem write.

This unblocks the "give me the string, I'll write it myself" pattern needed by hosted environments and SaaS layers:

```typescript
const json = new JSONRenderer().render(diffReport);
await db.diffs.insertOne(JSON.parse(json));
// or: res.type("application/json").send(json);
```

HTML follows the same shape — the bundled themes (`DeepSpaceTheme`, `DashboardLikeTheme`) already implement `Renderer`, so the same bypass pattern works there too.

### Fail-Loud RuleBasedComparer

`RuleBasedComparer.compare()` now throws if no `CompareRule` has been set. Previously it silently returned an empty pairing — every node looked `ADDED` or `DELETED` — which was both indistinguishable from a real total-rewrite diff and hard to debug.

The `Comparer` interface gained `setCompareRule(rule)` and `setGroupBy(fn)` to support configure-after-construct workflows. The constructor's `rule` parameter is now optional; the throw at `compare()` time is the safety net.

### Documentation

- `documents/proccesses/*.md` — the four pipeline step docs are renamed and filled. The old names (`pre_proccess`, `proccess`, `comparing`) did not reflect the actual stages.
- `documents/AGENT_HANDOFF.md` — a new handoff document for future contributors and coding agents. Captures architectural decisions, OSS vs SaaS positioning, design rationale, pending work, and the regression baseline.
- `README.md` — refreshed throughout. Quick Start now demonstrates the v2 composite pattern, a "What's New in v2.0.0" section near the top, a new `CompositeDiffViewer` subsection in Core Concepts, a `Power-user customisation` block, and a `Migration from v1.x` section before the License.

### Breaking Changes

`Comparer` interface gained two required methods:

```typescript
interface Comparer {
  compare(reference: ContextTree, target: ContextTree): CompareResult;
  setCompareRule(compareRule: CompareRule): void; // new
  setGroupBy(groupBy: GroupKeyFn): void; // new
}
```

Any custom `Comparer` implementations must add these (they can be no-ops if you do not need re-configuration).

`RuleBasedComparer.compare()` throws when invoked before a `CompareRule` has been set. The previous behaviour (silent empty pairing) is gone.

`JSONDiffReporter` constructor now accepts an optional `Renderer` (default `JSONRenderer`). No-argument calls still work; callers passing positional arguments other than `outputPath` may need to adjust.

The three concrete viewer constructors now accept an optional `Comparer` and an optional `name`. Existing call sites that pass a `Comparer` continue to work unchanged; new code can omit it entirely.

`DiffPoint.serialize()` output may include a new `source` field when the producing viewer set it. Consumers that ignore unknown JSON fields are unaffected; strict schema validators may need to allow the field.

### Migration from v1.x

For most codebases, the only forced change is implementing `setCompareRule` and `setGroupBy` on custom `Comparer`s. v1 code that uses the built-in `RuleBasedComparer` and the three concrete viewers continues to work.

To adopt the v2 ergonomics:

```typescript
// v1
const rule = new CompareRule([
  { attType: "tagName", matchType: "match", logicType: "and" },
  { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
]);
const comparer = new RuleBasedComparer(rule);
const viewer = new TreeHierarchyDiffViewer(comparer);

// v2
const viewer = new TreeHierarchyDiffViewer();
```

To compose all three viewers:

```typescript
const composite = new CompositeDiffViewer<StandardDiffType>([
  new TreeHierarchyDiffViewer(),
  new NodeMutationDiffViewer(),
  new SubtreeShapeDiffViewer(),
]);
const diffs = composite.highlight(treeV1, treeV2);
```

The `deserialize` / `fromSnapshot` round-trip methods are NOT included in v2.0.0 — they are tracked for a follow-up release. Until then, `serialize()` output is the supported contract for persisting trees and reports to a database.

---

## v1.1.1

Minor patch: completed JSDoc coverage for all public APIs.

### Documentation

Every public class, interface, type, and method now has JSDoc with description, `@param`, `@returns`, and `@example` blocks. IDEs will show full inline documentation on hover for all exports.

Covered modules: core types (`ContextNode`, `ContextTree`, `HTMLNode`, `ValueType`), diff pipeline (`DiffPoint`, `DiffViewer`, `DiffReport`, `DiffReporter`), comparison layer (`Comparer`, `CompareRule`, `CompareRuleManager`), adapters (`CheerioAdapter`, `SHA256HashAdapter`, `UUIDAdapter`), implementations (`RuleBasedComparer`, `HTMLToContextConverter`, `TreeHierarchyDiffViewer`, `NodeMutationDiffViewer`, `SubtreeShapeDiffViewer`, `HTMLDiffReporter`, `JSONDiffReporter`), and renderer interface.

---

## v1.1.0

Feature release: identity-based signature system and tree serialization.

### Signature System

`ContextTree` now supports identity-based node lookup — answering "what is this node?" rather than "where does it sit?"

- **`SignatureCreator`** — a pluggable function passed to `ContextTree`'s constructor that defines which properties compose a node's identity. Developers choose what matters for their use case.
- **`defaultSignatureCreator`** — built-in creator using `tagName + attributes (excluding class) + directTextHash`. The `class` attribute is excluded by default because CSS classes change frequently during redesigns.
- **`withClassSignatureCreator`** — built-in alternative that includes `class` for projects where CSS classes carry semantic meaning (e.g. BEM).
- **`getBySignature(sig)`** — returns all nodes matching a signature (multiple nodes can share identity, e.g. repeated list items).
- **`hasSignature(sig)`** / **`signatures()`** — existence check and full signature set.

### Tree Serialization

`ContextTree` now implements `ISerializable` with a `serialize()` method that produces a `ContextTreeSnapshot` — a flat JSON-safe object with all primitive fields, ready for `JSON.stringify()` and file storage.

The snapshot includes:

- `treeId` — a deterministic hash of the tree's content. Two identical DOMs produce the same `treeId`.
- `createdDate` / `lastUpdateDate` — ISO 8601 timestamps for snapshot lifecycle tracking.
- `nodeCount` — total number of nodes.
- `nodes` — flat array of `ContextNodeSnapshot` objects (tree structure recoverable via `parentId` and `childIds`).

### Breaking Changes

`ContextTree` constructor now requires a `HashAdapter` as its second parameter (used for computing `treeId`):

```ts
// Before
const tree = new ContextTree(root);

// After
const tree = new ContextTree(root, hasher);
const tree = new ContextTree(root, hasher, customSignatureCreator);
```

If using `HTMLToContextConverter`, this is handled automatically — the converter passes its own `HashAdapter` through.

---

## v1.0.x

Initial public release of the core diff engine.

### Core Pipeline

Parse → Convert → Compare → Diff → Report.

- **CheerioAdapter** — parses raw HTML into `HTMLNode` trees
- **HTMLToContextConverter** — enriches nodes with structural metadata (`ContextNode`) and indexes them into a `ContextTree`
- **RuleBasedComparer** — matches nodes across two trees using configurable `CompareRule` criteria with bucket-based grouping
- **Three DiffViewers**, each with a distinct analytical lens:
  - `TreeHierarchyDiffViewer` (context lens) — ADDED, DELETED, REORDERED, REPARENTED
  - `NodeMutationDiffViewer` (node lens) — TAG_CHANGED, ATTRIBUTE_CHANGED, TEXT_CHANGED
  - `SubtreeShapeDiffViewer` (inner lens) — GROWN, SHRUNK, DEPTH_CHANGED
- **DiffReport** — groups diff points with metadata, serializable
- **HTMLDiffReporter** / **JSONDiffReporter** — output reports to file with themed HTML or raw JSON
- **Two HTML themes** — `DashboardLikeTheme` and `DeepSpaceTheme`

### Architecture

Hexagonal (ports-and-adapters) design. Every major component is behind an interface — swap parsing libraries, hash algorithms, ID generators, comparison strategies, or report formats without touching core logic.
