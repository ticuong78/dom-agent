# Decomposing Step

## What it does

This step takes the `HTMLNode` tree produced by the preparing step and decomposes every tag node into a `ContextNode` carrying explicit, scalar metadata: depth, height, sibling position, parent surface, attribute analytics, and a hash of the node's own text. The collection of `ContextNode`s is wrapped in an indexed `ContextTree` that downstream steps can query by signature or composite key.

The name "pre-process" undersells what happens here. This is the core enrichment pass — comparison and diffing only work because every property the rules will check is materialized as a separate field on `ContextNode` at this point. There are no opaque hashes; every dimension a rule might care about is its own attribute.

## How it works

The step is driven by a single class, `HTMLToContextConverter`, defined at `src/implementation/converter/HTMLToContextConverter.ts`. It accepts two optional adapters via the constructor:

- An `IDAdapter` — generates a unique `id` for every node so the resulting tree can be serialized without circular references. Defaults to `new UUIDAdapter()`.
- A `HashAdapter` — hashes each node's direct text and computes a deterministic `treeId` for the whole tree. Defaults to `new SHA256HashAdapter()`.

Both parameters have defaults, so `new HTMLToContextConverter()` is valid for the common case. Pass custom implementations when you need a different ID scheme or hash algorithm.

Calling `converter.convert(htmlNode)` returns either a fully populated `ContextTree` or `null` if the root is not a tag node (text/comment/script/style roots are rejected).

## What gets computed on each node

`HTMLToContextConverter` walks the `HTMLNode` tree recursively. For every node of type `"tag"` it constructs a `ContextNode` (`src/core/context/ContextNode.ts`) with these computed fields:

- **Surface** — `tagName`, `attributeAnalytic` (each attribute value broken into `actualValue`, `numberOfValues`, `totalLength`), `attributeCount`.
- **Inner** — `childCount` (direct children only) and `height` (longest path from this node down to a leaf; leaves are height 0).
- **Positioning** — `depth` (root is 0), `nthChild`, `siblingCount`.
- **Text** — `directText` (text owned by this node, not inherited from descendants) and `directTextHash` (SHA-256 of `directText`).
- **Parent surface** — `parentTagName`, `parentAttributeCount`, `parentDepth`. The parent's identity is "propagated down" so each node knows where it sits without a back-pointer walk.

After the children of a node are converted, the converter wires up navigational pointers (`parent`, `nextSibling`, `previousSibling`) so the tree can be traversed in either direction. Non-tag nodes (text, comment, script, style) are skipped — their textual content is already captured on the parent as `directText`.

## What the ContextTree adds

`ContextTree` (`src/core/context/ContextTree.ts`) is more than a root pointer. On construction it:

1. Walks every node and inserts it into `byCompositeKey` — a map from a positional key (`depth:nthChild/siblingCount|tagName|attributeCount|directTextHash`) to the node.
2. Computes a `signature` for each node using a `SignatureCreator` and inserts it into `bySignature` — a multi-map, because repeated structures (e.g. list items) can share identity.
3. Hashes the concatenated composite keys to produce a deterministic `treeId`. Two identical DOM inputs yield the same `treeId`.

The default `SignatureCreator` excludes the `class` attribute because classes churn during redesigns. `withClassSignatureCreator` is provided when class names are meaningful identifiers (BEM, scoped components). A custom `SignatureCreator` can be passed as the third constructor argument.

The result of this step is the canonical input contract for everything that follows — comparers and diff viewers consume `ContextTree`, never raw HTML.

## How to plug in your own logic

The decomposing step is mostly fixed (a node's metrics are a property of the algorithm, not configuration), but two extension points exist:

- **Identity** — pass a custom `SignatureCreator` into `ContextTree` to redefine what counts as "the same node" for indexing.
- **Adapters** — swap `IDAdapter` or `HashAdapter` implementations. Anything that satisfies the interfaces in `src/core/crypto/` works; the converter never sees the concrete type.

If you need to alter how children are walked (e.g. include comment nodes, ignore certain tags), extend or wrap `HTMLToContextConverter` itself.
