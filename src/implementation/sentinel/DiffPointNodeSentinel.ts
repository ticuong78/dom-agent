import type { ContextTree } from "@core/context";
import type { DiffPoint } from "@core/diff";
import type { NodeSentinel, SentinelResult } from "@core/sentinel";

/**
 * A {@link NodeSentinel} implementation that determines node status by
 * cross-referencing the reference {@link ContextTree} with a set of
 * {@link DiffPoint} results.
 *
 * **Algorithm:**
 * 1. Check if the signature exists in the reference tree (`hasSignature`)
 * 2. If not found → `NEVER_EXISTED`
 * 3. If found → scan DiffPoints for any whose `referenceNode` matches
 * 4. If matched → `AFFECTED` (with the relevant points)
 * 5. If no DiffPoint references it → `UNCHANGED`
 *
 * @example
 * ```ts
 * const tree = converter.convert(html);
 * const diffs = viewer.highlight(oldTree, newTree);
 *
 * const sentinel = new DiffPointNodeSentinel(oldTree, diffs);
 * const result = sentinel.query(signature);
 *
 * if (result.found && result.status === "AFFECTED") {
 *   result.points.forEach(p => {
 *     console.log(`${p.type}: ${p.referenceNode?.tagName}`);
 *   });
 * }
 * ```
 */
export class DiffPointNodeSentinel implements NodeSentinel {
  private readonly tree: ContextTree;
  private readonly diffPoints: DiffPoint<string>[];

  /**
   * @param tree - The reference (old) {@link ContextTree} to check node existence against.
   * @param diffPoints - The diff results produced by one or more {@link DiffViewer} runs.
   */
  constructor(tree: ContextTree, diffPoints: DiffPoint<string>[]) {
    this.tree = tree;
    this.diffPoints = diffPoints;
  }

  /**
   * Queries whether a node (identified by signature) exists in the reference
   * tree and whether it was affected by any detected change.
   *
   * @param signature - The identity signature of the node to track.
   * @returns A {@link SentinelResult} describing the node's status.
   */
  query(signature: string): SentinelResult {
    // Step 1: Check if the node ever existed in the reference tree
    if (!this.tree.hasSignature(signature)) {
      return { found: false, reason: "NEVER_EXISTED" };
    }

    // Step 2: Get all nodes matching this signature in the reference tree
    const trackedNodes = this.tree.getBySignature(signature);
    const trackedIds = new Set(trackedNodes.map((n) => n.id));

    // Step 3: Scan DiffPoints for any whose referenceNode matches
    const affectedPoints = this.diffPoints.filter(
      (point) => point.referenceNode !== null && trackedIds.has(point.referenceNode.id),
    );

    // Step 4: Determine result
    if (affectedPoints.length === 0) {
      return { found: true, status: "UNCHANGED" };
    }

    return { found: true, status: "AFFECTED", points: affectedPoints };
  }
}
