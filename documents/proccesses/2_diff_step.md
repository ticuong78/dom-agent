# Diffing Step

## What it does

This step takes the two `ContextTree`s produced by the decomposing step — the **reference** (old/baseline) tree and the **target** (new/current) tree — and produces a list of `DiffPoint`s that describe exactly how the second tree differs from the first. Each `DiffPoint` is tagged with a type (e.g. `REPARENTED`, `TEXT_CHANGED`, `GROWN`) and carries pointers to the reference node, target node, and where relevant the parent nodes involved.

The file name "process" is intentionally generic; what actually happens here is two distinct things glued together:

1. **Matching** — figuring out which node in the new tree corresponds to which node in the old tree.
2. **Classifying** — given a pair of matched nodes (or an unmatched node), deciding what changed.

These responsibilities are split across two collaborators: a `Comparer` does the matching, and a `DiffViewer` does the classifying. Several viewers can be run against the same comparer, each producing diffs through a different lens.

## The Comparer

`RuleBasedComparer` (`src/implementation/compare/RuleBasedComparer.ts`) is the default implementation of the `Comparer` interface. Given a reference tree and a target tree, it returns three lists: `pairs` (nodes matched across trees), `referenceOnly` (nodes only in the old tree), and `targetOnly` (nodes only in the new tree).

It is driven by two configurable inputs:

- A **`CompareRule`** (`src/core/compare/CompareRule.ts`) — an ordered list of `ComparePoint` predicates joined by AND/OR. Each point inspects one property: `equal`/`less`/`greater` on numeric fields (`depth`, `childCount`, `height`, …), `match`/`unmatch` on string fields (`tagName`, `directTextHash`, …), or `keys_match`/`values_match`/`full_match` on `attributeAnalytic`. `evaluate(a, b)` returns whether two nodes count as the same entity under this rule.
- A **`GroupKeyFn`** — extracts a bucket key from a node so the matcher only compares within the same bucket. The default groups by `tagName`. `RuleBasedComparer` builds a bucket map of target nodes up front, which turns the search space from O(n·m) into O(n·k) where k is the average bucket size.

For each reference node the comparer walks the candidates in its bucket, drops anything already paired, drops anything that fails the rule, and picks the survivor that minimises `|Δdepth| · 100 + |ΔnthChild|` — that is, prefers candidates that sit closest to the reference's original position.

### Picking a rule

The recommended baseline is `tagName + attributeAnalytic values_match`. `values_match` only checks shared attribute keys, so a node that gains a new attribute (e.g. `data-verified="true"`) still pairs with its previous self — the new attribute is then surfaced as an `ATTRIBUTE_CHANGED` mutation downstream rather than breaking the match.

Two important exceptions:

- Matching reparented nodes? Drop `depth` from the rule. A node that moved branches has a different depth and would never pair otherwise.
- Matching tag-changed nodes? Drop `tagName` from the rule and group by `depth` (`groupKey = String(node.depth)`). Without this, a `<div>` that became a `<section>` lands in different buckets and is reported as DELETED/ADDED instead of `TAG_CHANGED`.

The README's "Choosing the Right Comparer" table summarises these combinations.

## The DiffViewers

A `DiffViewer` is "a lens." It accepts a `Comparer`, calls `compare()` on the two trees, and turns the resulting pairs + unmatched lists into typed `DiffPoint`s. None of the viewers claims to be complete — they each look at one aspect of change. Running multiple viewers and merging their outputs gives a richer signal than any single viewer can.

Three viewers ship in `src/implementation/diff/viewer/`:

**`TreeHierarchyDiffViewer`** — structural movement. For each matched pair, it compares parent surface (`parentTagName`, `parentAttributeCount`, `parentDepth`) and position (`depth`, `nthChild`, `siblingCount`). Different parent or different depth → `REPARENTED`. Same parent, different `nthChild` → `REORDERED`. Unmatched reference nodes are `DELETED`; unmatched target nodes are `ADDED`.

**`NodeMutationDiffViewer`** — in-place property changes. For each matched pair, it independently checks tag, attributes, and text. Different `tagName` → `TAG_CHANGED`. Different attribute set or values (it inspects both `attributeAnalytic` keys and `actualValue`/`numberOfValues`/`totalLength`) → `ATTRIBUTE_CHANGED` with `delta = |Δ attributeCount|`. Different `directTextHash` → `TEXT_CHANGED`. A single pair can emit several mutations; they are not mutually exclusive. Unmatched nodes are `ADDED`/`DELETED`.

**`SubtreeShapeDiffViewer`** — what's inside the node. For each matched pair, it compares `childCount` and `height`. More children → `GROWN` (delta = number added). Fewer children → `SHRUNK` (delta = number removed). Same children but a different `height` → `DEPTH_CHANGED` (delta = signed height difference, can be negative if the subtree got shallower). Unmatched nodes are `ADDED`/`DELETED`.

Because the matching quality is decided by the comparer, each viewer typically wants its own `RuleBasedComparer` instance tuned for what it's looking for — see `examples/demo.ts` for a complete three-viewer setup.

## How to build your own logic

Two natural extension points live here:

- **A custom matcher.** Implement the `Comparer` interface (`src/core/compare/Comparer.ts`) to use a different matching strategy — for example, exact ID-based pairing, edit-distance over signatures, or a deterministic two-pass match. Any `DiffViewer` accepts any `Comparer`.
- **A new lens.** Implement the `DiffViewer` interface (`src/core/diff/DiffViewer.ts`) to report diffs the built-in viewers don't surface — accessibility regressions, style changes, ARIA role flips, anything you can detect from a pair of `ContextNode`s.

Whatever you build, the output should be a list of `DiffPoint`s — that's the contract the reporting step depends on.
