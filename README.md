<div align="center">

# dom-agent

**Pure-algorithmic DOM change detection. No AI. No ML. No black boxes.**

[![npm version](https://img.shields.io/npm/v/@ticuong78/dom-agent?color=cb3837&label=npm)](https://www.npmjs.com/package/@ticuong78/dom-agent)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](./LICENSE)
[![Module: ESM](https://img.shields.io/badge/Module-ESM-f7df1e)](https://nodejs.org/api/esm.html)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Zero AI Dependencies](https://img.shields.io/badge/AI_Dependencies-Zero-brightgreen)](#design-philosophy)

</div>

---

## What's New in v2.0.0

- **`CompositeDiffViewer`** — runs the three built-in viewers over the same tree pair and reconciles their outputs with a single rule: "matched beats unmatched." Drops contradictory `ADDED`/`DELETED` that another viewer has already paired, deduplicates the rest, and preserves each child's `source` stamp. Empirically reduces noise by ~75% on real DOM diffs without losing signal.
- **Viewer self-ownership.** Each built-in viewer ships with its own canonical matching rule (`DEFAULT_RULE` static). `new NodeMutationDiffViewer()` is now enough to detect mutations — the class owns its semantics. No more wiring up `CompareRule`s by hand for every viewer.
- **`source` field on every `DiffPoint`.** Optional string stamped by the emitting viewer (`"hierarchy"`, `"mutation"`, `"shape"`, or whatever name you pass). Survives composition — you can always trace a diff back to the leaf viewer that produced it. Serialized into `DiffPointSnapshot`.
- **`StandardDiffType` union.** `TreeHierarchyDiffType | NodeMutationDiffType | SubtreeShapeDiffType` exported for callers composing the standard trio.
- **Fail-loud `RuleBasedComparer`.** Calling `compare()` before setting a rule now throws with a clear remediation message instead of silently returning empty pairs.

See the [migration notes](#migration-from-v1x) at the bottom for breaking-change details.

---

## The Problem

Web scrapers are fragile. A site redesign, a renamed CSS class, a rearranged layout — any of these can silently break your pipeline. You only find out when your data goes stale or your downstream systems start failing.

Most solutions throw machine learning at this: embeddings, visual diffing, trained models. Expensive, opaque, slow, and impossible to explain to a stakeholder.

## The Solution

dom-agent decomposes every DOM node into scalar properties — tag name, attribute structure, depth, child count, subtree height, parent surface — and compares them field-by-field using configurable rules. Fast, explainable, deterministic.

When a match fails, you know _which_ property diverged, _how_ it changed, and _where_ it happened.

---

## Install

If you use [npm](https://www.npmjs.com/) as the main package manager, please type:

```bash
npm install @ticuong78/dom-agent
```

Otherwise, if you are using the same package manager as this project does - [yarn](https://yarnpkg.com/), please type:

```bash
yarn add @ticuong78/dom-agent
```

## Quick Start

```typescript
import {
  CheerioAdapter,
  SHA256HashAdapter,
  UUIDAdapter,
  HTMLToContextConverter,
  TreeHierarchyDiffViewer,
  NodeMutationDiffViewer,
  SubtreeShapeDiffViewer,
  CompositeDiffViewer,
  type StandardDiffType,
} from "@ticuong78/dom-agent";

// 1. Parse two HTML snapshots into ContextTrees
const adapter = new CheerioAdapter();
const converter = new HTMLToContextConverter(); // UUIDAdapter + SHA256HashAdapter by default
const tree1 = converter.convert(adapter.parse(htmlBefore)!)!;
const tree2 = converter.convert(adapter.parse(htmlAfter)!)!;

// 2. Compose the three built-in viewers — each owns its canonical rule
const composite = new CompositeDiffViewer<StandardDiffType>([
  new TreeHierarchyDiffViewer(),
  new NodeMutationDiffViewer(),
  new SubtreeShapeDiffViewer(),
]);

// 3. Detect changes — output is deduplicated and free of viewer contradictions
const diffs = composite.highlight(tree1, tree2);

for (const diff of diffs) {
  console.log(
    `[${diff.source}] ${diff.type}: ${diff.referenceNode?.tagName ?? "—"} -> ${diff.targetNode?.tagName ?? "—"}`,
  );
}
```

Need finer control? Each viewer accepts an optional custom `Comparer`. See [Power-user customisation](#power-user-customisation) below.

---

## Architecture

dom-agent follows a hexagonal (ports-and-adapters) architecture:

```
 core/               Interfaces, types, contracts
 implementation/     Concrete strategies
 adapters/           Third-party wrappers (Cheerio, SHA-256, UUID)
```

Each layer depends only on the one above it. Swap Cheerio for JSDOM, SHA-256 for xxHash, UUID for nanoid — the core never knows.

## Core Concepts

### ContextNode

Every HTML element becomes a `ContextNode` with decomposed scalar properties:

| Category        | Properties                                             | Purpose                     |
| --------------- | ------------------------------------------------------ | --------------------------- |
| **Surface**     | `tagName`, `attributeAnalytic`, `attributeCount`       | What the node _is_          |
| **Inner**       | `height`, `childCount`                                 | What is _inside_ the node   |
| **Positioning** | `depth`, `nthChild`, `siblingCount`                    | Where the node _sits_       |
| **Text**        | `directText`, `directTextHash`                         | The node's own text content |
| **Parent**      | `parentTagName`, `parentAttributeCount`, `parentDepth` | Parent identity, propagated |

Instead of comparing two opaque hashes, dom-agent compares individual fields — when a match fails, you know exactly which property diverged.

### DiffPoint

The atomic unit of diff output:

| Field                 | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `type`                | What kind of change (`REPARENTED`, `TAG_CHANGED`, `GROWN`, ...)  |
| `referenceNode`       | Pointer into the old tree (`null` for additions)                 |
| `targetNode`          | Pointer into the new tree (`null` for deletions)                 |
| `referenceParentNode` | Parent of the reference node (relevant for hierarchy diffs)      |
| `targetParentNode`    | Parent of the target node (relevant for hierarchy diffs)         |
| `delta`               | Optional numeric quantity (e.g. number of children gained)       |
| `source`              | **New in v2.** Name of the producing viewer (e.g. `"hierarchy"`) |

The `source` field lets you trace every diff back to the leaf viewer that produced it — invaluable when reading composite output or building viewer-specific filters downstream.

### CompareRule

Declarative matching criteria that define when two nodes are "the same":

```typescript
const rule = new CompareRule([
  { attType: "tagName", matchType: "match", logicType: "and" },
  { attType: "depth", matchType: "equal", logicType: "and" },
  { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
]);
```

Compare point types:

- **Scalar** — `equal` / `less` / `greater` on numeric properties, `match` / `unmatch` on strings
- **Attribute** — `keys_match` (same key set), `values_match` (shared keys have identical values), `full_match` (both)

The `values_match` mode is the recommended baseline: a node gaining `data-verified="true"` still pairs with its original (shared keys match), but the mutation viewer detects the attribute change downstream.

### DiffViewers

Three viewers, three lenses, composable results. As of v2, each viewer ships with its own canonical matching rule — you do not need to construct a `Comparer` by hand.

**TreeHierarchyDiffViewer** — structural rearrangements

| Diff Type    | Meaning                          |
| ------------ | -------------------------------- |
| `REPARENTED` | Node moved to a different parent |
| `REORDERED`  | Same parent, different position  |
| `ADDED`      | Only in target                   |
| `DELETED`    | Only in reference                |

Default rule: `tagName + attributeAnalytic values_match` (no depth constraint, so reparented nodes still pair across branches).

**NodeMutationDiffViewer** — in-place mutations

| Diff Type           | Meaning                                |
| ------------------- | -------------------------------------- |
| `TAG_CHANGED`       | Tag changed (e.g., `div` -> `section`) |
| `ATTRIBUTE_CHANGED` | Attributes added, removed, or modified |
| `TEXT_CHANGED`      | Direct text content changed            |
| `ADDED` / `DELETED` | Unmatched nodes                        |

Default rule: `depth + attributeAnalytic values_match`, grouped by `depth` (no `tagName` constraint, so tag-changed nodes still pair).

**SubtreeShapeDiffViewer** — subtree structure

| Diff Type           | Meaning                                          |
| ------------------- | ------------------------------------------------ |
| `GROWN`             | Gained direct children (delta = count change)    |
| `SHRUNK`            | Lost direct children                             |
| `DEPTH_CHANGED`     | Subtree depth changed without child count change |
| `ADDED` / `DELETED` | Unmatched nodes                                  |

Default rule: `tagName + attributeAnalytic values_match`.

Running multiple viewers and compositing results gives richer signals than any single viewer. A node flagged as both `REPARENTED` and `ATTRIBUTE_CHANGED` tells you it moved _and_ was modified in transit.

### CompositeDiffViewer (new in v2)

Composes any number of `DiffViewer`s and returns a single deduplicated `DiffPoint[]`. Implements `DiffViewer<T>` so it can be nested or used anywhere a viewer is expected.

**Deduplication only.** After fanning out to all child viewers, the composite collapses points sharing the same `(type, referenceNode.id, targetNode.id)` key. `ADDED` and `DELETED` survive even when the same node appears in other diff types from sibling viewers — all classifications are preserved.

**What composite does NOT do:**

- Resolve multi-target conflicts (two viewers pairing the same R to different targets). Both points appear; group by `referenceNode.id` to detect.
- Suppress derived shape diffs (a `REPARENTED` widget still produces `SHRUNK`/`GROWN` on its old/new parents).
- Merge multiple diffs about the same node into one entry.

Use `StandardDiffType` when composing the built-in trio to get full type narrowing on `diff.type`:

```typescript
const composite = new CompositeDiffViewer<StandardDiffType>([
  new TreeHierarchyDiffViewer(),
  new NodeMutationDiffViewer(),
  new SubtreeShapeDiffViewer(),
]);
```

### Power-user customisation

Each viewer's canonical rule is exposed as a static so you can inspect, remix, or replace it:

```typescript
// Inspect the canonical rule
console.log(NodeMutationDiffViewer.DEFAULT_RULE.points);

// Remix: keep the canonical rule but add a constraint
const stricter = new CompareRule([
  ...NodeMutationDiffViewer.DEFAULT_RULE.points,
  { attType: "tagName", matchType: "match", logicType: "and" },
]);

const viewer = new NodeMutationDiffViewer(
  new RuleBasedComparer(stricter, NodeMutationDiffViewer.DEFAULT_GROUP_BY),
);

// Or pass an entirely custom Comparer
const viewer2 = new NodeMutationDiffViewer(myCustomComparer);
```

### Reporting

`DiffSummary` wraps a list of diff points with metadata (`reportDate`, `reportName`, `totalDiffs`). Call `serialize()` to get a JSON-safe `DiffSummarySnapshot` — all node references are flattened to primitive snapshots, safe for `JSON.stringify()` and database storage.

```typescript
const summary = new DiffSummary(diffs, "homepage-daily");
const json = JSON.stringify(summary.serialize());
// store / send / log as needed
```

---

## Folder Structure

```
dom-agent/
  src/
    core/                       Interfaces & types only
      compare/                  Comparer, CompareRule, CompareRuleManager
      context/                  ContextNode, ContextTree
      converter/                Converter interface
      crypto/                   HashAdapter, IDAdapter
      diff/                     DiffPoint, DiffViewer, DiffSummary
      interface/                ISerializable
      plain/                    HTMLNode, HTMLAdapter

    implementation/             Concrete strategies
      compare/                  RuleBasedComparer
      converter/                HTMLToContextConverter (default adapters)
      diff/
        viewer/                 AbstractDiffViewer, ComparingBasedDiffViewer,
                                TreeHierarchy, NodeMutation, SubtreeShape,
                                CompositeDiffViewer + StandardDiffType

    adapters/                   Third-party wrappers
      atom/                     CheerioAdapter
      hash/                     SHA256HashAdapter
      id/                       UUIDAdapter

  documents/                    Pipeline docs + handoff notes for contributors
  examples/                     Demo scripts
  tests/                        Unit & integration tests
  scripts/                      Build tooling
```

## Design Philosophy

**Decomposed signatures over monolithic hashes.** When two hashes don't match, you know _something_ changed but not _what_. dom-agent keeps every property as a separate comparable field. Comparison short-circuits early, output tells you exactly which field diverged.

**Classes own their semantics.** A `NodeMutationDiffViewer` knows what mutation detection means. Names are contracts, not labels on empty shells.

**Viewers as lenses, not verdicts.** Each `DiffViewer` examines changes through one lens. None claims completeness. Compose them with `CompositeDiffViewer` for a richer picture.

**Adapters as boundaries.** Every third-party dependency is isolated behind an interface. The core has zero external dependencies. Swap parsing libraries, hash functions, or ID generators without touching comparison logic.

**Fail loud.** Misuse (e.g. invoking `compare()` before setting a rule) raises a clear error instead of producing junk output.

---

## Migration from v1.x

v2.0.0 is largely additive — most v1 code keeps working. Three areas need attention:

**1. Custom `Comparer` implementations.** The `Comparer` interface gained two required methods: `setCompareRule(rule)` and `setGroupBy(fn)`. If you have a custom `Comparer`, add these (they can be no-ops if you don't need re-configuration).

```typescript
class MyComparer implements Comparer {
  compare(ref, tar) { ... }
  setCompareRule(rule: CompareRule) { /* update internal state */ }
  setGroupBy(fn: GroupKeyFn) { /* update internal state */ }
}
```

**2. `RuleBasedComparer.compare()` now throws when no rule is set.** Previously it silently returned an empty pairing (every node looking `ADDED`/`DELETED`). If you ever construct `new RuleBasedComparer()` without a rule, set one before calling `compare()`:

```typescript
const comparer = new RuleBasedComparer();
comparer.setCompareRule(myRule);
comparer.compare(t1, t2);
```

**3. Viewer construction is now simpler.** The v1 pattern of building a `CompareRule`, a `RuleBasedComparer`, and passing it into a viewer still works. But the canonical rule for each viewer now lives on the class:

```typescript
// v1 (still works)
const comparer = new RuleBasedComparer(myRule);
const viewer = new TreeHierarchyDiffViewer(comparer);

// v2 (recommended)
const viewer = new TreeHierarchyDiffViewer();
```

`DiffPoint` gains an optional `source` field (mutable, post-hoc). Consumers that ignore unknown fields on the snapshot are unaffected; strict JSON schema validators may need to allow it.

---

## Scripts

If you are using [npm](https://www.npmjs.com/), please type:

```bash
npm run build          # Compile for publishing
npm run dev            # Run demo
npm test               # All tests
npm run test:unit      # Unit tests only
npm run test:coverage  # With coverage
npm run test:watch     # Watch mode
```

Otherwise using this for [yarn](https://yarnpkg.com/), please type:

```bash
yarn build          # Compile for publishing
yarn dev            # Run demo
yarn test           # All tests
yarn test:unit      # Unit tests only
yarn test:coverage  # With coverage
yarn test:watch     # Watch mode
```

## Tech Stack

| Tool       | Version | Purpose               |
| ---------- | ------- | --------------------- |
| TypeScript | 6.0     | Language              |
| Node.js    | >= 18   | Runtime               |
| Cheerio    | 1.2     | HTML parsing          |
| Vitest     | 4.1     | Testing               |
| tsc-alias  | 1.8     | Path alias resolution |

## License

This project is dual-licensed:

- **GPL-3.0** for open-source use — see [LICENSE](./LICENSE)
- **Commercial license** for proprietary use — see [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md)

For commercial licensing inquiries, contact lephamhungcuong219@gmail.com.
