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

## What's New in v4.0.0

- **`diff()` function.** Single entry point — pass two HTML strings, get back a deduplicated `DiffPoint[]`. No more manual pipeline wiring.
- **Selector suggestion.** Every `ContextNode` can suggest a CSS selector via `node.suggestSelector()`. Confidence is data-driven: an `AttributePool` counts how many times each `attr=value` appears across the tree, so `id="search"` that appears twice scores 0.5, not a hardcoded 0.8. Selectors always include `:nth-child()` for disambiguation.
- **Flat architecture.** The hexagonal `core/` → `implementation/` → `adapters/` layers are collapsed into `convert/`, `compare/`, `diffs/`, `selector.ts`. Fewer files, same separation of concerns.
- **Single `AbstractDiffViewer` base class.** Subclasses implement only `classifyPair()` — the compare → classify → ADDED/DELETED → stamp flow lives in the base.
- **Element exclusion.** Pass `exclude: [".ad-banner", "#cookie-popup"]` to `diff()` to ignore elements during comparison.

See [CHANGELOG.md](./CHANGELOG.md) for full breaking-change details.

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
import { diff } from "@ticuong78/dom-agent";

const diffs = diff({
  first: htmlBefore,
  second: htmlAfter,
});

for (const d of diffs) {
  console.log(
    `[${d.source}] ${d.type}: ${d.referenceNode?.tagName ?? "—"} → ${d.targetNode?.tagName ?? "—"}`,
  );

  // Suggest a new CSS selector for changed nodes
  const suggestion = d.targetNode?.suggestSelector();
  if (suggestion) {
    console.log(`  → suggested: ${suggestion.selector} (confidence: ${suggestion.confidence})`);
  }
}
```

Need finer control? Each viewer accepts an optional custom `Comparer`. See [Power-user customisation](#power-user-customisation) below.

---

## Architecture

dom-agent follows a pipeline architecture:

```
 convert/            Parse HTML → enrich into ContextNode / ContextTree
 compare/            Match nodes across two trees using configurable rules
 diffs/              Classify matched pairs into diff types
 selector.ts         Suggest CSS selectors for changed nodes
```

Each stage depends only on the one before it. The `diff()` function orchestrates the full pipeline.

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
| **Selector**    | `selectorScore`, `bestAttr`                            | How uniquely identifiable   |

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
| `source`              | Name of the producing viewer (e.g. `"hierarchy"`) |

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

Three viewers, three lenses, composable results. Each viewer ships with its own canonical matching rule — you do not need to construct a `Comparer` by hand.

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

### CompositeDiffViewer

Composes any number of `DiffViewer`s and returns a single deduplicated `DiffPoint[]`. Implements `DiffViewer<T>` so it can be nested or used anywhere a viewer is expected. Add viewers via `registerViewers()`.

**Deduplication only.** After fanning out to all child viewers, the composite collapses points sharing the same `(type, referenceNode.id, targetNode.id)` key. All classifications are preserved.

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

### Selector Suggestion

Every `ContextNode` can suggest a CSS selector via `suggestSelector()`. Confidence is **data-driven**: an `AttributePool` counts how many times each `attr=value` pair appears across the tree. A `data-id="price"` that appears once scores 1.0; an `id="search"` appearing twice scores 0.5.

Three strategies, chosen automatically:

| Strategy | When | Example |
| -------- | ---- | ------- |
| `self` | Node's own attributes are unique enough | `div[data-s="price"]:nth-child(3)` |
| `path` | An ancestor has higher confidence | `div[data-s="photos"]:nth-child(8) > img[data-id="p1"]:nth-child(1)` |
| `root` | Nothing reliable — full positional path | `div:nth-child(1) > ul:nth-child(2) > li:nth-child(3)` |

```typescript
const suggestion = targetNode.suggestSelector();
// { selector: "div[data-s='photos']:nth-child(8) > img:nth-child(1)", confidence: 0.9, strategy: "path" }
```

Selector suggestions are a **temporary fallback** — they keep your scraper running while you review the change. They are not a permanent replacement for human-verified selectors.

---

## Folder Structure

```
dom-agent/
  src/
    convert/                    Parse + enrich pipeline
      parse.ts                  CheerioParser — HTML string → HTMLNode tree
      convert.ts                ContextConverter — HTMLNode → ContextNode
      context.ts                ContextNode, ContextTree, AttributePool integration
      pool.ts                   AttributePool — attr=value frequency counting

    compare/                    Node matching
      comparer.ts               Comparer interface, RuleBasedComparer
      rule.ts                   CompareRule, ComparePoint types

    diffs/                      Change detection
      points.ts                 DiffPoint, DiffType, DiffPointSnapshot
      viewers.ts                AbstractDiffViewer, 3 concrete viewers, CompositeDiffViewer

    selector.ts                 suggestSelector() — CSS selector suggestion
    types.ts                    HTMLNode, HTMLNodeType
    utils.ts                    HashFn, defaultHash
    index.ts                    Public API — diff() function

  examples/                     Demo scripts
  tests/                        Unit & integration tests
```

## Design Philosophy

**Decomposed signatures over monolithic hashes.** When two hashes don't match, you know _something_ changed but not _what_. dom-agent keeps every property as a separate comparable field. Comparison short-circuits early, output tells you exactly which field diverged.

**Classes own their semantics.** A `NodeMutationDiffViewer` knows what mutation detection means. Names are contracts, not labels on empty shells.

**Viewers as lenses, not verdicts.** Each `DiffViewer` examines changes through one lens. None claims completeness. Compose them with `CompositeDiffViewer` for a richer picture.

**Fail loud.** Misuse (e.g. invoking `compare()` before setting a rule) raises a clear error instead of producing junk output.

**Selectors are band-aids.** `suggestSelector()` keeps your scraper alive while you fix the real problem. It is not a permanent replacement for human-verified selectors.

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
