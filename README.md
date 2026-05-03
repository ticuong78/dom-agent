# dom-sentinel

**Monitors DOM structure changes on target websites to protect web scraping pipelines from breaking silently.**

No AI. No ML. Pure algorithmic change detection using decomposed node signatures and rule-based comparison.

---

## The Problem

Web scrapers are fragile. A site redesign, a renamed CSS class, a rearranged layout — any of these can silently break your pipeline. You only find out when your data goes stale or your downstream systems start failing. By then, the damage is done.

Most solutions throw machine learning at this: training models to recognize "similar" elements, embedding-based matching, visual diffing. These approaches are expensive, opaque, and slow. They require training data, GPU resources, and produce results you can't explain to a stakeholder.

## The Solution

dom-sentinel takes a different approach. It decomposes every DOM node into a set of scalar properties — tag name, attribute structure, depth, child count, subtree height, parent surface — and compares them field-by-field using configurable rules. No hashing. No embeddings. No black boxes.

The result: fast, explainable, deterministic change detection that tells you exactly *what* changed, *how* it changed, and *where* it changed — in terms you can act on programmatically.

---

## Architecture

dom-sentinel follows a hexagonal (ports-and-adapters) architecture with three clean layers:

```
┌─────────────────────────────────────────────────────┐
│                     core/                           │
│  Interfaces, types, contracts (the "what")          │
│  ContextNode · CompareRule · DiffViewer · Comparer  │
├─────────────────────────────────────────────────────┤
│                 implementation/                     │
│  Concrete strategies (the "how")                    │
│  RuleBasedComparer · TreeHierarchyDiffViewer · ...  │
├─────────────────────────────────────────────────────┤
│                   adapters/                         │
│  Third-party integrations (the "with what")         │
│  CheerioAdapter · SHA256HashAdapter · UUIDAdapter   │
└─────────────────────────────────────────────────────┘
```

Each layer depends only on the one above it. Swap Cheerio for JSDOM, SHA-256 for xxHash, UUID for nanoid — the core never knows.

## Core Concepts

### ContextNode

The atomic unit. Every HTML element is converted into a `ContextNode` carrying decomposed scalar properties:

| Category | Properties | Purpose |
|---|---|---|
| **Surface** | `tagName`, `attributeAnalytic`, `attributeCount` | What the node *is* — its identity |
| **Inner** | `height`, `childCount` | What's *inside* the node — its subtree shape |
| **Positioning** | `depth`, `nthChild`, `siblingCount` | Where the node *sits* — its location |
| **Text** | `directText`, `directTextHash` | The node's own text content (not children's) |
| **Parent Surface** | `parentTagName`, `parentAttributeCount`, `parentDepth` | The parent's identity, propagated to children |

These properties replace the traditional monolithic hash signature. Instead of comparing two opaque strings, dom-sentinel compares individual fields — so when a match fails, you know *which* property diverged.

### CompareRule

A declarative set of comparison points that define when two nodes should be considered "the same node." Each point specifies a property, a match type, and a logic operator:

```typescript
const rule = new CompareRule([
  { attType: "tagName",           matchType: "match",        logicType: "and" },
  { attType: "depth",             matchType: "equal",        logicType: "and" },
  { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
]);
```

**Scalar compare points:**
- `NumericComparePoint` — `equal`, `less`, `greater` on any numeric property
- `StringComparePoint` — `match`, `unmatch` on any string property

**Attribute compare point:**
- `keys_match` — both nodes have the exact same set of attribute keys
- `values_match` — for every shared key, the actual values are identical
- `full_match` — both keys and values match (strict equality)

The `values_match` mode is particularly powerful: it only checks *shared* keys, so a node that gains a new attribute (like `data-verified="true"`) still pairs with its original version — but the attribute change is detected downstream by the mutation viewer.

### Comparer

Matches nodes between two `ContextTree` snapshots. The `RuleBasedComparer` implementation uses:

