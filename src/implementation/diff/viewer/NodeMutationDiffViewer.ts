import type { ContextNode, ContextTree } from "@core/context";
import type { ValueType } from "@core/context/ContextNode";
import { DiffPoint, type DiffType, type DiffViewer } from "@core/diff";
import type { Comparer } from "@core/compare/Comparer";

/**
 * Extended diff types emitted by {@link NodeMutationDiffViewer}.
 *
 * - `"ADDED"` / `"DELETED"` — base types
 * - `"TAG_CHANGED"` — the element's tag name was swapped (e.g. `<div>` → `<section>`)
 * - `"ATTRIBUTE_CHANGED"` — attributes were added, removed, or modified
 * - `"TEXT_CHANGED"` — the node's direct text content was modified
 */
export type NodeMutationDiffType =
  | DiffType
  | "TAG_CHANGED"
  | "ATTRIBUTE_CHANGED"
  | "TEXT_CHANGED";

/**
 * A node-lens {@link DiffViewer} that detects in-place property mutations.
 *
 * For each matched node pair, checks whether the tag name, attributes, or
 * text content changed. A single pair can emit multiple diff types (e.g. both
 * TAG_CHANGED and TEXT_CHANGED if both changed simultaneously).
 *
 * **Best used when:** the DOM hierarchy is relatively stable and you want
 * to detect content or styling changes on existing elements.
 *
 * **Precondition:** works best when the {@link Comparer} can produce meaningful
 * matches. If the entire tree is reorganised, positional matching will pair
 * wrong nodes and the mutations reported will be noise.
 *
 * @example
 * ```ts
 * const viewer = new NodeMutationDiffViewer(comparer);
 * const diffs = viewer.highlight(oldTree, newTree);
 *
 * const textChanges = diffs.filter(d => d.type === "TEXT_CHANGED");
 * textChanges.forEach(d => {
 *   console.log(`"${d.referenceNode?.directText}" → "${d.targetNode?.directText}"`);
 * });
 * ```
 */
export class NodeMutationDiffViewer implements DiffViewer<NodeMutationDiffType> {
  private comparer: Comparer;

  /**
   * @param comparer - The {@link Comparer} used to match nodes between trees.
   */
  constructor(comparer: Comparer) {
    this.comparer = comparer;
  }

  /**
   * Compares two trees and returns mutation-related differences.
   *
   * @param reference - The old (baseline) tree.
   * @param target - The new (current) tree.
   * @returns Array of diff points classified as ADDED, DELETED, TAG_CHANGED,
   *          ATTRIBUTE_CHANGED, or TEXT_CHANGED.
   */
  highlight(
    reference: ContextTree,
    target: ContextTree,
  ): DiffPoint<NodeMutationDiffType>[] {
    const { pairs, referenceOnly, targetOnly } = this.comparer.compare(
      reference,
      target,
    );

    const points: DiffPoint<NodeMutationDiffType>[] = [];

    for (const { reference: r, target: t } of pairs) {
      points.push(...this.classifyMutations(r, t));
    }

    for (const r of referenceOnly) {
      points.push(new DiffPoint<NodeMutationDiffType>("DELETED", r, null));
    }

    for (const t of targetOnly) {
      points.push(new DiffPoint<NodeMutationDiffType>("ADDED", null, t));
    }

    return points;
  }

  private classifyMutations(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<NodeMutationDiffType>[] {
    const points: DiffPoint<NodeMutationDiffType>[] = [];

    if (r.tagName !== t.tagName) {
      points.push(new DiffPoint<NodeMutationDiffType>("TAG_CHANGED", r, t));
    }

    if (this.attributesChanged(r, t)) {
      points.push(
        new DiffPoint<NodeMutationDiffType>(
          "ATTRIBUTE_CHANGED",
          r,
          t,
          null,
          null,
          Math.abs(r.attributeCount - t.attributeCount),
        ),
      );
    }

    if (r.directTextHash !== t.directTextHash) {
      points.push(new DiffPoint<NodeMutationDiffType>("TEXT_CHANGED", r, t));
    }

    return points;
  }

  /**
   * Compares attribute analytics between two nodes.
   * Checks both the set of attribute keys and their analysed values.
   */
  private attributesChanged(r: ContextNode, t: ContextNode): boolean {
    if (r.attributeCount !== t.attributeCount) return true;

    const rKeys = Object.keys(r.attributeAnalytic);
    const tKeys = Object.keys(t.attributeAnalytic);

    if (rKeys.length !== tKeys.length) return true;
    for (const key of rKeys) {
      if (!(key in t.attributeAnalytic)) return true;
    }

    for (const key of rKeys) {
      const rVal = r.attributeAnalytic[key] as ValueType;
      const tVal = t.attributeAnalytic[key] as ValueType;

      if (
        rVal.numberOfValues !== tVal.numberOfValues ||
        rVal.totalLength !== tVal.totalLength ||
        rVal.actualValue !== tVal.actualValue
      ) {
        return true;
      }
    }

    return false;
  }
}
