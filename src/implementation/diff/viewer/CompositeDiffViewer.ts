import type { ContextNode, ContextTree } from "@core/context";
import { DiffPoint } from "@core/diff";
import { AbstractDiffViewer } from "./AbstractDiffViewer";

import type { NodeMutationDiffType } from "./NodeMutationDiffViewer";
import type { SubtreeShapeDiffType } from "./SubtreeShapeDiffViewer";
import type { TreeHierarchyDiffType } from "./TreeHierarchyDiffViewer";

/**
 * Convenience union of the diff types produced by the three built-in viewers.
 * Use as the type parameter of CompositeDiffViewer when composing the standard
 * hierarchy + mutation + shape trio.
 */
export type StandardDiffType =
  | TreeHierarchyDiffType
  | NodeMutationDiffType
  | SubtreeShapeDiffType;

/**
 * An AbstractDiffViewer that runs several child viewers over the same tree
 * pair and reconciles their outputs into a single, deduplicated list.
 *
 * Reconciliation rule: matched beats unmatched. If any viewer paired
 * reference-node R with target-node T (via any non-ADDED/DELETED diff type),
 * every DELETED for R and every ADDED for T from other viewers is dropped.
 *
 * Surviving points keep the `source` set by their original child viewer.
 */
export class CompositeDiffViewer<
  T extends string = string,
> extends AbstractDiffViewer<T> {
  private readonly viewers: AbstractDiffViewer<T>[];

  constructor(viewers: AbstractDiffViewer<T>[], name: string = "composite") {
    super(name);
    this.viewers = viewers;
  }

  highlight(reference: ContextTree, target: ContextTree): DiffPoint<T>[] {
    // 1. Fan out
    const all: DiffPoint<T>[] = [];
    for (const viewer of this.viewers) {
      all.push(...viewer.highlight(reference, target));
    }

    // 2. Discover matched node sets
    const matchedRefs = new Set<ContextNode>();
    const matchedTars = new Set<ContextNode>();

    for (const point of all) {
      if (point.type !== "ADDED" && point.referenceNode) {
        matchedRefs.add(point.referenceNode);
      }
      if (point.type !== "DELETED" && point.targetNode) {
        matchedTars.add(point.targetNode);
      }
    }

    // 3. Filter contradictions
    const filtered: DiffPoint<T>[] = [];
    for (const point of all) {
      if (
        point.type === "DELETED" &&
        point.referenceNode &&
        matchedRefs.has(point.referenceNode)
      ) {
        continue;
      }
      if (
        point.type === "ADDED" &&
        point.targetNode &&
        matchedTars.has(point.targetNode)
      ) {
        continue;
      }
      filtered.push(point);
    }

    // 4. Deduplicate by (type, refId, tarId)
    const seen = new Set<string>();
    const deduped: DiffPoint<T>[] = [];
    for (const point of filtered) {
      const refId = point.referenceNode ? point.referenceNode.id : "";
      const tarId = point.targetNode ? point.targetNode.id : "";
      const key = point.type + "|" + refId + "|" + tarId;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(point);
    }

    // 5. Return; survivors keep their original viewer's source
    return deduped;
  }
}
