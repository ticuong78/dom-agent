# @ticuong78/dom-agent — Release Notes

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
