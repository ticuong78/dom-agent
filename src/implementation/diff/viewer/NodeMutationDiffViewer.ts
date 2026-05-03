import type { ContextNode, ContextTree } from "@core/context";
import type { ValueType } from "@core/context/ContextNode";
import type { DiffPoint, DiffType, DiffViewer } from "@core/diff";
import type { Comparer } from "@core/compare/Comparer";

export type NodeMutationDiffType =
  | DiffType
  | "TAG_CHANGED"
  | "ATTRIBUTE_CHANGED"
  | "TEXT_CHANGED";

/**
 * NodeMutationDiffViewer — node-lens viewer.
 *
 * Detects in-place mutations: a matched node whose surface properties
 * (tagName, attributes, directText) changed between snapshots.
 *
 * Precondition: works best when the DOM hierarchy is relatively stable
 * so the Comparer can produce meaningful matches. If the entire tree
 * is reorganised, positional matching will pair wrong nodes and the
 * mutations reported will be noise.
 *
 * A single matched pair can emit multiple diff types (e.g. both
 * TAG_CHANGED and TEXT_CHANGED if both changed simultaneously).
 */
export class NodeMutationDiffViewer
  implements DiffViewer<NodeMutationDiffType>
{
  private comparer: Comparer;

  constructor(comparer: Comparer) {
    this.comparer = comparer;
  }

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
      points.push({ type: "DELETED", referenceNode: r, targetNode: null });
    }

    for (const t of targetOnly) {
      points.push({ type: "ADDED", referenceNode: null, targetNode: t });
    }

    return points;
  }

  private classifyMutations(
    r: ContextNode,
    t: ContextNode,
  ): DiffPoint<NodeMutationDiffType>[] {
    const points: DiffPoint<NodeMutationDiffType>[] = [];

    if (r.tagName !== t.tagName) {
      points.push({ type: "TAG_CHANGED", referenceNode: r, targetNode: t });
    }

    if (this.attributesChanged(r, t)) {
      points.push({
        type: "ATTRIBUTE_CHANGED",
        referenceNode: r,
        targetNode: t,
        delta: Math.abs(r.attributeCount - t.attributeCount),
      });
    }

    if (r.directTextHash !== t.directTextHash) {
      points.push({ type: "TEXT_CHANGED", referenceNode: r, targetNode: t });
    }

    return points;
  }

  /**
   * Compares attribute analytics between two nodes.
   * Checks both the set of attribute keys and their analysed values
   * (numberOfValues, totalLength) — not just the count.
   */
  private attributesChanged(r: ContextNode, t: ContextNode): boolean {
    if (r.attributeCount !== t.attributeCount) return true;

    const rKeys = Object.keys(r.attributeAnalytic);
    const tKeys = Object.keys(t.attributeAnalytic);

    // Different attribute names
    if (rKeys.length !== tKeys.length) return true;
    for (const key of rKeys) {
      if (!(key in t.attributeAnalytic)) return true;
    }

    // Same keys — check if values changed
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