1. **GroupKeyFn** — a coarse bucketing function (default: by `tagName`) that reduces O(n*m) comparisons to O(n*m/k)
2. **CompareRule** — evaluates candidate pairs within each bucket
3. **Proximity tiebreaker** — among passing candidates, picks the closest match by `depth * 100 + nthChild`

Output: `ComparePair[]` (matched nodes), `referenceOnly[]` (deleted), `targetOnly[]` (added).

### DiffViewer

Classifies the changes found by a Comparer. Each viewer examines matched pairs through a specific lens:

#### TreeHierarchyDiffViewer (context lens)
Detects structural rearrangements by comparing parent surface and positioning:

| Diff Type | Meaning |
|---|---|
| `REPARENTED` | Node moved to a different parent |
| `REORDERED` | Node stayed in the same parent but changed position |
| `ADDED` | Node exists only in the target tree |
| `DELETED` | Node exists only in the reference tree |

#### NodeMutationDiffViewer (node lens)
Detects in-place mutations on matched pairs. A single pair can emit multiple types:

| Diff Type | Meaning |
|---|---|
| `TAG_CHANGED` | HTML tag changed (e.g., `div` → `section`) |
| `ATTRIBUTE_CHANGED` | Attributes were added, removed, or modified |
| `TEXT_CHANGED` | Direct text content changed |
| `ADDED` / `DELETED` | Unmatched nodes |

#### SubtreeShapeDiffViewer (inner lens)
Detects subtree structure changes using inner properties:

| Diff Type | Meaning |
|---|---|
| `GROWN` | Node gained direct children (`delta` = count increase) |
| `SHRUNK` | Node lost direct children (`delta` = count decrease) |
| `DEPTH_CHANGED` | Subtree depth changed without child count change (`delta` = height difference) |
| `ADDED` / `DELETED` | Unmatched nodes |

### Why Multiple Viewers?

No single viewer covers every scenario — and that's by design. Each viewer declares its lens, has its own preconditions, and emits its own diff types. When you composite them, conflicts between viewers become higher-fidelity signals than either verdict alone.

A node that `TreeHierarchyDiffViewer` calls REPARENTED but `NodeMutationDiffViewer` also flags as ATTRIBUTE_CHANGED tells you more than either verdict in isolation: the node moved *and* was modified in transit.

### DiffReporter

Renders diff results into human-readable or machine-readable formats:

- **HTMLDiffReporter** — visual side-by-side report with color-coded badges per diff type
- **JSONDiffReporter** — structured JSON output with flattened node snapshots (circular references resolved to IDs)

---

## Folder Structure

```
dom-sentinel/
├── src/
│   ├── core/                         # Interfaces & types (no implementations)
│   │   ├── compare/                  # CompareRule, CompareRuleManager, Comparer
│   │   ├── context/                  # ContextNode, ContextTree
│   │   ├── converter/                # Converter interface
│   │   ├── crypto/                   # HashAdapter, IDAdapter interfaces
│   │   ├── diff/                     # DiffPoint, DiffViewer, DiffReporter
│   │   └── plain/                    # HTMLNode, HTMLAdapter interfaces
│   │
│   ├── implementation/               # Concrete strategies
│   │   ├── compare/                  # RuleBasedComparer
│   │   ├── converter/                # HTMLToContextConverter
│   │   └── diff/
│   │       ├── viewer/               # TreeHierarchy, NodeMutation, SubtreeShape
│   │       └── reporter/             # HTMLDiffReporter, JSONDiffReporter
│   │
│   ├── adapters/                     # Third-party wrappers
│   │   ├── atom/                     # CheerioAdapter (HTML parsing)
│   │   ├── hash/                     # SHA256HashAdapter
│   │   └── id/                       # UUIDAdapter
│   │
│   └── index.ts                      # Demo / entry point
│
├── tests/
│   └── unit/                         # Unit tests (vitest)
│
├── report/                           # Generated diff reports (HTML + JSON)
└── artifacts/                        # Sample HTML files for testing
```

