import type { ContextNode, ContextTree } from "@core/context";
import { DiffPoint, type DiffType, type DiffViewer } from "@core/diff";
import type { Comparer } from "@core/compare/Comparer";

/**
 * Extended diff types emitted by {@link SubtreeShapeDiffViewer}.
 *
 * - `"ADDED"` / `"DELETED"` — base types
 * - `"GROWN"` — the node gained children (delta = number of children added)
 * - `"SHRUNK"` — the node lost children (delta = number of children removed)
 * - `"DEPTH_CHANGED"` — the subtree became deeper or shallower (delta = height difference)
 */
export type SubtreeShapeDiffType =
  | DiffType
  | "GROWN"
  | "SHRUNK"
  | "DEPTH_CHANGED";

/**
 * An inner-lens {@link DiffViewer} that detects changes in subtree structure.
 *
 * For each matched node pair, checks whether children were added/removed
 * (GROWN/SHRUNK) or whether the subtree depth changed (DEPTH_CHANGED).
 * A single pair can emit multiple diff types.
 *
 * **Best used when:** you want to detect container-level changes —
 * lists gaining items, sections collapsing, trees growing new branches.
 *
 * **Precondition:** works best when nodes have stable surface identity
 * (tagName + attributes) so the {@link Comparer} can match them by what
 * they ARE rather than where they sit.
 *
 * @example
 * ```ts
 * const viewer = new SubtreeShapeDiffViewer(comparer);
 * const diffs = viewer.highlight(oldTree, newTree);
 *
 * const grown = diffs.filter(d => d.type === "GROWN");
 * grown.forEach(d => {
 *   console.log(`${d.targetNode?.tagName} gained ${d.delta} children`);
 * });
 * ```
 */
export class SubtreeShapeDiffViewer implements DiffViewer<SubtreeShapeDiffType> {
  private comparer: Comparer;

  /**
   * @param comparer - The {@link Comparer} used to match nodes between trees.
   */
  constructor(comparer: Comparer) {
    this.comparer = comparer;
  }

  /**
   * Compares two trees and returns subtree-shape differences.
   *
   * @param reference - The old (baseline) tree.
   * @param target - The new (current) tree.
   * @returns Array of diff points classified as ADDED, DELETED, GROWN, SHRUNK,
   *          or DEPTH_CHANGED.
   */
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
