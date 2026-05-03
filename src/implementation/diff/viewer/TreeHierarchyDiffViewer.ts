import type { ContextNode, ContextTree } from "@core/context";
import type { DiffPoint, DiffType, DiffViewer } from "@core/diff";
import type { Comparer } from "@core/compare/Comparer";

export type TreeHierarchyDiffType = DiffType | "REORDERED" | "REPARENTED";

/**
 * TreeHierarchyDiffViewer — context-lens viewer.
 *
 * Detects structural movement: nodes added, deleted, reordered
 * within the same parent, or reparented to a different container.
 *
 * Precondition: works best when nodes have distinguishing surface
 * properties (tagName + attributes) so the Comparer can match them
 * across trees. On DOMs where every node is a bare <div>, matching
 * quality degrades.
 */
export class TreeHierarchyDiffViewer
  implements DiffViewer<TreeHierarchyDiffType>
{
  private comparer: Comparer;

  constructor(comparer: Comparer) {
    this.comparer = comparer;
  }

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
      points.push({ type: "DELETED", referenceNode: r, targetNode: null });
    }

    for (const t of targetOnly) {
      points.push({ type: "ADDED", referenceNode: null, targetNode: t });
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

    // Nothing changed from a hierarchy perspective
    if (sameParent && samePosition) {
      return [];
    }

    // Parent surface changed or depth shifted — reparented
    if (!sameParent || r.depth !== t.depth) {
      return [
        {
          type: "REPARENTED",
          referenceNode: r,
          targetNode: t,
          referenceParentNode: r.parent,
          targetParentNode: t.parent,
        },
      ];
    }

    // Same parent but different position — reordered
    if (r.nthChild !== t.nthChild) {
      return [{ type: "REORDERED", referenceNode: r, targetNode: t }];
    }

    return [];
  }
}