---

## Quick Start

```bash
npm install
npm run dev
```

This runs the demo in `src/index.ts`, which:
1. Parses two HTML snapshots (reference and target)
2. Converts them to `ContextTree` structures
3. Runs three DiffViewers with tailored Comparers
4. Outputs diff results to console and generates reports in `report/`

### Programmatic Usage

```typescript
import { CheerioAdapter } from "@adapters/atom";
import { SHA256HashAdapter } from "@adapters/hash";
import { UUIDAdapter } from "@adapters/id";
import { HTMLToContextConverter } from "@implementation/converter/HTMLToContextConverter";
import { CompareRule } from "@core/compare/CompareRule";
import { RuleBasedComparer } from "@implementation/compare/RuleBasedComparer";
import { TreeHierarchyDiffViewer } from "@implementation/diff/viewer/TreeHierarchyDiffViewer";

// 1. Parse HTML into ContextTrees
const adapter = new CheerioAdapter();
const converter = new HTMLToContextConverter(new UUIDAdapter(), new SHA256HashAdapter());

const tree1 = converter.convert(adapter.parse(htmlSnapshot1));
const tree2 = converter.convert(adapter.parse(htmlSnapshot2));

// 2. Define matching rules
const rule = new CompareRule([
  { attType: "tagName", matchType: "match", logicType: "and" },
  { attType: "attributeAnalytic", matchType: "values_match", logicType: "and" },
]);
const comparer = new RuleBasedComparer(rule);

// 3. Detect changes
const viewer = new TreeHierarchyDiffViewer(comparer);
const diffs = viewer.highlight(tree1, tree2);

for (const diff of diffs) {
  console.log(diff.type, diff.referenceNode?.tagName, "→", diff.targetNode?.tagName);
}
```

---

## Design Philosophy

### Decomposed Signatures over Monolithic Hashes
Traditional DOM diffing hashes node properties into a single string signature. When two hashes don't match, you know *something* changed but not *what*. dom-sentinel keeps every property as a separate comparable field. The comparison is faster (scalar checks short-circuit before touching all fields) and the output is more informative (you see exactly which property diverged).

### Rules over Algorithms
The `CompareRule` system lets you define matching criteria declaratively. Different use cases need different strictness levels. Monitoring a login form? Match by `tagName + id attribute`. Monitoring a product listing? Match by `tagName + depth + class`. The rule system makes this a configuration choice, not a code change.

### Viewers as Lenses, Not Verdicts
Each DiffViewer examines changes through a specific lens. None claims to be complete. `TreeHierarchyDiffViewer` knows about structure but not content. `NodeMutationDiffViewer` knows about content but not subtree shape. Running multiple viewers and compositing their results gives you a richer picture than any single viewer could.

### Adapters as Boundaries
Every third-party dependency (Cheerio, SHA-256, UUID) is isolated behind an interface. The core library has zero external dependencies. This means:
- Swap parsing libraries without touching comparison logic
- Swap hash functions without touching node construction
- Test with mocks that satisfy the interface contracts

---

## Choosing the Right Comparer

Different viewers may need different Comparer configurations:

| Viewer | Recommended Rule | Why |
|---|---|---|
| TreeHierarchyDiffViewer | `tagName + values_match` (no depth) | Reparented nodes change depth — requiring depth equality would miss them |
| NodeMutationDiffViewer | `depth + values_match`, grouped by depth | Tag-changed nodes have different tagNames — grouping by depth instead of tagName allows pairing them |
| SubtreeShapeDiffViewer | `tagName + values_match` | Standard structural matching is sufficient for subtree comparison |

The `values_match` attribute mode is recommended as a baseline because it prevents false pairings between structurally similar but semantically different nodes (e.g., a `div.uncle` and a `div.aunt` with the same tag, depth, and attribute count but different attribute values).

---

## Running Tests

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:coverage # With coverage report
npm run test:watch    # Watch mode
```

---

## License

MIT
