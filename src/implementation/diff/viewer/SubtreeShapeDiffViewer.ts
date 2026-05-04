import type { ContextNode, ContextTree } from "@core/context";
import { DiffPoint, type DiffType, type DiffViewer } from "@core/diff";
import type { Comparer } from "@core/compare/Comparer";

export type SubtreeShapeDiffType =
  | DiffType
  | "GROWN"
  | "SHRUNK"
  | "DEPTH_CHANGED";

/**
 * SubtreeShapeDiffViewer — inner-lens viewer.
 *
 * Detects when a matched node's subtree structure changed: children
 * added or removed (GROWN/SHRUNK), or the subtree became deeper or
 * shallower (DEPTH_CHANGED).
 *
 * Precondition: works best when nodes have stable surface identity
 * (tagName + attributes) so the Comparer can match them by what they
 * ARE rather than where they sit. If surface properties also changed,
 * pair with a NodeMutationDiffViewer for the full picture.
 *
 * A single matched pair can emit multiple diff types (e.g. both
 * GROWN and DEPTH_CHANGED if children were added at a new depth).
 */
export class SubtreeShapeDiffViewer implements DiffViewer<SubtreeShapeDiffType> {
  private comparer: Comparer;

  constructor(comparer: Comparer) {
    this.comparer = comparer;
  }

  highlight(
    reference: ContextTree,
    target: ContextTree,
  ): DiffPoint<SubtreeShapeDiffType>[] {
    const { pairs, referenceOnly, targetOnly } = this.comparer.compare(
      reference,
      target,
    );

    const points: DiffPoint<SubtreeShapeDiffType>[] = [];

    for (const { reference: r, target: t } of pairs) {
      points.push(...this.classifyShape(r, t));
    }

    for (const r of referenceOnly) {
      points.push(new DiffPoint<SubtreeShapeDiffType>("DELETED", r, null));
    }

    for (const t of targetOnly) {
      points.push(new DiffPoint<SubtreeShapeDiffType>("ADDED", null, t));
    }

    return points;
  }

  private classifyShape(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<SubtreeShapeDiffType>[] {
    const points: DiffPoint<SubtreeShapeDiffType>[] = [];

    if (t.childCount > r.childCount) {
      points.push(
        new DiffPoint<SubtreeShapeDiffType>(
          "GROWN",
          r,
          t,
          null,
          null,
          t.childCount - r.childCount,
        ),
      );
    } else if (t.childCount < r.childCount) {
      points.push(
        new DiffPoint<SubtreeShapeDiffType>(
          "SHRUNK",
          r,
          t,
          null,
          null,
          r.childCount - t.childCount,
        ),
      );
    }

    if (r.height !== t.height) {
      points.push(
        new DiffPoint<SubtreeShapeDiffType>(
          "DEPTH_CHANGED",
          r,
          t,
          null,
          null,
          t.height - r.height,
        ),
      );
    }

    return points;
  }
}
