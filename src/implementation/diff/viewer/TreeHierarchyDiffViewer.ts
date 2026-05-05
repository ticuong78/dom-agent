import type { ContextNode, ContextTree } from "@core/context";
import { DiffPoint, type DiffType, type DiffViewer } from "@core/diff";
import type { Comparer } from "@core/compare/Comparer";

/**
 * Extended diff types emitted by {@link TreeHierarchyDiffViewer}.
 *
 * - `"ADDED"` / `"DELETED"` — base types (node appeared or disappeared)
 * - `"REORDERED"` — node stayed with the same parent but changed position
 * - `"REPARENTED"` — node moved to a different parent container
 */
export type TreeHierarchyDiffType = DiffType | "REORDERED" | "REPARENTED";

/**
 * A context-lens {@link DiffViewer} that detects structural movement in the DOM.
 *
 * Analyses matched node pairs to determine if they were reordered within
 * their parent or reparented to an entirely different container. Also reports
 * unmatched nodes as additions or deletions.
 *
 * **Best used when:** the DOM structure is relatively stable and you want to
 * detect layout shifts, component reordering, or elements being moved between
 * containers.
 *
 * **Precondition:** works best when nodes have distinguishing surface
 * properties (tagName + attributes) so the {@link Comparer} can match them
 * across trees. On DOMs where every node is a bare `<div>`, matching quality
 * degrades.
 *
 * @example
 * ```ts
 * const comparer = new RuleBasedComparer(rule);
 * const viewer = new TreeHierarchyDiffViewer(comparer);
 * const diffs = viewer.highlight(oldTree, newTree);
 *
 * diffs.forEach(d => {
 *   if (d.type === "REPARENTED") {
 *     console.log(`${d.referenceNode?.tagName} moved from ${d.referenceParentNode?.tagName} to ${d.targetParentNode?.tagName}`);
 *   }
 * });
 * ```
 */
export class TreeHierarchyDiffViewer implements DiffViewer<TreeHierarchyDiffType> {
  private comparer: Comparer;

  /**
   * @param comparer - The {@link Comparer} used to match nodes between trees.
   */
  constructor(comparer: Comparer) {
    this.comparer = comparer;
  }

  /**
   * Compares two trees and returns hierarchy-related differences.
   *
   * @param reference - The old (baseline) tree.
   * @param target - The new (current) tree.
   * @returns Array of diff points classified as ADDED, DELETED, REORDERED, or REPARENTED.
   */
  highlight(
    reference: ContextTree,
    target: ContextTree,
  ): DiffPoint<TreeHierarchyDiffType>[] {
    const { pairs, referenceOnly, targetOnly } = this.comparer.compare(
      reference,
      target,
    );

    const points: DiffPoint<TreeHierarchyDiffType>[] = [];

    for (const { reference: r, target: t } of pairs) {
      points.push(...this.classifyPair(r, t));
    }

    for (const r of referenceOnly) {
      points.push(new DiffPoint<TreeHierarchyDiffType>("DELETED", r, null));
    }

    for (const t of targetOnly) {
      points.push(new DiffPoint<TreeHierarchyDiffType>("ADDED", null, t));
    }

    return points;
  }

  private classifyPair(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<TreeHierarchyDiffType>[] {
    const sameParent =
      r.parentTagName === t.parentTagName &&
      r.parentAttributeCount === t.parentAttributeCount &&
      r.parentDepth === t.parentDepth;

    const samePosition =
      r.depth === t.depth &&
      r.nthChild === t.nthChild &&
      r.siblingCount === t.siblingCount;

    if (sameParent && samePosition) {
      return [];
    }

    if (!sameParent || r.depth !== t.depth) {
      return [
        new DiffPoint<TreeHierarchyDiffType>(
          "REPARENTED",
          r,
          t,
          r.parent,
          t.parent,
        ),
      ];
    }

    if (r.nthChild !== t.nthChild) {
      return [new DiffPoint<TreeHierarchyDiffType>("REORDERED", r, t)];
    }

    return [];
  }
}
