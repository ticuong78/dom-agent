<div align="center">

# dom-sentinel

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

## The Problem

Web scrapers are fragile. A site redesign, a renamed CSS class, a rearranged layout — any of these can silently break your pipeline. You only find out when your data goes stale or your downstream systems start failing.

Most solutions throw machine learning at this: embeddings, visual diffing, trained models. Expensive, opaque, slow, and impossible to explain to a stakeholder.

## The Solution

dom-sentinel decomposes every DOM node into scalar properties — tag name, attribute structure, depth, child count, subtree height, parent surface — and compares them field-by-field using configurable rules. Fast, explainable, deterministic.

When a match fails, you know _which_ property diverged, _how_ it changed, and _where_ it happened.

---

## Install

```bash
npm install @ticuong78/dom-agent
```

## Quick Start

```typescript
import {
  CheerioAdapter,
  SHA256HashAdapter,
  UUIDAdapter,
  HTMLToContextConverter,
  CompareRule,
  RuleBasedComparer,
  TreeHierarchyDiffViewer,
} from "@ticuong78/dom-agent";

// 1. Parse HTML into ContextTrees
const adapter = new CheerioAdapter();
const converter = new HTMLToContextConverter(
  new UUIDAdapter(),
  new SHA256HashAdapter(),
);
const tree1 = converter.convert(adapter.parse(htmlBefore));
const tree2 = converter.convert(adapter.parse(htmlAfter));

// 2. Define matching rules
const rule = new CompareRule([
  { attType: "tagName", matchType: "match", logicType: "and" },
  { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
]);

// 3. Detect changes
const viewer = new TreeHierarchyDiffViewer(new RuleBasedComparer(rule));
const diffs = viewer.highlight(tree1, tree2);

for (const diff of diffs) {
  console.log(
    diff.type,
    diff.referenceNode?.tagName,
    "->",
    diff.targetNode?.tagName,
  );
}
```

---

## Architecture

dom-sentinel follows a hexagonal (ports-and-adapters) architecture:

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

Instead of comparing two opaque hashes, dom-sentinel compares individual fields — when a match fails, you know exactly which property diverged.

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

Three viewers, three lenses, composable results:

**TreeHierarchyDiffViewer** — structural rearrangements

| Diff Type    | Meaning                          |
| ------------ | -------------------------------- |
| `REPARENTED` | Node moved to a different parent |
| `REORDERED`  | Same parent, different position  |
| `ADDED`      | Only in target                   |
| `DELETED`    | Only in reference                |

**NodeMutationDiffViewer** — in-place mutations

| Diff Type           | Meaning                                |
| ------------------- | -------------------------------------- |
| `TAG_CHANGED`       | Tag changed (e.g., `div` -> `section`) |
| `ATTRIBUTE_CHANGED` | Attributes added, removed, or modified |
| `TEXT_CHANGED`      | Direct text content changed            |
| `ADDED` / `DELETED` | Unmatched nodes                        |

**SubtreeShapeDiffViewer** — subtree structure

| Diff Type           | Meaning                                          |
| ------------------- | ------------------------------------------------ |
| `GROWN`             | Gained direct children (delta = count change)    |
| `SHRUNK`            | Lost direct children                             |
| `DEPTH_CHANGED`     | Subtree depth changed without child count change |
| `ADDED` / `DELETED` | Unmatched nodes                                  |

Running multiple viewers and compositing results gives richer signals than any single viewer. A node flagged as both `REPARENTED` and `ATTRIBUTE_CHANGED` tells you it moved _and_ was modified in transit.

### Choosing the Right Comparer

| Viewer                  | Recommended Rule                         | Why                                       |
| ----------------------- | ---------------------------------------- | ----------------------------------------- |
| TreeHierarchyDiffViewer | `tagName + values_match` (no depth)      | Reparented nodes change depth             |
| NodeMutationDiffViewer  | `depth + values_match`, grouped by depth | Tag-changed nodes have different tagNames |
| SubtreeShapeDiffViewer  | `tagName + values_match`                 | Standard structural matching              |

### Reporting

- **HTMLDiffReporter** — visual HTML report with color-coded badges, expandable cards, and side-by-side panels
- **JSONDiffReporter** — structured JSON with flattened node snapshots (circular references resolved to IDs)

Two built-in themes for HTML reports: **DeepSpaceTheme** (dark, dashboard-like) and **DashboardLikeTheme** (clean, card-based). Implement the `Renderer` interface to create your own.

---

## Folder Structure

```
dom-sentinel/
  src/
    core/                   Interfaces & types only
      compare/              CompareRule, CompareRuleManager, Comparer
      context/              ContextNode, ContextTree
      converter/            Converter interface
      crypto/               HashAdapter, IDAdapter
      diff/                 DiffPoint, DiffViewer, DiffReporter, DiffReport
      interface/            ISerializable
      plain/                HTMLNode, HTMLAdapter
      renderer/             Renderer interface

    implementation/         Concrete strategies
      compare/              RuleBasedComparer
      converter/            HTMLToContextConverter
      diff/
        viewer/             TreeHierarchy, NodeMutation, SubtreeShape
        reporter/           HTMLDiffReporter, JSONDiffReporter
      theme/                DeepSpaceTheme, DashboardLikeTheme

    adapters/               Third-party wrappers
      atom/                 CheerioAdapter
      hash/                 SHA256HashAdapter
      id/                   UUIDAdapter

  examples/                 Demo scripts
  tests/                    Unit & integration tests
  scripts/                  Build tooling
```

## Design Philosophy

**Decomposed signatures over monolithic hashes.** When two hashes don't match, you know _something_ changed but not _what_. dom-sentinel keeps every property as a separate comparable field. Comparison short-circuits early, output tells you exactly which field diverged.

**Rules over algorithms.** The CompareRule system makes matching criteria a configuration choice, not a code change. Monitoring a login form? Match by `tagName + id`. Product listing? `tagName + depth + class`.

**Viewers as lenses, not verdicts.** Each DiffViewer examines changes through one lens. None claims completeness. Composite them for a richer picture.

**Adapters as boundaries.** Every third-party dependency is isolated behind an interface. The core has zero external dependencies. Swap parsing libraries, hash functions, or ID generators without touching comparison logic.

---

## Scripts

```bash
npm run build          # Compile for publishing
npm run dev            # Run demo
npm test               # All tests
npm run test:unit      # Unit tests only
npm run test:coverage  # With coverage
npm run test:watch     # Watch mode
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
